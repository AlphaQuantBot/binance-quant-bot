import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TestnetReferenceStream,ReferenceStreamTimeoutError} from '../src/server/testnetReferenceStream';
import {ReferencePriceFreshnessError} from '../src/server/priceReference';
class Socket extends EventTarget{close(){}emit(t:number,r:string|null='100'){this.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({e:'referencePrice',s:'BTCUSDT',r,t})}));}}
test('preparation timeout distinguishes silent wait from historical cached events',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const socket=new Socket(),feed=new TestnetReferenceStream('BTCUSDT',()=>10000,()=>socket);
 try{
  socket.emit(7000);
  const pending=assert.rejects(feed.readForBook('BTCUSDT'),(error:unknown)=>{
   assert.ok(error instanceof ReferencePriceFreshnessError);
   assert.equal(error.timing.streamWait?.messagesDuringWait,0);assert.equal(error.timing.streamWait?.referenceEventsDuringWait,0);
   assert.equal(error.timing.streamWait?.bestNewEventMaxAgeMs,null);assert.equal(error.timing.streamWait?.waitLimitMs,4000);
   return true;
  });
  t.mock.timers.tick(4000);await pending;
 }finally{feed.close();}
});
test('stale events during preparation retain counts and best observed age without being accepted',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const socket=new Socket(),feed=new TestnetReferenceStream('BTCUSDT',()=>10000,()=>socket);
 try{
  socket.emit(7000);
  const pending=assert.rejects(feed.readForBook('BTCUSDT'),(error:unknown)=>{
   assert.ok(error instanceof ReferencePriceFreshnessError);const wait=error.timing.streamWait;assert.ok(wait);
   assert.equal(wait.messagesDuringWait,2);assert.equal(wait.referenceEventsDuringWait,2);assert.equal(wait.bestNewEventMaxAgeMs,2400);
   assert.equal(wait.requiredMaxEventAgeMs,1000);assert.ok(wait.waitElapsedMs!==null&&wait.waitElapsedMs>=0);
   assert.equal(error.timing.eventAgeMs,2400);return true;
  });
  socket.emit(7400);socket.emit(7600);t.mock.timers.tick(4000);await pending;
 }finally{feed.close();}
});
test('null-only arrivals remain unavailable and are distinguishable from no messages',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const socket=new Socket(),feed=new TestnetReferenceStream('BTCUSDT',()=>10000,()=>socket);
 try{
  const pending=assert.rejects(feed.readForBook('BTCUSDT'),(error:unknown)=>{
   assert.ok(error instanceof ReferenceStreamTimeoutError);const wait=error.streamDiagnostics.streamWait;assert.ok(wait);
   assert.equal(wait.messagesDuringWait,1);assert.equal(wait.referenceEventsDuringWait,1);assert.equal(wait.bestNewEventMaxAgeMs,null);return true;
  });
  socket.emit(9999,null);t.mock.timers.tick(4000);await pending;
 }finally{feed.close();}
});
