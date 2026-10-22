import {test} from 'node:test';
import assert from 'node:assert/strict';
import {probeReferenceCadence} from '../src/server/referenceCadenceProbe';
class Socket extends EventTarget{closes=0;close(){this.closes++;}emit(t:number,r:string|null='100'){this.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({e:'referencePrice',s:'BTCUSDT',r,t})}));}}
test('bounded public probe retains long arrival gaps and trailing silence without account or order capability',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 let mono=100,connections=0;const socket=new Socket();
 const pending=probeReferenceCadence(10,url=>{connections++;assert.equal(url,'wss://stream.testnet.binance.vision/ws/btcusdt@referencePrice');return socket;},()=>mono);
 socket.dispatchEvent(new Event('open'));
 mono=1000;socket.emit(10000);mono=2000;socket.emit(11000);mono=7500;socket.emit(16500,null);
 mono=10100;t.mock.timers.tick(10000);const result=await pending;
 assert.equal(result.state,'COMPLETED');assert.equal(result.messages,3);assert.equal(result.nullPrices,1);
 assert.equal(result.intervals,2);assert.equal(result.maxMessageGapMs,5500);
 assert.equal(result.gapBuckets.over4000Ms,1);assert.equal(result.gapBuckets.upTo1000Ms,1);
 assert.equal(result.firstMessageDelayMs,900);assert.equal(result.lastMessageAgeMs,2600);
 assert.equal(result.ordersSubmitted,0);assert.equal(result.executionAuthorized,false);assert.equal(connections,1);assert.equal(socket.closes,1);
});
test('silent socket yields unknown message ages and no fabricated intervals',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const socket=new Socket();
 const pending=probeReferenceCadence(10,()=>socket,()=>100);
 t.mock.timers.tick(10000);const result=await pending;
 assert.equal(result.messages,0);assert.equal(result.maxMessageGapMs,null);assert.equal(result.firstMessageDelayMs,null);
 assert.equal(result.lastMessageAgeMs,null);assert.equal(result.intervals,0);
});
test('malformed data and disconnect stop once without reconnect or exposing upstream payloads',async()=>{
 for(const mode of ['invalid','disconnect']){
  const socket=new Socket();let connections=0;
  const pending=probeReferenceCadence(10,()=>{connections++;return socket;},()=>100);
  if(mode==='invalid')socket.dispatchEvent(new MessageEvent('message',{data:'private malformed payload'}));
  else socket.dispatchEvent(new Event('close'));
  const result=await pending;assert.equal(result.state,'STOPPED');
  assert.equal(result.stopCode,mode==='invalid'?'STREAM_REFERENCE_INVALID':'STREAM_REFERENCE_DISCONNECTED');
  assert.ok(!JSON.stringify(result).includes('private'));assert.equal(connections,1);assert.equal(socket.closes,1);
 }
});
test('invalid duration and pre-aborted probes open no socket; interruption closes an existing one',async()=>{
 let connections=0;const socket=new Socket(),factory=()=>{connections++;return socket;};
 for(const seconds of [0,9,601,NaN,10.5])await assert.rejects(probeReferenceCadence(seconds,factory),/DURATION_INVALID/);
 const stop=new AbortController();stop.abort();
 assert.equal((await probeReferenceCadence(10,factory,undefined,stop.signal)).state,'INTERRUPTED');assert.equal(connections,0);
 const active=new AbortController(),pending=probeReferenceCadence(10,factory,undefined,active.signal);active.abort();
 assert.equal((await pending).state,'INTERRUPTED');assert.equal(connections,1);assert.equal(socket.closes,1);
});
