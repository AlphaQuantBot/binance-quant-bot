import {test} from 'node:test';
import assert from 'node:assert/strict';
import {referenceWaitWithinContext} from '../src/server/referenceBookBudget';
import {TestnetReferenceStream,ReferenceStreamTimeoutError} from '../src/server/testnetReferenceStream';
import {createBinanceTestnetAdapter} from '../src/server/binanceTestnetAdapter';
import {decisionObservationErrorCode} from '../src/server/decisionObservationErrors';
test('reference deadline subtracts elapsed metadata and book reserve and never exceeds four seconds',()=>{
 assert.equal(referenceWaitWithinContext(10000,10709,771),3520);
 assert.equal(referenceWaitWithinContext(10000,10000,500),4000);
 assert.equal(referenceWaitWithinContext(10000,14228,771),1);
});
test('exhausted context budget and invalid clocks fail before collection instead of extending limits',()=>{
 assert.throws(()=>referenceWaitWithinContext(10000,14229,771),/TRADE_CONTEXT_BUDGET_EXHAUSTED/);
 assert.throws(()=>referenceWaitWithinContext(10000,9999,771),/INVALID_CLOCK/);
 assert.throws(()=>referenceWaitWithinContext(10000,10000,NaN),/INVALID_CLOCK/);
 assert.equal(decisionObservationErrorCode(Error('TRADE_CONTEXT_BUDGET_EXHAUSTED')),'TRADE_CONTEXT_BUDGET_EXHAUSTED');
 assert.equal(decisionObservationErrorCode(Error('TRADE_CONTEXT_BUDGET_EXHAUSTED secret')),'DECISION_OBSERVATION_UNCONFIRMED');
});
test('preparation times out at the reduced deadline without accepting insufficiently fresh cache',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 class Socket extends EventTarget{close(){}}
 const socket=new Socket(),feed=new TestnetReferenceStream('BTCUSDT',()=>2500,()=>socket);
 try{
  socket.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({e:'referencePrice',s:'BTCUSDT',r:'100',t:1000})}));
  let rejected=false;
  const pending=assert.rejects(feed.readForBook('BTCUSDT',771,3520),(error:unknown)=>{
   rejected=true;assert.ok(error instanceof ReferenceStreamTimeoutError);
   assert.equal(error.streamDiagnostics.waitLimitMs,3520);assert.equal(error.streamDiagnostics.requiredMaxEventAgeMs,1229);return true;
  });
  t.mock.timers.tick(3519);await Promise.resolve();assert.equal(rejected,false);
  t.mock.timers.tick(1);await pending;
  for(const deadline of [0,4001,NaN])await assert.rejects(feed.readForBook('BTCUSDT',771,deadline),/CONFIGURATION_INVALID/);
 }finally{feed.close();}
});
test('adapter provides its original context start and exhausted preparation cannot reach book request',async()=>{
 let now=10000;const paths:string[]=[];
 const adapter=createBinanceTestnetAdapter({apiKey:'fixtureKey',secretKey:'fixtureSecret',now:()=>now,
  referenceReader:async(_symbol,startedAt)=>{
   assert.equal(startedAt,10000);referenceWaitWithinContext(startedAt!,now,771);
   throw Error('UNREACHABLE');
  },fetcher:async url=>{
   paths.push(new URL(String(url)).pathname);now=14500;
   return new Response(JSON.stringify({symbols:[{symbol:'BTCUSDT',baseAsset:'BTC',quoteAsset:'USDT',status:'TRADING',
    isSpotTradingAllowed:true,orderTypes:['LIMIT'],filters:[{filterType:'PERCENT_PRICE',avgPriceMins:5}]}],exchangeFilters:[]}));
  }});
 await assert.rejects(adapter.tradeContext('BTCUSDT'),/TRADE_CONTEXT_BUDGET_EXHAUSTED/);
 assert.deepEqual(paths,['/api/v3/exchangeInfo']);
});
