import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TestnetReferenceStream,ReferenceStreamTimeoutError} from '../src/server/testnetReferenceStream';
class Socket extends EventTarget{close(){}emit(t:number){this.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({e:'referencePrice',s:'BTCUSDT',r:'100',t})}));}}
test('book preparation waits for a newer event while ordinary reads retain the 2000 ms rule',async()=>{
 let now=2500;const socket=new Socket(),feed=new TestnetReferenceStream('BTCUSDT',()=>now,()=>socket);
 try{
  socket.emit(1000);assert.equal((await feed.read('BTCUSDT')).timestamp,1000);
  let resolved=false;const pending=feed.readForBook('BTCUSDT').then(r=>{resolved=true;return r;});
  await Promise.resolve();assert.equal(resolved,false);
  socket.emit(2400);const reference=await pending;assert.equal(reference.timestamp,2400);assert.equal(reference.observedAt,2500);
  now=4600;assert.throws(()=>feed.snapshot('BTCUSDT'),/STALE_REFERENCE_PRICE/);
 }finally{feed.close();}
});
test('book preparation keeps its four-second deadline when no suitable event arrives',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const socket=new Socket(),feed=new TestnetReferenceStream('BTCUSDT',()=>2500,()=>socket);
 try{
  socket.emit(1000);
  const pending=assert.rejects(feed.readForBook('BTCUSDT'),(error:unknown)=>{
   assert.ok(error instanceof ReferenceStreamTimeoutError);assert.equal(error.streamDiagnostics.waitLimitMs,4000);
   assert.equal(error.streamDiagnostics.requiredMaxEventAgeMs,1000);return true;
  });
  t.mock.timers.tick(3999);t.mock.timers.tick(1);await pending;
 }finally{feed.close();}
});
test('preparation uses the whole calibrated event-age interval, not local age or interval midpoint',async()=>{
 const socket=new Socket(),feed=new TestnetReferenceStream('BTCUSDT',()=>10000,()=>socket,
  ()=>({serverTime:11000,localStartedAt:9700,localReceivedAt:10000}));
 try{
  socket.emit(10200);let resolved=false;
  const pending=feed.readForBook('BTCUSDT').then(r=>{resolved=true;return r;});
  await Promise.resolve();assert.equal(resolved,false);
  socket.emit(10500);const result=await pending;assert.equal(result.timestamp,10500);assert.equal(result.observedAt,10000);
 }finally{feed.close();}
});
test('close rejects a pending preparation instead of opening a replacement connection',async()=>{
 let connections=0;const socket=new Socket(),feed=new TestnetReferenceStream('BTCUSDT',()=>2500,()=>{connections++;return socket;});
 socket.emit(1000);const pending=assert.rejects(feed.readForBook('BTCUSDT'),/STREAM_REFERENCE_CLOSED/);
 feed.close();await pending;assert.equal(connections,1);
});
