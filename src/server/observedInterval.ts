import {commitSnapshotMirror,readSnapshot,snapshotExists} from './durableSnapshot';
import {units} from './exactDecimal';
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {normalizeBalances,type Balance} from './accountSnapshot';
import {reconcileActivity,type ActivitySnapshot} from './accountActivity';
import {mergeRecoveredActivity,type HistoryRecovery} from './historyRecovery';
import type {valueAccount} from './accountValuation';
type Valuation=Awaited<ReturnType<typeof valueAccount>>;
type Checkpoint={accountId:string;startedAt:number;observedAt:number;balances:Balance[];balanceDigest:string};
type Recovered=Awaited<ReturnType<HistoryRecovery['recover']>>;
type Pair={symbol:string;baseAsset:string;quoteAsset:string};
function validateCheckpoint(s:Checkpoint,accountId:string){
 if(!s||s.accountId!==accountId||!Number.isSafeInteger(s.startedAt)||!Number.isSafeInteger(s.observedAt)||s.startedAt<=0||s.observedAt<s.startedAt||s.observedAt-s.startedAt>10000)throw Error('INVALID_INTERVAL_CHECKPOINT');
 const balances=normalizeBalances(s.balances);if(createHash('sha256').update(JSON.stringify([accountId,balances])).digest('hex')!==s.balanceDigest)throw Error('INTERVAL_BALANCE_DIGEST_MISMATCH');
}
export function reconcileObservedInterval(before:Checkpoint,after:Checkpoint,recovered:Recovered[],pairs:Pair[],accountId:string){
 validateCheckpoint(before,accountId);validateCheckpoint(after,accountId);
 if(after.startedAt<=before.observedAt||after.observedAt-before.startedAt>86400000)throw Error('INVALID_OBSERVATION_INTERVAL');
 if(!pairs.length||new Set(pairs.map(p=>p.symbol)).size!==pairs.length||recovered.length!==pairs.length)throw Error('INTERVAL_SYMBOL_COVERAGE_REQUIRED');
 let activity:ActivitySnapshot={trades:[],unresolved:[]};const boundary:string[]=[],ids=new Set<string>();
 for(const pair of pairs){
  const windows=recovered.filter(r=>r.symbol===pair.symbol);if(windows.length!==1)throw Error('INTERVAL_WINDOW_REQUIRED');const r=windows[0];
  if(r.startTime!==before.startedAt||r.endTime!==after.observedAt)throw Error('INTERVAL_WINDOW_MISMATCH');
  activity=mergeRecoveredActivity(activity,r,pair,accountId).activity;
  for(const t of r.trades){const id=t.symbol+':'+t.tradeId;if(ids.has(id))throw Error('INTERVAL_TRADE_REUSED');ids.add(id);if(t.time<=before.observedAt||t.time>=after.startedAt)boundary.push(id);}
 }
 const represented=new Set(['USDT',...pairs.flatMap(p=>[p.baseAsset,p.quoteAsset])]);
 const unmonitored=[...new Set([...before.balances,...after.balances].filter(b=>units(b.free)+units(b.locked)>0n).map(b=>b.asset))].filter(a=>!represented.has(a));
 const movement=reconcileActivity(before.balances,after.balances,{trades:[],unresolved:[]},activity);
 return {state:boundary.length?'BOUNDARY_ACTIVITY_AMBIGUOUS':unmonitored.length?'UNMONITORED_HOLDINGS':movement.state==='MATCHED_KNOWN_ACTIVITY'?'MATCHED_SCOPED_INTERVAL':'UNEXPLAINED_INTERVAL_CHANGE',startTime:before.startedAt,endTime:after.observedAt,boundaryTrades:boundary,unmonitoredHoldings:unmonitored,movement,accountGapClosed:false as const,dailyRiskAuthorized:false as const};
}
type Pending={after:Checkpoint;reports:Recovered[];pairs:Pair[];blocked?:boolean};
/** Bind fixed balance checkpoints to scoped history; never replace an unresolved checkpoint pair. */
export class ObservedIntervalAudit{
 private baseline?:Checkpoint;private pending?:Pending;private lastAudit?:ReturnType<typeof reconcileObservedInterval>;private fd:number;private busy=false;private closed=false;private released=false;private symbols:string[];
 constructor(private file:string,private accountId:string,symbols:string[],private lagMs:number,private recover:(s:{symbol:string;startTime:number;endTime:number})=>Promise<Recovered>,private lookup:(symbol:string)=>Promise<Pair>,private now=Date.now){
  if(!/^testnet_[a-f0-9]{24}$/.test(accountId)||!Array.isArray(symbols)||!symbols.length||symbols.length>10||new Set(symbols).size!==symbols.length||symbols.some(s=>typeof s!=='string'||!/^[A-Z0-9]{5,24}$/.test(s))||!Number.isSafeInteger(lagMs)||lagMs<30000)throw Error('INVALID_INTERVAL_AUDIT_CONFIG');this.symbols=[...symbols].sort();
  fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});this.fd=fs.openSync(file+'.lock','wx',0o600);
  try{if(snapshotExists(file)){const d=readSnapshot(file);if(d.version!==1||d.accountId!==accountId||JSON.stringify(d.symbols)!==JSON.stringify(this.symbols)||d.lagMs!==lagMs)throw Error('INVALID_INTERVAL_AUDIT_JOURNAL');
   if(d.baseline)validateCheckpoint(d.baseline,accountId);
   if(d.pending){if(!d.baseline||!Array.isArray(d.pending.reports)||!Array.isArray(d.pending.pairs)||d.pending.reports.length!==d.pending.pairs.length||d.pending.reports.length>this.symbols.length||(d.pending.blocked!==undefined&&typeof d.pending.blocked!=='boolean'))throw Error('INVALID_PENDING_INTERVAL');validateCheckpoint(d.pending.after,accountId);if(d.pending.after.startedAt<=d.baseline.observedAt)throw Error('INVALID_PENDING_INTERVAL');
    let activity:ActivitySnapshot={trades:[],unresolved:[]};for(let i=0;i<d.pending.reports.length;i++){const r=d.pending.reports[i],p=d.pending.pairs[i];if(r.symbol!==this.symbols[i]||p.symbol!==r.symbol||r.startTime!==d.baseline.startedAt||r.endTime!==d.pending.after.observedAt)throw Error('INVALID_PENDING_INTERVAL');activity=mergeRecoveredActivity(activity,r,p,accountId).activity;}
   }
   this.baseline=d.baseline;this.pending=d.pending;
   // Last audit is diagnostic only; recompute a blocked outcome rather than trusting saved status.
   if(this.pending?.blocked){if(this.pending.reports.length!==this.symbols.length)throw Error('INVALID_BLOCKED_INTERVAL');this.lastAudit=reconcileObservedInterval(this.baseline!,this.pending.after,this.pending.reports,this.pending.pairs,accountId);if(this.lastAudit.state==='MATCHED_SCOPED_INTERVAL')throw Error('INVALID_BLOCKED_INTERVAL');}
  }}catch(e){fs.closeSync(this.fd);fs.unlinkSync(file+'.lock');throw e;}
 }
 private persist(){const tmp=this.file+'.'+randomUUID()+'.tmp';let fd:number|undefined;try{fd=fs.openSync(tmp,'wx',0o600);fs.writeFileSync(fd,JSON.stringify({version:1,accountId:this.accountId,symbols:this.symbols,lagMs:this.lagMs,baseline:this.baseline,pending:this.pending,lastAudit:this.lastAudit}));fs.fsyncSync(fd);fs.closeSync(fd);fd=undefined;commitSnapshotMirror(tmp,this.file);}catch(e){this.closed=true;throw e;}finally{if(fd!==undefined)fs.closeSync(fd);if(fs.existsSync(tmp))fs.unlinkSync(tmp);}}
 capture(sample:Valuation){
  if(this.closed)throw Error('INTERVAL_AUDIT_CLOSED');if(this.busy)throw Error('INTERVAL_AUDIT_BUSY');
  if(!sample?.complete||sample.environment!=='BINANCE_TESTNET'||sample.currentEquityUSDT===null||sample.issues.length||sample.unpricedAssets.length||this.now()<sample.observedAt||this.now()-sample.observedAt>2000)throw Error('FRESH_COMPLETE_INTERVAL_SAMPLE_REQUIRED');
  const point:Checkpoint={accountId:sample.accountId,startedAt:sample.startedAt,observedAt:sample.observedAt,balances:normalizeBalances(sample.balances),balanceDigest:sample.balanceDigest};validateCheckpoint(point,this.accountId);
  if(!this.baseline){this.baseline=point;this.persist();return 'BASELINE_ONLY';}
  if(this.pending)return 'PENDING_INTERVAL_RETAINED';
  if(point.startedAt<=this.baseline.observedAt)throw Error('INTERVAL_SAMPLE_NOT_ADVANCING');
  this.pending={after:point,reports:[],pairs:[]};this.persist();return 'INTERVAL_QUEUED';
 }
 async work(){
  if(this.closed)throw Error('INTERVAL_AUDIT_CLOSED');if(this.busy)throw Error('INTERVAL_AUDIT_BUSY');
  if(!this.pending)return {state:'NO_PENDING_INTERVAL',recoveryWorkUsed:0,accountGapClosed:false,dailyRiskAuthorized:false};
  if(this.pending.blocked)return {...this.lastAudit!,recoveryWorkUsed:0};
  const before=this.baseline!,p=this.pending;
  if(p.after.observedAt-before.startedAt>86400000)return {state:'INTERVAL_TOO_WIDE_REQUIRES_REVIEW',recoveryWorkUsed:0,accountGapClosed:false,dailyRiskAuthorized:false};
  if(this.now()-p.after.observedAt<this.lagMs)return {state:'WAITING_SETTLEMENT_LAG',recoveryWorkUsed:0,accountGapClosed:false,dailyRiskAuthorized:false};
  this.busy=true;
  try{
   if(p.reports.length===this.symbols.length)return {...this.finish(),recoveryWorkUsed:0};
   const symbol=this.symbols[p.reports.length];const pair=await this.lookup(symbol);
   if(pair.symbol!==symbol||pair.baseAsset+pair.quoteAsset!==symbol)throw Error('INTERVAL_PAIR_MISMATCH');
   const report=await this.recover({symbol,startTime:before.startedAt,endTime:p.after.observedAt});
   if(report.state!=='STABLE_SYMBOL_WINDOW')return {state:'INTERVAL_HISTORY_UNCONFIRMED',recoveryWorkUsed:1,accountGapClosed:false,dailyRiskAuthorized:false};
   if(report.symbol!==symbol||report.startTime!==before.startedAt||report.endTime!==p.after.observedAt)throw Error('INTERVAL_WINDOW_MISMATCH');mergeRecoveredActivity({trades:[],unresolved:[]},report,pair,this.accountId);
   p.reports.push(structuredClone(report));p.pairs.push(structuredClone(pair));this.persist();
   if(p.reports.length<this.symbols.length)return {state:'INTERVAL_SYMBOLS_PENDING',recoveryWorkUsed:1,accountGapClosed:false,dailyRiskAuthorized:false};
   return {...this.finish(),recoveryWorkUsed:1};
  }finally{this.busy=false;}
 }
 private finish(){const p=this.pending!;this.lastAudit=reconcileObservedInterval(this.baseline!,p.after,p.reports,p.pairs,this.accountId);if(this.lastAudit.state==='MATCHED_SCOPED_INTERVAL'){this.baseline=p.after;this.pending=undefined;}else p.blocked=true;this.persist();return this.lastAudit;}
 close(){if(this.busy)throw Error('INTERVAL_AUDIT_BUSY');if(this.released)return;this.closed=true;fs.closeSync(this.fd);fs.unlinkSync(this.file+'.lock');this.released=true;}
}
