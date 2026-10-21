import {removeSnapshotFixtureCompanion} from './fixtures/durableSnapshot';
import {writeSnapshotFixture} from './fixtures/durableSnapshot';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { OrderExecution, type Intent, type Confirmation, type Adapter } from '../src/server/orderExecution';
const intent:Intent={requestId:'request_0001',accountId:'test_account',symbol:'BTCUSDT',side:'BUY',quantity:'2'};
const confirmed=(i:Intent,id:string,patch:Partial<Confirmation>={}):Confirmation=>({clientOrderId:id,symbol:i.symbol,side:i.side,orderId:'123',status:'NEW',executedQty:'0',quoteQty:'0',updateTime:1,...patch});
function setup(adapter:Adapter){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'aq-order-'));const file=path.join(dir,'orders.json');return {dir,file,engine:new OrderExecution(file,adapter)};}
function clean(s:ReturnType<typeof setup>){s.engine.close();fs.rmSync(s.dir,{recursive:true,force:true});}
test('intent is durable before network; concurrent identical requests submit only once',async()=>{
 let calls=0,release!:()=>void;const wait=new Promise<void>(r=>release=r);
 const s=setup({submit:async(i,id)=>{calls++;assert.equal(JSON.parse(fs.readFileSync(s.file,'utf8')).orders[0].status,'SUBMITTING');await wait;return confirmed(i,id);},query:async()=>null});
 try{const first=s.engine.submit(intent);assert.equal((await s.engine.submit(intent)).status,'SUBMITTING');assert.throws(()=>s.engine.close(),/SUBMISSION/);release();assert.equal((await first).status,'NEW');assert.equal(calls,1);assert.equal(fs.statSync(s.file).mode&0o777,0o600);}finally{clean(s);}
});
test('lost response persists UNKNOWN, blocks new account orders and never retries on restart or absent query',async()=>{
 let calls=0;const adapter:Adapter={submit:async()=>{calls++;throw Error('timeout after exchange acceptance');},query:async()=>null};const s=setup(adapter);
 try{assert.equal((await s.engine.submit(intent)).status,'UNKNOWN');s.engine.close();s.engine=new OrderExecution(s.file,adapter);assert.equal((await s.engine.submit(intent)).status,'UNKNOWN');assert.equal((await s.engine.reconcile(intent.requestId)).status,'UNKNOWN');await assert.rejects(s.engine.submit({...intent,requestId:'request_0002'}),/RECONCILIATION/);assert.equal(calls,1);}finally{clean(s);}
});
test('partial fill and cancellation preserve confirmed quantities; duplicate/stale events do not double count',async()=>{
 let result:Partial<Confirmation>={status:'PARTIALLY_FILLED',executedQty:'0.5',quoteQty:'50',updateTime:2};const s=setup({submit:async(i,id)=>confirmed(i,id),query:async(i,id)=>confirmed(i,id,result)});
 try{await s.engine.submit(intent);await s.engine.reconcile(intent.requestId);assert.deepEqual(await s.engine.reconcile(intent.requestId),s.engine.list()[0]);result={status:'NEW',updateTime:1};assert.equal((await s.engine.reconcile(intent.requestId)).status,'PARTIALLY_FILLED');result={status:'CANCELED',executedQty:'0.5',quoteQty:'50',updateTime:3};const canceled=await s.engine.reconcile(intent.requestId);assert.equal(canceled.confirmation?.executedQty,'0.5');assert.equal(canceled.status,'CANCELED');result={status:'FILLED',executedQty:'2',quoteQty:'200',updateTime:4};await assert.rejects(s.engine.reconcile(intent.requestId),/TERMINAL_CHANGED/);}finally{clean(s);}
});
test('ACK or malformed response is not treated as a fill; unknown blocks trading',async()=>{
 const s=setup({submit:async(i,id)=>confirmed(i,id,{status:'FILLED',executedQty:'0',quoteQty:'0'}),query:async()=>null});try{assert.equal((await s.engine.submit(intent)).status,'UNKNOWN');assert.equal(s.engine.list()[0].confirmation,undefined);}finally{clean(s);}
});
test('same request with changed parameters is a conflict, not another order',async()=>{
 let calls=0;const s=setup({submit:async(i,id)=>{calls++;return confirmed(i,id);},query:async()=>null});try{await s.engine.submit(intent);await assert.rejects(s.engine.submit({...intent,quantity:'3'}),/IDEMPOTENCY_CONFLICT/);assert.equal(calls,1);}finally{clean(s);}
});
test('crash recovery converts persisted SUBMITTING to UNKNOWN without network',async()=>{
 let calls=0;const adapter:Adapter={submit:async(i,id)=>{calls++;return confirmed(i,id);},query:async()=>null};const s=setup(adapter);
 try{await s.engine.submit(intent);s.engine.close();const data=JSON.parse(fs.readFileSync(s.file,'utf8'));data.orders[0].status='SUBMITTING';delete data.orders[0].confirmation;writeSnapshotFixture(s.file,data);s.engine=new OrderExecution(s.file,adapter);assert.equal(s.engine.list()[0].status,'UNKNOWN');await s.engine.submit(intent);assert.equal(calls,1);}finally{clean(s);}
});
test('exclusive process lock and corrupt journal fail closed',()=>{
 const adapter:Adapter={submit:async(i,id)=>confirmed(i,id),query:async()=>null};const s=setup(adapter);
 try{assert.throws(()=>new OrderExecution(s.file,adapter),/EEXIST/);s.engine.close();fs.writeFileSync(s.file,'broken');assert.throws(()=>new OrderExecution(s.file,adapter));fs.unlinkSync(s.file);removeSnapshotFixtureCompanion(s.file);s.engine=new OrderExecution(s.file,adapter);}finally{clean(s);}
});
test('disk failure before submission sends nothing',async()=>{
 let calls=0;const s=setup({submit:async(i,id)=>{calls++;return confirmed(i,id);},query:async()=>null});fs.mkdirSync(s.file);
 try{await assert.rejects(s.engine.submit(intent));assert.equal(calls,0);await assert.rejects(s.engine.submit(intent),/JOURNAL_CLOSED/);}finally{fs.rmSync(s.dir,{recursive:true,force:true});}
});
test('query mismatch, quantity regression and invalid decimal are rejected',async()=>{
 let patch:Partial<Confirmation>={symbol:'ETHUSDT'};const s=setup({submit:async(i,id)=>confirmed(i,id,{status:'PARTIALLY_FILLED',executedQty:'1',quoteQty:'100'}),query:async(i,id)=>confirmed(i,id,patch)});
 try{await s.engine.submit(intent);await assert.rejects(s.engine.reconcile(intent.requestId),/INVALID_CONFIRMATION/);patch={status:'PARTIALLY_FILLED',executedQty:'0.5',quoteQty:'50',updateTime:2};await assert.rejects(s.engine.reconcile(intent.requestId),/TOTALS_REGRESSED/);await assert.rejects(s.engine.submit({...intent,requestId:'request_0002',quantity:'NaN'}),/INVALID_DECIMAL/);}finally{clean(s);}
});
test('confirmed fill survives restart without inventing price, fees or local balance',async()=>{
 const adapter:Adapter={submit:async(i,id)=>confirmed(i,id,{status:'FILLED',executedQty:'2',quoteQty:'213.456789123456789',updateTime:5}),query:async()=>null};const s=setup(adapter);
 try{const first=await s.engine.submit(intent);s.engine.close();s.engine=new OrderExecution(s.file,adapter);assert.deepEqual(s.engine.list()[0],first);assert.equal(first.confirmation?.quoteQty,'213.456789123456789');assert.equal('balance' in first,false);}finally{clean(s);}
});
test('unknown is resolved only by matching exchange query, then the account may continue',async()=>{
 let calls=0;const s=setup({submit:async(i,id)=>{calls++;if(calls===1)throw Error('lost');return confirmed(i,id);},query:async(i,id)=>confirmed(i,id,{status:'FILLED',executedQty:'2',quoteQty:'200'})});
 try{await s.engine.submit(intent);assert.equal((await s.engine.reconcile(intent.requestId)).status,'FILLED');assert.equal((await s.engine.submit({...intent,requestId:'request_0002'})).status,'NEW');assert.equal(calls,2);}finally{clean(s);}
});
test('query transport failure leaves unknown and cannot release the account block',async()=>{
 let calls=0;const s=setup({submit:async()=>{calls++;throw Error('lost');},query:async()=>{throw Error('offline');}});
 try{await s.engine.submit(intent);await assert.rejects(s.engine.reconcile(intent.requestId),/offline/);await assert.rejects(s.engine.submit({...intent,requestId:'request_0002'}),/RECONCILIATION/);assert.equal(calls,1);}finally{clean(s);}
});
test('rejection is distinct from fill and a second process cannot ignore a stale lock',async()=>{
 const adapter:Adapter={submit:async(i,id)=>confirmed(i,id,{status:'REJECTED'}),query:async()=>null};const s=setup(adapter);
 try{assert.equal((await s.engine.submit(intent)).status,'REJECTED');s.engine.close();fs.writeFileSync(s.file+'.lock','old process');assert.throws(()=>new OrderExecution(s.file,adapter),/EEXIST/);fs.unlinkSync(s.file+'.lock');s.engine=new OrderExecution(s.file,adapter);}finally{clean(s);}
});
