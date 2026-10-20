import { rulesFixture, policyFixture, dailyEvidenceFixture } from './fixtures/trading';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CapitalLedger } from '../src/server/capitalLedger';
import { FundedExecution, type AccountAdapter, type FundingPlan } from '../src/server/fundedExecution';
import { accountDiscrepancies, type AccountSnapshot } from '../src/server/accountSnapshot';
import { settleTrades } from '../src/server/tradeSettlement';
import type { Intent, Confirmation } from '../src/server/orderExecution';
const accountId='testnet_fixture';
const intent:Intent={requestId:'request_0001',accountId,symbol:'BTCUSDT',side:'BUY',quantity:'2',limitPrice:'100'};
const plan:FundingPlan={baseAsset:'BTC',quoteAsset:'USDT',buyQuoteBudget:'200',feeDebits:[{asset:'USDT',amount:'1'}]};
const snapshot=(patch:Partial<AccountSnapshot>={}):AccountSnapshot=>({environment:'BINANCE_TESTNET',accountId,startedAt:1000,observedAt:1001,canTrade:true,balances:[{asset:'USDT',free:'1000',locked:'0'},{asset:'BTC',free:'10',locked:'0'}],openOrders:[],...patch});
const confirmation=(i:Intent,id:string,patch:Partial<Confirmation>={}):Confirmation=>{
 const c:Confirmation={clientOrderId:id,symbol:i.symbol,side:i.side,status:'FILLED',orderId:'123',executedQty:i.quantity,quoteQty:'200',updateTime:1002,...patch};
 c.settlement=settleTrades(c,c.executedQty==='0'?[]:[{tradeId:'1',orderId:c.orderId,symbol:c.symbol,side:c.side,quantity:c.executedQty,quoteQuantity:c.quoteQty,commission:'0.1',commissionAsset:'USDT'}]);return c;
};
function ledger(now=()=>1002){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'aq-capital-'));return {dir,file:path.join(dir,'capital'),book:new CapitalLedger(path.join(dir,'capital'),accountId,now)};}
function cleanup(s:ReturnType<typeof ledger>){s.book.close();fs.rmSync(s.dir,{recursive:true,force:true});}
test('free excludes locked; local holds use exact decimals and prevent double allocation',()=>{
 const s=ledger();try{s.book.reconcile(snapshot({balances:[{asset:'USDT',free:'100',locked:'50'}]}),[]);assert.equal(s.book.available('USDT'),'100');s.book.reserve(intent,[{asset:'USDT',amount:'60.000000000000000001'}]);assert.equal(s.book.available('USDT'),'39.999999999999999999');assert.throws(()=>s.book.reserve({...intent,requestId:'request_0002'},[{asset:'USDT',amount:'40'}]),/INSUFFICIENT/);assert.equal(fs.statSync(s.file).mode&0o777,0o600);}finally{cleanup(s);}
});
test('restart never trusts old balances and retained orphan hold blocks readiness',()=>{
 const s=ledger();try{s.book.reconcile(snapshot(),[]);s.book.reserve(intent,[{asset:'USDT',amount:'200'}]);s.book.close();s.book=new CapitalLedger(s.file,accountId,()=>1002);assert.throws(()=>s.book.available('USDT'),/FRESH_ACCOUNT/);const result=s.book.reconcile(snapshot(),[]);assert.equal(result.ready,false);assert.match(result.problems[0],/RESERVATION_ORDER/);assert.throws(()=>s.book.reserve({...intent,requestId:'request_0002'},[{asset:'USDT',amount:'1'}]),/FRESH_ACCOUNT/);}finally{cleanup(s);}
});
test('future/mismatched/invalid snapshots revoke readiness',()=>{
 const s=ledger();try{for(const patch of [{startedAt:2000,observedAt:2000},{accountId:'wrong'},{environment:'PRODUCTION' as any},{balances:[{asset:'USDT',free:'-1',locked:'0'}]},{balances:[{asset:'USDT',free:'1',locked:'0'},{asset:'USDT',free:'2',locked:'0'}]}]){
  s.book.reconcile(snapshot(),[]);
  assert.throws(()=>s.book.reconcile(snapshot(patch),[]));assert.throws(()=>s.book.available('USDT'),/FRESH_ACCOUNT/);
 }}finally{cleanup(s);}
});
test('freshness expiry blocks funding even though persisted/previous balances exist',()=>{
 let now=1002;const s=ledger(()=>now);try{s.book.reconcile(snapshot(),[]);now=31001;assert.throws(()=>s.book.reserve(intent,[{asset:'USDT',amount:'1'}]),/STALE/);now=12000;assert.throws(()=>s.book.reconcile(snapshot({startedAt:1000,observedAt:12000}),[]),/STALE/);}finally{cleanup(s);}
});
test('missing asset, invalid debit, changed request and wrong account cannot reserve',()=>{
 const s=ledger();try{s.book.reconcile(snapshot(),[]);assert.throws(()=>s.book.reserve(intent,[{asset:'BNB',amount:'1'}]),/UNAVAILABLE/);assert.throws(()=>s.book.reserve(intent,[{asset:'USDT',amount:'0'}]),/INVALID/);assert.throws(()=>s.book.reserve({...intent,accountId:'wrong'},[{asset:'USDT',amount:'1'}]),/ACCOUNT/);s.book.reserve(intent,[{asset:'USDT',amount:'100'}]);s.book.reserve(intent,[{asset:'USDT',amount:'100'}]);assert.equal(s.book.available('USDT'),'900');assert.throws(()=>s.book.reserve(intent,[{asset:'USDT',amount:'101'}]),/CONFLICT/);}finally{cleanup(s);}
});
test('external/manual open order and unknown local order block readiness',()=>{
 const s=ledger();try{const open={clientOrderId:'manual',orderId:'999',symbol:'ETHUSDT',side:'BUY' as const,status:'NEW',quantity:'1',executedQty:'0'};
 const result=s.book.reconcile(snapshot({openOrders:[open]}),[]);assert.equal(result.ready,false);assert.match(result.problems[0],/EXTERNAL/);
 const problems=accountDiscrepancies(snapshot(),[{...intent,clientOrderId:'aq_unknown',status:'UNKNOWN'}]);assert.match(problems[0],/UNRESOLVED/);
 }finally{cleanup(s);}
});
function funded(overrides:Partial<AccountAdapter>={},now=()=>1002){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'aq-funded-'));let latest:Confirmation|undefined,calls=0;
 const adapter:AccountAdapter={dailyRiskEvidence:async snapshot=>dailyEvidenceFixture(snapshot),tradeContext:async()=>rulesFixture(),submit:async(i,id)=>{calls++;latest=confirmation(i,id);return latest;},query:async()=>latest??null,accountSnapshot:async()=>snapshot(),...overrides};
 const create=()=>new FundedExecution(path.join(dir,'orders'),path.join(dir,'capital'),accountId,adapter,now,policyFixture());
 return {dir,adapter,engine:create(),create,calls:()=>calls};
}
function cleanFunded(s:ReturnType<typeof funded>){s.engine.close();fs.rmSync(s.dir,{recursive:true,force:true});}
test('funded engine requires refresh, reserves before sending, invalidates balance after submit',async()=>{
 const s=funded();try{await assert.rejects(s.engine.submit(intent,plan),/FRESH_ACCOUNT/);assert.equal(s.calls(),0);assert.equal((await s.engine.refresh()).ready,true);await s.engine.submit(intent,plan);assert.equal(s.calls(),1);assert.throws(()=>s.engine.available('USDT'),/FRESH_ACCOUNT/);await s.engine.submit(intent,plan);assert.equal(s.calls(),1);}finally{cleanFunded(s);}
});
test('capital and fee budget must both fit; sell reserves actual base units',async()=>{
 const s=funded();try{await s.engine.refresh();await assert.rejects(s.engine.submit(intent,{...plan,buyQuoteBudget:'1000'}),/INSUFFICIENT/);await s.engine.refresh();await assert.rejects(s.engine.submit(intent,{...plan,feeDebits:[{asset:'BNB',amount:'0.1'}]}),/UNAVAILABLE/);assert.equal(s.calls(),0);await s.engine.refresh();await s.engine.submit({...intent,side:'SELL'},plan);assert.equal(s.calls(),1);}finally{cleanFunded(s);}
});
test('fresh exchange snapshot settles spent holds without double subtraction after restart',async()=>{
 const s=funded({accountSnapshot:async()=>snapshot({balances:[{asset:'USDT',free:'799.9',locked:'0'},{asset:'BTC',free:'12',locked:'0'}]})});try{await s.engine.refresh();await s.engine.submit(intent,plan);s.engine.close();s.engine=s.create();assert.throws(()=>s.engine.available('USDT'),/FRESH_ACCOUNT/);assert.equal((await s.engine.refresh()).ready,true);assert.equal(s.engine.available('USDT'),'799.9');assert.equal(s.calls(),1);}finally{cleanFunded(s);}
});
test('unknown send, missing remote order and account read failure never release fresh funding',async()=>{
 const s=funded({submit:async()=>{throw Error('timeout');},query:async()=>null});try{await s.engine.refresh();await s.engine.submit(intent,plan);await assert.rejects(s.engine.refresh(),/NOT_FOUND/);await assert.rejects(s.engine.submit({...intent,requestId:'request_0002'},plan),/FRESH_ACCOUNT/);assert.equal(s.calls(),0);}finally{cleanFunded(s);}
 const other=funded();try{await other.engine.refresh();other.adapter.accountSnapshot=async()=>{throw Error('offline');};await assert.rejects(other.engine.refresh(),/offline/);await assert.rejects(other.engine.submit(intent,plan),/FRESH_ACCOUNT/);}finally{cleanFunded(other);}
});
test('concurrent funded calls cannot race budget or close while sending',async()=>{
 let release!:()=>void;const wait=new Promise<void>(r=>release=r);const s=funded({submit:async(i,id)=>{await wait;return confirmation(i,id);}});try{await s.engine.refresh();const sending=s.engine.submit(intent,plan);await assert.rejects(s.engine.submit({...intent,requestId:'request_0002'},plan),/BUSY/);assert.throws(()=>s.engine.close(),/BUSY/);release();await sending;}finally{cleanFunded(s);}
});
test('changed funding plan/symbol pair cannot replay an existing request',async()=>{
 const s=funded();try{await s.engine.refresh();await s.engine.submit(intent,plan);await assert.rejects(s.engine.submit(intent,{...plan,buyQuoteBudget:'201'}),/CONFLICT/);await assert.rejects(s.engine.submit(intent,{...plan,baseAsset:'ETH'}),/FUNDING_PLAN/);assert.equal(s.calls(),1);}finally{cleanFunded(s);}
});
test('disabled exchange trading permission revokes readiness and keeps holds',()=>{
 const s=ledger();try{s.book.reconcile(snapshot(),[]);assert.equal(s.book.reconcile(snapshot({canTrade:false}),[]).ready,false);assert.throws(()=>s.book.reserve(intent,[{asset:'USDT',amount:'1'}]),/FRESH_ACCOUNT/);}finally{cleanup(s);}
});
test('fresh matching open order uses exchange free, not free minus already locked order again',async()=>{
 let latest:Confirmation|undefined;const s=funded({submit:async(i,id)=>{latest=confirmation(i,id,{status:'NEW',executedQty:'0',quoteQty:'0'});return latest;},query:async()=>latest??null,accountSnapshot:async()=>latest?snapshot({balances:[{asset:'USDT',free:'800',locked:'200'}],openOrders:[{clientOrderId:latest.clientOrderId,orderId:latest.orderId,symbol:'BTCUSDT',side:'BUY',status:'NEW',quantity:'2',executedQty:'0'}]}):snapshot()});
 try{await s.engine.refresh();await s.engine.submit(intent,plan);assert.equal((await s.engine.refresh()).ready,true);assert.equal(s.engine.available('USDT'),'800');}finally{cleanFunded(s);}
});
test('open-order mismatches, missing active order and terminal-still-open are discrepancies',()=>{
 const c=confirmation(intent,'aq_example',{status:'NEW',executedQty:'0',quoteQty:'0'});const row={...intent,clientOrderId:c.clientOrderId,status:c.status,confirmation:c};
 assert.match(accountDiscrepancies(snapshot(),[row])[0],/NOT_OPEN/);
 const open={clientOrderId:c.clientOrderId,orderId:'999',symbol:'BTCUSDT',side:'BUY' as const,status:'NEW',quantity:'2',executedQty:'0'};assert.ok(accountDiscrepancies(snapshot({openOrders:[open]}),[row]).some(p=>p.startsWith('OPEN_ORDER_MISMATCH')));
 assert.ok(accountDiscrepancies(snapshot({openOrders:[open]}),[{...row,status:'FILLED',confirmation:confirmation(intent,c.clientOrderId)}]).some(p=>p.startsWith('TERMINAL_ORDER_STILL_OPEN')));
});
test('orphan reservation between journal writes cannot be resumed into a new submission',async()=>{
 const s=funded();s.engine.close();const book=new CapitalLedger(path.join(s.dir,'capital'),accountId,()=>1002);book.reconcile(snapshot(),[]);book.reserve(intent,[{asset:'USDT',amount:'201'}]);book.close();s.engine=s.create();
 try{assert.equal((await s.engine.refresh()).ready,false);await assert.rejects(s.engine.submit(intent,plan),/REVIEW_REQUIRED/);assert.equal(s.calls(),0);}finally{cleanFunded(s);}
});
test('capital journal writer lock and corrupt file are rejected',()=>{
 const s=ledger();try{assert.throws(()=>new CapitalLedger(s.file,accountId),/EEXIST/);s.book.close();fs.writeFileSync(s.file,'invalid');assert.throws(()=>new CapitalLedger(s.file,accountId));fs.unlinkSync(s.file);s.book=new CapitalLedger(s.file,accountId);}finally{cleanup(s);}
});
test('capital persistence failure stops before network submission',async()=>{
 const s=funded();try{await s.engine.refresh();fs.unlinkSync(path.join(s.dir,'capital'));fs.mkdirSync(path.join(s.dir,'capital'));await assert.rejects(s.engine.submit(intent,plan));assert.equal(s.calls(),0);await assert.rejects(s.engine.submit({...intent,requestId:'request_0002'},plan),/CLOSED/);}finally{cleanFunded(s);}
});
