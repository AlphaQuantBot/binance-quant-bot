import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ReferencePriceFreshnessError,annotateReferenceBookProgress} from '../src/server/priceReference';
const initial={kind:'REFERENCE_PRICE' as const,price:'100',timestamp:10000,observedAt:11000,
 referenceClock:{serverTime:11000,localStartedAt:10000,localReceivedAt:10590}};
test('unchanged event identifies aging during book read without changing original failure ages',()=>{
 const error=new ReferencePriceFreshnessError(initial,11630),ages={...error.timing};
 annotateReferenceBookProgress(error,initial,10900);
 assert.equal(error.timing.referenceEventAdvanceMs,0);assert.equal(error.timing.initialServerEventAgeMaxMs,1901);
 assert.equal(error.timing.serverEventAgeMaxMs,ages.serverEventAgeMaxMs);
 assert.ok(!JSON.stringify(error).includes('timestamp'));
});
test('newer and regressing event timestamps remain distinguishable without substituting receipt times',()=>{
 for(const advance of [300,-100]){
  const error=new ReferencePriceFreshnessError({...initial,timestamp:initial.timestamp+advance},11630);
  annotateReferenceBookProgress(error,initial,11000);
  assert.equal(error.timing.referenceEventAdvanceMs,advance);
  annotateReferenceBookProgress(error,{...initial,timestamp:1},11000);
  assert.equal(error.timing.referenceEventAdvanceMs,advance);
 }
});
test('invalid diagnostic clock cannot hide original failure and untyped errors are untouched',()=>{
 const error=new ReferencePriceFreshnessError({kind:'REFERENCE_PRICE',price:'1',timestamp:1000,observedAt:1000},3100);
 assert.equal(annotateReferenceBookProgress(error,{...initial,referenceClock:{serverTime:NaN,localStartedAt:1,localReceivedAt:2}},11000),error);
 assert.equal(error.timing.initialServerEventAgeMaxMs,undefined);assert.equal(error.message,'STALE_REFERENCE_PRICE');
 const untyped={message:'STALE_REFERENCE_PRICE'};
 assert.equal(annotateReferenceBookProgress(untyped,initial,11000),untyped);assert.deepEqual(untyped,{message:'STALE_REFERENCE_PRICE'});
});
