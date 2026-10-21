import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {DecisionWatchJournal,readDecisionWatchHistory} from '../src/server/decisionWatchJournal';
import {runDecisionWatch,summarizeDecisionWatch,type DecisionWatchReport} from '../src/server/scopedDecisionWatch';
const report=(candleCloseTime=119999):DecisionWatchReport=>({assessment:'WAIT',candidate:'NONE',signal:'HOLD',candleCloseTime,inputHash:'a'.repeat(64),orderReview:{state:'NOT_APPLICABLE'},executionAuthorized:false,ordersSubmitted:0,automaticTradingEnabled:false});
function fixture(){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'decision-evidence-'));return {dir,file:path.join(dir,'history.sqlite'),clean:()=>fs.rmSync(dir,{recursive:true,force:true})};}
test('committed decisions and recomputed final summary survive reopen with exact replay and revision rejection',()=>{
 const f=fixture();let journal=new DecisionWatchJournal(f.file);
 try{
  const id=journal.start(2,1000),first=report(),second=report(179999);
  journal.append(id,1,first);journal.append(id,1,first);
  assert.throws(()=>journal.append(id,1,{...first,inputHash:'b'.repeat(64)}),/HISTORY_INVALID/);
  assert.throws(()=>journal.append(id,3,second),/HISTORY_INVALID/);
  journal.append(id,2,second);
  const summary=summarizeDecisionWatch([first,second],2,2,'COMPLETED',null);
  const saved=journal.finish(id,summary);assert.equal(saved.persistedSession,true);
  journal.close();journal=new DecisionWatchJournal(f.file);
  const history=readDecisionWatchHistory(f.file,5,id);
  assert.equal(history.length,1);assert.deepEqual(history[0].summary,saved);
  assert.equal(history[0].observations!.length,2);assert.equal(saved.uniqueCandles,2);
  assert.throws(()=>journal.append(id,2,second),/HISTORY_INVALID/);
 }finally{journal.close();f.clean();}
});
test('unfinalized sessions retain committed cycles across restart and are never silently completed or resumed',()=>{
 const f=fixture();let journal=new DecisionWatchJournal(f.file);
 try{
  const id=journal.start(10,1000);journal.append(id,1,report());journal.close();
  const pending=readDecisionWatchHistory(f.file,5,id)[0].summary;
  assert.equal(pending.state,'UNFINALIZED');assert.equal(pending.completedCycles,1);assert.equal(pending.persistedSession,false);
  journal=new DecisionWatchJournal(f.file);const other=journal.start(1,2000);assert.notEqual(other,id);
  assert.equal(readDecisionWatchHistory(f.file,5,id)[0].summary.state,'UNFINALIZED');
 }finally{journal.close();f.clean();}
});
test('unsafe reports and summaries inconsistent with persisted rows cannot claim successful persistence',()=>{
 const f=fixture(),journal=new DecisionWatchJournal(f.file);
 try{
  const id=journal.start(1,1000),r=report();
  assert.throws(()=>journal.append(id,1,{...r,ordersSubmitted:1}),/HISTORY_INVALID/);
  assert.throws(()=>journal.finish(id,summarizeDecisionWatch([r],1,1,'COMPLETED',null)),/HISTORY_INVALID/);
  journal.append(id,1,r);const summary=summarizeDecisionWatch([r],1,1,'COMPLETED',null);journal.finish(id,summary);
  assert.throws(()=>journal.finish(id,{...summary,stopCode:'CHANGED'}),/HISTORY_INVALID/);
  const tamper=new DatabaseSync(f.file);
  try{tamper.prepare('UPDATE decision_reports SET payload=? WHERE session_id=?').run(JSON.stringify({...r,signal:'SELL_CROSS'}),id);}
  finally{tamper.close();}
  assert.throws(()=>readDecisionWatchHistory(f.file,5,id),/HISTORY_INVALID/);
 }finally{journal.close();f.clean();}
});
test('actual SQLite writer contention stops watch before report emission or a second observation',async()=>{
 const f=fixture(),journal=new DecisionWatchJournal(f.file),id=journal.start(2,1000),blocker=new DatabaseSync(f.file);
 let calls=0,emits=0,waits=0;
 try{
  blocker.exec('BEGIN IMMEDIATE');
  const summary=await runDecisionWatch(2,{
   observe:async()=>{calls++;return {report:report(),serverTime:120100,clockReceivedAt:120100};},
   record:(r,cycle)=>journal.append(id,cycle,r),emit:()=>{emits++;},wait:async()=>{waits++;},
   monotonicNow:()=>120101,errorCode:()=> 'SAFE_FAILURE'
  },new AbortController().signal);
  assert.equal(summary.stopCode,'DECISION_WATCH_PERSISTENCE_FAILED');assert.equal(summary.completedCycles,0);
  assert.equal(calls,1);assert.equal(emits,0);assert.equal(waits,0);
  blocker.exec('ROLLBACK');assert.equal(journal.finish(id,summary).persistedSession,true);
 }finally{blocker.close();journal.close();f.clean();}
});
test('committed observation survives abrupt child exit without a final summary',()=>{
 const f=fixture();
 try{
  const moduleUrl=new URL('../src/server/decisionWatchJournal.ts',import.meta.url).href;
  const source='const {DecisionWatchJournal}=await import('+JSON.stringify(moduleUrl)+');const j=new DecisionWatchJournal('+JSON.stringify(f.file)+');const id=j.start(10,1000);j.append(id,1,'+JSON.stringify(report())+');process.exit(7);';
  const child=spawnSync(process.execPath,['--import','tsx','--input-type=module','-e',source],{encoding:'utf8',timeout:15000});
  assert.equal(child.error,undefined);assert.equal(child.status,7,child.stderr);
  const rows=readDecisionWatchHistory(f.file);
  assert.equal(rows[0].summary.state,'UNFINALIZED');assert.equal(rows[0].summary.completedCycles,1);
 }finally{f.clean();}
});
test('history reader does not create missing storage and has bounded results without exchange capability',()=>{
 const f=fixture();
 try{
  assert.throws(()=>readDecisionWatchHistory(f.file),/HISTORY_MISSING/);assert.equal(fs.existsSync(f.file),false);
  assert.throws(()=>readDecisionWatchHistory(f.file,21),/HISTORY_INVALID/);
  const cli=fs.readFileSync(new URL('../scripts/read_decision_history.ts',import.meta.url),'utf8');
  assert.doesNotMatch(cli,/fetch\(|createBinance|APP_TESTNET_API_KEY|APP_TESTNET_SECRET_KEY/);
 }finally{f.clean();}
});

test('watch CLI refuses to use the scoped journal itself as observation history before any DB or network work',()=>{
 const f=fixture();
 try{
  const scoped=path.join(f.dir,'decision-watch.sqlite');fs.writeFileSync(scoped,'scoped journal marker');
  const script=fileURLToPath(new URL('../scripts/watch_scoped_decisions.ts',import.meta.url));
  const child=spawnSync(process.execPath,['--import','tsx',script,'1'],{encoding:'utf8',timeout:15000,
   env:{...process.env,APP_TESTNET_SCOPED_JOURNAL:scoped}});
  assert.equal(child.error,undefined);assert.equal(child.status,1);
  // Capture the complete pretty-printed JSON object, allowing surrounding Node warnings.
  const output=child.stderr.match(/^\{[\s\S]*?^\}/m);assert.ok(output);
  assert.equal(JSON.parse(output[0]).stopCode,'DECISION_WATCH_HISTORY_INVALID');
  assert.equal(fs.readFileSync(scoped,'utf8'),'scoped journal marker');assert.equal(fs.existsSync(scoped+'-wal'),false);
 }finally{f.clean();}
});
