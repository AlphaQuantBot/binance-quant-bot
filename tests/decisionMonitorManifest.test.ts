import {test} from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {DatabaseSync} from 'node:sqlite';import {randomUUID} from 'node:crypto';
import {DecisionWatchJournal,readDecisionMonitor} from '../src/server/decisionWatchJournal';
import {runDecisionMonitor} from '../src/server/scopedDecisionMonitor';
import {ReferenceStreamTimeoutError} from '../src/server/testnetReferenceStream';
import {analyzeDecisionHistory} from '../src/server/decisionHistoryAnalysis';
function fixture(){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'monitor-manifest-'));return {file:path.join(dir,'history.sqlite'),clean:()=>fs.rmSync(dir,{recursive:true,force:true})};}
async function run(journal:DecisionWatchJournal,id:string){
 let mono=1000,attempt=0;
 return runDecisionMonitor(2,{
  observe:async()=>{if(++attempt===1)throw new ReferenceStreamTimeoutError({opened:true,messages:0,referenceEvents:0,nullPrices:0,nonNullPrices:0,waitLimitMs:4000});
   return {serverTime:120001,clockReceivedAt:mono,report:{environment:'BINANCE_TESTNET',strategy:'EMA20_50_CROSS_1M_V1',symbol:'BTCUSDT',
    assessment:'WAIT',candidate:'NONE',signal:'HOLD',candleCloseTime:119999,inputHash:'a'.repeat(64),orderReview:{state:'NOT_APPLICABLE'},
    executionAuthorized:false,ordersSubmitted:0,automaticTradingEnabled:false}};},
  monotonicNow:()=>mono,wait:async ms=>{mono+=ms;},begin:()=>journal.startMonitorCycle(id),
  record:(child,r)=>journal.append(child,1,r),finish:(child,s)=>journal.finish(child,s),
  emit:(_cycle,child,status)=>journal.markMonitorCycle(id,child,status),
  errorCode:()=> 'STREAM_REFERENCE_TIMEOUT'
 },new AbortController().signal);
}
test('monitor identity, unavailable classification and full summary survive reopen with all children analyzable',async()=>{
 const f=fixture(),journal=new DecisionWatchJournal(f.file);
 try{
  const id=journal.startMonitor(2),summary=await run(journal,id),saved=journal.finishMonitor(id,summary);journal.close();
  const loaded=readDecisionMonitor(f.file,id);
  assert.deepEqual(loaded.summary,saved);assert.equal(saved.persistedSession,true);
  assert.equal(saved.state,'COMPLETED_WITH_UNAVAILABLE_CYCLES');assert.equal(saved.observedCycles,1);assert.equal(saved.unavailableCycles,1);
  assert.deepEqual(loaded.children.map(c=>c.status),['UNAVAILABLE','OBSERVED']);
  const analysis=analyzeDecisionHistory(loaded.observationsBySession,'EXPLICIT_IDS');
  assert.equal(analysis.sessionsAnalyzed,2);assert.equal(analysis.observations,1);assert.equal(analysis.sessionStates.STOPPED,1);
 }finally{journal.close();f.clean();}
});
test('unfinished parent and atomically linked pending child remain unfinalized after reopen',()=>{
 const f=fixture(),journal=new DecisionWatchJournal(f.file);
 try{
  const id=journal.startMonitor(2),child=journal.startMonitorCycle(id);journal.close();
  const loaded=readDecisionMonitor(f.file,id);
  assert.equal(loaded.summary.state,'UNFINALIZED');assert.equal(loaded.summary.persistedSession,false);
  assert.deepEqual(loaded.summary.childSessionIds,[child]);assert.equal(loaded.children[0].status,null);
  assert.equal(loaded.observationsBySession[0].summary.state,'UNFINALIZED');
 }finally{journal.close();f.clean();}
});
test('inconsistent counters and modified finalized summary are rejected and finalized parent cannot acquire another child',async()=>{
 const f=fixture(),journal=new DecisionWatchJournal(f.file);
 try{
  const id=journal.startMonitor(2),summary=await run(journal,id);
  assert.throws(()=>journal.finishMonitor(id,{...summary,observedCycles:99}),/HISTORY_INVALID/);
  journal.finishMonitor(id,summary);assert.throws(()=>journal.startMonitorCycle(id),/HISTORY_INVALID/);journal.close();
  const db=new DatabaseSync(f.file);
  try{const row=db.prepare('SELECT summary FROM decision_monitors WHERE id=?').get(id) as {summary:string};const changed=JSON.parse(row.summary);
   changed.unavailableCycles=0;db.prepare('UPDATE decision_monitors SET summary=? WHERE id=?').run(JSON.stringify(changed),id);
  }finally{db.close();}
  assert.throws(()=>readDecisionMonitor(f.file,id),/HISTORY_INVALID/);
 }finally{journal.close();f.clean();}
});
test('cross-parent children and missing manifests cannot be silently grouped or create storage',()=>{
 const f=fixture();
 try{
  assert.throws(()=>readDecisionMonitor(f.file,randomUUID()),/HISTORY_MISSING/);assert.equal(fs.existsSync(f.file),false);
  const journal=new DecisionWatchJournal(f.file);
  try{
   const first=journal.startMonitor(2),second=journal.startMonitor(2),child=journal.startMonitorCycle(first);
   assert.throws(()=>journal.markMonitorCycle(second,child,'OBSERVED'),/HISTORY_INVALID/);
   assert.equal(readDecisionMonitor(f.file,second).children.length,0);
   assert.throws(()=>readDecisionMonitor(f.file,randomUUID()),/HISTORY_MISSING/);
  }finally{journal.close();}
 }finally{f.clean();}
});
