import {test} from 'node:test';
import assert from 'node:assert/strict';
import {measuredReferenceClock,referenceEventAges} from '../src/server/referenceClock';
import {referenceForFilter} from '../src/server/priceReference';
import {TestnetReferenceStream} from '../src/server/testnetReferenceStream';
const clock={serverTime:1500,localStartedAt:1000,localReceivedAt:1200};
test('measured clock accounts for local offset without changing event or receipt timestamps',async()=>{
 let now=2000,mono=1000;
 const evidence=measuredReferenceClock(1500,1000,1200,0,200,()=>now,()=>mono);
 const socket=new EventTarget() as EventTarget & {close:()=>void};socket.close=()=>{};
 const feed=new TestnetReferenceStream('BTCUSDT',()=>now,()=>socket,evidence);
 try{
  socket.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({e:'referencePrice',s:'BTCUSDT',r:'100',t:2226})}));
  const r=await feed.read('BTCUSDT');
  assert.equal(r.timestamp,2226);assert.equal(r.observedAt,2000);
  assert.deepEqual(referenceEventAges(r.timestamp,now,r.referenceClock!),{youngest:73,oldest:275});
  assert.equal(referenceForFilter(r,{avgPriceMins:0},now),100n*10n**18n);
  now=2100;mono=1001;
  assert.throws(()=>feed.snapshot('BTCUSDT'),/REFERENCE_CLOCK_UNCONFIRMED/);
 }finally{feed.close();}
});
test('uncertainty must prove both nonfuture and no older than 2000 ms',()=>{
 const r={kind:'REFERENCE_PRICE' as const,price:'100',observedAt:2000,timestamp:2226,referenceClock:clock};
 assert.equal(referenceForFilter(r,{avgPriceMins:0},2000),100n*10n**18n);
 assert.throws(()=>referenceForFilter({...r,timestamp:2300},{avgPriceMins:0},2000),/STALE_REFERENCE_PRICE/);
 assert.throws(()=>referenceForFilter({...r,timestamp:500},{avgPriceMins:0},2000),/STALE_REFERENCE_PRICE/);
 // Receipt age is inclusive: 1999 and 2000 ms pass; 2001 ms fails.
 for(const now of [2000,2001])assert.equal(referenceForFilter({...r,observedAt:1},{avgPriceMins:0},now),100n*10n**18n);
 assert.throws(()=>referenceForFilter({...r,observedAt:1},{avgPriceMins:0},2002),/STALE_REFERENCE_PRICE/);
 assert.throws(()=>referenceForFilter({...r,referenceClock:undefined},{avgPriceMins:0},2000),/STALE_REFERENCE_PRICE/);
});
test('slow, expired, malformed and wall-clock-jumped calibrations fail closed',()=>{
 for(const value of [{...clock,localStartedAt:100},{...clock,serverTime:NaN},{...clock,localReceivedAt:999}]){
  assert.throws(()=>referenceEventAges(1500,2000,value),/REFERENCE_CLOCK_UNCONFIRMED/);
 }
 assert.throws(()=>referenceEventAges(1500,31201,clock),/REFERENCE_CLOCK_UNCONFIRMED/);
 assert.throws(()=>referenceEventAges(1500,1199,clock),/REFERENCE_CLOCK_UNCONFIRMED/);
 assert.throws(()=>measuredReferenceClock(1500,1000,1200,0,100),/REFERENCE_CLOCK_UNCONFIRMED/);
 const get=measuredReferenceClock(1500,1000,1200,0,200,()=>2000,()=>900);
 assert.throws(get,/REFERENCE_CLOCK_UNCONFIRMED/);
});
