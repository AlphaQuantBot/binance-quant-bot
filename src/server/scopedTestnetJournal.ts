import fs from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createHash,randomUUID} from 'node:crypto';
import {units,decimal} from './exactDecimal';
import {validateAccountSnapshot,type AccountSnapshot} from './accountSnapshot';
import {validateTradeContext,type TradeContext} from './tradingRules';
import {validateSettlement} from './tradeSettlement';
import type {Intent,Confirmation} from './orderExecution';
export const scopedLimits=Object.freeze({symbol:'BTCUSDT',capitalUSDT:'100',maxOrderUSDT:'25',lossLimitUSDT:'5'});
type Entry={intent:Intent;clientOrderId:string;feeReserveUSDT:string;confirmation?:Confirmation};
type State={version:1;limits:typeof scopedLimits;accountId:string;allocationId:string;createdAt:number;baseline:{BTC:string;USDT:string};haltReasons:string[];orders:Entry[]};
const terminal=['FILLED','CANCELED','REJECTED','EXPIRED','EXPIRED_IN_MATCH'];
const statuses=['NEW','PARTIALLY_FILLED','PENDING_NEW','PENDING_CANCEL',...terminal];
const scale=10n**18n;
const pending=(e:Entry)=>!e.confirmation||!terminal.includes(e.confirmation.status);
function clientId(s:State,i:Intent){return 'aq_'+createHash('sha256').update(JSON.stringify(['SCOPED_TESTNET',s.allocationId,i])).digest('hex').slice(0,32);}
function identity(i:Intent){return JSON.stringify([i.requestId,i.accountId,i.symbol,i.side,i.quantity,i.limitPrice]);}
function checkIntent(i:Intent,accountId:string){
 if(!i||i.accountId!==accountId||i.symbol!=='BTCUSDT'||!['BUY','SELL'].includes(i.side)||typeof i.requestId!=='string'||!/^[-\w]{8,80}$/.test(i.requestId)||i.stopPrice!==undefined||!i.limitPrice||units(i.limitPrice)<=0n||units(i.quantity)<=0n||units(i.quantity)*units(i.limitPrice)>units(scopedLimits.maxOrderUSDT)*scale)throw Error('SCOPED_INVALID_INTENT');
}
function checkConfirmation(e:Entry,c:Confirmation,previous=e.confirmation){
 if(!c||c.clientOrderId!==e.clientOrderId||c.symbol!==e.intent.symbol||c.side!==e.intent.side||!statuses.includes(c.status)||typeof c.orderId!=='string'||!/^\d{1,30}$/.test(c.orderId)||!Number.isSafeInteger(c.updateTime)||c.updateTime<0)throw Error('SCOPED_CONFIRMATION_MISMATCH');
 const q=units(c.executedQty),v=units(c.quoteQty),requested=units(e.intent.quantity),limit=units(e.intent.limitPrice!);
 if(q>requested||(q===0n)!==(v===0n)||(['NEW','REJECTED','PENDING_NEW'].includes(c.status)&&q!==0n)||(c.status==='FILLED'&&q!==requested)||(c.status==='PARTIALLY_FILLED'&&(q===0n||q>=requested))||(q>0n&&(e.intent.side==='BUY'?v*scale>q*limit:v*scale<q*limit)))throw Error('SCOPED_EXECUTION_TOTALS_INVALID');
 if(q>0n&&!c.settlement)throw Error('SCOPED_FEES_UNCONFIRMED');
 if(c.settlement){validateSettlement(c,c.settlement);if(c.settlement.fees.some(f=>!['BTC','USDT'].includes(f.asset)&&units(f.amount)>0n))throw Error('SCOPED_FEE_ASSET_UNSUPPORTED');}
 if(previous){
  if(c.orderId!==previous.orderId||c.updateTime<previous.updateTime||q<units(previous.executedQty)||v<units(previous.quoteQty))throw Error('SCOPED_CONFIRMATION_REGRESSED');
  if(terminal.includes(previous.status)&&(c.status!==previous.status||q!==units(previous.executedQty)||v!==units(previous.quoteQty)))throw Error('SCOPED_TERMINAL_CHANGED');
  for(const t of previous.settlement?.trades??[]){const next=c.settlement?.trades.find(n=>n.tradeId===t.tradeId);if(!next||JSON.stringify(t)!==JSON.stringify(next))throw Error('SCOPED_SETTLED_TRADE_CHANGED');}
 }
}
function totals(s:State){
 let cash=units(scopedLimits.capitalUSDT),btc=0n,quoteDelta=0n,baseDelta=0n,heldCash=0n,heldBTC=0n;
 const trades=new Set<string>();
 for(const row of s.orders){
  const c=row.confirmation;let spent=0n;
  if(c){const q=units(c.executedQty),v=units(c.quoteQty);baseDelta+=row.intent.side==='BUY'?q:-q;quoteDelta+=row.intent.side==='BUY'?-v:v;spent=row.intent.side==='BUY'?v:0n;
   for(const trade of c.settlement?.trades??[]){const key=c.symbol+':'+trade.tradeId;if(trades.has(key))throw Error('SCOPED_DUPLICATE_TRADE');trades.add(key);}
   for(const f of c.settlement?.fees??[]){if(f.asset==='USDT'){quoteDelta-=units(f.amount);if(row.intent.side==='BUY')spent+=units(f.amount);}else if(f.asset==='BTC')baseDelta-=units(f.amount);}
  }
  if(pending(row)){
   if(row.intent.side==='BUY'){const hold=(units(row.intent.quantity)*units(row.intent.limitPrice!)+scale-1n)/scale+units(row.feeReserveUSDT);if(spent>hold)throw Error('SCOPED_RESERVATION_EXCEEDED');heldCash+=hold-spent;}
   else heldBTC+=units(row.intent.quantity)-units(c?.executedQty??'0');
  }
 }
 cash+=quoteDelta;btc+=baseDelta;
 if(cash<0n||btc<0n||heldCash>cash||heldBTC>btc)throw Error('SCOPED_CAPITAL_NEGATIVE');
 return {cash,btc,quoteDelta,baseDelta,availableCash:cash-heldCash,availableBTC:btc-heldBTC};
}
function balance(s:AccountSnapshot,asset:'BTC'|'USDT'){const b=s.balances.find(b=>b.asset===asset);if(!b)throw Error('SCOPED_BALANCE_MISSING');return units(b.free)+units(b.locked);}
/** Local experiment accounting only. No exchange submit/cancel method exists here. */
export class ScopedTestnetJournal {
 private db:DatabaseSync;private closed=false;
 constructor(file:string,private accountId:string,private now:()=>number=Date.now){
  if(!/^testnet_[a-f0-9]{24}$/.test(accountId))throw Error('SCOPED_ACCOUNT_INVALID');
  fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});
  const fd=fs.openSync(file,'a',0o600);fs.closeSync(fd);
  if(fs.lstatSync(file).isSymbolicLink()||!fs.statSync(file).isFile())throw Error('SCOPED_STORAGE_INVALID');
  this.db=new DatabaseSync(file);
  try{
   this.db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=0;');
   if((this.db.prepare('PRAGMA journal_mode').get() as any).journal_mode!=='wal'||(this.db.prepare('PRAGMA synchronous').get() as any).synchronous!==2)throw Error('SCOPED_DURABILITY_UNCONFIRMED');
   if((this.db.prepare('PRAGMA integrity_check').get() as any).integrity_check!=='ok')throw Error('SCOPED_STORAGE_INVALID');
   this.db.exec('CREATE TABLE IF NOT EXISTS scoped_state(id INTEGER PRIMARY KEY CHECK(id=1),payload TEXT NOT NULL) STRICT;');
   if(this.db.prepare('SELECT payload FROM scoped_state WHERE id=1').get())this.load();
  }catch(e){this.db.close();throw e;}
 }
 private open(){if(this.closed)throw Error('SCOPED_JOURNAL_CLOSED');}
 private load():State{
  this.open();const row=this.db.prepare('SELECT payload FROM scoped_state WHERE id=1').get() as {payload:string}|undefined;
  if(!row)throw Error('SCOPED_NOT_INITIALIZED');const s=JSON.parse(row.payload) as State;
  if(s.version!==1||JSON.stringify(s.limits)!==JSON.stringify(scopedLimits)||s.accountId!==this.accountId||typeof s.allocationId!=='string'||!/^[-\w]{36}$/.test(s.allocationId)||!Number.isSafeInteger(s.createdAt)||s.createdAt<=0||!s.baseline||!Array.isArray(s.orders)||s.orders.length>100||!Array.isArray(s.haltReasons)||s.haltReasons.some(r=>!['OPERATOR_HALT','SCOPED_BALANCE_CHANGED','SCOPED_EXTERNAL_OPEN_ORDER','SCOPED_LOSS_LIMIT_REACHED','SCOPED_ACCOUNT_TRADING_DISABLED'].includes(r)))throw Error('SCOPED_STATE_INVALID');
  units(s.baseline.BTC);units(s.baseline.USDT);const ids=new Set<string>();
  for(const e of s.orders){checkIntent(e.intent,this.accountId);units(e.feeReserveUSDT);if(ids.has(e.intent.requestId)||e.clientOrderId!==clientId(s,e.intent))throw Error('SCOPED_STATE_INVALID');ids.add(e.intent.requestId);if(e.confirmation)checkConfirmation(e,e.confirmation,undefined);}
  totals(s);return s;
 }
 private save(s:State){this.db.prepare('INSERT INTO scoped_state(id,payload) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload').run(JSON.stringify(s));}
 private transaction<T>(fn:()=>T):T{
  this.open();this.db.exec('BEGIN IMMEDIATE');try{const result=fn();this.db.exec('COMMIT');return result;}catch(e){try{this.db.exec('ROLLBACK');}catch{}throw e;}
 }
 initialize(snapshot:AccountSnapshot){
  validateAccountSnapshot(snapshot,this.accountId,this.now());
  return this.transaction(()=>{
   if(this.db.prepare('SELECT id FROM scoped_state WHERE id=1').get()){this.load();return {created:false};}
   if(!snapshot.canTrade||snapshot.openOrders.length)throw Error('SCOPED_INITIAL_ACCOUNT_BLOCKED');
   if(units(snapshot.balances.find(b=>b.asset==='USDT')?.free??'0')<units(scopedLimits.capitalUSDT))throw Error('SCOPED_CAPITAL_UNAVAILABLE');
   const state:State={version:1,limits:{...scopedLimits},accountId:this.accountId,allocationId:randomUUID(),createdAt:this.now(),baseline:{BTC:decimal(balance(snapshot,'BTC')),USDT:decimal(balance(snapshot,'USDT'))},haltReasons:[],orders:[]};this.save(state);return {created:true};
  });
 }
 prepare(intent:Intent,feeReserveUSDT:string){
  checkIntent(intent,this.accountId);units(feeReserveUSDT);
  // Normalize the durable identity before deriving the account/allocation-specific ID.
  intent={requestId:intent.requestId,accountId:intent.accountId,symbol:intent.symbol,side:intent.side,quantity:decimal(units(intent.quantity)),limitPrice:decimal(units(intent.limitPrice!))};
  return this.transaction(()=>{
   const s=this.load(),old=s.orders.find(o=>o.intent.requestId===intent.requestId);
   if(old){if(identity(old.intent)!==identity(intent)||units(old.feeReserveUSDT)!==units(feeReserveUSDT))throw Error('SCOPED_IDEMPOTENCY_CONFLICT');return {created:false,entry:structuredClone(old)};}
   if(s.haltReasons.length)throw Error('SCOPED_HALTED');if(s.orders.some(pending))throw Error('SCOPED_RECONCILIATION_REQUIRED');if(s.orders.length>=100)throw Error('SCOPED_ORDER_COUNT_LIMIT');
   const t=totals(s),principal=(units(intent.quantity)*units(intent.limitPrice!)+scale-1n)/scale;
   if(intent.side==='BUY'?principal+units(feeReserveUSDT)>t.availableCash:units(intent.quantity)>t.availableBTC)throw Error('SCOPED_CAPITAL_UNAVAILABLE');
   const entry:Entry={intent,feeReserveUSDT:decimal(units(feeReserveUSDT)),clientOrderId:clientId(s,intent)};
   s.orders.push(entry);totals(s);this.save(s);return {created:true,entry:structuredClone(entry)};
  });
 }
 confirm(requestId:string,confirmation:Confirmation){
  return this.transaction(()=>{const s=this.load(),e=s.orders.find(o=>o.intent.requestId===requestId);if(!e)throw Error('SCOPED_ORDER_NOT_FOUND');if(s.orders.some(o=>o!==e&&o.confirmation?.orderId===confirmation.orderId))throw Error('SCOPED_ORDER_ID_REUSED');checkConfirmation(e,confirmation);e.confirmation=structuredClone(confirmation);totals(s);this.save(s);});
 }
 async reconcile(query:(intent:Intent,clientId:string)=>Promise<Confirmation|null>){
  const rows=this.load().orders.filter(pending);if(rows.length>1)throw Error('SCOPED_STATE_INVALID');let confirmed=0;
  for(const row of rows){const c=await query(structuredClone(row.intent),row.clientOrderId);if(c){this.confirm(row.intent.requestId,c);confirmed++;}}
  return {queried:rows.length,confirmed,unresolved:this.load().orders.filter(pending).length};
 }
 audit(snapshot:AccountSnapshot,context:TradeContext){
  validateAccountSnapshot(snapshot,this.accountId,this.now());validateTradeContext(context,'BTCUSDT',this.now());
  if(context.baseAsset!=='BTC'||context.quoteAsset!=='USDT'||!context.spotAllowed||context.status!=='TRADING')throw Error('SCOPED_PRICE_UNCONFIRMED');
  return this.transaction(()=>{
   const s=this.load(),t=totals(s),reasons=new Set(s.haltReasons);
   if(!snapshot.canTrade)reasons.add('SCOPED_ACCOUNT_TRADING_DISABLED');
   if(balance(snapshot,'BTC')!==units(s.baseline.BTC)+t.baseDelta||balance(snapshot,'USDT')!==units(s.baseline.USDT)+t.quoteDelta)reasons.add('SCOPED_BALANCE_CHANGED');
   if(snapshot.openOrders.some(o=>!s.orders.some(e=>e.clientOrderId===o.clientOrderId)))reasons.add('SCOPED_EXTERNAL_OPEN_ORDER');
   const equity=t.cash+t.btc*units(context.quote.bid)/scale,loss=units(scopedLimits.capitalUSDT)>equity?units(scopedLimits.capitalUSDT)-equity:0n;
   if(loss>=units(scopedLimits.lossLimitUSDT))reasons.add('SCOPED_LOSS_LIMIT_REACHED');
   s.haltReasons=[...reasons];this.save(s);
   return {environment:'BINANCE_TESTNET',operation:'SCOPED_CAPITAL_AUDIT',limits:scopedLimits,allocatedCashUSDT:decimal(t.cash),ownedBTC:decimal(t.btc),availableCashUSDT:decimal(t.availableCash),scopedEquityUSDT:decimal(equity),lossUSDT:decimal(loss),halted:s.haltReasons.length>0,haltReasons:s.haltReasons,unresolvedOrders:s.orders.filter(pending).length,orderCount:s.orders.length,accountConsistent:!reasons.has('SCOPED_BALANCE_CHANGED')&&!reasons.has('SCOPED_EXTERNAL_OPEN_ORDER'),scope:'LOCAL_BTCUSDT_EXPERIMENT_ONLY',capitalTransferred:false,dailyRiskAuthorized:false,tradingEnabled:false,executionBlockers:['MATCHING_ENGINE_WORKER_NOT_ENABLED']};
  });
 }
 halt(){this.transaction(()=>{const s=this.load();if(!s.haltReasons.includes('OPERATOR_HALT'))s.haltReasons.push('OPERATOR_HALT');this.save(s);});}
 close(){if(!this.closed){this.db.close();this.closed=true;}}
}
