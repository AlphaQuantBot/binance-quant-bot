import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {DecisionWatchJournal,readDecisionWatchHistoryByIds,validateDecisionSessionIds} from '../src/server/decisionWatchJournal';
import {summarizeDecisionWatch} from '../src/server/scopedDecisionWatch';
import {analyzeDecisionHistory} from '../src/server/decisionHistoryAnalysis';
function fixture(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'selected-history-')),file=path.join(dir,'history.sqlite');
 return {file,clean:()=>fs.rmSync(dir,{recursive:true,force:true})};
}
function populate(file:string,count:number){
 const journal=new DecisionWatchJournal(file),ids:string[]=[];
 try{
  for(let i=0;i<count;i++){
   const id=journal.start(1,100000+i*60000);ids.push(id);
   const records=i===count-1?[]:[{environment:'BINANCE_TESTNET',strategy:'EMA20_50_CROSS_1M_V1',symbol:'BTCUSDT',
    assessment:i===0?'CANDIDATE_ONLY':'WAIT',candidate:i===0?'BUY':'NONE',signal:i===0?'BUY_CROSS':'HOLD',
    candleCloseTime:59999+i*60000,inputHash:'a'.repeat(64),orderReview:{state:i===0?'LOCAL_CHECKS_PASSED':'NOT_APPLICABLE'},
    executionAuthorized:false,ordersSubmitted:0,automaticTradingEnabled:false}];
   if(records.length)journal.append(id,1,records[0]);
   journal.finish(id,summarizeDecisionWatch(records,1,1,records.length?'COMPLETED':'STOPPED',records.length?null:'STREAM_REFERENCE_TRANSPORT_UNCONFIRMED'));
  }
 }finally{journal.close();}
 return ids;
}
test('explicit 37-session selection includes early candidate and final failed attempt without recent-history truncation',()=>{
 const f=fixture();
 try{
  const ids=populate(f.file,37),before=fs.readFileSync(f.file);
  const rows=readDecisionWatchHistoryByIds(f.file,ids),analysis=analyzeDecisionHistory(rows,'EXPLICIT_IDS');
  assert.equal(analysis.sessionsAnalyzed,37);assert.equal(analysis.observations,36);assert.equal(analysis.uniqueCandles,36);
  assert.equal(analysis.sessionStates.STOPPED,1);assert.equal(analysis.uniqueCandidateCandles.BUY,1);
  assert.equal(analysis.uniqueLocallyReviewedCandles,1);assert.equal(analysis.signals.HOLD,35);
  assert.deepEqual(rows.map(row=>row.summary.sessionId),ids);
  assert.throws(()=>analyzeDecisionHistory(rows),/ANALYSIS_INVALID/);
  assert.deepEqual(fs.readFileSync(f.file),before);
 }finally{f.clean();}
});
test('one missing selected session fails instead of returning partial success or falling back to recent sessions',()=>{
 const f=fixture();
 try{const ids=populate(f.file,2);assert.throws(()=>readDecisionWatchHistoryByIds(f.file,[ids[0],randomUUID()]),/HISTORY_MISSING/);}
 finally{f.clean();}
});
test('selection is bounded, unique and validated before missing storage could be created',()=>{
 const f=fixture();
 try{
  for(const ids of [[],[randomUUID(),'bad'],Array(121).fill(randomUUID())]){
   assert.throws(()=>readDecisionWatchHistoryByIds(f.file,ids),/HISTORY_INVALID/);
  }
  const id=randomUUID();assert.throws(()=>validateDecisionSessionIds([id,id]),/HISTORY_INVALID/);
  assert.throws(()=>readDecisionWatchHistoryByIds(f.file,[id]),/HISTORY_MISSING/);
  assert.equal(fs.existsSync(f.file),false);
 }finally{f.clean();}
});
test('selected history still rejects corrupted persisted summary instead of trusting its counters',()=>{
 const f=fixture();
 try{
  const ids=populate(f.file,2),db=new DatabaseSync(f.file);
  try{
   const row=db.prepare('SELECT summary FROM decision_sessions WHERE id=?').get(ids[0]) as {summary:string};
   const summary=JSON.parse(row.summary);summary.uniqueCandles=999;
   db.prepare('UPDATE decision_sessions SET summary=? WHERE id=?').run(JSON.stringify(summary),ids[0]);
  }finally{db.close();}
  assert.throws(()=>readDecisionWatchHistoryByIds(f.file,ids),/HISTORY_INVALID/);
 }finally{f.clean();}
});
