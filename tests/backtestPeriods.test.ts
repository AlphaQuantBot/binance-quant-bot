import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {compareBacktestPeriods,previousBacktestPeriodEnd} from '../src/server/backtestPeriods';
function dataset(start:number){
 const raw=Array.from({length:1000},(_,i)=>{const t=start+i*60000;return [t,'100','100','100','100','1',t+59999];});
 const evaluationTime=start+1000*60000;
 return {raw,evaluationTime,serverTime:evaluationTime+1000,inputHash:createHash('sha256').update(JSON.stringify(raw)).digest('hex')};
}
const costs=[{feeBps:0,slippageBps:0},{feeBps:10,slippageBps:5}];
test('independent adjacent periods retain separate equity, costs and hashes in chronological order',()=>{
 const older=dataset(60000),newer=dataset(60060000);
 const result=compareBacktestPeriods([newer,older],costs);
 assert.equal(result.periods[0].datasetId,older.inputHash);assert.equal(result.periods[1].datasetId,newer.inputHash);
 assert.equal(result.periodCount,2);assert.equal(result.positionsCarriedBetweenPeriods,false);
 assert.equal(result.combinedPortfolioResultAssessed,false);
 assert.equal(result.periods[0].scenarios[0].finalCloseMarkedEquityUSDT,'100');
 assert.equal(result.periods[1].evaluatedCandles,881);assert.equal(result.ordersSubmitted,0);
 assert.equal(previousBacktestPeriodEnd(newer),older.evaluationTime-1);
});
test('overlapping candles and duplicate datasets cannot claim independent periods',()=>{
 assert.throws(()=>compareBacktestPeriods([dataset(60000),dataset(120000)],costs),/PERIODS_OVERLAP/);
 const a=dataset(60000);assert.throws(()=>compareBacktestPeriods([a,a],costs),/PERIODS_OVERLAP/);
});
test('period bounds, corrupt identity and invalid costs fail before a result',()=>{
 const a=dataset(60000),b=dataset(60060000);
 assert.throws(()=>compareBacktestPeriods([a],costs),/PERIODS_INVALID/);
 assert.throws(()=>compareBacktestPeriods(Array(6).fill(a),costs),/PERIODS_INVALID/);
 assert.throws(()=>compareBacktestPeriods([{...a,inputHash:'f'.repeat(64)},b],costs),/HASH_MISMATCH/);
 assert.throws(()=>compareBacktestPeriods([a,b],[]),/COSTS_REQUIRED/);
});
