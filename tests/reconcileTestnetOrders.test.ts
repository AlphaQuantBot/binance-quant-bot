import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { OrderExecution, type Intent, type Adapter } from '../src/server/orderExecution';
import { reconcileTestnetOrders } from '../src/server/reconcileTestnetOrders';
import { settleTrades } from '../src/server/tradeSettlement';
const intent:Intent={requestId:'request_0001',accountId:'testnet_fixture',symbol:'BTCUSDT',side:'BUY',quantity:'2'};
test('operator reconciliation persists verified snapshot with GET-only adapter usage',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'aq-readonly-')),file=path.join(dir,'journal');let reads=0,posts=0;
 const seed=new OrderExecution(file,{submit:async()=>{throw Error('lost');},query:async()=>null});await seed.submit(intent);seed.close();
 const adapter:Adapter={submit:async()=>{posts++;throw Error('MUST_NOT_SUBMIT');},query:async(i,id)=>{reads++;const order={clientOrderId:id,symbol:i.symbol,side:i.side,orderId:'123',status:'FILLED' as const,executedQty:'2',quoteQty:'200',updateTime:5};return {...order,settlement:settleTrades(order,[{tradeId:'1',orderId:'123',symbol:i.symbol,side:i.side,quantity:'2',quoteQuantity:'200',commission:'0.1',commissionAsset:'USDT'}])};}};
 try{const r=await reconcileTestnetOrders(file,intent.accountId,adapter);assert.equal(reads,1);assert.equal(posts,0);assert.equal(r[0].verified,true);assert.deepEqual(r[0].fees,[{asset:'USDT',amount:'0.1'}]);await assert.rejects(reconcileTestnetOrders(file,'wrong_account',adapter),/ACCOUNT_MISMATCH/);assert.equal(reads,1);}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('missing journal and query failures cannot submit or fabricate verification',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'aq-readonly-')),file=path.join(dir,'journal');let posts=0;const adapter:Adapter={submit:async()=>{posts++;throw Error('MUST_NOT_SUBMIT');},query:async()=>{throw Error('secret response');}};
 try{await assert.rejects(reconcileTestnetOrders(file,intent.accountId,adapter),/NOT_FOUND/);assert.equal(fs.existsSync(file+'.lock'),false);const seed=new OrderExecution(file,adapter);await seed.submit(intent);seed.close();posts=0;const results=await reconcileTestnetOrders(file,intent.accountId,adapter);assert.equal(posts,0);assert.equal(results[0].verified,false);assert.equal(results[0].status,'UNKNOWN');assert.equal(JSON.stringify(results).includes('secret response'),false);}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('missing remote order cannot reuse old verified settlement as a fresh successful check',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'aq-readonly-')),file=path.join(dir,'journal');
 const a:Adapter={submit:async(i,id)=>{const order={clientOrderId:id,symbol:i.symbol,side:i.side,orderId:'123',status:'NEW' as const,executedQty:'0',quoteQty:'0',updateTime:1};return {...order,settlement:settleTrades(order,[])};},query:async()=>null};
 const seed=new OrderExecution(file,a);await seed.submit(intent);seed.close();
 try{const results=await reconcileTestnetOrders(file,intent.accountId,a);assert.equal(results[0].verified,false);}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
