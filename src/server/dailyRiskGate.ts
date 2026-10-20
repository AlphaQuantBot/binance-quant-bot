import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { units, decimal } from './exactDecimal';
import { normalizeBalances, validateAccountSnapshot, type AccountSnapshot } from './accountSnapshot';
/** Attestation contract for a future trusted full-account historian/valuator, NEVER browser input. */
export type DailyRiskEvidence={
  environment:'BINANCE_TESTNET';accountId:string;quoteAsset:'USDT';source:'RECONCILED_ACCOUNT_HISTORY';scope:'REALIZED_AND_UNREALIZED';
  day:string;coverageFrom:number;coverageTo:number;observedAt:number;balanceDigest:string;
  openingEquity:string;currentEquity:string;externalInflows:string;externalOutflows:string;pricedAssets:string[];unpricedAssets:string[];
};
type DayState={day:string;openingEquity:string;limit:string;coverageTo:number;externalInflows:string;externalOutflows:string;latched:boolean};
export function balanceDigest(snapshot:AccountSnapshot) {
  return createHash('sha256').update(JSON.stringify([snapshot.accountId,normalizeBalances(snapshot.balances)])).digest('hex');
}
/** No real evidence provider is supplied yet. Missing/full-day-incomplete evidence always blocks. */
export class DailyRiskGate {
  private fd:number;private state?:DayState;private halted=false;private closed=false;private released=false;
  constructor(private file:string,private accountId:string){
    fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});this.fd=fs.openSync(file+'.lock','wx',0o600);
    try{if(fs.existsSync(file)){
      const data=JSON.parse(fs.readFileSync(file,'utf8'));
      if(data.version!==1||data.accountId!==accountId||typeof data.halted!=='boolean')throw Error('INVALID_DAILY_RISK_JOURNAL');
      this.halted=data.halted;
      if(data.state){const d=data.state;
        if(typeof d.day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(d.day)||new Date(d.day+'T00:00:00Z').toISOString().slice(0,10)!==d.day||typeof d.latched!=='boolean'||!Number.isSafeInteger(d.coverageTo)||d.coverageTo<Date.parse(d.day+'T00:00:00Z')||d.coverageTo>=Date.parse(d.day+'T00:00:00Z')+86400000||units(d.openingEquity)<=0n||units(d.limit)<=0n)throw Error('INVALID_DAILY_RISK_JOURNAL');
        units(d.externalInflows);units(d.externalOutflows);this.state=d;
      }
    }}catch(e){fs.closeSync(this.fd);fs.unlinkSync(file+'.lock');throw e;}
  }
  private persist(){
    const tmp=this.file+'.'+randomUUID()+'.tmp';let fd:number|undefined;
    try{fd=fs.openSync(tmp,'wx',0o600);fs.writeFileSync(fd,JSON.stringify({version:1,accountId:this.accountId,halted:this.halted,state:this.state}));fs.fsyncSync(fd);fs.closeSync(fd);fd=undefined;fs.renameSync(tmp,this.file);const dir=fs.openSync(path.dirname(this.file),'r');try{fs.fsyncSync(dir);}finally{fs.closeSync(dir);}}
    catch(e){this.closed=true;throw e;}finally{if(fd!==undefined)fs.closeSync(fd);if(fs.existsSync(tmp))fs.unlinkSync(tmp);}
  }
  private open(){if(this.closed)throw Error('DAILY_RISK_JOURNAL_CLOSED');}
  halt(){this.open();this.halted=true;this.persist();}
  assess(e:DailyRiskEvidence|undefined,snapshot:AccountSnapshot,limit:string,now:number){
    this.open();if(this.halted)throw Error('PERSISTENT_EMERGENCY_HALT');
    validateAccountSnapshot(snapshot,this.accountId,now);
    const day=new Date(now).toISOString().slice(0,10),start=Date.parse(day+'T00:00:00Z');
    if(!e||e.environment!=='BINANCE_TESTNET'||e.accountId!==this.accountId||e.quoteAsset!=='USDT'||e.source!=='RECONCILED_ACCOUNT_HISTORY'||e.scope!=='REALIZED_AND_UNREALIZED'||e.day!==day||e.coverageFrom!==start||!Number.isSafeInteger(e.coverageTo)||!Number.isSafeInteger(e.observedAt)||e.coverageTo<snapshot.observedAt||e.coverageTo>e.observedAt||e.observedAt>now||now-e.observedAt>2000||now-e.coverageTo>30000||e.balanceDigest!==balanceDigest(snapshot))throw Error('FULL_DAY_RISK_EVIDENCE_REQUIRED');
    const assets=snapshot.balances.filter(b=>units(b.free)+units(b.locked)>0n).map(b=>b.asset).sort();
    if(!Array.isArray(e.pricedAssets)||!Array.isArray(e.unpricedAssets)||e.unpricedAssets.length||JSON.stringify([...e.pricedAssets].sort())!==JSON.stringify(assets))throw Error('UNPRICED_ACCOUNT_RISK');
    const opening=units(e.openingEquity),equity=units(e.currentEquity),inflows=units(e.externalInflows),outflows=units(e.externalOutflows),cap=units(limit);
    if(opening<=0n||cap<=0n)throw Error('INVALID_DAILY_LOSS_LIMIT');
    if(this.state&&this.state.day>day)throw Error('RISK_CLOCK_REGRESSED');
    const prev=this.state?.day===day?this.state:undefined;
    if(prev&&(units(prev.openingEquity)!==opening||units(prev.limit)!==cap||prev.coverageTo>e.coverageTo||units(prev.externalInflows)>inflows||units(prev.externalOutflows)>outflows))throw Error('DAILY_RISK_BASELINE_CHANGED');
    const pnl=equity-opening-inflows+outflows,loss=pnl<0n?-pnl:0n;
    const latched=!!prev?.latched||loss>=cap;
    this.state={day,openingEquity:decimal(opening),limit:decimal(cap),coverageTo:e.coverageTo,externalInflows:decimal(inflows),externalOutflows:decimal(outflows),latched};
    this.persist();return {latched,lossQuote:decimal(loss),day};
  }
  close(){if(this.released)return;this.closed=true;fs.closeSync(this.fd);fs.unlinkSync(this.file+'.lock');this.released=true;}
}
