import {test} from 'node:test';
import assert from 'node:assert/strict';
import {referenceForFilter,ReferencePriceFreshnessError} from '../src/server/priceReference';
test('stale event, delayed request and future server time remain blocked with numeric age diagnostics',()=>{
 for(const [observedAt,timestamp,requestAge,eventAge] of [[4900,1000,100,4000],[1000,4900,4000,100],[4900,5100,100,-100]]){
  try{referenceForFilter({kind:'REFERENCE_PRICE',price:'100',observedAt,timestamp},{avgPriceMins:5},5000);assert.fail('must reject');}
  catch(e){assert.ok(e instanceof ReferencePriceFreshnessError);assert.equal(e.message,'STALE_REFERENCE_PRICE');assert.deepEqual(e.timing,{referenceKind:'REFERENCE_PRICE',requestAgeMs:requestAge,eventAgeMs:eventAge});assert.equal(JSON.stringify(e.timing).includes('price'),false);}
 }
});
test('unknown reference kind or invalid timestamps do not disclose arbitrary data',()=>{
 const e=new ReferencePriceFreshnessError({kind:'private-field' as any,price:'secret',observedAt:NaN,timestamp:Infinity},5000);
 assert.deepEqual(e.timing,{referenceKind:'UNKNOWN',requestAgeMs:null,eventAgeMs:null});assert.equal(JSON.stringify(e).includes('secret'),false);
});
