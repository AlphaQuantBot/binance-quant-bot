import {commitSnapshotMirror,readSnapshot,snapshotExists} from './durableSnapshot';
import {validateActivity,reconcileActivity,type ActivitySnapshot} from './accountActivity';
import fs from 'node:fs';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {units,decimal} from './exactDecimal';
import {normalizeBalances,type Balance} from './accountSnapshot';
import type {valueAccount} from './accountValuation';
type Sample=Awaited<ReturnType<typeof valueAccount>>;
type Day={day:string;firstObservedAt:number;firstEquityUSDT:string;lastObservedAt:number;lastEquityUSDT:string;count:number;maxGapMs:number;restartObserved:boolean;lastBalances:Balance[];lastActivity?:ActivitySnapshot;activityIssues?:string[]};
const dayOf=(time:number)=>new Date(time).toISOString().slice(0,10);
const signed=(n:bigint)=>n<0n?'-'+decimal(-n):decimal(n);
/** Observed equity history only. Never pretends REST observations prove external flows. */
export class EquityHistory{
 private fd:number;private days:Day[]=[];private closed=false;private released=false;
 constructor(private file:string,private accountId:string,private now=Date.now){
  if(!/^[\w-]{1,80}$/.test(accountId))throw Error('INVALID_HISTORY_ACCOUNT');
  fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});this.fd=fs.openSync(file+'.lock','wx',0o600);
  try{if(snapshotExists(file)){
   const data=readSnapshot(file);
   if(data.version!==1||data.accountId!==accountId||!Array.isArray(data.days))throw Error('INVALID_EQUITY_HISTORY');
   const seen=new Set<string>();let last=0;
   this.days=data.days.map((d:Day)=>{
    if(!d||!Number.isSafeInteger(d.firstObservedAt)||!Number.isSafeInteger(d.lastObservedAt)||d.firstObservedAt<=0||d.lastObservedAt<d.firstObservedAt||d.firstObservedAt<=last||dayOf(d.firstObservedAt)!==d.day||dayOf(d.lastObservedAt)!==d.day||seen.has(d.day)||!Number.isSafeInteger(d.count)||d.count<1||!Number.isSafeInteger(d.maxGapMs)||d.maxGapMs<0||typeof d.restartObserved!=='boolean')throw Error('INVALID_EQUITY_HISTORY');
    if(d.lastActivity)validateActivity(d.lastActivity);if(d.activityIssues!==undefined&&(!Array.isArray(d.activityIssues)||d.activityIssues.some(x=>typeof x!=='string')))throw Error('INVALID_ACTIVITY_HISTORY');
    units(d.firstEquityUSDT);units(d.lastEquityUSDT);normalizeBalances(d.lastBalances);seen.add(d.day);last=d.lastObservedAt;return structuredClone(d);
   });
   const latest=this.days.at(-1);if(latest){latest.restartObserved=true;this.persist();}
  }}catch(e){fs.closeSync(this.fd);fs.unlinkSync(file+'.lock');throw e;}
 }
 private persist(){const tmp=this.file+'.'+randomUUID()+'.tmp';let fd:number|undefined;try{fd=fs.openSync(tmp,'wx',0o600);fs.writeFileSync(fd,JSON.stringify({version:1,accountId:this.accountId,days:this.days}));fs.fsyncSync(fd);fs.closeSync(fd);fd=undefined;commitSnapshotMirror(tmp,this.file);}catch(e){this.closed=true;throw e;}finally{if(fd!==undefined)fs.closeSync(fd);if(fs.existsSync(tmp))fs.unlinkSync(tmp);}}
 record(sample:Sample,activity?:ActivitySnapshot){
  if(this.closed)throw Error('EQUITY_HISTORY_CLOSED');const now=this.now();
  if(!sample||sample.environment!=='BINANCE_TESTNET'||sample.operation!=='READ_ONLY_ACCOUNT_VALUATION'||sample.accountId!==this.accountId||sample.quoteAsset!=='USDT'||!sample.complete||sample.currentEquityUSDT===null||sample.issues.length||sample.unpricedAssets.length)throw Error('COMPLETE_VALUATION_REQUIRED');
  if(!Number.isSafeInteger(sample.observedAt)||sample.observedAt<=0||sample.observedAt>now||now-sample.observedAt>2000||!Number.isSafeInteger(sample.startedAt)||sample.startedAt<=0||sample.startedAt>sample.observedAt||now-sample.startedAt>10000)throw Error('STALE_HISTORY_SAMPLE');
  const equity=decimal(units(sample.currentEquityUSDT)),balances=normalizeBalances(sample.balances),day=dayOf(sample.observedAt),prev=this.days.at(-1);
  if(prev&&sample.observedAt<=prev.lastObservedAt)throw Error('HISTORY_CLOCK_NOT_ADVANCING');
  if(createHash('sha256').update(JSON.stringify([this.accountId,balances])).digest('hex')!==sample.balanceDigest)throw Error('HISTORY_BALANCE_DIGEST_MISMATCH');
  const previousBalances=prev?.lastBalances;
  if(activity)validateActivity(activity);
  const activityAudit=activity&&prev?.lastActivity&&previousBalances?reconcileActivity(previousBalances,balances,prev.lastActivity,activity):{state:activity?.unresolved.length?'UNRESOLVED_ORDERS':'ACTIVITY_BASELINE_ONLY',unresolved:activity?.unresolved??[],dailyRiskAuthorized:false};
  const activityIssues=[...new Set([...(prev?.day===day?prev.activityIssues??[]:[]),...(['UNRESOLVED_ORDERS','UNEXPLAINED_BALANCE_CHANGE'].includes(activityAudit.state)?[activityAudit.state]:[])])];
  let current=prev;
  if(!prev||prev.day!==day){current={day,firstObservedAt:sample.observedAt,firstEquityUSDT:equity,lastObservedAt:sample.observedAt,lastEquityUSDT:equity,count:1,maxGapMs:0,restartObserved:false,lastBalances:balances};this.days.push(current);}
  else{prev.maxGapMs=Math.max(prev.maxGapMs,sample.observedAt-prev.lastObservedAt);prev.lastObservedAt=sample.observedAt;prev.lastEquityUSDT=equity;prev.count++;prev.lastBalances=balances;}
  current!.activityIssues=activityIssues;
  if(activity)current!.lastActivity=structuredClone(activity);else delete current!.lastActivity;
  this.persist();
  const assets=[...new Set([...(previousBalances??[]).map(b=>b.asset),...balances.map(b=>b.asset)])].sort();
  const total=(rows:Balance[],asset:string)=>{const b=rows.find(x=>x.asset===asset);return b?units(b.free)+units(b.locked):0n;};
  return {environment:'BINANCE_TESTNET',accountId:this.accountId,day,baselineKind:'FIRST_OBSERVATION',activityAudit,activityIssues,firstObservedAt:current!.firstObservedAt,lastObservedAt:current!.lastObservedAt,observationCount:current!.count,observedEquityChangeUSDT:signed(units(equity)-units(current!.firstEquityUSDT)),nativeBalanceChanges:previousBalances?assets.map(asset=>({asset,change:signed(total(balances,asset)-total(previousBalances,asset))})).filter(r=>r.change!=='0'):[],maxObservationGapMs:current!.maxGapMs,restartObserved:current!.restartObserved,externalInflowsUSDT:null,externalOutflowsUSDT:null,dailyPnlUSDT:null,coverageComplete:false,dailyRiskAuthorized:false};
 }
 close(){if(this.released)return;this.closed=true;fs.closeSync(this.fd);fs.unlinkSync(this.file+'.lock');this.released=true;}
}
