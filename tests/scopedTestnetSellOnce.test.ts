import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {ScopedTestnetJournal} from '../src/server/scopedTestnetJournal';
import {runScopedTestnetSellOnce} from '../src/server/scopedTestnetSellOnce';
import {planScopedTestnetSell} from '../src/server/scopedTestnetSellPlan';
import {settleTrades} from '../src/server/tradeSettlement';
import {normalizeCommission} from '../src/server/commissionRates';
import {rulesFixture} from './fixtures/trading';
import type {AccountSnapshot} from '../src/server/accountSnapshot';
import type {Intent,Confirmation} from '../src/server/orderExecution';
const accountId='testnet_'+'a'.repeat(24),zero={maker:'0',taker:'0',buyer:'0',seller:'0'};
function fixture(mode='normal'){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'aq-sell-')),file=path.join(dir,'scope.sqlite');let sold=false,posts=0;
 const snapshot=():AccountSnapshot=>({environment:'BINANCE_TESTNET',accountId,startedAt:1000,observedAt:1001,canTrade:true,openOrders:[],balances:[{asset:'BTC',free:sold?'10':'10.2',locked:'0'},{asset:'USDT',free:sold?'1000':'980',locked:'0'}]});
 const commission=normalizeCommission({symbol:'BTCUSDT',standardCommission:zero,specialCommission:zero,taxCommission:zero,discount:{enabledForAccount:false,enabledForSymbol:false,discountAsset:null,discount:'0'}},accountId,'BTCUSDT',1000,1001);
 let j=new ScopedTestnetJournal(file,accountId,()=>1002);
 j.initialize({...snapshot(),balances:[{asset:'BTC',free:'10',locked:'0'},{asset:'USDT',free:'1000',locked:'0'}]});
 function fill(i:Intent,id:string,orderId:string):Confirmation{
 const c:Confirmation={symbol:'BTCUSDT',side:i.side,clientOrderId:id,orderId,status:'FILLED',executedQty:i.quantity,quoteQty:'20',updateTime:1002};
 c.settlement=settleTrades(c,[{tradeId:orderId,orderId,symbol:c.symbol,side:c.side,quantity:i.quantity,quoteQuantity:'20',commission:'0',commissionAsset:'USDT'}]);return c;
 }
 const buy=j.prepareFirstBuy({requestId:'sandbox_first_buy_v1',accountId,symbol:'BTCUSDT',side:'BUY',quantity:'0.2',limitPrice:'100'},'0');j.confirm(buy.entry.intent.requestId,fill(buy.entry.intent,buy.entry.clientOrderId,'1'));
 let saved:Confirmation|null=null;
 const reader={accountSnapshot:async()=>snapshot(),tradeContext:async()=>rulesFixture(),commissionRates:async()=>commission,query:async()=>mode==='missing'?null:saved,submit:async(i:Intent,id:string)=>{
  posts++;assert.equal(i.side,'SELL');assert.equal(i.quantity,'0.2');
  const observer=new ScopedTestnetJournal(file,accountId,()=>1002);try{assert.ok(observer.find('sandbox_first_sell_v1')?.sendAttemptAt);}finally{observer.close();}
  if(mode==='missing')throw Error('transport');sold=true;saved=fill(i,id,'2');if(mode==='lost')throw Error('lost');return saved;
 }};
 return {get j(){return j;},file,reader,commission,snapshot,posts:()=>posts,reopen(){j.close();j=new ScopedTestnetJournal(file,accountId,()=>1002);},close(){j.close();fs.rmSync(dir,{recursive:true,force:true});}};
}
test('sell closes only owned BTC; durable claim and restart prevent any second send',async()=>{for(const mode of ['normal','lost','missing']){const f=fixture(mode);try{
 const r=await runScopedTestnetSellOnce(f.j,f.reader,()=>1002);assert.equal(f.posts(),1);assert.equal(r.state,mode==='missing'?'RECONCILIATION_REQUIRED':'CONFIRMED');if(mode!=='missing'){assert.equal(r.positionClosed,true);assert.equal(r.realizedResultUSDT,'0');assert.equal(r.capitalAudit?.ownedBTC,'0');assert.equal(r.capitalAudit?.allocatedCashUSDT,'100');}
 f.reopen();const again=await runScopedTestnetSellOnce(f.j,f.reader,()=>1002);assert.equal(again.testnetOrderAttemptedThisRun,false);assert.equal(f.posts(),1);
 }finally{f.close();}}});
test('sell blocks changed native balances, halt, nonzero fees and stale data before send',async()=>{for(const mode of ['balance','halt','fee','stale']){const f=fixture();try{
 if(mode==='halt')f.j.halt();if(mode==='balance'){const original=f.reader.accountSnapshot;f.reader.accountSnapshot=async()=>{const s=await original();s.balances[0].free='11';return s;};}
 if(mode==='fee')f.commission.standard.seller='0.001';
 await assert.rejects(runScopedTestnetSellOnce(f.j,f.reader,()=>mode==='stale'?5000:1002));assert.equal(f.posts(),0);assert.equal(f.j.find('sandbox_first_sell_v1'),undefined);
 }finally{f.close();}}});
test('sell sizing floors lot increments and 25 USDT cap, never borrows baseline BTC',()=>{const f=fixture();try{
 const context=rulesFixture();context.quote.bid='200';context.quote.ask='200';
 assert.equal(planScopedTestnetSell(f.snapshot(),context,f.commission,'0.2',1002).intent.quantity,'0.125');
 assert.throws(()=>planScopedTestnetSell(f.snapshot(),context,f.commission,'0.00001',1002));
 const i={requestId:'sandbox_first_sell_v1',accountId,symbol:'BTCUSDT',side:'SELL' as const,quantity:'0.21',limitPrice:'100'};assert.throws(()=>f.j.prepareFirstSell(i),/CAPITAL_UNAVAILABLE/);
 }finally{f.close();}});
test('claim failure and halt after reservation prevent sell POST; duplicate connection cannot claim',async t=>{const f=fixture();try{
 const original=f.j.prepareFirstSell.bind(f.j);t.mock.method(f.j,'prepareFirstSell',(...args:Parameters<typeof original>)=>{const r=original(...args);f.j.halt();return r;});await assert.rejects(runScopedTestnetSellOnce(f.j,f.reader,()=>1002),/HALTED/);assert.equal(f.posts(),0);
 }finally{f.close();}});

test('two database connections and restart cannot acquire a second sell send claim',()=>{const f=fixture();try{
 f.j.prepareFirstSell({requestId:'sandbox_first_sell_v1',accountId,symbol:'BTCUSDT',side:'SELL',quantity:'0.2',limitPrice:'100'});f.j.beginFirstSellSend();const other=new ScopedTestnetJournal(f.file,accountId,()=>1002);try{assert.throws(()=>other.beginFirstSellSend(),/ALREADY_CLAIMED/);}finally{other.close();}f.reopen();assert.throws(()=>f.j.beginFirstSellSend(),/ALREADY_CLAIMED/);
 }finally{f.close();}});

test('partial expired sell reports remaining BTC, never a full realized result or another attempt',async()=>{const f=fixture();try{
 const partial=(i:Intent,id:string):Confirmation=>{const c:Confirmation={symbol:'BTCUSDT',side:'SELL',clientOrderId:id,orderId:'2',status:'EXPIRED',executedQty:'0.1',quoteQty:'10',updateTime:1002};c.settlement=settleTrades(c,[{tradeId:'2',orderId:'2',symbol:'BTCUSDT',side:'SELL',quantity:'0.1',quoteQuantity:'10',commission:'0',commissionAsset:'USDT'}]);return c;};
 let count=0;const reader={...f.reader,accountSnapshot:async()=>count?{...f.snapshot(),balances:[{asset:'BTC',free:'10.1',locked:'0'},{asset:'USDT',free:'990',locked:'0'}]}:f.snapshot(),submit:async(i:Intent,id:string)=>{count++;return partial(i,id);}};
 const r=await runScopedTestnetSellOnce(f.j,reader,()=>1002);assert.equal(r.positionClosed,false);assert.equal(r.realizedResultUSDT,null);assert.equal(r.capitalAudit?.ownedBTC,'0.1');f.reopen();await runScopedTestnetSellOnce(f.j,reader,()=>1002);assert.equal(count,1);
 }finally{f.close();}});
