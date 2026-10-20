import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHmac } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createBinanceTestnetAdapter, testnetAccountId } from '../src/server/binanceTestnetAdapter';
import { OrderExecution, type Intent, type Confirmation } from '../src/server/orderExecution';
import { settleTrades, type ExecutionTrade } from '../src/server/tradeSettlement';
const apiKey='testnetFixtureKey', secretKey='testnetFixtureSecret', cid='aq_'+'a'.repeat(32);
const intent:Intent={requestId:'request_0001',accountId:testnetAccountId(apiKey),symbol:'BTCUSDT',side:'BUY',quantity:'2'};
const order=(patch:object={})=>({clientOrderId:cid,symbol:'BTCUSDT',side:'BUY',origQty:'2',orderId:123,status:'FILLED',executedQty:'2',cummulativeQuoteQty:'200',updateTime:10,...patch});
const trade=(patch:object={})=>({id:1,orderId:123,symbol:'BTCUSDT',isBuyer:true,qty:'2',quoteQty:'200',commission:'0.000012345678901234',commissionAsset:'BNB',...patch});
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
function adapter(fetcher:typeof fetch){return createBinanceTestnetAdapter({apiKey,secretKey,fetcher,now:()=>1234567890});}
const conf:Confirmation={clientOrderId:cid,symbol:'BTCUSDT',side:'BUY',orderId:'123',status:'FILLED',executedQty:'2',quoteQty:'200',updateTime:10};
const execution=(patch:Partial<ExecutionTrade>={}):ExecutionTrade=>({tradeId:'1',orderId:'123',symbol:'BTCUSDT',side:'BUY',quantity:'2',quoteQuantity:'200',commission:'0.01',commissionAsset:'BNB',...patch});
test('signed testnet submission uses exactly one POST, fixed host, safe headers and redirect rejection',async()=>{
 let calls=0;const a=adapter(async(url,init)=>{
  calls++;const u=new URL(String(url));assert.equal(u.origin,'https://testnet.binance.vision');assert.equal(u.pathname,'/api/v3/order');assert.equal(u.search,'');assert.equal(init?.method,'POST');assert.equal(init?.redirect,'error');assert.equal((init?.headers as any)['X-MBX-APIKEY'],apiKey);
  const p=new URLSearchParams(String(init?.body)), signature=p.get('signature');p.delete('signature');assert.equal(signature,createHmac('sha256',secretKey).update(p.toString()).digest('hex'));assert.equal(p.get('newClientOrderId'),cid);assert.equal(p.get('newOrderRespType'),'FULL');assert.equal(p.get('quantity'),'2');assert.equal(p.get('timestamp'),'1234567890');return json(order());
 });assert.equal((await a.submit(intent,cid)).status,'FILLED');assert.equal(calls,1);
});
test('timeout, malformed body, 429 and 5xx never trigger another submission',async()=>{
 for(const mode of ['timeout','badjson','429','503']){
  let calls=0;const a=adapter(async()=>{calls++;if(mode==='timeout')throw Error('secretKey='+secretKey);if(mode==='badjson')return new Response('<html>');return json({code:-1007,msg:secretKey},Number(mode));});
  await assert.rejects(a.submit(intent,cid),e=>{assert.ok(!String(e).includes(secretKey));return true;});assert.equal(calls,1);
 }
});
test('wrong account and invalid client id fail before any network',async()=>{
 let calls=0;const a=adapter(async()=>{calls++;return json(order());});await assert.rejects(a.submit({...intent,accountId:'other'},cid),/ACCOUNT_MISMATCH/);await assert.rejects(a.query(intent,'bad'),/INVALID_ORDER/);assert.equal(calls,0);
});
test('query uses original client id and reads complete trades with fee assets kept separate',async()=>{
 let calls=0;const a=adapter(async(url,init)=>{calls++;const u=new URL(String(url));assert.equal(init?.method,'GET');if(u.pathname==='/api/v3/order'){assert.equal(u.searchParams.get('origClientOrderId'),cid);return json(order());}assert.equal(u.pathname,'/api/v3/myTrades');assert.equal(u.searchParams.get('orderId'),'123');assert.equal(u.searchParams.get('fromId'),'0');return json([trade({id:1,qty:'0.5',quoteQty:'50'}),trade({id:2,qty:'1.5',quoteQty:'150',commission:'0.2',commissionAsset:'USDT'})]);});
 const result=await a.query(intent,cid);assert.equal(calls,2);assert.deepEqual(result?.settlement?.fees,[{asset:'BNB',amount:'0.000012345678901234'},{asset:'USDT',amount:'0.2'}]);
});
test('missing order returns null with no trade read or resend; NEW does not invent trades',async()=>{
 let calls=0;const a=adapter(async()=>{calls++;return json({code:-2013,msg:'Order does not exist'},400);});assert.equal(await a.query(intent,cid),null);assert.equal(calls,1);
 const b=adapter(async()=>json(order({status:'NEW',executedQty:'0',cummulativeQuoteQty:'0'})));assert.deepEqual((await b.query(intent,cid))?.settlement,{trades:[],fees:[]});
});
test('ACK, mismatched identity, unavailable totals and unsafe numeric ids fail closed',async()=>{
 for(const data of [{orderId:123},order({symbol:'ETHUSDT'}),order({origQty:'3'}),order({orderId:9007199254740992}),order({cummulativeQuoteQty:'-1'}),order({executedQty:'NaN'}),order({status:'NEW'})])await assert.rejects(adapter(async()=>json(data)).submit(intent,cid));
});
test('trade list failure or missing fills cannot become zero fees',async()=>{
 for(const data of [[],[trade({qty:'1',quoteQty:'100'})],[trade({symbol:'ETHUSDT'})],[trade({orderId:456})],[trade({isBuyer:false})],[trade({commission:'-0.1'})],[trade({id:9007199254740992})]]){
  const a=adapter(async(url)=>new URL(String(url)).pathname==='/api/v3/order'?json(order()):json(data));await assert.rejects(a.query(intent,cid));
 }
 const a=adapter(async(url)=>new URL(String(url)).pathname==='/api/v3/order'?json(order()):json({code:-1003},429));await assert.rejects(a.query(intent,cid));
});
test('trade pages start at zero and advance by exact trade ID without dropping early fills',async()=>{
 let calls=0;const rows=Array.from({length:1000},(_,i)=>trade({id:i+1,qty:'0.001',quoteQty:'0.1',commission:'0'}));
 const a=adapter(async(url)=>{calls++;const u=new URL(String(url));if(u.pathname==='/api/v3/order')return json(order());if(u.searchParams.get('fromId')==='0')return json(rows);assert.equal(u.searchParams.get('fromId'),'1001');return json([trade({id:1001,qty:'1',quoteQty:'100',commission:'0.1'})]);});
 assert.equal((await a.query(intent,cid))?.settlement?.trades.length,1001);assert.equal(calls,3);
});
test('non-advancing/out-of-range trade pages and bounded page exhaustion fail closed',async()=>{
 let page=0;const a=adapter(async(url)=>{const u=new URL(String(url));if(u.pathname==='/api/v3/order')return json(order());page++;return json(Array.from({length:1000},(_,i)=>trade({id:i+1,qty:'0.001',quoteQty:'0.1'})));});await assert.rejects(a.query(intent,cid),/TRADE_CURSOR/);assert.equal(page,2);
 let pages=0;const b=adapter(async(url)=>{const u=new URL(String(url));if(u.pathname==='/api/v3/order')return json(order());pages++;const cursor=Number(u.searchParams.get('fromId'));return json(Array.from({length:1000},(_,i)=>trade({id:cursor+i,qty:'0.0001',quoteQty:'0.01'})));});await assert.rejects(b.query(intent,cid),/PAGE_LIMIT/);assert.equal(pages,10);
});
test('duplicate fills are deduplicated; conflicting fill and missing commission fail validation',()=>{
 const t=execution();assert.equal(settleTrades(conf,[t,t]).trades.length,1);assert.throws(()=>settleTrades(conf,[t,{...t,commission:'0.02'}]),/CONFLICTING/);assert.throws(()=>settleTrades(conf,[{...t,commission:undefined as any}]),/DECIMAL/);
});
test('canceled partial fill retains exact native-asset fee and filled quantity',async()=>{
 const a=adapter(async(url)=>new URL(String(url)).pathname==='/api/v3/order'?json(order({status:'CANCELED',executedQty:'0.1',cummulativeQuoteQty:'10'})):json([trade({qty:'0.1',quoteQty:'10',commissionAsset:'BTC',commission:'0.0001'})]));const r=await a.query(intent,cid);assert.equal(r?.status,'CANCELED');assert.equal(r?.executedQty,'0.1');assert.deepEqual(r?.settlement?.fees,[{asset:'BTC',amount:'0.0001'}]);
});
test('lost POST reply reconciles through GET trades and survives journal restart with no second POST',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'aq-settlement-')),file=path.join(dir,'journal.json');let posts=0,actualId='';
 const a=adapter(async(url,init)=>{const u=new URL(String(url));if(init?.method==='POST'){posts++;actualId=new URLSearchParams(String(init.body)).get('newClientOrderId')!;throw Error('reply lost');}return u.pathname==='/api/v3/order'?json(order({clientOrderId:actualId})):json([trade()]);});let engine=new OrderExecution(file,a);
 try{assert.equal((await engine.submit(intent)).status,'UNKNOWN');const result=await engine.reconcile(intent.requestId);assert.equal(result.status,'FILLED');assert.ok(result.confirmation?.settlement);engine.close();engine=new OrderExecution(file,a);assert.deepEqual(engine.list()[0],result);await engine.submit(intent);assert.equal(posts,1);}finally{engine.close();fs.rmSync(dir,{recursive:true,force:true});}
});
test('journal rejects inconsistent settlement and later mutation of already confirmed commissions',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'aq-fees-')),file=path.join(dir,'journal.json');let fee='0.01';const settlement=()=>settleTrades(conf,[execution({commission:fee})]);
 // Use the journal-generated client ID, not the fixture ID.
 const engine=new OrderExecution(file,{submit:async(i,id)=>({...conf,clientOrderId:id,settlement:settlement()}),query:async(i,id)=>({...conf,clientOrderId:id,updateTime:11,settlement:settlement()})});
 try{await engine.submit(intent);fee='0.02';await assert.rejects(engine.reconcile(intent.requestId),/SETTLED_TRADE_CHANGED/);assert.equal(engine.list()[0].confirmation?.settlement?.fees[0].amount,'0.01');}finally{engine.close();fs.rmSync(dir,{recursive:true,force:true});}
});
test('429/418 cooldown prevents further calls until provider retry interval expires',async()=>{
 for(const status of [429,418]){let calls=0,now=1000;const a=createBinanceTestnetAdapter({apiKey,secretKey,now:()=>now,fetcher:async()=>{calls++;return new Response('{}',{status,headers:{'Retry-After':'120'}});}});await assert.rejects(a.query(intent,cid),/COOLDOWN/);await assert.rejects(a.submit(intent,cid),/COOLDOWN/);assert.equal(calls,1);now+=120000;await assert.rejects(a.query(intent,cid),/COOLDOWN/);assert.equal(calls,2);}
});
const accountResponse=(patch:object={})=>({canTrade:true,accountType:'SPOT',permissions:['SPOT'],balances:[{asset:'USDT',free:'100.00000000',locked:'20.00000000'},{asset:'BTC',free:'1',locked:'0'}],...patch});
const openResponse=(patch:object={})=>({clientOrderId:'manual_order',orderId:999,symbol:'ETHUSDT',side:'BUY',status:'NEW',origQty:'2',executedQty:'0',...patch});
test('account snapshot reads whole-account balances and open orders twice, never submits',async()=>{
 const paths:string[]=[];const a=adapter(async(url,init)=>{const u=new URL(String(url));paths.push(u.pathname);assert.equal(init?.method,'GET');assert.equal(u.searchParams.has('symbol'),false);if(u.pathname==='/api/v3/account'){assert.equal(u.searchParams.get('omitZeroBalances'),'false');return json(accountResponse());}return json([openResponse()]);});
 const result=await a.accountSnapshot();assert.equal(result.accountId,intent.accountId);assert.equal(result.environment,'BINANCE_TESTNET');assert.deepEqual(paths,['/api/v3/account','/api/v3/openOrders','/api/v3/account','/api/v3/openOrders']);assert.deepEqual(result.balances[1],{asset:'USDT',free:'100',locked:'20'});assert.equal(result.openOrders[0].clientOrderId,'manual_order');
});
test('changing balance or open-order set during snapshot collection fails closed',async()=>{
 for(const mode of ['balance','orders']){let accounts=0,orders=0;const a=adapter(async(url)=>{if(new URL(String(url)).pathname==='/api/v3/account'){accounts++;return json(accountResponse(mode==='balance'&&accounts===2?{balances:[]}:{ }));}orders++;return json(mode==='orders'&&orders===2?[openResponse()]:[]);});await assert.rejects(a.accountSnapshot(),/CHANGED_DURING_READ/);}
});
test('malformed/negative/duplicate balances and invalid open-order statuses fail snapshot validation',async()=>{
 for(const bad of [accountResponse({canTrade:'true'}),accountResponse({accountType:'MARGIN'}),accountResponse({balances:[{asset:'USDT',free:'-1',locked:'0'}]}),accountResponse({balances:[{asset:'BTC',free:'1',locked:'0'},{asset:'BTC',free:'1',locked:'0'}]})])await assert.rejects(adapter(async(url)=>new URL(String(url)).pathname==='/api/v3/account'?json(bad):json([])).accountSnapshot());
 for(const bad of [[openResponse({status:'FILLED'})],[openResponse(),openResponse()],[openResponse({orderId:9007199254740992})],[openResponse({executedQty:'2'})]])await assert.rejects(adapter(async(url)=>new URL(String(url)).pathname==='/api/v3/account'?json(accountResponse()):json(bad)).accountSnapshot());
});
test('slow collection and account read error do not produce apparently fresh snapshot',async()=>{
 let now=1234567890;const a=createBinanceTestnetAdapter({apiKey,secretKey,now:()=>now,fetcher:async(url)=>{now+=3000;return new URL(String(url)).pathname==='/api/v3/account'?json(accountResponse()):json([]);}});await assert.rejects(a.accountSnapshot(),/STALE/);
 const b=adapter(async()=>json({code:-2015},401));await assert.rejects(b.accountSnapshot(),/UNCONFIRMED/);
});
