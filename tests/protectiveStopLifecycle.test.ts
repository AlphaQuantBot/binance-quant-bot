import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {OrderExecution,type Intent} from '../src/server/orderExecution';
import {createBinanceTestnetAdapter,testnetAccountId} from '../src/server/binanceTestnetAdapter';
const key='fixtureTestnetKey',secret='fixtureTestnetSecret';
const intent:Intent={accountId:testnetAccountId(key),requestId:'stop_request_001',symbol:'BTCUSDT',side:'SELL',quantity:'1',limitPrice:'89',stopPrice:'90'};
const raw=(clientOrderId:string,patch:object={})=>({symbol:'BTCUSDT',clientOrderId,orderId:123,orderListId:-1,side:'SELL',type:'STOP_LOSS_LIMIT',timeInForce:'GTC',price:'89',stopPrice:'90',origQty:'1',executedQty:'0',cummulativeQuoteQty:'0',status:'NEW',updateTime:1000,...patch});
test('stop timeout is durably unknown; restart queries original ID and never repeats POST',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'stop-life-')),file=path.join(dir,'orders.json');let posts=0,queries=0,id='';
 const adapter=createBinanceTestnetAdapter({apiKey:key,secretKey:secret,now:()=>1000,fetcher:async(url,init)=>{if(init?.method==='POST'){posts++;const p=new URLSearchParams(String(init.body));assert.equal(p.get('type'),'STOP_LOSS_LIMIT');assert.equal(p.get('timeInForce'),'GTC');assert.equal(p.get('stopPrice'),'90');id=p.get('newClientOrderId')!;throw Error('timeout');}queries++;assert.equal(new URL(String(url)).searchParams.get('origClientOrderId'),id);return new Response(JSON.stringify(raw(id)));}});
 let engine=new OrderExecution(file,adapter);try{assert.equal((await engine.submit(intent)).status,'UNKNOWN');assert.equal((await engine.submit(intent)).status,'UNKNOWN');engine.close();engine=new OrderExecution(file,adapter);assert.equal((await engine.reconcile(intent.requestId)).status,'NEW');assert.equal((await engine.submit(intent)).status,'NEW');assert.equal(posts,1);assert.equal(queries,1);await assert.rejects(engine.submit({...intent,stopPrice:'91'}),/IDEMPOTENCY_CONFLICT/);}finally{engine.close();fs.rmSync(dir,{recursive:true,force:true});}
});
test('malformed protective requests fail before network and changed exchange trigger cannot confirm',async()=>{
 let calls=0;const a=createBinanceTestnetAdapter({apiKey:key,secretKey:secret,now:()=>1000,fetcher:async()=>{calls++;return new Response(JSON.stringify(raw('aq_'+'a'.repeat(32),{stopPrice:'80'})));}});const cid='aq_'+'a'.repeat(32);
 for(const patch of [{side:'BUY'},{limitPrice:'91'},{stopPrice:'0'}])await assert.rejects(a.submit({...intent,...patch} as Intent,cid),/INVALID_PROTECTIVE_STOP/);assert.equal(calls,0);await assert.rejects(a.query(intent,cid),/STOP_IDENTITY_MISMATCH/);
});
