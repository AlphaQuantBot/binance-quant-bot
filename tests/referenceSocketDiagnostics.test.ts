import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TestnetReferenceStream,ReferenceStreamTimeoutError} from '../src/server/testnetReferenceStream';
import {ReferencePriceFreshnessError} from '../src/server/priceReference';
class Socket extends EventTarget{readyState:0|1|2|3=1;close(){}emit(timestamp:number,r:string|null='100'){this.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({e:'referencePrice',s:'BTCUSDT',r,t:timestamp})}));}}
test('silent wait reports client socket state and total idle time including time before the wait',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 for(const state of [1,2,3] as const){
  let mono=1000;const socket=new Socket(),feed=new TestnetReferenceStream('BTCUSDT',()=>10000,()=>socket,undefined,()=>mono);
  try{
   socket.emit(7000);mono=6000;socket.readyState=state;
   const pending=assert.rejects(feed.readForBook('BTCUSDT'),(error:unknown)=>{
    assert.ok(error instanceof ReferencePriceFreshnessError);const wait=error.timing.streamWait;assert.ok(wait);
    assert.equal(wait.socketReadyState,state);assert.equal(wait.lastMessageAgeMs,9000);
    assert.equal(wait.waitElapsedMs,4000);assert.equal(wait.messagesDuringWait,0);return true;
   });
   mono=10000;t.mock.timers.tick(4000);await pending;
  }finally{feed.close();}
 }
});
test('missing socket state and no prior message remain null rather than guessed healthy',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const socket=new EventTarget() as EventTarget&{close:()=>void};socket.close=()=>{};
 const feed=new TestnetReferenceStream('BTCUSDT',()=>10000,()=>socket);
 try{
  const pending=assert.rejects(feed.readForBook('BTCUSDT'),(error:unknown)=>{
   assert.ok(error instanceof ReferenceStreamTimeoutError);const wait=error.streamDiagnostics.streamWait;assert.ok(wait);
   assert.equal(wait.socketReadyState,null);assert.equal(wait.lastMessageAgeMs,null);return true;
  });
  t.mock.timers.tick(4000);await pending;
 }finally{feed.close();}
});
test('new null message updates transport idle age but never supplies a usable reference',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 let mono=0;const socket=new Socket(),feed=new TestnetReferenceStream('BTCUSDT',()=>10000,()=>socket,undefined,()=>mono);
 try{
  const pending=assert.rejects(feed.readForBook('BTCUSDT'),(error:unknown)=>{
   assert.ok(error instanceof ReferenceStreamTimeoutError);const wait=error.streamDiagnostics.streamWait;assert.ok(wait);
   assert.equal(wait.lastMessageAgeMs,1000);assert.equal(wait.messagesDuringWait,1);
   assert.equal(wait.bestNewEventMaxAgeMs,null);return true;
  });
  mono=3000;socket.emit(9999,null);mono=4000;t.mock.timers.tick(4000);await pending;
 }finally{feed.close();}
});
