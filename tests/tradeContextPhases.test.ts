import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TradeContextFreshnessError,annotateTradeContextPhases} from '../src/server/tradeContextTiming';
import {createBinanceTestnetAdapter} from '../src/server/binanceTestnetAdapter';
test('phase annotation preserves the original ages, reason and first duration measurements',()=>{
 const error=new TradeContextFreshnessError(10000,15497,16004);
 annotateTradeContextPhases(error,1500,3997,507);annotateTradeContextPhases(error,1,1,1);
 assert.equal(error.contextTiming.contextAgeMs,6004);assert.equal(error.contextTiming.quoteAgeMs,507);
 assert.deepEqual(error.contextTiming.reasons,['CONTEXT_TOO_OLD']);
 assert.deepEqual(error.contextTiming.collectionPhases,{metadataReadElapsedMs:1500,referenceWaitElapsedMs:3997,bookReadElapsedMs:507});
});
test('invalid durations become null and untyped errors cannot receive phase diagnostics',()=>{
 const error=new TradeContextFreshnessError(10000,15497,16004);
 annotateTradeContextPhases(error,NaN,-1,Infinity);
 assert.deepEqual(error.contextTiming.collectionPhases,{metadataReadElapsedMs:null,referenceWaitElapsedMs:null,bookReadElapsedMs:null});
 const untyped={message:'STALE_TRADE_CONTEXT'};assert.equal(annotateTradeContextPhases(untyped,1,2,3),untyped);
 assert.deepEqual(untyped,{message:'STALE_TRADE_CONTEXT'});
});
test('real adapter fixture reports all collection phases on stale context without retrying or changing quote limits',async()=>{
 let now=10000;const paths:string[]=[];
 const ref={kind:'REFERENCE_PRICE' as const,price:'100',timestamp:15400,observedAt:15500};
 const adapter=createBinanceTestnetAdapter({apiKey:'fixtureKey',secretKey:'fixtureSecret',now:()=>now,
 referenceReader:async()=>ref,referenceSnapshot:()=>ref,fetcher:async url=>{
  const p=new URL(String(url)).pathname;paths.push(p);
  if(p.endsWith('exchangeInfo')){now=15500;return new Response(JSON.stringify({symbols:[{symbol:'BTCUSDT',baseAsset:'BTC',quoteAsset:'USDT',status:'TRADING',
   isSpotTradingAllowed:true,orderTypes:['LIMIT'],filters:[{filterType:'PERCENT_PRICE',avgPriceMins:5}]}],exchangeFilters:[]}));}
  now=16000;return new Response(JSON.stringify({symbol:'BTCUSDT',bidPrice:'100',askPrice:'101',bidQty:'1',askQty:'1'}));
 }});
 await assert.rejects(adapter.tradeContext('BTCUSDT'),(error:unknown)=>{
  assert.ok(error instanceof TradeContextFreshnessError);
  assert.equal(error.contextTiming.contextAgeMs,6000);assert.equal(error.contextTiming.quoteAgeMs,500);
  const phases=error.contextTiming.collectionPhases;assert.ok(phases);
  for(const duration of Object.values(phases))assert.ok(duration!==null&&Number.isFinite(duration)&&duration>=0);
  return true;
 });
 assert.deepEqual(paths,['/api/v3/exchangeInfo','/api/v3/ticker/bookTicker']);
});
