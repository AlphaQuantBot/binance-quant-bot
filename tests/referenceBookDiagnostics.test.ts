import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ReferencePriceFreshnessError,annotateReferenceBookRead,referenceForFilter} from '../src/server/priceReference';
test('calibrated failure exposes exact uncertainty width without changing age bounds',()=>{
 const reference={kind:'REFERENCE_PRICE' as const,price:'100',timestamp:10000,observedAt:11000,
  referenceClock:{serverTime:11000,localStartedAt:10000,localReceivedAt:10590}};
 assert.throws(()=>referenceForFilter(reference,{avgPriceMins:0},11630),(error:unknown)=>{
  assert.ok(error instanceof ReferencePriceFreshnessError);
  assert.equal(error.timing.serverEventAgeMinMs,2039);assert.equal(error.timing.serverEventAgeMaxMs,2631);
  assert.equal(error.timing.clockUncertaintyMs,592);
  assert.equal(error.timing.bookReadElapsedMs,undefined);return true;
 });
});
test('book duration annotation preserves original decision, ages and first measurement',()=>{
 const error=new ReferencePriceFreshnessError({kind:'REFERENCE_PRICE',price:'secret',timestamp:1000,observedAt:2800},3100);
 const original={...error.timing};
 assert.equal(annotateReferenceBookRead(error,640.5),error);
 annotateReferenceBookRead(error,999);
 assert.deepEqual(error.timing,{...original,bookReadElapsedMs:640.5});
 assert.equal(error.message,'STALE_REFERENCE_PRICE');assert.ok(!JSON.stringify(error).includes('secret'));
});
test('invalid elapsed durations serialize as null and arbitrary errors gain no diagnostics',()=>{
 for(const elapsed of [NaN,Infinity,-1]){
  const error=new ReferencePriceFreshnessError({kind:'REFERENCE_PRICE',price:'1',timestamp:1000,observedAt:1000},3100);
  annotateReferenceBookRead(error,elapsed);assert.equal(error.timing.bookReadElapsedMs,null);
 }
 const unknown={message:'STALE_REFERENCE_PRICE'};assert.equal(annotateReferenceBookRead(unknown,100),unknown);
 assert.deepEqual(unknown,{message:'STALE_REFERENCE_PRICE'});
});
