import { units as amount } from './exactDecimal';
import { validateSettlement, type Settlement } from './tradeSettlement';
import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
export type Status = 'SUBMITTING'|'UNKNOWN'|'NEW'|'PARTIALLY_FILLED'|'FILLED'|'CANCELED'|'REJECTED'|'EXPIRED'|'EXPIRED_IN_MATCH';
export type Intent = {requestId:string; accountId:string; symbol:string; side:'BUY'|'SELL'; quantity:string;limitPrice?:string};
export type Confirmation = {clientOrderId:string; symbol:string; side:'BUY'|'SELL'; status:Status; orderId:string; executedQty:string; quoteQty:string; updateTime:number; settlement?:Settlement};
export type Record = Intent & {clientOrderId:string; status:Status; confirmation?:Confirmation};
export interface Adapter { submit(intent:Intent, clientId:string):Promise<Confirmation>; query(intent:Intent, clientId:string):Promise<Confirmation|null> }
const states = ['NEW','PARTIALLY_FILLED','FILLED','CANCELED','REJECTED','EXPIRED','EXPIRED_IN_MATCH'];
const terminal = ['FILLED','CANCELED','REJECTED','EXPIRED','EXPIRED_IN_MATCH'];
function validate(i:Intent) {
  if(i.limitPrice!==undefined&&amount(i.limitPrice)<=0n)throw Error('INVALID_LIMIT_PRICE');
  if(!/^[\w-]{8,80}$/.test(i.requestId)||!/^[\w-]{1,80}$/.test(i.accountId)||!/^[A-Z0-9]{5,24}$/.test(i.symbol)||!['BUY','SELL'].includes(i.side)||amount(i.quantity)<=0n)throw Error('INVALID_INTENT');
}
const fingerprint=(i:Intent)=>JSON.stringify([i.requestId,i.accountId,i.symbol,i.side,i.quantity,...(i.limitPrice===undefined?[]:[i.limitPrice])]);
const clientId=(i:Intent)=>'aq_'+createHash('sha256').update(fingerprint(i)).digest('hex').slice(0,32);
/** Single operator/process journal; stale locks require manual recovery. No exchange adapter is enabled. */
export class OrderExecution {
  private rows:Record[]=[]; private closed=false; private fd:number; private inFlight=0;
  constructor(private file:string,private adapter:Adapter){
    fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});
    this.fd=fs.openSync(file+'.lock','wx',0o600);
    try {
      if(fs.existsSync(file)) {
        const data=JSON.parse(fs.readFileSync(file,'utf8'));
        if(data.version!==1||!Array.isArray(data.orders))throw Error('INVALID_JOURNAL');
        const ids=new Set<string>();
        this.rows=data.orders.map((r:Record)=>{
          validate(r);
          if(ids.has(r.requestId)||r.clientOrderId!==clientId(r)||!['SUBMITTING','UNKNOWN',...states].includes(r.status))throw Error('INVALID_JOURNAL');
          ids.add(r.requestId);if(r.confirmation){this.check(r,r.confirmation);if(r.status!==r.confirmation.status&&r.status!=='UNKNOWN')throw Error('INVALID_JOURNAL_STATUS');}
          return {...r,status:r.status==='SUBMITTING'?'UNKNOWN':r.status};
        });this.persist();
      }
    }catch(e){fs.closeSync(this.fd);fs.unlinkSync(file+'.lock');throw e;}
  }
  private open(){if(this.closed)throw Error('JOURNAL_CLOSED');}
  private persist(){
    const tmp=this.file+'.'+randomUUID()+'.tmp';let fd:number|undefined;
    try{
      fd=fs.openSync(tmp,'wx',0o600);fs.writeFileSync(fd,JSON.stringify({version:1,orders:this.rows}));fs.fsyncSync(fd);fs.closeSync(fd);fd=undefined;
      fs.renameSync(tmp,this.file);const dir=fs.openSync(path.dirname(this.file),'r');try{fs.fsyncSync(dir);}finally{fs.closeSync(dir);}
    }catch(e){this.closed=true;throw e;}finally{if(fd!==undefined)fs.closeSync(fd);if(fs.existsSync(tmp))fs.unlinkSync(tmp);}
  }
  list(){this.open();return structuredClone(this.rows);}
  private check(r:Record,e:Confirmation){
    if(!e||e.clientOrderId!==r.clientOrderId||e.symbol!==r.symbol||e.side!==r.side||!states.includes(e.status)||typeof e.orderId!=='string'||!/^\d{1,30}$/.test(e.orderId)||!Number.isSafeInteger(e.updateTime)||e.updateTime<0)throw Error('INVALID_CONFIRMATION');
    if(e.settlement)validateSettlement(e,e.settlement);
    const qty=amount(e.executedQty),quote=amount(e.quoteQty),requested=amount(r.quantity);
    if(qty>requested||(qty===0n)!==(quote===0n)||(['NEW','REJECTED'].includes(e.status)&&qty!==0n)||(e.status==='PARTIALLY_FILLED'&&(qty<=0n||qty>=requested))||(e.status==='FILLED'&&qty!==requested))throw Error('INVALID_TOTALS');
  }
  private apply(r:Record,e:Confirmation){
    this.check(r,e);const prev=r.confirmation;
    if(prev){
      if(prev.orderId!==e.orderId)throw Error('ORDER_ID_CHANGED');
      if(e.updateTime<prev.updateTime)return;
      if(amount(e.executedQty)<amount(prev.executedQty)||amount(e.quoteQty)<amount(prev.quoteQty))throw Error('TOTALS_REGRESSED');
      if(terminal.includes(prev.status)&&(prev.status!==e.status||amount(prev.executedQty)!==amount(e.executedQty)||amount(prev.quoteQty)!==amount(e.quoteQty)))throw Error('TERMINAL_CHANGED');
      if(prev.settlement){
        if(!e.settlement)throw Error('SETTLEMENT_MISSING');
        for(const t of prev.settlement.trades){const next=e.settlement.trades.find(n=>n.tradeId===t.tradeId);if(!next||JSON.stringify(t)!==JSON.stringify(next))throw Error('SETTLED_TRADE_CHANGED');}
      }
      if(prev.status==='PARTIALLY_FILLED'&&e.status==='NEW')throw Error('STATUS_REGRESSED');
    }
    r.confirmation=structuredClone(e);r.status=e.status;this.persist();
  }
  async submit(i:Intent){
    this.open();validate(i);i={requestId:i.requestId,accountId:i.accountId,symbol:i.symbol,side:i.side,quantity:i.quantity,...(i.limitPrice===undefined?{}:{limitPrice:i.limitPrice})};const prev=this.rows.find(r=>r.requestId===i.requestId);
    if(prev){if(fingerprint(prev)!==fingerprint(i))throw Error('IDEMPOTENCY_CONFLICT');return structuredClone(prev);}
    if(this.rows.some(r=>r.accountId===i.accountId&&['SUBMITTING','UNKNOWN'].includes(r.status)))throw Error('RECONCILIATION_REQUIRED');
    const r:Record={...i,clientOrderId:clientId(i),status:'SUBMITTING'};this.rows.push(r);
    try{this.persist();}catch(e){this.closed=true;throw e;}
    try{this.apply(r,await this.adapter.submit(structuredClone(i),r.clientOrderId));}
    catch{r.status='UNKNOWN';try{this.persist();}catch(e){this.closed=true;throw e;}}
    return structuredClone(r);
  }
  async reconcile(id:string){
    this.open();const r=this.rows.find(r=>r.requestId===id);if(!r)throw Error('ORDER_NOT_FOUND');
    if(r.status==='SUBMITTING')throw Error('SUBMISSION_IN_PROGRESS');
    this.inFlight++;
    try{const e=await this.adapter.query(structuredClone(r),r.clientOrderId);if(e)this.apply(r,e);return structuredClone(r);}
    finally{this.inFlight--;}
  }
  close(){if(this.inFlight>0)throw Error('RECONCILIATION_IN_PROGRESS');if(this.rows.some(r=>r.status==='SUBMITTING'))throw Error('SUBMISSION_IN_PROGRESS');fs.closeSync(this.fd);fs.unlinkSync(this.file+'.lock');this.closed=true;}
}
