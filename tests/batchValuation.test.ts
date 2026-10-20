import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeValuationMarks} from '../src/server/valuationMarks';
import {valueAccount} from '../src/server/accountValuation';
import {createBinanceTestnetAdapter} from '../src/server/binanceTestnetAdapter';
import type {AccountSnapshot} from '../src/server/accountSnapshot';
const names=Array.from({length:600},(_,i)=>'ASSET'+i).concat('这是测试币');
const info=(assets=names)=>({symbols:assets.map(baseAsset=>({symbol:baseAsset+'USDT',baseAsset,quoteAsset:'USDT',status:'TRADING',isSpotTradingAllowed:true}))});
const ticks=(assets=names)=>assets.map(asset=>({symbol:asset+'USDT',bidPrice:'2',askPrice:'3',bidQty:'10',askQty:'10'}));
const snapshot=():AccountSnapshot=>({environment:'BINANCE_TESTNET',accountId:'account1',startedAt:1000,observedAt:1001,canTrade:true,openOrders:[],balances:names.map(asset=>({asset,free:'1',locked:'0.5'})).concat({asset:'USDT',free:'100',locked:'0'})});
const reader=()=>({accountSnapshot:async()=>snapshot(),tradeContext:async()=>{throw Error('must not fetch each asset');},valuationMarks:async(assets:string[])=>normalizeValuationMarks(info(),ticks(),assets,1000,1001)});
test('hundreds of holdings including Unicode use one bulk read and exact free-plus-locked values',async()=>{
 let reads=0;const base=reader();const r=await valueAccount({...base,valuationMarks:async assets=>{reads++;return base.valuationMarks(assets);}},'account1',()=>1002);
 assert.equal(reads,1);assert.equal(r.complete,true);assert.equal(r.assets.length,602);assert.equal(r.currentEquityUSDT,'1903');assert.equal(r.dailyRiskAuthorized,false);assert.equal(r.assets.find(a=>a.asset==='这是测试币')?.valueUSDT,'3');
});
test('missing markets, zero quotes and malformed books preserve unpriced holdings and block total',async()=>{
 const t=ticks();t[0].bidPrice='0';t[1].askPrice='1';const m=info();m.symbols[2].isSpotTradingAllowed=false;
 const r=await valueAccount({...reader(),valuationMarks:async assets=>normalizeValuationMarks(m,t.slice(0,-1),assets,1000,1001)},'account1',()=>1002);
 assert.equal(r.complete,false);assert.equal(r.currentEquityUSDT,null);assert.equal(r.assets.length,602);assert.deepEqual(new Set(r.unpricedAssets),new Set(['ASSET0','ASSET1','ASSET2','这是测试币']));
});
test('duplicate/mismatched batch identities and stale quotes never produce account equity',async()=>{
 const marks=await reader().valuationMarks(names);
 for(const rows of [[...marks,marks[0]],[{...marks[0],symbol:'WRONG'}],marks.map(m=>({...m,startedAt:1}))]){
 const r=await valueAccount({...reader(),valuationMarks:async()=>rows},'account1',()=>3000);assert.equal(r.complete,false);assert.equal(r.currentEquityUSDT,null);
 }
 assert.throws(()=>normalizeValuationMarks(info(),[...ticks(),ticks()[0]],names,1000,1001),/DUPLICATE/);
});
test('bulk provider failure or absent batch capability cannot silently drop holdings or fan out requests',async()=>{
 for(const valuationMarks of [undefined,async()=>{throw Error('secret transport detail');}]){
 let calls=0;const r=await valueAccount({...reader(),valuationMarks,tradeContext:async()=>{calls++;throw Error('unexpected');}},'account1',()=>1002);
 assert.equal(calls,0);assert.equal(r.complete,false);assert.equal(r.currentEquityUSDT,null);assert.equal(r.assets.length,602);assert.equal(r.unpricedAssets.length,601);assert.equal(JSON.stringify(r).includes('secret transport detail'),false);
 }
});
test('final account changes and quote age remain enforced after batch reads',async()=>{
 let accounts=0;const r=await valueAccount({...reader(),accountSnapshot:async()=>{const s=snapshot();if(accounts++)s.balances[0].free='2';return s;}},'account1',()=>1002);
 assert.ok(r.issues.includes('ACCOUNT_CHANGED_DURING_VALUATION'));assert.equal(r.currentEquityUSDT,null);
 accounts=0;const stale=await valueAccount({...reader(),accountSnapshot:async()=>{accounts++;return snapshot();}},'account1',()=>accounts>=2?4000:1002);
 assert.ok(stale.issues.some(i=>i.startsWith('STALE_PRICE:')));assert.equal(stale.currentEquityUSDT,null);
});
test('testnet batch adapter uses exactly two public GETs without credentials or symbol fan-out',async()=>{
 const paths:string[]=[];const a=createBinanceTestnetAdapter({apiKey:'fixtureKey123',secretKey:'fixtureSecret123',now:()=>1001,fetcher:async(url,init)=>{
 const u=new URL(String(url));paths.push(u.pathname);assert.equal(u.origin,'https://testnet.binance.vision');assert.equal(u.searchParams.has('signature'),false);assert.equal(init?.method,'GET');assert.equal((init?.headers as any)?.['X-MBX-APIKEY'],undefined);
 return new Response(JSON.stringify(u.pathname.endsWith('exchangeInfo')?info():ticks()));
 }});const marks=await a.valuationMarks(names);assert.equal(marks.length,601);assert.deepEqual(paths,['/api/v3/exchangeInfo','/api/v3/ticker/bookTicker']);
});
