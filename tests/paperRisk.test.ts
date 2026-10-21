import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { paperExit,nextPaperWinRate,paperAvailableCapital,paperSymbolPrice } from '../src/utils/paperRisk';
const input={entry:100,price:98,quantity:2,stopPercent:2,takeProfitPercent:3,feeRate:0.001};
test('stop realizes an actual loss using position quantity and both-side assumed fees',()=>{
 const r=paperExit(input)!;assert.equal(r.reason,'STOP_LOSS');assert.equal(r.gross,-4);assert.equal(r.fees,0.396);assert.equal(r.net,-4.396);assert.equal(r.isWin,false);assert.equal(nextPaperWinRate(1,100,r.isWin),50);
});
test('trailing stop raises with high-water mark and profit threshold is independent',()=>{
 assert.equal(paperExit({...input,price:101})!.reason,null);const up=paperExit({...input,price:102})!;assert.equal(up.highest,102);assert.equal(paperExit({...input,price:99,highest:up.highest})!.reason,'STOP_LOSS');assert.equal(paperExit({...input,price:103})!.reason,'TAKE_PROFIT');
});
test('gross-positive fee-negative exit is not labeled a win; invalid positions stay unresolved',()=>{
 assert.equal(paperExit({...input,price:100.1,takeProfitPercent:0.05})!.isWin,false);for(const bad of [{entry:undefined},{quantity:NaN},{quantity:0},{stopPercent:0},{price:Infinity}])assert.equal(paperExit({...input,...bad} as any),null);assert.throws(()=>nextPaperWinRate(-1,0,true));
});
test('open paper positions reserve funds; low balance and unknown positions never generate cash',()=>{
 assert.equal(paperAvailableCapital(100,[{hasOpenPosition:true,entryPrice:100,positionQty:0.6}]),40);assert.equal(paperAvailableCapital(5,[]),5);assert.equal(paperAvailableCapital(100,[{hasOpenPosition:true}]),0);
 const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');const cycle=app.slice(app.indexOf('const executeBotCycle = useCallback'),app.indexOf('// Automated Trading Engine Dual-Timer'));
 assert.equal(cycle.includes('simulatedBalanceUsdt: 1000.00'),false);assert.equal(cycle.includes('const isWin = true'),false);assert.equal(cycle.includes('Asla zararına satılmaz'),false);assert.ok(cycle.includes('positionOrderId'));
});

test('a missing symbol price cannot borrow a different token price; held positions do not scan replacements',()=>{
 assert.equal(paperSymbolPrice({BTCUSDT:100},'ETHUSDT'),undefined);assert.equal(paperSymbolPrice({BTCUSDT:100},'BTCUSDT'),100);
 const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');assert.ok(app.includes('!bot.hasOpenPosition && isAltcoinHunter'));assert.equal(app.includes('currentPrices[targetSymbol] || currentPrices[bot.symbol]'),false);
});
