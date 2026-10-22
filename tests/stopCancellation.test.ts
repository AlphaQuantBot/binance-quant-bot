import {writeSnapshotFixture} from './fixtures/durableSnapshot';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {OrderExecution,type Intent,type Confirmation,type Adapter} from '../src/server/orderExecution';
import {createBinanceTestnetAdapter,testnetAccountId} from '../src/server/binanceTestnetAdapter';
const key='testnetFixtureKey',secret='testnetFixtureSecret';
const intent:Intent={requestId:'cancel_stop_001',accountId:testnetAccountId(key),symbol:'BTCUSDT',side:'SELL',quantity:'2',limitPrice:'89',stopPrice:'90'};
const conf=(cid:string,patch:Partial<Confirmation>={}):Confirmation=>({clientOrderId:cid,symbol:'BTCUSDT',side:'SELL',orderId:'12',status:'NEW',executedQty:'0',quoteQty:'0',updateTime:1000,...patch});
async function fixture(run:(file:string)=>Promise<void>){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cancel-stop-'));try{await run(path.join(dir,'journal.json'));}finally{fs.rmSync(dir,{recursive:true,force:true});}}
test('ambiguous cancellation survives restart, blocks new orders and never sends DELETE twice',()=>fixture(async file=>{
 let deletes=0,resolved=false,cid='';const a:Adapter={submit:async(i,id)=>{cid=id;return conf(id);},cancel:async()=>{deletes++;assert.equal(JSON.parse(fs.readFileSync(file,'utf8')).orders[0].cancelState,'REQUESTING');throw Error('timeout');},query:async()=>resolved?conf(cid,{status:'CANCELED',updateTime:1001}):null};
 let e=new OrderExecution(file,a);try{await e.submit(intent);assert.equal((await e.cancelStop(intent.requestId)).cancelState,'UNKNOWN');await assert.rejects(e.submit({...intent,requestId:'another_stop_001'}),/RECONCILIATION_REQUIRED/);e.close();e=new OrderExecution(file,a);assert.equal((await e.cancelStop(intent.requestId)).cancelState,'UNKNOWN');assert.equal(deletes,1);resolved=true;assert.equal((await e.reconcile(intent.requestId)).cancelState,'RESOLVED');assert.equal(e.list()[0].status,'CANCELED');assert.equal(deletes,1);}finally{e.close();}
}));
test('NEW after cancellation is not cancellation confirmation',()=>fixture(async file=>{let cid='';const e=new OrderExecution(file,{submit:async(i,id)=>{cid=id;return conf(id);},cancel:async()=>{},query:async()=>conf(cid)});try{await e.submit(intent);const r=await e.cancelStop(intent.requestId);assert.equal(r.status,'NEW');assert.equal(r.cancelState,'UNKNOWN');}finally{e.close();}}));
test('fill racing cancellation is recorded as FILLED, not CANCELED',()=>fixture(async file=>{let cid='';const settlement={trades:[{tradeId:'1',orderId:'12',symbol:'BTCUSDT',side:'SELL' as const,quantity:'2',quoteQuantity:'180',commission:'0.18',commissionAsset:'USDT'}],fees:[{asset:'USDT',amount:'0.18'}]};const e=new OrderExecution(file,{submit:async(i,id)=>{cid=id;return conf(id);},cancel:async()=>{throw Error('already filled');},query:async()=>conf(cid,{status:'FILLED',executedQty:'2',quoteQty:'180',updateTime:1001,settlement})});try{await e.submit(intent);const r=await e.cancelStop(intent.requestId);assert.equal(r.status,'FILLED');assert.equal(r.cancelState,'RESOLVED');assert.deepEqual(r.confirmation?.settlement,settlement);}finally{e.close();}}));
test('terminal partial fill without fee evidence remains unresolved',()=>fixture(async file=>{let cid='';const e=new OrderExecution(file,{submit:async(i,id)=>{cid=id;return conf(id);},cancel:async()=>{},query:async()=>conf(cid,{status:'CANCELED',executedQty:'1',quoteQty:'90',updateTime:1001})});try{await e.submit(intent);assert.equal((await e.cancelStop(intent.requestId)).cancelState,'UNKNOWN');}finally{e.close();}}));
test('non-stop orders cannot invoke stop cancellation',()=>fixture(async file=>{const e=new OrderExecution(file,{submit:async(i,id)=>conf(id),query:async()=>null,cancel:async()=>{throw Error('must not call');}});try{const i={...intent,stopPrice:undefined};await e.submit(i);await assert.rejects(e.cancelStop(i.requestId),/STOP_CANCEL_UNAVAILABLE/);}finally{e.close();}}));
test('adapter DELETE is signed, fixed-host, single-order; query accepts only bound terminal cancel alias',async()=>{
 const cid='aq_'+'a'.repeat(32),alias='ac_'+'b'.repeat(32);let calls=0;
 const a=createBinanceTestnetAdapter({apiKey:key,secretKey:secret,now:()=>1000,fetcher:async(url,init)=>{calls++;const u=new URL(String(url));assert.equal(u.origin,'https://testnet.binance.vision');assert.equal(u.pathname,'/api/v3/order');assert.equal(u.searchParams.get('orderId'),'12');assert.ok(u.searchParams.get('signature'));if(init?.method==='DELETE'){assert.equal(u.searchParams.get('origClientOrderId'),cid);assert.equal(u.searchParams.get('newClientOrderId'),alias);return new Response(JSON.stringify({status:'CANCELED'}));}assert.equal(init?.method,'GET');return new Response(JSON.stringify({symbol:'BTCUSDT',clientOrderId:alias,orderId:12,orderListId:-1,side:'SELL',type:'STOP_LOSS_LIMIT',timeInForce:'GTC',price:'89',stopPrice:'90',origQty:'2',executedQty:'0',cummulativeQuoteQty:'0',status:'CANCELED',updateTime:1001}));}});
 await a.cancel!(intent,cid,'12',alias);const c=await a.query(intent,cid,{orderId:'12',clientOrderId:alias});assert.equal(c?.clientOrderId,cid);assert.equal(c?.status,'CANCELED');assert.equal(calls,2);
});
test('crash with REQUESTING on disk recovers UNKNOWN without cancel replay',()=>fixture(async file=>{
 let cid='',deletes=0;const a:Adapter={submit:async(i,id)=>{cid=id;return conf(id);},cancel:async()=>{deletes++;},query:async()=>null};let e=new OrderExecution(file,a);await e.submit(intent);e.close();const saved=JSON.parse(fs.readFileSync(file,'utf8'));saved.orders[0].cancelState='REQUESTING';writeSnapshotFixture(file,saved);e=new OrderExecution(file,a);try{assert.equal(e.list()[0].cancelState,'UNKNOWN');await e.cancelStop(intent.requestId);await e.reconcile(intent.requestId);assert.equal(deletes,0);}finally{e.close();}
}));
test('unrelated cancellation alias and order ID cannot resolve a retained cancellation',async()=>{
 const cid='aq_'+'a'.repeat(32),alias='ac_'+'b'.repeat(32);
 for(const patch of [{clientOrderId:'ac_'+'c'.repeat(32)},{orderId:13},{status:'NEW'}]){
 const a=createBinanceTestnetAdapter({apiKey:key,secretKey:secret,now:()=>1000,fetcher:async()=>new Response(JSON.stringify({symbol:'BTCUSDT',clientOrderId:alias,orderId:12,orderListId:-1,side:'SELL',type:'STOP_LOSS_LIMIT',timeInForce:'GTC',price:'89',stopPrice:'90',origQty:'2',executedQty:'0',cummulativeQuoteQty:'0',status:'CANCELED',updateTime:1000,...patch}))});
 await assert.rejects(a.query(intent,cid,{orderId:'12',clientOrderId:alias}),/IDENTITY_MISMATCH/);
 }
});
