import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createBinanceTestnetAdapter } from '../src/server/binanceTestnetAdapter';
const now=1234567890;
const filter=(avgPriceMins=5)=>({filterType:'PERCENT_PRICE',multiplierDown:'0.9',multiplierUp:'1.1',avgPriceMins});
const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status});
function setup(ref:any,options:{status?:number;mins?:number;window?:number;timestamp?:number;trades?:any[];filters?:any[]}={}){
 const calls:string[]=[];const adapter=createBinanceTestnetAdapter({apiKey:'fixtureKey',secretKey:'fixtureSecret',now:()=>now,fetcher:async(url,init)=>{
  const u=new URL(String(url));calls.push(u.pathname);assert.equal(init?.method,'GET');assert.equal(u.searchParams.has('signature'),false);
  switch(u.pathname){case '/api/v3/exchangeInfo':return json({symbols:[{symbol:'BTCUSDT',baseAsset:'BTC',quoteAsset:'USDT',status:'TRADING',isSpotTradingAllowed:true,orderTypes:['LIMIT'],filters:options.filters??[filter(options.window??5)]}],exchangeFilters:[]});
  case '/api/v3/referencePrice':return json(ref,options.status??200);
  case '/api/v3/avgPrice':return json({mins:options.mins??5,price:'100',closeTime:options.timestamp??now});
  case '/api/v3/trades':assert.equal(u.searchParams.get('limit'),'1');return json(options.trades??[{price:'100',time:now}]);
  case '/api/v3/ticker/bookTicker':return json({symbol:'BTCUSDT',bidPrice:'100',askPrice:'100',bidQty:'2',askQty:'2'});
  default:throw Error('UNEXPECTED_REQUEST');}
 }});return {adapter,calls};
}
test('non-null exchange reference takes precedence; no average-price substitution',async()=>{
 const s=setup({symbol:'BTCUSDT',referencePrice:'99.5',timestamp:now});const c=await s.adapter.tradeContext('BTCUSDT');assert.equal(c.reference?.kind,'REFERENCE_PRICE');assert.equal(c.reference?.price,'99.5');assert.equal(s.calls.includes('/api/v3/avgPrice'),false);
});
test('only explicit null or documented never-set error permits matching-window average',async()=>{
 for(const [ref,status] of [[{symbol:'BTCUSDT',referencePrice:null},200],[{code:-2043,msg:'never set'},400]] as const){const s=setup(ref,{status});const c=await s.adapter.tradeContext('BTCUSDT');assert.equal(c.reference?.kind,'AVERAGE_PRICE');assert.equal(c.reference?.absenceConfirmed,true);assert.equal(c.reference?.avgPriceMins,5);}
});
test('unknown/malformed/failed reference calls cannot fall back to averages',async()=>{
 for(const [ref,status] of [[{},200],[{symbol:'ETHUSDT',referencePrice:null},200],[{code:-2043},404],[{code:-1007},503],[{symbol:'BTCUSDT',referencePrice:'0',timestamp:now},200]] as const){const s=setup(ref,{status});await assert.rejects(s.adapter.tradeContext('BTCUSDT'));assert.equal(s.calls.includes('/api/v3/avgPrice'),false);}
});
test('wrong average window, mixed windows and stale reference/average fail closed',async()=>{
 for(const s of [setup({symbol:'BTCUSDT',referencePrice:null},{mins:1}),setup({symbol:'BTCUSDT',referencePrice:null},{filters:[filter(5),filter(1)]}),setup({symbol:'BTCUSDT',referencePrice:'100',timestamp:now-3000}),setup({symbol:'BTCUSDT',referencePrice:null},{timestamp:now-3000})])await assert.rejects(s.adapter.tradeContext('BTCUSDT'),/REFERENCE/);
});
test('zero-minute filter uses last trade only after confirmed reference absence',async()=>{
 const s=setup({symbol:'BTCUSDT',referencePrice:null},{window:0});assert.equal((await s.adapter.tradeContext('BTCUSDT')).reference?.kind,'LAST_TRADE');assert.equal(s.calls.includes('/api/v3/avgPrice'),false);const bad=setup({symbol:'BTCUSDT',referencePrice:null},{window:0,trades:[]});await assert.rejects(bad.adapter.tradeContext('BTCUSDT'),/LAST_TRADE/);
});
