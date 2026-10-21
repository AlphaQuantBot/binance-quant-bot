import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {validateTradeContext,type TradeContext} from '../src/server/tradingRules';
import {TradeContextFreshnessError} from '../src/server/tradeContextTiming';
import {runDecisionWatch} from '../src/server/scopedDecisionWatch';
import {DecisionWatchJournal,readDecisionWatchHistory} from '../src/server/decisionWatchJournal';
function context(startedAt=5000,quoteAt=8000):TradeContext{
 return {environment:'BINANCE_TESTNET',symbol:'BTCUSDT',baseAsset:'BTC',quoteAsset:'USDT',status:'TRADING',spotAllowed:true,
 orderTypes:['LIMIT'],filters:[],exchangeFilters:[],startedAt,quote:{bid:'100',ask:'101',bidQty:'1',askQty:'1',observedAt:quoteAt}};
}
test('exact 5000 ms context and 2000 ms quote boundaries retain acceptance',()=>{
 assert.doesNotThrow(()=>validateTradeContext(context(),'BTCUSDT',10000));
});
test('context collection and quote age failures are diagnosed separately without loosening limits',()=>{
 for(const [start,quote,reason] of [[4999,9000,'CONTEXT_TOO_OLD'],[6000,7999,'QUOTE_TOO_OLD']] as const){
  assert.throws(()=>validateTradeContext(context(start,quote),'BTCUSDT',10000),(error:unknown)=>{
   assert.ok(error instanceof TradeContextFreshnessError);assert.equal(error.message,'STALE_TRADE_CONTEXT');
   assert.deepEqual(error.contextTiming.reasons,[reason]);assert.equal(error.contextTiming.contextLimitMs,5000);
   assert.equal(error.contextTiming.quoteLimitMs,2000);assert.equal(error.contextTiming.beforeQuoteMs,quote-start);return true;
  });
 }
});
test('invalid numeric times and reversed chronology expose only safe durations and fixed reasons',()=>{
 const error=new TradeContextFreshnessError('secret',NaN,Infinity);
 assert.deepEqual(error.contextTiming.reasons,['INVALID_TIMESTAMPS']);
 assert.equal(error.contextTiming.contextAgeMs,null);assert.ok(!JSON.stringify(error).includes('secret'));
 assert.deepEqual(new TradeContextFreshnessError(9000,8000,10000).contextTiming.reasons,['QUOTE_BEFORE_CONTEXT']);
 assert.deepEqual(new TradeContextFreshnessError(9000,11000,10000).contextTiming.reasons,['QUOTE_IN_FUTURE']);
});
test('typed context timing survives watch stop and SQLite reopen, while untyped payloads cannot inject it',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'context-timing-')),file=path.join(dir,'history.sqlite');
 try{
  const error=new TradeContextFreshnessError(4999,9000,10000);
  const deps={observe:async()=>{throw error;},wait:async()=>{},monotonicNow:()=>0,emit:()=>{},errorCode:()=> 'STALE_TRADE_CONTEXT'};
  const summary=await runDecisionWatch(60,deps,new AbortController().signal);
  assert.equal(summary.completedCycles,0);assert.equal(summary.attemptedCycles,1);assert.deepEqual(summary.contextTiming,error.contextTiming);
  const journal=new DecisionWatchJournal(file);
  const saved=(()=>{try{const id=journal.start(60,10000);return journal.finish(id,summary);}finally{journal.close();}})();
  assert.deepEqual(readDecisionWatchHistory(file)[0].summary,saved);
  const untyped=await runDecisionWatch(60,{...deps,observe:async()=>{throw {contextTiming:{secret:'private'}};}},new AbortController().signal);
  assert.equal(untyped.contextTiming,undefined);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
