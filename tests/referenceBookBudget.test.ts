import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ReferenceBookBudget} from '../src/server/referenceBookBudget';
import {TestnetReferenceStream} from '../src/server/testnetReferenceStream';
import {createBinanceTestnetAdapter} from '../src/server/binanceTestnetAdapter';
test('cold start uses 1000 ms and later reserve uses the slowest retained read plus 250 ms',()=>{
 const budget=new ReferenceBookBudget();assert.equal(budget.reserveMs(),1000);
 budget.record(309.25);assert.equal(budget.reserveMs(),560);
 budget.record(520.23);assert.equal(budget.reserveMs(),771);
 budget.record(100);assert.equal(budget.reserveMs(),771);
 assert.equal(budget.diagnostics().sampleCount,3);
});
test('estimate retains eight observations and rejects malformed measurements',()=>{
 const budget=new ReferenceBookBudget();budget.record(1200);
 for(let i=0;i<7;i++)budget.record(300);
 assert.equal(budget.reserveMs(),1450);budget.record(300);assert.equal(budget.reserveMs(),550);
 for(const value of [NaN,Infinity,-1,Number.MAX_VALUE])budget.record(value);
 assert.equal(budget.diagnostics().sampleCount,8);assert.equal(budget.reserveMs(),550);
});
test('reserve remains within 500 to 1999 ms even with very short or long reads',()=>{
 const fast=new ReferenceBookBudget();fast.record(0);assert.equal(fast.reserveMs(),500);
 const slow=new ReferenceBookBudget();slow.record(4000);assert.equal(slow.reserveMs(),1999);
});
test('measured preparation can accept 1057 ms age while final snapshot still rejects over 2000 ms',async()=>{
 let now=3000;class Socket extends EventTarget{close(){}}
 const socket=new Socket(),feed=new TestnetReferenceStream('BTCUSDT',()=>now,()=>socket);
 try{
  socket.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({e:'referencePrice',s:'BTCUSDT',r:'100',t:1943})}));
  const budget=new ReferenceBookBudget();budget.record(309.25);
  assert.equal((await feed.readForBook('BTCUSDT',budget.reserveMs())).timestamp,1943);
  now=3944;assert.throws(()=>feed.snapshot('BTCUSDT'),/STALE_REFERENCE_PRICE/);
  for(const reserve of [0,2000,NaN,1.5])await assert.rejects(feed.readForBook('BTCUSDT',reserve),/CONFIGURATION_INVALID/);
 }finally{feed.close();}
});
test('adapter reports exactly one book duration before snapshot without adding requests',async()=>{
 const durations:number[]=[],paths:string[]=[];
 const reference={kind:'REFERENCE_PRICE' as const,price:'100',timestamp:9900,observedAt:10000};
 const adapter=createBinanceTestnetAdapter({apiKey:'fixtureKey',secretKey:'fixtureSecret',now:()=>10000,
  referenceReader:async()=>reference,referenceSnapshot:()=>{assert.equal(durations.length,1);return reference;},
  onBookRead:ms=>durations.push(ms),fetcher:async url=>{
   const p=new URL(String(url)).pathname;paths.push(p);
   return new Response(JSON.stringify(p.endsWith('exchangeInfo')?{symbols:[{symbol:'BTCUSDT',baseAsset:'BTC',quoteAsset:'USDT',
    status:'TRADING',isSpotTradingAllowed:true,orderTypes:['LIMIT'],filters:[{filterType:'PERCENT_PRICE',avgPriceMins:5}]}],exchangeFilters:[]}:
    {symbol:'BTCUSDT',bidPrice:'100',askPrice:'101',bidQty:'1',askQty:'1'}));
  }});
 await adapter.tradeContext('BTCUSDT');
 assert.deepEqual(paths,['/api/v3/exchangeInfo','/api/v3/ticker/bookTicker']);
 assert.equal(durations.length,1);assert.ok(Number.isFinite(durations[0])&&durations[0]>=0);
});
