import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {ScopedTestnetJournal} from '../src/server/scopedTestnetJournal';
import {runScopedTestnetBuyOnce,firstBuyRequestId} from '../src/server/scopedTestnetBuyOnce';
import {createBinanceTestnetAdapter,testnetAccountId} from '../src/server/binanceTestnetAdapter';
const key='fixtureKey123',secret='fixtureSecret123',accountId=testnetAccountId(key);
function setup(mode='normal'){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'aq-buy-once-')),file=path.join(dir,'scope.sqlite');
 let posts=0,queries=0,filled=false,client='',now=1002,failQuery=mode==='delayed';const paths:string[]=[];
 const balance=()=>({canTrade:true,accountType:'SPOT',permissions:['SPOT'],balances:[{asset:'BTC',free:filled?'10.25':'10',locked:'0'},{asset:'USDT',free:filled?'975':'1000',locked:'0'}]});
 const zero={maker:'0',taker:'0',buyer:'0',seller:'0'};
 const order=()=>({symbol:'BTCUSDT',side:'BUY',type:'LIMIT',timeInForce:'IOC',price:'100',origQty:'0.25',executedQty:'0.25',cummulativeQuoteQty:'25',clientOrderId:client,orderId:1,status:'FILLED',transactTime:1002,updateTime:1002});
 const a=createBinanceTestnetAdapter({apiKey:key,secretKey:secret,now:()=>now,fetcher:async(url,init)=>{
  const u=new URL(String(url));assert.equal(u.origin,'https://testnet.binance.vision');paths.push((init?.method??'GET')+' '+u.pathname);
  if(init?.method==='POST'){
   assert.equal(u.pathname,'/api/v3/order');posts++;const body=new URLSearchParams(String(init.body));assert.equal(body.get('symbol'),'BTCUSDT');assert.equal(body.get('type'),'LIMIT');assert.equal(body.get('timeInForce'),'IOC');client=body.get('newClientOrderId')!;
   const observer=new ScopedTestnetJournal(file,accountId,()=>now);try{assert.ok(observer.find(firstBuyRequestId)?.sendAttemptAt);}finally{observer.close();}assert.equal(f.j.find(firstBuyRequestId)?.clientOrderId,client);
   if(mode==='before-send-error')throw Error('fixture transport');if(mode==='expired')return new Response(JSON.stringify({...order(),status:'EXPIRED',executedQty:'0',cummulativeQuoteQty:'0'}));filled=true;if(mode==='lost-response')throw Error('fixture lost response');return new Response(JSON.stringify(mode==='ack'?{symbol:'BTCUSDT',orderId:1}:order()));
  }
  if(u.pathname==='/api/v3/account')return new Response(JSON.stringify(balance()));
  if(u.pathname==='/api/v3/openOrders')return new Response('[]');
  if(u.pathname==='/api/v3/exchangeInfo')return new Response(JSON.stringify({symbols:[{symbol:'BTCUSDT',baseAsset:'BTC',quoteAsset:'USDT',status:'TRADING',isSpotTradingAllowed:true,orderTypes:['LIMIT'],filters:[{filterType:'PRICE_FILTER',minPrice:'0.01',maxPrice:'1000000',tickSize:'0.01'},{filterType:'LOT_SIZE',minQty:'0.001',maxQty:'100',stepSize:'0.001'},{filterType:'MIN_NOTIONAL',minNotional:'5'}]}],exchangeFilters:[]}));
  if(u.pathname==='/api/v3/ticker/bookTicker')return new Response(JSON.stringify({symbol:'BTCUSDT',bidPrice:'100',askPrice:'100',bidQty:'1',askQty:'1'}));
  if(u.pathname==='/api/v3/account/commission')return new Response(JSON.stringify({symbol:'BTCUSDT',standardCommission:mode==='fees'?{...zero,taker:'0.001'}:zero,specialCommission:zero,taxCommission:zero,discount:{enabledForAccount:true,enabledForSymbol:true,discountAsset:null,discount:'0.25'}}));
  if(u.pathname==='/api/v3/order'){queries++;if(!filled||failQuery)return new Response('{"code":-2013}',{status:400});assert.equal(u.searchParams.get('origClientOrderId'),client);return new Response(JSON.stringify(order()));}
  if(u.pathname==='/api/v3/myTrades')return new Response(JSON.stringify([{id:1,orderId:1,symbol:'BTCUSDT',isBuyer:true,qty:'0.25',quoteQty:'25',commission:mode==='unsupported-fee'?'0.1':'0',commissionAsset:mode==='unsupported-fee'?'BNB':'USDT'}]));
  throw Error('unexpected endpoint');
 }});
 const f={dir,file,j:new ScopedTestnetJournal(file,accountId,()=>now),a,posts:()=>posts,queries:()=>queries,paths,setNow:(n:number)=>now=n,releaseQuery:()=>failQuery=false,reopen(){this.j.close();this.j=new ScopedTestnetJournal(file,accountId,()=>now);},close(){this.j.close();fs.rmSync(dir,{recursive:true,force:true});}};
 return f;
}
test('one real-adapter fixture POST occurs only after durable claim; fills and native fees are verified',async()=>{const f=setup();try{
 f.j.initialize(await f.a.accountSnapshot());const r=await runScopedTestnetBuyOnce(f.j,f.a,()=>1002);assert.equal(r.state,'CONFIRMED');assert.equal(r.testnetOrderAttemptedThisRun,true);assert.equal(r.executedBTC,'0.25');assert.equal(r.spentUSDT,'25');assert.equal(r.capitalAudit?.ownedBTC,'0.25');assert.equal(r.capitalAudit?.allocatedCashUSDT,'75');assert.equal(f.posts(),1);assert.equal(f.queries(),1);assert.deepEqual(r.fees,[{asset:'USDT',amount:'0'}]);
 f.reopen();const repeated=await runScopedTestnetBuyOnce(f.j,f.a,()=>1002);assert.equal(repeated.testnetOrderAttemptedThisRun,false);assert.equal(repeated.executedBTC,'0.25');assert.equal(f.posts(),1);
 }finally{f.close();}});
test('lost POST reply and malformed ACK are query-recovered with no second POST',async()=>{for(const mode of ['lost-response','ack']){const f=setup(mode);try{
 f.j.initialize(await f.a.accountSnapshot());const r=await runScopedTestnetBuyOnce(f.j,f.a,()=>1002);assert.equal(r.state,'CONFIRMED');assert.equal(r.sendResponse,'UNCONFIRMED');assert.equal(f.posts(),1);f.reopen();await runScopedTestnetBuyOnce(f.j,f.a,()=>1002);assert.equal(f.posts(),1);
 }finally{f.close();}}});
test('delayed query/fees after a send survive restart and later resolve without resubmission',async()=>{const f=setup('delayed');try{
 f.j.initialize(await f.a.accountSnapshot());const r=await runScopedTestnetBuyOnce(f.j,f.a,()=>1002);assert.equal(r.state,'RECONCILIATION_REQUIRED');assert.equal(r.executedBTC,null);assert.equal(r.capitalAudit,undefined);assert.equal(f.posts(),1);
 f.reopen();f.releaseQuery();const recovered=await runScopedTestnetBuyOnce(f.j,f.a,()=>1002);assert.equal(recovered.state,'CONFIRMED');assert.equal(recovered.testnetOrderAttemptedThisRun,false);assert.equal(f.posts(),1);
 }finally{f.close();}});
test('no remote order after ambiguous transport remains unresolved forever rather than retrying',async()=>{const f=setup('before-send-error');try{
 f.j.initialize(await f.a.accountSnapshot());assert.equal((await runScopedTestnetBuyOnce(f.j,f.a,()=>1002)).state,'RECONCILIATION_REQUIRED');f.reopen();assert.equal((await runScopedTestnetBuyOnce(f.j,f.a,()=>1002)).state,'RECONCILIATION_REQUIRED');assert.equal(f.posts(),1);assert.ok(f.j.find(firstBuyRequestId)?.sendAttemptAt);
 }finally{f.close();}});
test('nonzero current fees, operator halt, missing allocation and stale data stop before any POST',async()=>{
 for(const mode of ['fees','halt','missing','stale']){const f=setup(mode);try{
 if(mode!=='missing')f.j.initialize(await f.a.accountSnapshot());if(mode==='halt')f.j.halt();
 const expected=mode==='missing'?/SCOPED_NOT_INITIALIZED/:mode==='fees'?/SCOPED_NONZERO_FEE_EXECUTION_UNSUPPORTED/:mode==='halt'?/SCOPED_HALTED/:/STALE/;
 await assert.rejects(runScopedTestnetBuyOnce(f.j,f.a,()=>mode==='stale'?5000:1002),expected);assert.equal(f.posts(),0);
 if(mode==='missing')assert.throws(()=>f.j.find(firstBuyRequestId),/NOT_INITIALIZED/);else assert.equal(f.j.find(firstBuyRequestId),undefined);
 }finally{f.close();}}
});
test('reservation failure and send-claim failure cannot reach POST',async t=>{
 for(const method of ['prepareFirstBuy','beginFirstBuySend'] as const){const f=setup();try{f.j.initialize(await f.a.accountSnapshot());const m=t.mock.method(f.j,method,()=>{throw Error('fixture disk failure');});await assert.rejects(runScopedTestnetBuyOnce(f.j,f.a,()=>1002),/disk failure/);assert.equal(f.posts(),0);m.mock.restore();}finally{f.close();}}
});
test('third-asset fees are left unresolved, never charged to an invented scoped balance',async()=>{const f=setup('unsupported-fee');try{
 f.j.initialize(await f.a.accountSnapshot());const r=await runScopedTestnetBuyOnce(f.j,f.a,()=>1002);assert.equal(r.state,'RECONCILIATION_REQUIRED');assert.equal(r.recoveryError,true);assert.equal(r.fees,null);assert.equal(r.capitalAudit,undefined);assert.equal(f.posts(),1);await runScopedTestnetBuyOnce(f.j,f.a,()=>1002);assert.equal(f.posts(),1);
 }finally{f.close();}});
test('durable send claim can only be acquired once, including after reopen and from another connection',async()=>{const f=setup();let second:ScopedTestnetJournal|undefined;try{
 f.j.initialize(await f.a.accountSnapshot());const i={requestId:firstBuyRequestId,accountId,symbol:'BTCUSDT',side:'BUY' as const,quantity:'0.25',limitPrice:'100'};assert.equal(f.j.prepareFirstBuy(i,'0').created,true);f.j.beginFirstBuySend();
 second=new ScopedTestnetJournal(f.file,accountId,()=>1002);assert.equal(second.prepareFirstBuy({...i,limitPrice:'99'},'0').created,false);assert.throws(()=>second!.beginFirstBuySend(),/ALREADY_CLAIMED/);f.reopen();assert.throws(()=>f.j.beginFirstBuySend(),/ALREADY_CLAIMED/);assert.equal(f.posts(),0);
 }finally{second?.close();f.close();}});


test('an unfilled expired IOC is a terminal result, never an automatic second attempt',async()=>{const f=setup('expired');try{
 f.j.initialize(await f.a.accountSnapshot());const r=await runScopedTestnetBuyOnce(f.j,f.a,()=>1002);assert.equal(r.state,'CONFIRMED');assert.equal(r.orderStatus,'EXPIRED');assert.equal(r.executedBTC,'0');assert.equal(r.capitalAudit?.allocatedCashUSDT,'100');assert.equal(r.capitalAudit?.ownedBTC,'0');f.reopen();await runScopedTestnetBuyOnce(f.j,f.a,()=>1002);assert.equal(f.posts(),1);
 }finally{f.close();}});
test('a crash after durable claim but before network send is query-only on restart',async()=>{const f=setup();try{
 f.j.initialize(await f.a.accountSnapshot());f.j.prepareFirstBuy({requestId:firstBuyRequestId,accountId,symbol:'BTCUSDT',side:'BUY',quantity:'0.25',limitPrice:'100'},'0');f.j.beginFirstBuySend();f.reopen();const r=await runScopedTestnetBuyOnce(f.j,f.a,()=>1002);assert.equal(r.state,'RECONCILIATION_REQUIRED');assert.equal(r.testnetOrderAttemptedThisRun,false);assert.equal(f.posts(),0);
 }finally{f.close();}});


test('operator halt between reservation and claim prevents the first POST',async t=>{const f=setup();try{
 f.j.initialize(await f.a.accountSnapshot());const original=f.j.prepareFirstBuy.bind(f.j);const m=t.mock.method(f.j,'prepareFirstBuy',(...args:Parameters<typeof original>)=>{const r=original(...args);f.j.halt();return r;});
 await assert.rejects(runScopedTestnetBuyOnce(f.j,f.a,()=>1002),/SCOPED_HALTED/);assert.equal(f.posts(),0);assert.equal(f.j.find(firstBuyRequestId)?.sendAttemptAt,undefined);m.mock.restore();
 }finally{f.close();}});
