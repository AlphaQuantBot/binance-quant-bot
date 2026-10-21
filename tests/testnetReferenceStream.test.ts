import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TestnetReferenceStream,ReferenceStreamTimeoutError} from '../src/server/testnetReferenceStream';
import {ReferencePriceFreshnessError,annotateReferenceFailure} from '../src/server/priceReference';
import {createBinanceTestnetAdapter} from '../src/server/binanceTestnetAdapter';
class FakeSocket extends EventTarget{closes=0;close(){this.closes++;}emit(value:unknown){this.dispatchEvent(new MessageEvent('message',{data:JSON.stringify(value)}));}}
const event=(t=1000,r:string|null='100')=>({e:'referencePrice',s:'BTCUSDT',r,t});
function setup(){let clock=1001;const socket=new FakeSocket();const feed=new TestnetReferenceStream('BTCUSDT',()=>clock,url=>{assert.equal(url,'wss://stream.testnet.binance.vision/ws/btcusdt@referencePrice');return socket;});return {socket,feed,setClock:(n:number)=>clock=n};}
test('warm stream retains exchange event timestamp and actual receipt, without credentials',async()=>{const f=setup();try{f.socket.emit(event());const r=await f.feed.read('BTCUSDT');assert.equal(r.timestamp,1000);assert.equal(r.observedAt,1001);assert.equal(r.kind,'REFERENCE_PRICE');r.price='999';assert.equal((await f.feed.read('BTCUSDT')).price,'100');}finally{f.feed.close();}});
test('stale and future events cannot satisfy a reader; a new genuinely fresh event can',async()=>{const f=setup();try{f.setClock(5000);f.socket.emit(event(2000));let resolved=false;const pending=f.feed.read('BTCUSDT').then(r=>{resolved=true;return r;});await Promise.resolve();assert.equal(resolved,false);f.socket.emit(event(5100));await Promise.resolve();assert.equal(resolved,false);f.setClock(5200);f.socket.emit(event(5190));const r=await pending;assert.equal(r.timestamp,5190);}finally{f.feed.close();}});
test('null clears cached availability; close rejects waiting readers and closes socket',async()=>{const f=setup();f.socket.emit(event());f.socket.emit(event(1001,null));const p=f.feed.read('BTCUSDT');f.feed.close();await assert.rejects(p,/STREAM_REFERENCE_CLOSED/);assert.equal(f.socket.closes,1);await assert.rejects(f.feed.read('BTCUSDT'),/CLOSED/);});
test('wrong identity, malformed messages and regression never become trusted reference data',async()=>{
 for(const value of [{...event(),s:'ETHUSDT'},{...event(),r:100},{...event(),e:'trade'},{...event(),r:'0'},{...event(),t:'1000'}]){const f=setup();f.socket.emit(value);await assert.rejects(f.feed.read('BTCUSDT'),/STREAM_REFERENCE_INVALID/);f.feed.close();}
 const f=setup();f.socket.emit(event());f.socket.emit(event(999));await assert.rejects(f.feed.read('BTCUSDT'),/REGRESSED/);f.feed.close();
});
test('disconnect or connection error before read is retained and never reconnected',async()=>{for(const type of ['close','error']){const f=setup();f.socket.dispatchEvent(new Event(type));await assert.rejects(f.feed.read('BTCUSDT'),/STREAM_REFERENCE/);assert.equal(f.socket.closes,1);f.feed.close();}});
test('stream wait timeout retains actual stale event ages',async t=>{t.mock.timers.enable({apis:['setTimeout']});const f=setup();try{f.setClock(5000);f.socket.emit(event(2000));const p=f.feed.read('BTCUSDT');const rejected=assert.rejects(p,(e:unknown)=>e instanceof ReferencePriceFreshnessError&&e.timing.eventAgeMs===3000);t.mock.timers.tick(4000);await rejected;}finally{f.feed.close();}});
test('adapter uses warmed stream then fresh book, with no REST reference fallback',async()=>{
 const paths:string[]=[];let served=false;
 const a=createBinanceTestnetAdapter({apiKey:'fixtureKey',secretKey:'fixtureSecret',now:()=>1002,referenceReader:async symbol=>{assert.equal(symbol,'BTCUSDT');served=true;return {kind:'REFERENCE_PRICE',price:'100',timestamp:1000,observedAt:1001};},fetcher:async url=>{
 const p=new URL(String(url)).pathname;paths.push(p);
 if(p.endsWith('exchangeInfo'))return new Response(JSON.stringify({symbols:[{symbol:'BTCUSDT',baseAsset:'BTC',quoteAsset:'USDT',status:'TRADING',isSpotTradingAllowed:true,orderTypes:['LIMIT'],filters:[{filterType:'PERCENT_PRICE',avgPriceMins:5}]}],exchangeFilters:[]}));
 assert.equal(served,true);assert.equal(p,'/api/v3/ticker/bookTicker');return new Response(JSON.stringify({symbol:'BTCUSDT',bidPrice:'100',askPrice:'100',bidQty:'1',askQty:'1'}));
 }});assert.equal((await a.tradeContext('BTCUSDT')).reference?.timestamp,1000);assert.deepEqual(paths,['/api/v3/exchangeInfo','/api/v3/ticker/bookTicker']);
});
test('failed stream or stale stream data stops context without REST/average substitution',async()=>{
 for(const mode of ['failed','stale']){const paths:string[]=[];const a=createBinanceTestnetAdapter({apiKey:'fixtureKey',secretKey:'fixtureSecret',now:()=>5000,referenceReader:async()=>{if(mode==='failed')throw Error('STREAM_REFERENCE_DISCONNECTED');return {kind:'REFERENCE_PRICE',price:'100',timestamp:2000,observedAt:4999};},fetcher:async url=>{const p=new URL(String(url)).pathname;paths.push(p);return new Response(JSON.stringify(p.endsWith('exchangeInfo')?{symbols:[{symbol:'BTCUSDT',baseAsset:'BTC',quoteAsset:'USDT',status:'TRADING',isSpotTradingAllowed:true,orderTypes:['LIMIT'],filters:[{filterType:'PERCENT_PRICE',avgPriceMins:5}]}],exchangeFilters:[]}:{symbol:'BTCUSDT',bidPrice:'100',askPrice:'100',bidQty:'1',askQty:'1'}));}});await assert.rejects(a.tradeContext('BTCUSDT'));assert.equal(paths.includes('/api/v3/referencePrice'),false);assert.equal(paths.includes('/api/v3/avgPrice'),false);}
});

test('cached snapshot never waits or refreshes stale/future exchange timestamps',()=>{
 const f=setup();try{
  assert.throws(()=>f.feed.snapshot('BTCUSDT'),/UNAVAILABLE/);f.socket.emit(event());
  const first=f.feed.snapshot('BTCUSDT');assert.equal(first.timestamp,1000);assert.equal(first.observedAt,1001);
  f.setClock(3100);assert.throws(()=>f.feed.snapshot('BTCUSDT'),(e:unknown)=>e instanceof ReferencePriceFreshnessError&&e.timing.eventAgeMs===2100);
  f.socket.emit(event(3200));assert.throws(()=>f.feed.snapshot('BTCUSDT'),(e:unknown)=>e instanceof ReferencePriceFreshnessError&&e.timing.eventAgeMs===-100);
  f.socket.emit(event(3201,null));assert.throws(()=>f.feed.snapshot('BTCUSDT'),/UNAVAILABLE/);
 }finally{f.feed.close();}assert.throws(()=>f.feed.snapshot('BTCUSDT'),/CLOSED/);
});
test('post-book cached event replaces an aging initial event with no HTTP retry or stream wait',async()=>{
 const f=setup();let clock=2900,reads=0,snapshots=0,bookDone=false;const paths:string[]=[];
 try{f.socket.emit(event());f.setClock(clock);
  const a=createBinanceTestnetAdapter({apiKey:'fixtureKey',secretKey:'fixtureSecret',now:()=>clock,
   referenceReader:async s=>{reads++;return f.feed.read(s);},
   referenceSnapshot:s=>{snapshots++;assert.equal(bookDone,true);return f.feed.snapshot(s);},
   fetcher:async url=>{const p=new URL(String(url)).pathname;paths.push(p);
    if(p.endsWith('exchangeInfo'))return new Response(JSON.stringify({symbols:[{symbol:'BTCUSDT',baseAsset:'BTC',quoteAsset:'USDT',status:'TRADING',isSpotTradingAllowed:true,orderTypes:['LIMIT'],filters:[{filterType:'PERCENT_PRICE',avgPriceMins:5}]}],exchangeFilters:[]}));
    clock=3100;f.setClock(clock);f.socket.emit(event(3099,'101'));bookDone=true;
    return new Response(JSON.stringify({symbol:'BTCUSDT',bidPrice:'101',askPrice:'101',bidQty:'1',askQty:'1'}));
   }});
  const c=await a.tradeContext('BTCUSDT');assert.equal(c.reference?.timestamp,3099);assert.equal(c.reference?.observedAt,3100);
  assert.equal(reads,1);assert.equal(snapshots,1);assert.deepEqual(paths,['/api/v3/exchangeInfo','/api/v3/ticker/bookTicker']);
 }finally{f.feed.close();}
});
test('post-book stale, cleared, future or disconnected cache fails without REST fallback or retry',async()=>{
 for(const mode of ['stale','cleared','future','disconnected']){
  const f=setup();let clock=2900;const paths:string[]=[];
  try{f.socket.emit(event());f.setClock(clock);
   const a=createBinanceTestnetAdapter({apiKey:'fixtureKey',secretKey:'fixtureSecret',now:()=>clock,referenceReader:s=>f.feed.read(s),referenceSnapshot:s=>f.feed.snapshot(s),fetcher:async url=>{
    const p=new URL(String(url)).pathname;paths.push(p);
    if(p.endsWith('exchangeInfo'))return new Response(JSON.stringify({symbols:[{symbol:'BTCUSDT',baseAsset:'BTC',quoteAsset:'USDT',status:'TRADING',isSpotTradingAllowed:true,orderTypes:['LIMIT'],filters:[{filterType:'PERCENT_PRICE',avgPriceMins:5}]}],exchangeFilters:[]}));
    clock=3100;f.setClock(clock);
    if(mode==='cleared')f.socket.emit(event(3100,null));if(mode==='future')f.socket.emit(event(3200));if(mode==='disconnected')f.socket.dispatchEvent(new Event('close'));
    return new Response(JSON.stringify({symbol:'BTCUSDT',bidPrice:'100',askPrice:'100',bidQty:'1',askQty:'1'}));
   }});
   await assert.rejects(a.tradeContext('BTCUSDT'));assert.deepEqual(paths,['/api/v3/exchangeInfo','/api/v3/ticker/bookTicker']);
  }finally{f.feed.close();}
 }
 assert.throws(()=>createBinanceTestnetAdapter({apiKey:'fixtureKey',secretKey:'fixtureSecret',referenceSnapshot:()=>({kind:'REFERENCE_PRICE',price:'1',timestamp:1,observedAt:1})}),/CONFIGURATION_INVALID/);
});

test('timeout distinguishes unopened, open without messages and null-only reference streams',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 for(const mode of ['unopened','silent','null']){
  const f=setup();
  try{
   if(mode!=='unopened')f.socket.dispatchEvent(new Event('open'));
   const p=f.feed.read('BTCUSDT');
   if(mode==='null')f.socket.emit(event(1001,null));
   const rejected=assert.rejects(p,(e:unknown)=>{
    assert.ok(e instanceof ReferenceStreamTimeoutError);
    assert.deepEqual(e.streamDiagnostics,{opened:mode!=='unopened',messages:mode==='null'?1:0,
     referenceEvents:mode==='null'?1:0,nullPrices:mode==='null'?1:0,nonNullPrices:0,waitLimitMs:4000});
    assert.ok(!JSON.stringify(e).includes('price":'));
    return true;
   });
   t.mock.timers.tick(3999);await Promise.resolve();
   t.mock.timers.tick(1);await rejected;
  }finally{f.feed.close();}
 }
});
test('timeout diagnostic snapshot retains prior nonnull count after an explicit null clears price',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const f=setup();
 try{
  f.socket.dispatchEvent(new Event('open'));f.socket.emit(event());f.socket.emit(event(1001,null));
  const p=f.feed.read('BTCUSDT');
  const rejected=assert.rejects(p,(e:unknown)=>{
   assert.ok(e instanceof ReferenceStreamTimeoutError);assert.equal(e.streamDiagnostics.nonNullPrices,1);
   assert.equal(e.streamDiagnostics.nullPrices,1);assert.equal(e.streamDiagnostics.messages,2);return true;
  });
  t.mock.timers.tick(4000);await rejected;
 }finally{f.feed.close();}
});

test('stream freshness failure identifies first read, post-book snapshot or final validation without more requests',async()=>{
 for(const stage of ['INITIAL_STREAM_READ','POST_BOOK_SNAPSHOT','CONTEXT_REFERENCE_VALIDATION'] as const){
  const paths:string[]=[];
  const old={kind:'REFERENCE_PRICE' as const,price:'100',timestamp:2000,observedAt:4999};
  const fresh={...old,timestamp:4990};
  const a=createBinanceTestnetAdapter({apiKey:'fixtureKey',secretKey:'fixtureSecret',now:()=>5000,
   referenceReader:async()=>{
    if(stage==='INITIAL_STREAM_READ')throw new ReferencePriceFreshnessError(old,5000);
    return stage==='CONTEXT_REFERENCE_VALIDATION'?old:fresh;
   },
   ...(stage==='POST_BOOK_SNAPSHOT'?{referenceSnapshot:()=>{throw new ReferencePriceFreshnessError(old,5000);}}:{}),
   fetcher:async url=>{
    const p=new URL(String(url)).pathname;paths.push(p);
    return new Response(JSON.stringify(p.endsWith('exchangeInfo')?
     {symbols:[{symbol:'BTCUSDT',baseAsset:'BTC',quoteAsset:'USDT',status:'TRADING',isSpotTradingAllowed:true,orderTypes:['LIMIT'],filters:[{filterType:'PERCENT_PRICE',avgPriceMins:5}]}],exchangeFilters:[]}:
     {symbol:'BTCUSDT',bidPrice:'100',askPrice:'100',bidQty:'1',askQty:'1'}));
   }});
  await assert.rejects(a.tradeContext('BTCUSDT'),(error:unknown)=>{
   assert.ok(error instanceof ReferencePriceFreshnessError);assert.equal(error.timing.stage,stage);
   assert.equal(error.timing.eventAgeMs,3000);assert.equal(error.timing.requestAgeMs,1);return true;
  });
  assert.deepEqual(paths,stage==='INITIAL_STREAM_READ'?['/api/v3/exchangeInfo']:['/api/v3/exchangeInfo','/api/v3/ticker/bookTicker']);
 }
});
test('observation phase annotation preserves the original stage and ages and ignores untyped errors',()=>{
 const error=new ReferencePriceFreshnessError({kind:'REFERENCE_PRICE',price:'100',timestamp:1000,observedAt:2900},3100);
 annotateReferenceFailure(error,'POST_BOOK_SNAPSHOT');
 assert.equal(annotateReferenceFailure(error,undefined,'CANDIDATE_REVIEW'),error);
 annotateReferenceFailure(error,'CONTEXT_REFERENCE_VALIDATION','ACCOUNT_OBSERVATION');
 assert.deepEqual(error.timing,{referenceKind:'REFERENCE_PRICE',requestAgeMs:200,eventAgeMs:2100,stage:'POST_BOOK_SNAPSHOT',phase:'CANDIDATE_REVIEW'});
 const plain=Error('fixture');assert.equal(annotateReferenceFailure(plain,'INITIAL_STREAM_READ'),plain);
 assert.equal('timing' in plain,false);
});

test('startup allows a delayed first fresh event while subsequent reads retain 4-second deadline',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const f=setup();
 try{
  let complete=false;
  const startup=f.feed.warmup('BTCUSDT').then(()=>{complete=true;});
  t.mock.timers.tick(5000);await Promise.resolve();assert.equal(complete,false);
  f.setClock(6001);f.socket.emit(event(5990));await startup;assert.equal(complete,true);
  assert.equal((await f.feed.read('BTCUSDT')).timestamp,5990);
  // Completed warmup is not repeated after a null clears the cached price.
  f.socket.emit(event(6001,null));await f.feed.warmup('BTCUSDT');
  const pending=f.feed.read('BTCUSDT');
  const rejected=assert.rejects(pending,(error:unknown)=>{
   assert.ok(error instanceof ReferenceStreamTimeoutError);assert.equal(error.streamDiagnostics.waitLimitMs,4000);
   assert.equal(error.streamDiagnostics.waitPhase,undefined);return true;
  });
  t.mock.timers.tick(4000);await rejected;
 }finally{f.feed.close();}
});
test('startup times out at 12 seconds with explicit phase and never treats stale data as fresh',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 for(const stale of [false,true]){
  const f=setup();
  try{
   f.socket.dispatchEvent(new Event('open'));
   const pending=f.feed.warmup('BTCUSDT');
   if(stale){f.setClock(5000);f.socket.emit(event(1000));}
   const rejected=assert.rejects(pending,(error:unknown)=>{
    if(stale){assert.ok(error instanceof ReferencePriceFreshnessError);assert.equal(error.timing.eventAgeMs,4000);}
    else{assert.ok(error instanceof ReferenceStreamTimeoutError);assert.equal(error.streamDiagnostics.waitLimitMs,12000);assert.equal(error.streamDiagnostics.waitPhase,'STARTUP');}
    return true;
   });
   t.mock.timers.tick(11999);await Promise.resolve();t.mock.timers.tick(1);await rejected;
  }finally{f.feed.close();}
 }
});
test('startup close or disconnect rejects immediately without waiting for its longer deadline',async()=>{
 for(const mode of ['close','disconnect']){
  const f=setup();const pending=f.feed.warmup('BTCUSDT');
  const rejected=assert.rejects(pending,mode==='close'?/STREAM_REFERENCE_CLOSED/:/STREAM_REFERENCE_DISCONNECTED/);
  if(mode==='close')f.feed.close();else f.socket.dispatchEvent(new Event('close'));
  await rejected;f.feed.close();
 }
});
