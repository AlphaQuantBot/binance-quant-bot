import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeValuationMarks,validateValuationMark} from '../src/server/valuationMarks';
import {valueAccount} from '../src/server/accountValuation';
import type {AccountSnapshot} from '../src/server/accountSnapshot';
const market=(baseAsset:string,quoteAsset:string)=>({symbol:baseAsset+quoteAsset,baseAsset,quoteAsset,status:'TRADING',isSpotTradingAllowed:true});
const quote=(symbol:string,bidPrice='2',askPrice='3')=>({symbol,bidPrice,askPrice,bidQty:'10',askQty:'10'});
const snapshot=():AccountSnapshot=>({environment:'BINANCE_TESTNET',accountId:'account1',startedAt:1000,observedAt:1001,canTrade:true,balances:[{asset:'TRY',free:'2',locked:'1'}],openOrders:[]});
const reader=(info:any,books:any[])=>({accountSnapshot:async()=>snapshot(),tradeContext:async()=>{throw Error('must not fan out');},valuationMarks:async(assets:string[])=>normalizeValuationMarks(info,books,assets,1000,1001)});
test('inverse conversion buys USDT at ask and divides exact full quantity without reciprocal rounding loss',async()=>{
 const r=await valueAccount(reader({symbols:[market('USDT','TRY')]},[quote('USDTTRY')]),'account1',()=>1002);
 assert.equal(r.complete,true);assert.equal(r.currentEquityUSDT,'1');assert.equal(r.assets[0].source,'SPOT_INVERSE_ASK');assert.equal(r.assets[0].quantity,'3');assert.equal(r.assets[0].priceUSDT,'0.333333333333333333');assert.equal(r.assets[0].valueUSDT,'1');assert.equal(r.dailyRiskAuthorized,false);
});
test('direct bid deterministically wins when both valid markets exist, independent of response order',()=>{
 const markets=[market('USDT','TRY'),market('TRY','USDT')];const books=[quote('USDTTRY'),quote('TRYUSDT','0.2','0.4')];
 for(const rows of [books,books.slice().reverse()]){const marks=normalizeValuationMarks({symbols:markets},rows,['TRY'],1000,1001);assert.equal(marks.length,1);assert.equal(marks[0].symbol,'TRYUSDT');assert.equal(marks[0].route,undefined);}
});
test('a missing or unusable direct book may use a valid inverse book, never a zero or crossed book',async()=>{
 const info={symbols:[market('TRY','USDT'),market('USDT','TRY')]};
 const r=await valueAccount(reader(info,[quote('TRYUSDT','0','0'),quote('USDTTRY')]),'account1',()=>1002);assert.equal(r.currentEquityUSDT,'1');
 for(const patch of [{bidPrice:'0'},{askPrice:'0'},{askPrice:'1'},{askQty:'0'},{bidQty:'0'},{askPrice:3},{askPrice:'bad'}]){
 const bad=await valueAccount(reader({symbols:[market('USDT','TRY')]},[{...quote('USDTTRY'),...patch}]),'account1',()=>1002);assert.equal(bad.complete,false);assert.equal(bad.currentEquityUSDT,null);assert.deepEqual(bad.unpricedAssets,['TRY']);
 }
});
test('inactive inverse markets, duplicate books, wrong route identity and stale marks remain blocked',()=>{
 assert.deepEqual(normalizeValuationMarks({symbols:[{...market('USDT','TRY'),status:'HALT'}]},[quote('USDTTRY')],['TRY'],1000,1001),[]);
 assert.throws(()=>normalizeValuationMarks({symbols:[market('USDT','TRY')]},[quote('USDTTRY'),quote('USDTTRY')],['TRY'],1000,1001),/DUPLICATE/);
 const m=normalizeValuationMarks({symbols:[market('USDT','TRY')]},[quote('USDTTRY')],['TRY'],1000,1001)[0];
 for(const row of [{...m,symbol:'TRYUSDT'},{...m,ask:undefined},{...m,ask:'1'},{...m,route:'UNKNOWN'}])assert.throws(()=>validateValuationMark(row as any,'TRY',1002));
 assert.throws(()=>validateValuationMark(m,'TRY',3001));
});
test('no valid direct or inverse market still blocks complete equity even if other holdings price',async()=>{
 const base=reader({symbols:[market('USDT','TRY')]},[quote('USDTTRY')]);
 const r=await valueAccount({...base,accountSnapshot:async()=>({...snapshot(),balances:[...snapshot().balances,{asset:'456',free:'10000',locked:'0'}]})},'account1',()=>1002);
 assert.equal(r.complete,false);assert.equal(r.currentEquityUSDT,null);assert.deepEqual(r.unpricedAssets,['456']);assert.equal(r.assets.find(a=>a.asset==='TRY')?.valueUSDT,'1');
});
