import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {runDecisionMonitor,isReferenceUnavailable} from '../src/server/scopedDecisionMonitor';
import {ReferenceStreamTimeoutError} from '../src/server/testnetReferenceStream';
import {ReferencePriceFreshnessError} from '../src/server/priceReference';
import {DecisionWatchJournal,readDecisionWatchHistory} from '../src/server/decisionWatchJournal';
function timeout(){return new ReferenceStreamTimeoutError({opened:true,messages:0,referenceEvents:0,nullPrices:0,nonNullPrices:0,waitLimitMs:4000});}
function harness(){
 let mono=1000,calls=0,ids=0;const statuses:string[]=[],waits:number[]=[],finished=new Set<string>();
 const deps:Parameters<typeof runDecisionMonitor>[1]={
  observe:async()=>{calls++;return {serverTime:120001,clockReceivedAt:mono,report:{assessment:'WAIT',candidate:'NONE',signal:'HOLD',
   candleCloseTime:119999,inputHash:'a'.repeat(64),orderReview:{state:'NOT_APPLICABLE'},executionAuthorized:false,ordersSubmitted:0,automaticTradingEnabled:false}};},
  monotonicNow:()=>mono,wait:async ms=>{waits.push(ms);mono+=ms;},begin:()=>String(++ids),record:()=>{},
  finish:(id)=>{finished.add(id);return {sessionId:id,persistedSession:true};},
  emit:(_cycle,id,status)=>{assert.ok(finished.has(id));statuses.push(status);},
  errorCode:e=>e instanceof Error&&['STALE_REFERENCE_PRICE','STREAM_REFERENCE_TIMEOUT','STREAM_REFERENCE_DISCONNECTED'].includes(e.message)?e.message:'DECISION_OBSERVATION_UNCONFIRMED'
 };
 return {deps,statuses,waits,getCalls:()=>calls};
}
test('unavailable reference cycles persist separately and next attempt starts on a later schedule without retry',async()=>{
 const h=harness(),original=h.deps.observe;let attempt=0;
 h.deps.observe=async signal=>{attempt++;if(attempt!==2)throw timeout();return original(signal);};
 const result=await runDecisionMonitor(3,h.deps,new AbortController().signal);
 assert.deepEqual(h.statuses,['UNAVAILABLE','OBSERVED','UNAVAILABLE']);assert.deepEqual(h.waits,[60000,60000]);
 assert.equal(attempt,3);assert.equal(result.recordedCycles,3);assert.equal(result.observedCycles,1);assert.equal(result.unavailableCycles,2);
 assert.equal(result.state,'COMPLETED_WITH_UNAVAILABLE_CYCLES');assert.equal(result.persistedSession,false);assert.equal(result.ordersSubmitted,0);
});
test('future data, connection failures and arbitrary errors never become nonfatal unavailability',async()=>{
 assert.equal(isReferenceUnavailable(timeout()),true);
 assert.equal(isReferenceUnavailable(new ReferencePriceFreshnessError({kind:'REFERENCE_PRICE',price:'1',timestamp:7000,observedAt:9000},10000)),true);
 assert.equal(isReferenceUnavailable(new ReferencePriceFreshnessError({kind:'REFERENCE_PRICE',price:'1',timestamp:10100,observedAt:10000},10000)),false);
 assert.equal(isReferenceUnavailable({message:'STREAM_REFERENCE_TIMEOUT'}),false);
 const h=harness();let attempts=0;h.deps.observe=async()=>{attempts++;throw Error('STREAM_REFERENCE_DISCONNECTED');};
 const result=await runDecisionMonitor(3,h.deps,new AbortController().signal);
 assert.equal(result.state,'STOPPED');assert.equal(result.unavailableCycles,0);assert.equal(attempts,1);assert.equal(h.waits.length,0);
});
test('each unavailable and observed attempt survives SQLite reopen with exact original status',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'decision-monitor-')),file=path.join(dir,'history.sqlite');
 const journal=new DecisionWatchJournal(file);
 try{
  const h=harness(),observe=h.deps.observe;let attempts=0;
  h.deps.observe=async signal=>{if(++attempts===1)throw timeout();return observe(signal);};
  h.deps.begin=()=>journal.start(1);h.deps.record=(id,report)=>journal.append(id,1,report);
  h.deps.finish=(id,summary)=>journal.finish(id,summary);h.deps.emit=()=>{};
  const result=await runDecisionMonitor(2,h.deps,new AbortController().signal);journal.close();
  const rows=result.childSessionIds.map(id=>readDecisionWatchHistory(file,1,id)[0]);
  assert.equal(rows[0].summary.state,'STOPPED');assert.equal(rows[0].summary.completedCycles,0);
  assert.equal(rows[1].summary.state,'COMPLETED');assert.equal(rows[1].summary.completedCycles,1);
 }finally{journal.close();fs.rmSync(dir,{recursive:true,force:true});}
});
test('failed persistence cannot emit success or start another observation',async()=>{
 const h=harness();h.deps.finish=()=>{throw Error('disk failure');};
 await assert.rejects(runDecisionMonitor(3,h.deps,new AbortController().signal),/disk failure/);
 assert.equal(h.getCalls(),1);assert.deepEqual(h.statuses,[]);
});
test('operator interruption during schedule wait preserves recorded attempts and starts no second observation',async()=>{
 const h=harness(),stop=new AbortController();h.deps.wait=async()=>{stop.abort();throw Error('aborted');};
 const result=await runDecisionMonitor(3,h.deps,stop.signal);
 assert.equal(result.state,'INTERRUPTED');assert.equal(result.recordedCycles,1);assert.equal(h.getCalls(),1);
});
test('execution-capable reports and invalid limits cannot be admitted',async()=>{
 const h=harness(),observe=h.deps.observe;
 h.deps.observe=async signal=>{const sample=await observe(signal);sample.report.executionAuthorized=true;return sample;};
 const result=await runDecisionMonitor(3,h.deps,new AbortController().signal);
 assert.equal(result.state,'STOPPED');assert.equal(result.observedCycles,0);assert.equal(result.unavailableCycles,0);assert.equal(h.getCalls(),1);
 for(const count of [0,121,1.5,NaN])await assert.rejects(runDecisionMonitor(count,h.deps,new AbortController().signal),/CYCLES_INVALID/);
});
