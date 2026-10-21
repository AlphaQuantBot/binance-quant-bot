import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeCommission,commissionSummary} from '../src/server/commissionRates';
import {createBinanceTestnetAdapter,testnetAccountId} from '../src/server/binanceTestnetAdapter';
const key='fixtureTestnetKey',secret='fixtureTestnetSecret',accountId=testnetAccountId(key);
const raw=()=>({symbol:'BTCUSDT',standardCommission:{maker:'0.001',taker:'0.002',buyer:'0.0001',seller:'0.0002'},specialCommission:{maker:'0.00001',taker:'0.00002',buyer:'0.00003',seller:'0.00004'},taxCommission:{maker:'0.000001',taker:'0.000002',buyer:'0.000003',seller:'0.000004'},discount:{enabledForAccount:true,enabledForSymbol:true,discountAsset:'BNB',discount:'0.25'}});
test('current totals include liquidity plus side in all three components without assumed discount',()=>{const s=normalizeCommission(raw(),accountId,'BTCUSDT',1000,1001),r=commissionSummary(s,accountId,'BTCUSDT',1002);assert.equal(r.sell.maker,'0.001255');assert.equal(r.sell.taker,'0.002266');assert.equal(r.buy.maker,'0.001144');assert.equal(r.discountApplied,false);assert.equal(r.reservationAuthorized,false);});
test('missing components, numeric rates, rebates and malformed discounts are rejected',()=>{for(const mutate of [(r:any)=>delete r.taxCommission,(r:any)=>r.standardCommission.maker=0.001,(r:any)=>r.specialCommission.seller='-0.1',(r:any)=>r.discount.enabledForAccount='true',(r:any)=>r.discount.discount='1.01']){const r=raw();mutate(r);assert.throws(()=>normalizeCommission(r,accountId,'BTCUSDT',1000,1001));}});
test('wrong symbol, future clock and slow observations cannot produce current evidence',()=>{assert.throws(()=>normalizeCommission(raw(),accountId,'ETHUSDT',1000,1001));assert.throws(()=>normalizeCommission(raw(),accountId,'BTCUSDT',1000,3001));const s=normalizeCommission(raw(),accountId,'BTCUSDT',1000,1001);assert.throws(()=>commissionSummary(s,accountId,'BTCUSDT',1000));assert.throws(()=>commissionSummary(s,accountId,'BTCUSDT',4000));});
test('zero rates are valid observations and total over 100 percent is unsupported',()=>{const r=raw();for(const g of [r.standardCommission,r.specialCommission,r.taxCommission])for(const k of Object.keys(g))g[k as keyof typeof g]='0';assert.equal(commissionSummary(normalizeCommission(r,accountId,'BTCUSDT',1000,1001),accountId,'BTCUSDT',1001).sell.taker,'0');r.standardCommission.seller='0.9';r.taxCommission.taker='0.2';assert.throws(()=>normalizeCommission(r,accountId,'BTCUSDT',1000,1001));});
test('actual adapter issues one authenticated fixed-testnet GET, never an order request',async()=>{let calls=0;const a=createBinanceTestnetAdapter({apiKey:key,secretKey:secret,now:()=>1000,fetcher:async(url,init)=>{calls++;const u=new URL(String(url));assert.equal(u.origin,'https://testnet.binance.vision');assert.equal(u.pathname,'/api/v3/account/commission');assert.equal(u.searchParams.get('symbol'),'BTCUSDT');assert.ok(u.searchParams.get('signature'));assert.equal(init?.method,'GET');assert.equal((init?.headers as any)['X-MBX-APIKEY'],key);return new Response(JSON.stringify(raw()));}});assert.equal((await a.commissionRates('BTCUSDT')).accountId,accountId);assert.equal(calls,1);});
test('provider failures have no fallback rate or repeated request',async()=>{for(const mode of ['offline','bad','429']){let calls=0;const a=createBinanceTestnetAdapter({apiKey:key,secretKey:secret,now:()=>1000,fetcher:async()=>{calls++;if(mode==='offline')throw Error(secret);return mode==='bad'?new Response('{}'):new Response('{}',{status:429});}});await assert.rejects(a.commissionRates('BTCUSDT'));assert.equal(calls,1);}});


test('explicitly disabled discount can omit its asset without inventing one or reducing fees',()=>{
 for(const asset of [null,undefined,'']){const r:any=raw();r.discount={enabledForAccount:false,enabledForSymbol:false,discountAsset:asset,discount:'0'};
 const s=normalizeCommission(r,accountId,'BTCUSDT',1000,1001);
 assert.equal(s.discount.discountAsset,null);assert.equal(s.discount.discount,'0');
 const summary=commissionSummary(s,accountId,'BTCUSDT',1001);
 assert.equal(summary.buy.taker,'0.002155');assert.equal(summary.discountApplied,false);assert.equal(summary.reservationAuthorized,false);
 }
});
test('missing or empty enabled discount asset stays blocked; malformed types remain rejected',()=>{
 for(const flags of [[true,true],[true,false],[false,true]])for(const asset of [undefined,'']){
 const r:any=raw();r.discount={enabledForAccount:flags[0],enabledForSymbol:flags[1],discountAsset:asset,discount:'0'};
 assert.throws(()=>normalizeCommission(r,accountId,'BTCUSDT',1000,1001),/COMMISSION_DISCOUNT_ASSET/);
 }
 for(const asset of [123,{},[],false]){const r:any=raw();r.discount={enabledForAccount:false,enabledForSymbol:false,discountAsset:asset,discount:'0'};assert.throws(()=>normalizeCommission(r,accountId,'BTCUSDT',1000,1001),/COMMISSION_DISCOUNT_ASSET/);}
 const r:any=raw();r.discount={enabledForAccount:false,enabledForSymbol:false,discountAsset:null,discount:null};assert.throws(()=>normalizeCommission(r,accountId,'BTCUSDT',1000,1001));
});


test('observed enabled flags with null asset retain incomplete metadata and full undiscounted fees',()=>{
 const r:any=raw();r.discount.discountAsset=null;
 const s=normalizeCommission(r,accountId,'BTCUSDT',1000,1001);
 assert.equal(s.discount.enabledForAccount,true);assert.equal(s.discount.enabledForSymbol,true);assert.equal(s.discount.discountAsset,null);assert.equal(s.discount.discount,'0.25');
 const summary=commissionSummary(s,accountId,'BTCUSDT',1001);
 assert.equal(summary.discountMetadataComplete,false);assert.equal(summary.discountApplied,false);assert.equal(summary.reservationAuthorized,false);assert.equal(summary.buy.taker,'0.002155');
 for(const mutate of [(x:any)=>x.discount.discount=0.25,(x:any)=>x.discount.discount='1.01',(x:any)=>delete x.taxCommission]){const invalid:any=raw();invalid.discount.discountAsset=null;mutate(invalid);assert.throws(()=>normalizeCommission(invalid,accountId,'BTCUSDT',1000,1001));}
});
