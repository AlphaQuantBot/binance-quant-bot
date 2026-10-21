import {commitSnapshotMirror,readSnapshot,snapshotExists} from './durableSnapshot';
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {units} from './exactDecimal';
import type {HistoricalTrade,TradeHistoryWindow} from './tradeBackfill';
import {validateActivity,type ActivitySnapshot,type ActivityTrade} from './accountActivity';
type Scope={symbol:string;startTime:number;endTime:number};
type Entry=Scope&{id:string;state:'PENDING'|'STABLE_SYMBOL_WINDOW'|'CONFLICT';trades:HistoricalTrade[];reason?:string;lastAttemptAt?:number;verifiedAt?:number};
const scopeId=(accountId:string,s:Scope)=>createHash('sha256').update(JSON.stringify([accountId,s.symbol,s.startTime,s.endTime])).digest('hex');
function validateScope(s:Scope){if(!s||!/^[A-Z0-9]{5,24}$/.test(s.symbol)||!Number.isSafeInteger(s.startTime)||!Number.isSafeInteger(s.endTime)||s.startTime<=0||s.endTime<s.startTime||s.endTime-s.startTime>86400000)throw Error('INVALID_RECOVERY_SCOPE');}
function canonical(rows:HistoricalTrade[],scope:Scope){
 if(!Array.isArray(rows)||rows.length>20000)throw Error('INVALID_RECOVERY_TRADES');const seen=new Set<string>();
 return rows.map(t=>{
  if(!t||t.symbol!==scope.symbol||!/^(0|[1-9]\d{0,29})$/.test(t.tradeId)||!/^(0|[1-9]\d{0,29})$/.test(t.orderId)||!['BUY','SELL'].includes(t.side)||!Number.isSafeInteger(t.time)||t.time<scope.startTime||t.time>scope.endTime||!/^[A-Z0-9]{1,24}$/.test(t.commissionAsset)||units(t.quantity)<=0n||units(t.quoteQuantity)<=0n||seen.has(t.tradeId))throw Error('INVALID_RECOVERY_TRADE');units(t.commission);seen.add(t.tradeId);
  return {tradeId:t.tradeId,orderId:t.orderId,symbol:t.symbol,side:t.side,quantity:t.quantity,quoteQuantity:t.quoteQuantity,commission:t.commission,commissionAsset:t.commissionAsset,time:t.time};
 }).sort((a,b)=>BigInt(a.tradeId)<BigInt(b.tradeId)?-1:1);
}
/** Stable per-symbol observations are retained, but never close whole-account history gaps. */
export class HistoryRecovery{
 private rows:Entry[]=[];private fd:number;private busy=false;private closed=false;private released=false;
 constructor(private file:string,private accountId:string,private read:(symbol:string,start:number,end:number)=>Promise<TradeHistoryWindow>,private now=Date.now){
  if(!/^testnet_[a-f0-9]{24}$/.test(accountId))throw Error('INVALID_RECOVERY_ACCOUNT');
  fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});this.fd=fs.openSync(file+'.lock','wx',0o600);
  try{if(snapshotExists(file)){const d=readSnapshot(file);if(d.version!==1||d.accountId!==accountId||!Array.isArray(d.entries))throw Error('INVALID_RECOVERY_JOURNAL');const seen=new Set<string>();this.rows=d.entries.map((r:Entry)=>{validateScope(r);for(const time of [r.lastAttemptAt,r.verifiedAt])if(time!==undefined&&(!Number.isSafeInteger(time)||time<r.endTime))throw Error('INVALID_RECOVERY_TIME');if(r.id!==scopeId(accountId,r)||seen.has(r.id)||!['PENDING','STABLE_SYMBOL_WINDOW','CONFLICT'].includes(r.state))throw Error('INVALID_RECOVERY_JOURNAL');seen.add(r.id);return {...r,trades:canonical(r.trades,r)};});}}catch(e){fs.closeSync(this.fd);fs.unlinkSync(file+'.lock');throw e;}
 }
 private persist(){const tmp=this.file+'.'+randomUUID()+'.tmp';let fd:number|undefined;try{fd=fs.openSync(tmp,'wx',0o600);fs.writeFileSync(fd,JSON.stringify({version:1,accountId:this.accountId,entries:this.rows}));fs.fsyncSync(fd);fs.closeSync(fd);fd=undefined;commitSnapshotMirror(tmp,this.file);}catch(e){this.closed=true;throw e;}finally{if(fd!==undefined)fs.closeSync(fd);if(fs.existsSync(tmp))fs.unlinkSync(tmp);}}
 private checked(report:TradeHistoryWindow,scope:Scope){if(!report||report.environment!=='BINANCE_TESTNET'||report.accountId!==this.accountId||report.symbol!==scope.symbol||report.startTime!==scope.startTime||report.endTime!==scope.endTime||!Number.isSafeInteger(report.observedAt)||report.observedAt<scope.endTime||report.observedAt>this.now()||this.now()-report.observedAt>5000||!Number.isSafeInteger(report.requestCount)||report.requestCount<1||report.requestCount>64||report.fullAccountCoverage!==false||report.dailyRiskAuthorized!==false)throw Error('RECOVERY_REPORT_MISMATCH');return canonical(report.trades,scope);}
 async recover(input:Scope){
  if(this.closed)throw Error('RECOVERY_JOURNAL_CLOSED');if(this.busy)throw Error('RECOVERY_BUSY');const scope=structuredClone(input);validateScope(scope);const attemptAt=this.now();if(!Number.isSafeInteger(attemptAt)||attemptAt<=0)throw Error('INVALID_RECOVERY_CLOCK');if(scope.endTime>attemptAt)throw Error('RECOVERY_FUTURE_WINDOW');
  const id=scopeId(this.accountId,scope);let row=this.rows.find(r=>r.id===id);
  if(row?.state==='CONFLICT')throw Error('RECOVERY_CONFLICT_REQUIRES_REVIEW');
  if(!row){row={...scope,id,state:'PENDING',trades:[]};this.rows.push(row);}row.state='PENDING';row.lastAttemptAt=attemptAt;delete row.verifiedAt;delete row.reason;this.persist();this.busy=true;
  try{
   let first:HistoricalTrade[],second:HistoricalTrade[];
   try{first=this.checked(await this.read(scope.symbol,scope.startTime,scope.endTime),scope);second=this.checked(await this.read(scope.symbol,scope.startTime,scope.endTime),scope);}catch{row.reason='READ_UNCONFIRMED';this.persist();return this.report(row);}
   const next=new Map(second.map(t=>[t.tradeId,t]));
   if(row.trades.some(t=>JSON.stringify(next.get(t.tradeId))!==JSON.stringify(t))){row.state='CONFLICT';row.reason='RETAINED_HISTORY_REMOVED_OR_CHANGED';this.persist();return this.report(row);}
   if(JSON.stringify(first)!==JSON.stringify(second)){row.reason='HISTORY_STILL_CHANGING';this.persist();return this.report(row);}
   row.trades=second;row.state='STABLE_SYMBOL_WINDOW';row.verifiedAt=this.now();this.persist();return this.report(row);
  }finally{this.busy=false;}
 }
 private report(row:Entry){return {environment:'BINANCE_TESTNET' as const,...structuredClone(row),accountId:this.accountId,accountGapClosed:false as const,dailyRiskAuthorized:false as const};}
 close(){if(this.busy)throw Error('RECOVERY_BUSY');if(this.released)return;this.closed=true;fs.closeSync(this.fd);fs.unlinkSync(this.file+'.lock');this.released=true;}
}
/** Merge diagnostic activity only; never adopt manual fills as local bot orders. */
export function mergeRecoveredActivity(activity:ActivitySnapshot,recovered:Entry&{accountId:string;accountGapClosed:false;dailyRiskAuthorized:false},pair:{baseAsset:string;quoteAsset:string},accountId:string){
 validateActivity(activity);validateScope(recovered);
 if(!/^[A-Z0-9]{1,24}$/.test(pair.baseAsset)||!/^[A-Z0-9]{1,24}$/.test(pair.quoteAsset)||pair.baseAsset===pair.quoteAsset||pair.baseAsset+pair.quoteAsset!==recovered.symbol)throw Error('RECOVERY_PAIR_MISMATCH');
 if(recovered.accountId!==accountId||recovered.state!=='STABLE_SYMBOL_WINDOW'||recovered.accountGapClosed!==false||recovered.dailyRiskAuthorized!==false)throw Error('STABLE_RECOVERY_REQUIRED');
 const map=new Map(activity.trades.map(t=>[t.symbol+':'+t.tradeId,t]));let added=0;
 for(const t of canonical(recovered.trades,recovered)){
  const item:ActivityTrade={tradeId:t.tradeId,orderId:t.orderId,symbol:t.symbol,side:t.side,quantity:t.quantity,quoteQuantity:t.quoteQuantity,commission:t.commission,commissionAsset:t.commissionAsset,baseAsset:pair.baseAsset,quoteAsset:pair.quoteAsset};
  const key=item.symbol+':'+item.tradeId,old=map.get(key);
  if(old&&Object.keys(item).some(k=>old[k as keyof ActivityTrade]!==item[k as keyof ActivityTrade]))throw Error('RECOVERY_ACTIVITY_CONFLICT');
  if(!old){map.set(key,item);added++;}
 }
 const merged={trades:[...map.values()].sort((a,b)=>(a.symbol+':'+a.tradeId).localeCompare(b.symbol+':'+b.tradeId)),unresolved:[...activity.unresolved]};validateActivity(merged);
 return {activity:merged,addedTradeCount:added,accountGapClosed:false,dailyRiskAuthorized:false};
}
