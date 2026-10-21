import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {analyzeDecisionHistory} from '../src/server/decisionHistoryAnalysis';
import {DecisionWatchJournal,readDecisionWatchHistory} from '../src/server/decisionWatchJournal';
import {summarizeDecisionWatch,type DecisionWatchReport} from '../src/server/scopedDecisionWatch';
function report(time=119999,signal='HOLD',candidate='NONE',assessment='WAIT'){
 return {environment:'BINANCE_TESTNET',strategy:'EMA20_50_CROSS_1M_V1',symbol:'BTCUSDT',assessment,candidate,signal,candleCloseTime:time,
  inputHash:'a'.repeat(64),reasonCodes:['NO_NEW_CROSS'],executionBlockers:['AUTOMATIC_TRADING_NOT_ENABLED'],
  orderReview:{state:assessment==='CANDIDATE_ONLY'?'LOCAL_CHECKS_PASSED':assessment==='BLOCKED'?'BLOCKED':'NOT_APPLICABLE'},
  executionAuthorized:false,ordersSubmitted:0,automaticTradingEnabled:false};
}
function session(n:number,records:ReturnType<typeof report>[],state='COMPLETED'){
 return {startedAt:1000+n,summary:{sessionId:n.toString(16).padStart(8,'0')+'-0000-0000-0000-000000000000',state,requestedCycles:Math.max(1,records.length),
  completedCycles:records.length,executionAuthorized:false,ordersSubmitted:0,automaticTradingEnabled:false},observations:records};
}
test('overlapping sessions deduplicate candle signals while retaining distinct decision/review observations',()=>{
 const buy=report(119999,'BUY_CROSS','BUY','CANDIDATE_ONLY');
 const held={...buy,assessment:'BLOCKED',candidate:'NONE',orderReview:{state:'BLOCKED'}};
 const s=analyzeDecisionHistory([session(1,[buy,report(179999)]),session(2,[held])]);
 assert.equal(s.observations,3);assert.equal(s.uniqueCandles,2);assert.equal(s.duplicateCandleObservations,1);
 assert.equal(s.signals.BUY_CROSS,1);assert.equal(s.signals.HOLD,1);assert.equal(s.uniqueCandidateCandles.BUY,1);
 assert.equal(s.decisionObservations.BLOCKED,1);assert.equal(s.uniqueLocallyReviewedCandles,1);assert.equal(s.executionBlockerObservations.AUTOMATIC_TRADING_NOT_ENABLED,3);
 assert.equal(s.continuousRecordedCoverage,true);assert.equal(s.profitabilityAssessed,false);assert.equal(s.executionAuthorized,false);
});
test('changed hash or signal for a shared candle is a conflict, never a preferred observation',()=>{
 const first=report();
 for(const second of [{...first,inputHash:'b'.repeat(64)},{...first,signal:'SELL_CROSS'}]){
  assert.throws(()=>analyzeDecisionHistory([session(1,[first]),session(2,[second])]),/DECISION_ANALYSIS_SIGNAL_CONFLICT/);
 }
});
test('between-session gaps remain unobserved and unfinalized rows do not become completed sessions',()=>{
 const s=analyzeDecisionHistory([session(1,[report()]),session(2,[report(299999)],'UNFINALIZED')]);
 assert.equal(s.unobservedCandlesBetweenRecords,2);assert.equal(s.gapIntervals,1);assert.equal(s.continuousRecordedCoverage,false);
 assert.equal(s.sessionStates.COMPLETED,1);assert.equal(s.sessionStates.UNFINALIZED,1);
 assert.equal(analyzeDecisionHistory([]).uniqueCandles,0);assert.equal(analyzeDecisionHistory([]).continuousRecordedCoverage,false);
});
test('wrong identities, execution authority, mismatched counts and invalid labels cannot enter analysis',()=>{
 const good=session(1,[report()]);
 for(const changed of [
  {...good,summary:{...good.summary,completedCycles:0}},
  {...good,observations:[{...report(),symbol:'ETHUSDT'}]},
  {...good,observations:[{...report(),ordersSubmitted:1}]},
  {...good,observations:[{...report(),executionBlockers:['private value with spaces']}]},
  {...good,observations:[{...report(),candidate:'BUY'}]}
 ])assert.throws(()=>analyzeDecisionHistory([changed]),/DECISION_ANALYSIS_INVALID/);
 assert.throws(()=>analyzeDecisionHistory([good,good]),/DECISION_ANALYSIS_INVALID/);
});
test('blocked observations without a signal key remain explicit and do not fabricate candles',()=>{
 const blocked={...report(),assessment:'BLOCKED',orderReview:{state:'BLOCKED'}};
 const withoutKey={...blocked,signal:undefined,candleCloseTime:undefined,inputHash:undefined};
 const row={...session(1,[],'STOPPED'),summary:{...session(1,[],'STOPPED').summary,completedCycles:1},observations:[withoutKey]};
 const s=analyzeDecisionHistory([row]);assert.equal(s.observations,1);assert.equal(s.unattributedBlockedObservations,1);assert.equal(s.uniqueCandles,0);
});
test('read-only SQLite analysis includes stored reports and leaves finalized session evidence unchanged',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'decision-analysis-')),file=path.join(dir,'history.sqlite');
 const journal=new DecisionWatchJournal(file);
 try{
  const r=report() as DecisionWatchReport,id=journal.start(1,1000);journal.append(id,1,r);
  const summary=journal.finish(id,summarizeDecisionWatch([r],1,1,'COMPLETED',null));journal.close();
  const rows=readDecisionWatchHistory(file,5,undefined,true);
  assert.equal(analyzeDecisionHistory(rows).signals.HOLD,1);
  assert.deepEqual(readDecisionWatchHistory(file,5,id)[0].summary,summary);
  const cli=fs.readFileSync(new URL('../scripts/analyze_decision_history.ts',import.meta.url),'utf8');
  assert.doesNotMatch(cli,/fetch\(|createBinance|APP_TESTNET_API_KEY|APP_TESTNET_SECRET_KEY/);
 }finally{journal.close();fs.rmSync(dir,{recursive:true,force:true});}
});
