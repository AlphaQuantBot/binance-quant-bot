import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TestnetReferenceStream} from '../src/server/testnetReferenceStream';
import {ReferencePriceFreshnessError} from '../src/server/priceReference';
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
