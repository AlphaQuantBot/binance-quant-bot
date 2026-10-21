import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sampleDecisionReferenceClock} from '../src/server/decisionReferenceClock';
import {referenceForFilter} from '../src/server/priceReference';
import {ReferenceClockError} from '../src/server/referenceClock';
const seed={serverTime:2073,clockLocalStartedAt:1000,clockLocalReceivedAt:2346,clockStartedAt:1000,clockReceivedAt:2346};
test('fixed batch chooses minimum observed RTT while keeping real timestamps and strict event age bounds',async()=>{
 let wall=2500,mono=2500,calls=0;const durations=[500,280];
 const result=await sampleDecisionReferenceClock(seed,async(url,init)=>{
  assert.equal(String(url),'https://testnet.binance.vision/api/v3/time');assert.equal(init?.method,'GET');
  assert.equal(init?.redirect,'error');assert.equal(init?.headers,undefined);
  const duration=durations[calls++],serverTime=wall+400+duration/2;wall+=duration;mono+=duration;
  return new Response(JSON.stringify({serverTime}));
 },()=>wall,()=>mono);
 assert.equal(calls,2);assert.deepEqual(result.diagnostics,{sampleCount:3,roundTripMs:[1346,500,280],selectedRoundTripMs:280});
 const clock=result.referenceClock();
 assert.deepEqual(clock,{serverTime:3540,localStartedAt:3000,localReceivedAt:3280});
 assert.equal(referenceForFilter({kind:'REFERENCE_PRICE',price:'100',timestamp:3530,observedAt:wall,referenceClock:clock},{avgPriceMins:0},wall),100n*10n**18n);
 assert.throws(()=>referenceForFilter({kind:'REFERENCE_PRICE',price:'100',timestamp:1500,observedAt:wall,referenceClock:clock},{avgPriceMins:0},wall),/STALE_REFERENCE_PRICE/);
});
test('any failed sample stops the batch without retry or selecting earlier evidence as fallback',async()=>{
 for(const mode of ['transport','rate','http','schema','json']){
  let calls=0;
  await assert.rejects(sampleDecisionReferenceClock(seed,async()=>{
   calls++;if(mode==='transport')throw Error('fixture private error');
   if(mode==='rate')return new Response('{}',{status:429});
   if(mode==='http')return new Response('{}',{status:500});
   return new Response(mode==='json'?'not json':JSON.stringify({serverTime:'bad'}));
  },()=>2500,()=>2500),mode==='rate'?/SIGNAL_RATE_LIMITED/:mode==='schema'||mode==='json'?/SIGNAL_CLOCK_INVALID/:/SIGNAL_READ_FAILED/);
  assert.equal(calls,1);
 }
});
test('inconsistent exchange clock samples fail rather than cherry-picking a fast response',async()=>{
 let wall=2500,calls=0;
 await assert.rejects(sampleDecisionReferenceClock(seed,async()=>{
  const serverTime=wall+550+(calls++===1?10000:0);wall+=300;
  return new Response(JSON.stringify({serverTime}));
 },()=>wall,()=>wall),(error:unknown)=>error instanceof ReferenceClockError&&error.clockDiagnostics.reason==='MEASUREMENTS_DISAGREE');
 assert.equal(calls,2);
});
test('invalid initial evidence sends no extra request and wall-clock changes stop before another sample',async()=>{
 let calls=0;
 await assert.rejects(sampleDecisionReferenceClock({...seed,serverTime:NaN},async()=>{calls++;return new Response('{}');},()=>2500,()=>2500),/REFERENCE_CLOCK_UNCONFIRMED/);
 assert.equal(calls,0);
 let wall=2500,mono=2500;
 await assert.rejects(sampleDecisionReferenceClock(seed,async()=>{calls++;wall+=310;mono+=300;return new Response(JSON.stringify({serverTime:3000}));},()=>wall,()=>mono),
  (error:unknown)=>error instanceof ReferenceClockError&&error.clockDiagnostics.reason==='CALIBRATION_CLOCK_MISMATCH');
 assert.equal(calls,1);
});

test('failure of the second added request cannot return the earlier fast sample',async()=>{
 let wall=2500,calls=0;
 await assert.rejects(sampleDecisionReferenceClock(seed,async()=>{
  calls++;if(calls===2)return new Response('{}',{status:500});
  const serverTime=wall+450;wall+=100;return new Response(JSON.stringify({serverTime}));
 },()=>wall,()=>wall),/SIGNAL_READ_FAILED/);
 assert.equal(calls,2);
});
