import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validateTrade, limitNotional, assertPolicy } from '../src/server/tradingRules';
import { FundedExecution, type AccountAdapter } from '../src/server/fundedExecution';
import { rulesFixture, policyFixture } from './fixtures/trading';
import type { Intent, Confirmation } from '../src/server/orderExecution';
import type { AccountSnapshot } from '../src/server/accountSnapshot';
const intent:Intent={requestId:'request_0001',accountId:'testnet_fixture',symbol:'BTCUSDT',side:'BUY',quantity:'2',limitPrice:'100'};
const account=():AccountSnapshot=>({environment:'BINANCE_TESTNET',accountId:intent.accountId,startedAt:1000,observedAt:1001,canTrade:true,balances:[{asset:'BTC',free:'10',locked:'1'},{asset:'USDT',free:'1000',locked:'0'}],openOrders:[]});
const run=(i=intent,c=rulesFixture(),a=account(),p=policyFixture(),now=1002)=>validateTrade(i,c,a,p,now);
test('valid bounded order respects tick, lot and exact notional; tiny costs round reservation up',()=>{
 assert.equal(run().maximumBuyPrincipal,'200');assert.equal(limitNotional({...intent,quantity:'0.000000000000000001',limitPrice:'0.1'}),'0.000000000000000001');
});
test('missing policy, halt, allowlist and missing price stop validation',()=>{
 assert.throws(()=>assertPolicy(undefined),/POLICY_REQUIRED/);const p=policyFixture();p.halted=true;assert.throws(()=>run(intent,rulesFixture(),account(),p),/HALTED/);p.halted=false;p.symbols={};assert.throws(()=>run(intent,rulesFixture(),account(),p),/NOT_ALLOWED/);assert.throws(()=>run({...intent,limitPrice:undefined}),/BOUNDED_LIMIT/);
});
test('halted/non-spot/delisted pair, crossed or empty quote and stale evidence are rejected',()=>{
 for(const c of [{...rulesFixture(),status:'BREAK'},{...rulesFixture(),spotAllowed:false},{...rulesFixture(),orderTypes:['MARKET']}])assert.throws(()=>run(intent,c),/NOT_TRADABLE/);
 const c=rulesFixture();c.quote.bid='101';assert.throws(()=>run(intent,c),/BOOK_QUOTE/);c.quote.bid='100';c.quote.askQty='0';assert.throws(()=>run(intent,c),/BOOK_QUOTE/);assert.throws(()=>run(intent,rulesFixture(),account(),policyFixture(),4002),/STALE_TRADE/);
});
test('quantity step and min/max constraints reject rather than changing order size',()=>{
 const p=policyFixture();p.symbols.BTCUSDT={maxOrderNotional:'1000000',maxBasePosition:'10000'};for(const q of ['0.0001','2.0001','101'])assert.throws(()=>run({...intent,quantity:q},rulesFixture(),account(),p),/LOT_SIZE/);assert.equal(intent.quantity,'2');
});
test('price tick and disabled PRICE_FILTER elements are checked correctly',()=>{
 const c=rulesFixture();c.quote.ask='100.001';assert.throws(()=>run({...intent,limitPrice:'100.001'},c),/PRICE_FILTER/);
 c.quote.ask='100';c.filters[0]={filterType:'PRICE_FILTER',minPrice:'0',maxPrice:'0',tickSize:'0'};assert.doesNotThrow(()=>run(intent,c));
});
test('notional boundaries use exact multiplication, never truncated float rounding',()=>{
 const c=rulesFixture();c.filters[1]={filterType:'LOT_SIZE',minQty:'0',maxQty:'100',stepSize:'0'};c.filters[2]={filterType:'NOTIONAL',minNotional:'200',maxNotional:'201'};
 assert.doesNotThrow(()=>run(intent,c));assert.throws(()=>run({...intent,quantity:'1.999999999999999999'},c),/NOTIONAL/);assert.throws(()=>run({...intent,quantity:'2.010000000000000001'},c),/NOTIONAL/);
});
test('wide spread, nonmarketable prices and excess buy/sell slippage are rejected',()=>{
 const c=rulesFixture();c.quote.ask='102';assert.throws(()=>run({...intent,limitPrice:'102'},c),/SPREAD/);
 assert.throws(()=>run({...intent,limitPrice:'99'}),/NOT_MARKETABLE/);assert.throws(()=>run({...intent,limitPrice:'101.01'}),/SLIPPAGE/);
 assert.throws(()=>run({...intent,side:'SELL',limitPrice:'101'}),/NOT_MARKETABLE/);assert.throws(()=>run({...intent,side:'SELL',limitPrice:'98.99'}),/SLIPPAGE/);assert.doesNotThrow(()=>run({...intent,side:'SELL',limitPrice:'99'}));
});
test('order notional and holdings including locked units and pending buys respect limits',()=>{
 const p=policyFixture();p.symbols.BTCUSDT.maxOrderNotional='199.999999999999999999';assert.throws(()=>run(intent,rulesFixture(),account(),p),/ORDER_NOTIONAL/);p.symbols.BTCUSDT.maxOrderNotional='10000';p.symbols.BTCUSDT.maxBasePosition='12.9';assert.throws(()=>run(intent,rulesFixture(),account(),p),/BASE_POSITION/);
 p.symbols.BTCUSDT.maxBasePosition='13';const a=account();a.openOrders.push({clientOrderId:'other',orderId:'9',symbol:'BTCUSDT',side:'BUY',status:'PARTIALLY_FILLED',quantity:'1',executedQty:'0.5'});assert.throws(()=>run(intent,rulesFixture(),a,p),/BASE_POSITION/);
});
test('reducing sell is not blocked solely because existing position exceeds buy ceiling',()=>{
 const p=policyFixture();p.symbols.BTCUSDT.maxBasePosition='1';assert.doesNotThrow(()=>run({...intent,side:'SELL'},rulesFixture(),account(),p));
});
test('unknown filter and exchange-reference filters fail closed; duplicate/missing rules are rejected',()=>{
 for(const f of [{filterType:'NEW_UNKNOWN_FILTER'},{filterType:'PERCENT_PRICE',multiplierUp:'1.3',multiplierDown:'0.7',avgPriceMins:5}]){const c=rulesFixture();c.filters.push(f);assert.throws(()=>run(intent,c),/UNSUPPORTED|REFERENCE/);}
 const c=rulesFixture();c.filters.push(c.filters[0]);assert.throws(()=>run(intent,c),/INVALID_SYMBOL_FILTER/);c.filters=[];assert.throws(()=>run(intent,c),/REQUIRED_SYMBOL_FILTER/);
});
test('global/symbol order counts and exchange position caps are enforced',()=>{
 const c=rulesFixture();c.exchangeFilters=[{filterType:'EXCHANGE_MAX_NUM_ORDERS',maxNumOrders:0}];assert.throws(()=>run(intent,c),/ORDER_COUNT/);c.exchangeFilters=[];c.filters.push({filterType:'MAX_NUM_ORDERS',maxNumOrders:0});assert.throws(()=>run(intent,c),/ORDER_COUNT/);c.filters.pop();c.filters.push({filterType:'MAX_POSITION',maxPosition:'12'});assert.throws(()=>run(intent,c),/EXCHANGE_POSITION/);
});
test('wrong/future market context and unsupported other-symbol pending exposure block buys',()=>{
 const c=rulesFixture();c.symbol='ETHUSDT';assert.throws(()=>run(intent,c),/CONTEXT/);c.symbol='BTCUSDT';c.quote.observedAt=2000;assert.throws(()=>run(intent,c),/STALE/);
 const a=account();a.openOrders.push({clientOrderId:'other',orderId:'9',symbol:'ETHUSDT',side:'BUY',status:'NEW',quantity:'1',executedQty:'0'});assert.throws(()=>run(intent,rulesFixture(),a),/EXPOSURE/);
});
async function serviceTest(callback:(s:{engine:FundedExecution;posts:()=>number;adapter:AccountAdapter})=>Promise<void>,policy=policyFixture()){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'aq-risk-'));let posts=0;
 const adapter:AccountAdapter={accountSnapshot:async()=>account(),tradeContext:async()=>rulesFixture(),submit:async(i,id)=>{posts++;return {clientOrderId:id,symbol:i.symbol,side:i.side,status:'NEW',orderId:'123',executedQty:'0',quoteQty:'0',updateTime:1002};},query:async()=>null};
 const engine=new FundedExecution(path.join(dir,'orders'),path.join(dir,'capital'),intent.accountId,adapter,()=>1002,policy);
 try{await engine.refresh();await callback({engine,posts:()=>posts,adapter});}finally{engine.close();fs.rmSync(dir,{recursive:true,force:true});}
}
const funding={baseAsset:'BTC',quoteAsset:'USDT',buyQuoteBudget:'200',feeDebits:[{asset:'USDT',amount:'1'}]};
test('preflight failure creates no reservation and sends nothing; a refreshed retry can succeed',async()=>{
 await serviceTest(async s=>{await assert.rejects(s.engine.submit({...intent,quantity:'2.0001'},funding),/LOT_SIZE/);assert.equal(s.posts(),0);await s.engine.refresh();await s.engine.submit(intent,funding);assert.equal(s.posts(),1);});
});
test('funding below bounded buy principal and unsupported provider rules cannot submit',async()=>{
 await serviceTest(async s=>{await assert.rejects(s.engine.submit(intent,{...funding,buyQuoteBudget:'199.99'}),/BELOW_LIMIT/);assert.equal(s.posts(),0);await s.engine.refresh();s.adapter.tradeContext=async()=>{const c=rulesFixture();c.filters.push({filterType:'PERCENT_PRICE'});return c;};await assert.rejects(s.engine.submit(intent,funding),/REFERENCE/);assert.equal(s.posts(),0);});
});
test('idempotency includes limit price and cannot be changed on replay',async()=>{
 await serviceTest(async s=>{await s.engine.submit(intent,funding);await assert.rejects(s.engine.submit({...intent,limitPrice:'100.01'},funding),/CONFLICT/);assert.equal(s.posts(),1);});
});
test('async preflight cannot change intent or reservations via caller mutation',async()=>{
 await serviceTest(async s=>{
  let release!:()=>void;const wait=new Promise<void>(r=>release=r);
  s.adapter.tradeContext=async()=>{await wait;return rulesFixture();};
  // The service captures adapter.submit at construction; inspect persisted intent instead.
  const mutable={...intent},mutablePlan=structuredClone(funding);const sending=s.engine.submit(mutable,mutablePlan);
  mutable.quantity='3';mutable.limitPrice='100.5';mutablePlan.buyQuoteBudget='1';release();
  const result=await sending;assert.equal(result.quantity,'2');assert.equal(result.limitPrice,'100');assert.equal(s.posts(),1);
 });
});
test('halt toggled during price lookup prevents submission before reservation',async()=>{
 const policy=policyFixture();await serviceTest(async s=>{s.adapter.tradeContext=async()=>{policy.halted=true;return rulesFixture();};await assert.rejects(s.engine.submit(intent,funding),/HALTED/);assert.equal(s.posts(),0);},policy);
});
test('configured open-order ceiling and missing holdings stop new risk',()=>{
 const a=account();a.openOrders.push({clientOrderId:'other',orderId:'9',symbol:'BTCUSDT',side:'SELL',status:'NEW',quantity:'1',executedQty:'0'});const p=policyFixture();p.maxOpenOrders=1;assert.throws(()=>run(intent,rulesFixture(),a,p),/OPEN_ORDER/);a.openOrders=[];a.balances=a.balances.filter(b=>b.asset!=='BTC');assert.throws(()=>run(intent,rulesFixture(),a),/POSITION_UNAVAILABLE/);
});
