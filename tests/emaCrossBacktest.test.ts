import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {backtestEmaCross,readBacktestCandles,validateBacktestCosts} from '../src/server/emaCrossBacktest';
import {units} from '../src/server/exactDecimal';
function candles(count=124,exitOpen='50'){
 return Array.from({length:count},(_,i)=>{
  const close=i===120||i===121?'110':i===122?'50':i>=123?exitOpen:'100';
  const open=i===121?'110':i===122?'110':i>=123?exitOpen:'100';
  const time=(i+1)*60000;return [time,open,String(Math.max(Number(open),Number(close))),String(Math.min(Number(open),Number(close))),close,'1',time+59999];
 });
}
const server=(rows:ReturnType<typeof candles>)=>Number(rows[rows.length-1][6])+1000;
test('rolling strategy fills a crossing only at the next candle open and respects inclusive entry budget',()=>{
 const rows=candles(),result=backtestEmaCross(rows,server(rows),{feeBps:10,slippageBps:5});
 assert.equal(result.modeledExecutions.length,2);assert.equal(result.closedRoundTrips,1);
 assert.equal(result.modeledExecutions[0].side,'BUY');assert.equal(result.modeledExecutions[1].side,'SELL');
 for(const fill of result.modeledExecutions)assert.equal(fill.modeledOpenTime,fill.signalCloseTime+1);
 const buy=result.modeledExecutions[0];assert.ok(units(buy.principalUSDT)+units(buy.assumedFeeUSDT)<=25n*10n**18n);
 assert.equal(result.netLosingRoundTrips,1);assert.equal(result.executionAuthorized,false);assert.equal(result.ordersSubmitted,0);
});
test('cost assumptions reduce modeled proceeds and gross-positive fee-negative exits are not wins',()=>{
 const rows=candles(124,'110.1');
 const free=backtestEmaCross(rows,server(rows),{feeBps:0,slippageBps:0});
 const costly=backtestEmaCross(rows,server(rows),{feeBps:10,slippageBps:0});
 assert.equal(free.netWinningRoundTrips,1);assert.equal(costly.netWinningRoundTrips,0);assert.equal(costly.netLosingRoundTrips,1);
 assert.ok(units(free.finalCloseMarkedEquityUSDT)>units(costly.finalCloseMarkedEquityUSDT));
 assert.ok(units(costly.assumedFeesUSDT)>0n);
 const slipped=backtestEmaCross(rows,server(rows),{feeBps:0,slippageBps:5});
 assert.ok(units(slipped.finalCloseMarkedEquityUSDT)<units(free.finalCloseMarkedEquityUSDT));
});
test('last-candle crossing has no hypothetical fill and an open position is not forcibly closed',()=>{
 const last=candles(121),a=backtestEmaCross(last,server(last),{feeBps:0,slippageBps:0});
 assert.equal(a.lastCrossHasNoNextCandle,true);assert.equal(a.modeledExecutions.length,0);assert.equal(a.modeledCashUSDT,'100');
 const open=candles(122),b=backtestEmaCross(open,server(open),{feeBps:0,slippageBps:0});
 assert.equal(b.modeledExecutions.length,1);assert.ok(units(b.modeledOwnedBTC)>0n);
 assert.equal(b.closedRoundTrips,0);assert.equal(b.realizedNetResultUSDT,'0');assert.equal(b.openPositionForcedClosed,false);
});
test('next opening price can change a fill but never the preceding closed-candle signal time',()=>{
 const rows=candles(122),changed=structuredClone(rows);changed[121][1]='140';changed[121][2]='140';
 const a=backtestEmaCross(rows,server(rows),{feeBps:0,slippageBps:0});
 const b=backtestEmaCross(changed,server(changed),{feeBps:0,slippageBps:0});
 assert.equal(a.modeledExecutions[0].signalCloseTime,b.modeledExecutions[0].signalCloseTime);
 assert.equal(a.modeledExecutions[0].modeledPriceUSDT,'110');assert.equal(b.modeledExecutions[0].modeledPriceUSDT,'140');
});
test('malformed OHLC, gaps, forming candles and absent cost assumptions are rejected',()=>{
 const rows=candles();
 for(const costs of [{feeBps:-1,slippageBps:0},{feeBps:0,slippageBps:1001},{feeBps:NaN,slippageBps:0}])assert.throws(()=>validateBacktestCosts(costs),/COST_ASSUMPTIONS/);
 const gap=structuredClone(rows);gap[50][0]=Number(gap[50][0])+60000;assert.throws(()=>backtestEmaCross(gap,server(gap),{feeBps:0,slippageBps:0}),/SIGNAL_/);
 const bad=structuredClone(rows);bad[10][2]='1';assert.throws(()=>backtestEmaCross(bad,server(bad),{feeBps:0,slippageBps:0}),/SIGNAL_/);
 assert.throws(()=>backtestEmaCross(rows,Number(rows[rows.length-1][6]),{feeBps:0,slippageBps:0}),/SIGNAL_/);
});
test('historical reader makes exactly two unsigned fixed-host GETs and excludes the forming minute',async()=>{
 const rows=candles(1000),time=server(rows),urls:string[]=[];
 const sample=await readBacktestCandles(async(url,init)=>{
  urls.push(String(url));assert.equal(init?.method,'GET');assert.equal(init?.redirect,'error');assert.equal(init?.headers,undefined);
  return new Response(JSON.stringify(urls.length===1?{serverTime:time}:rows));
 },()=>1000);
 assert.equal(sample.raw.length,1000);assert.equal(urls.length,2);
 assert.equal(urls[0],'https://testnet.binance.vision/api/v3/time');
 const query=new URL(urls[1]);assert.equal(query.hostname,'testnet.binance.vision');assert.equal(query.searchParams.get('limit'),'1000');
 assert.equal(Number(query.searchParams.get('endTime')),Math.floor(time/60000)*60000-1);
});
test('reader failure has no retry, fallback, secret use or partial successful result',async()=>{
 let calls=0;await assert.rejects(readBacktestCandles(async()=>{calls++;return new Response('{}',{status:429});}),/BACKTEST_RATE_LIMITED/);
 assert.equal(calls,1);
 const cli=fs.readFileSync(new URL('../scripts/backtest_ema_cross.ts',import.meta.url),'utf8');
 assert.doesNotMatch(cli,/APP_TESTNET_API_KEY|APP_TESTNET_SECRET_KEY|createBinance|ScopedTestnetJournal/);
});
