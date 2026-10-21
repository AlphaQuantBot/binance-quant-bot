import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DecisionReferenceSession} from '../src/server/decisionReferenceSession';
import {TestnetReferenceStream} from '../src/server/testnetReferenceStream';
class Socket extends EventTarget{
 closes=0;close(){this.closes++;}
 emit(t:number){this.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({e:'referencePrice',s:'BTCUSDT',r:'100',t})}));}
}
function fixture(){
 let now=2000,created=0,oldClockExpired=false;
 const socket=new Socket();
 const session=new DecisionReferenceSession(clock=>{created++;return new TestnetReferenceStream('BTCUSDT',()=>now,()=>socket,clock);});
 const first=()=>{if(oldClockExpired)throw Error('REFERENCE_CLOCK_UNCONFIRMED');return {serverTime:1000,localStartedAt:1000,localReceivedAt:1000};};
 return {socket,session,first,created:()=>created,setNow:(n:number)=>now=n,expire:()=>oldClockExpired=true};
}
test('session reuses one connection across idle minute and validates new clock without retimestamping cached data',async()=>{
 const f=fixture();
 try{
  const first=f.session.get(f.first);f.socket.emit(1990);assert.equal((await first.read('BTCUSDT')).timestamp,1990);
  f.expire();f.setNow(62000);
  // Background receipt must not invoke an expired prior-cycle clock.
  f.socket.emit(61990);
  const second=f.session.get(()=>({serverTime:62000,localStartedAt:62000,localReceivedAt:62000}));
  assert.equal(first,second);assert.equal(f.created(),1);
  const r=await second.read('BTCUSDT');assert.equal(r.timestamp,61990);assert.equal(r.observedAt,62000);
 }finally{f.session.close();}
 assert.equal(f.socket.closes,1);
});
test('fresh calibration cannot make a stale cached event fresh or replace a failed connection',async()=>{
 const f=fixture();
 try{
  const feed=f.session.get(f.first);f.socket.emit(1990);await feed.read('BTCUSDT');
  f.setNow(62000);
  const clock=()=>({serverTime:62000,localStartedAt:62000,localReceivedAt:62000});
  const same=f.session.get(clock);
  assert.throws(()=>same.snapshot('BTCUSDT'),/STALE_REFERENCE_PRICE/);
  f.socket.dispatchEvent(new Event('close'));
  assert.throws(()=>f.session.get(clock),/STREAM_REFERENCE_DISCONNECTED/);
  await assert.rejects(same.read('BTCUSDT'),/STREAM_REFERENCE_DISCONNECTED/);
  assert.equal(f.created(),1);
 }finally{f.session.close();}
});
test('session close is terminal, idempotent and rejects pending read; unopened session creates no socket',async()=>{
 const f=fixture();const stream=f.session.get(f.first);
 const rejected=assert.rejects(stream.read('BTCUSDT'),/STREAM_REFERENCE_CLOSED/);
 f.session.close();f.session.close();await rejected;
 assert.equal(f.socket.closes,1);assert.throws(()=>f.session.get(f.first),/STREAM_REFERENCE_CLOSED/);
 const unused=fixture();unused.session.close();assert.equal(unused.created(),0);
});
test('updating session clock during a pending read is refused without replacing its connection',async()=>{
 const f=fixture();const stream=f.session.get(f.first);
 const rejected=assert.rejects(stream.read('BTCUSDT'),/STREAM_REFERENCE_CLOSED/);
 assert.throws(()=>f.session.get(f.first),/STREAM_REFERENCE_READER_BUSY/);
 assert.equal(f.created(),1);f.session.close();await rejected;
});
