import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nextSignalDelay,summarizeSignalSession} from '../src/server/testnetSignalTiming';
test('server-minute scheduling subtracts read/output latency and never accumulates per-cycle drift',()=>{
 assert.equal(nextSignalDelay(120100,100,500),61500);
 assert.equal(nextSignalDelay(179999,100,1100),1001);
 assert.equal(nextSignalDelay(120100,100,100000),0);
 for(let i=0;i<60;i++)assert.equal(nextSignalDelay(120000+i*60000+2000,0,1200),58800);
 assert.throws(()=>nextSignalDelay(100,200,199),/SIGNAL_CLOCK_INVALID/);
 assert.throws(()=>nextSignalDelay(NaN,0,0),/SIGNAL_CLOCK_INVALID/);
});
test('summary separates prior gap from session gaps and counts duplicate candles only once',()=>{
 const rows=[
 {candleCloseTime:119999,signal:'HOLD',recorded:true,missedCandles:5},
 {candleCloseTime:179999,signal:'BUY_CROSS',recorded:true,missedCandles:0},
 {candleCloseTime:179999,signal:'BUY_CROSS',recorded:false,missedCandles:0},
 {candleCloseTime:299999,signal:'SELL_CROSS',recorded:true,missedCandles:1}];
 const s=summarizeSignalSession(rows,4,'COMPLETED');
 assert.equal(s.uniqueCandles,3);assert.equal(s.completedCycles,4);assert.equal(s.newlyRecorded,3);
 assert.equal(s.duplicateObservations,1);assert.equal(s.missedBeforeSession,5);
 assert.equal(s.missedWithinSession,1);assert.equal(s.gapEventsWithinSession,1);
 assert.deepEqual(s.signals,{BUY_CROSS:1,SELL_CROSS:1,HOLD:1});
 assert.equal(s.continuousObservedSession,false);assert.equal(s.ordersSubmitted,0);
});
test('empty or single observation cannot prove continuity; interruption retains partial counts',()=>{
 assert.equal(summarizeSignalSession([],10,'STOPPED').continuousObservedSession,false);
 assert.equal(summarizeSignalSession([{candleCloseTime:59999,signal:'HOLD',recorded:true,missedCandles:0}],10,'INTERRUPTED').completedCycles,1);
 const s=summarizeSignalSession([{candleCloseTime:59999,signal:'HOLD',recorded:true,missedCandles:0},{candleCloseTime:119999,signal:'HOLD',recorded:true,missedCandles:0}],10,'INTERRUPTED');
 assert.equal(s.continuousObservedSession,true);assert.equal(s.state,'INTERRUPTED');
});
