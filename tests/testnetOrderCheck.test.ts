import {test} from 'node:test';
import assert from 'node:assert/strict';
import {planTestnetOrderCheck,runTestnetOrderCheck} from '../src/server/testnetOrderCheck';
import {createBinanceTestnetAdapter,testnetAccountId} from '../src/server/binanceTestnetAdapter';
import {normalizeCommission} from '../src/server/commissionRates';
import {rulesFixture} from './fixtures/trading';
import type {AccountSnapshot} from '../src/server/accountSnapshot';
const key='fixtureKey123',secret='fixtureSecret123',accountId=testnetAccountId(key);
const snapshot=():AccountSnapshot=>({environment:'BINANCE_TESTNET',accountId,startedAt:1000,observedAt:1001,canTrade:true,openOrders:[],balances:[{asset:'USDT',free:'1000',locked:'0'},{asset:'BTC',free:'100',locked:'0'},{asset:'这是测试币',free:'10000',locked:'0'}]});
const commission=()=>{const rates={maker:'0.001',taker:'0.002',buyer:'0',seller:'0'};return normalizeCommission({symbol:'BTCUSDT',standardCommission:rates,specialCommission:{maker:'0',taker:'0',buyer:'0',seller:'0'},taxCommission:{maker:'0',taker:'0',buyer:'0',seller:'0'},discount:{enabledForAccount:true,enabledForSymbol:true,discountAsset:null,discount:'0.25'}},accountId,'BTCUSDT',1000,1001);};
const plan=()=>planTestnetOrderCheck(snapshot(),rulesFixture(),commission(),1002);
test('scoped proposal respects free cash and keeps actual BTC exposure without whole-account equity claims',()=>{
 const p=plan();assert.equal(p.principalUSDT,'25');assert.equal(p.intent.quantity,'0.25');assert.equal(p.undiscountedFeeEstimateUSDT,'0.05');assert.equal(p.discountApplied,false);assert.equal(p.capitalReserved,false);assert.equal(p.lossLimitEnforced,false);assert.equal(p.dailyRiskAuthorized,false);assert.equal(p.tradingEnabled,false);assert.equal(p.executionBlockers.length,3);
 const s=snapshot();s.balances[0].free='99';s.balances[0].locked='1000';assert.throws(()=>planTestnetOrderCheck(s,rulesFixture(),commission(),1002),/CAPITAL_UNAVAILABLE/);
});
test('planner rejects existing orders, exchange position limits, stale evidence and blocked account before validation POST',async()=>{
 for(const mode of ['orders','position','stale','disabled','filters']){
 let posts=0;const s=snapshot(),c=rulesFixture();if(mode==='orders')s.openOrders=[{clientOrderId:'external',orderId:'1',symbol:'BTCUSDT',side:'BUY',status:'NEW',quantity:'1',executedQty:'0'}];
 if(mode==='position')c.filters.push({filterType:'MAX_POSITION',maxPosition:'1'});if(mode==='disabled')s.canTrade=false;if(mode==='filters')c.filters.push({filterType:'UNKNOWN_NEW_FILTER'});
 await assert.rejects(runTestnetOrderCheck({accountSnapshot:async()=>s,tradeContext:async()=>c,commissionRates:async()=>commission(),validateTestOrder:async()=>{posts++;}},()=>mode==='stale'?5000:1002));assert.equal(posts,0);
 }
});
test('read/validation coordinator makes one validation call and never claims an execution',async()=>{
 let posts=0;const r=await runTestnetOrderCheck({accountSnapshot:async()=>snapshot(),tradeContext:async()=>rulesFixture(),commissionRates:async()=>commission(),validateTestOrder:async(intent)=>{posts++;assert.equal(intent.symbol,'BTCUSDT');}},()=>1002);
 assert.equal(posts,1);assert.equal(r.state,'PASS');assert.equal(r.matchingEngineOrderCreated,false);assert.equal(r.tradingEnabled,false);
});
test('adapter validation signs exactly one fixed testnet order/test POST, not an order submission',async()=>{
 let posts=0;const p=plan();const a=createBinanceTestnetAdapter({apiKey:key,secretKey:secret,now:()=>1002,fetcher:async(url,init)=>{
 posts++;assert.equal(String(url),'https://testnet.binance.vision/api/v3/order/test');assert.equal(init?.method,'POST');assert.equal(init?.redirect,'error');const body=new URLSearchParams(String(init?.body));assert.equal(body.get('symbol'),'BTCUSDT');assert.equal(body.get('type'),'LIMIT');assert.equal(body.get('timeInForce'),'IOC');assert.equal(body.get('quantity'),'0.25');assert.ok(body.get('signature'));assert.equal(body.has('computeCommissionRates'),false);return new Response('{}');
 }});await a.validateTestOrder(p.intent,p.clientOrderId);assert.equal(posts,1);
 for(const patch of [{symbol:'ETHUSDT'},{quantity:'1'},{side:'SELL'},{stopPrice:'90'}])await assert.rejects(a.validateTestOrder({...p.intent,...patch} as any,p.clientOrderId));assert.equal(posts,1);
});
test('validation errors/timeouts/malformed responses do not retry or fall back to matching engine',async()=>{
 for(const mode of ['timeout','badjson','unexpected','429']){let calls=0;const p=plan();const a=createBinanceTestnetAdapter({apiKey:key,secretKey:secret,now:()=>1002,fetcher:async url=>{calls++;assert.equal(String(url),'https://testnet.binance.vision/api/v3/order/test');if(mode==='timeout')throw Error('private data');return new Response(mode==='badjson'?'bad':mode==='unexpected'?'{"orderId":1}':'{}',{status:mode==='429'?429:200});}});await assert.rejects(a.validateTestOrder(p.intent,p.clientOrderId));assert.equal(calls,1);}
});


test('operator-observed BTCUSDT filter set supports standalone validation without relaxing price or quantity rules',()=>{
 const context=rulesFixture();context.filters=[
 {filterType:'PRICE_FILTER',minPrice:'0.01000000',maxPrice:'1000000.00000000',tickSize:'0.01000000'},
 {filterType:'LOT_SIZE',minQty:'0.00001000',maxQty:'9000.00000000',stepSize:'0.00001000'},
 {filterType:'ICEBERG_PARTS',limit:100},
 {filterType:'MARKET_LOT_SIZE',minQty:'0.00000000',maxQty:'133.97193096',stepSize:'0.00000000'},
 {filterType:'TRAILING_DELTA',minTrailingAboveDelta:10,maxTrailingAboveDelta:2000,minTrailingBelowDelta:10,maxTrailingBelowDelta:2000},
 {filterType:'PERCENT_PRICE_BY_SIDE',bidMultiplierUp:'1.2',bidMultiplierDown:'0.5',askMultiplierUp:'2',askMultiplierDown:'0.8',avgPriceMins:5},
 {filterType:'NOTIONAL',minNotional:'5.00000000',applyMinToMarket:true,maxNotional:'9000000.00000000',applyMaxToMarket:false,avgPriceMins:5},
 {filterType:'MAX_NUM_ORDERS',maxNumOrders:200},
 {filterType:'MAX_NUM_ORDER_LISTS',maxNumOrderLists:20},
 {filterType:'MAX_NUM_ALGO_ORDERS',maxNumAlgoOrders:5},
 {filterType:'MAX_NUM_ORDER_AMENDS',maxNumOrderAmends:10}];
 context.reference={kind:'REFERENCE_PRICE',price:'100',timestamp:1001,observedAt:1000};
 const p=planTestnetOrderCheck(snapshot(),context,commission(),1002);assert.equal(p.principalUSDT,'25');assert.equal(p.tradingEnabled,false);
 context.filters.find(f=>f.filterType==='NOTIONAL')!.minNotional='26';assert.throws(()=>planTestnetOrderCheck(snapshot(),context,commission(),1002),/NOTIONAL_REJECTED/);
});
