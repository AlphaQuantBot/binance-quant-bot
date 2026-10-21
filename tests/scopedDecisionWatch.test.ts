import {ReferenceStreamTimeoutError} from '../src/server/testnetReferenceStream';
import {ReferencePriceFreshnessError} from '../src/server/priceReference';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runDecisionWatch,type DecisionWatchReport} from '../src/server/scopedDecisionWatch';
function fixture(cycles=10){
 let server=120100,calls=0,active=0,maxActive=0;const waits:number[]=[],emitted:DecisionWatchReport[]=[];const stop=new AbortController();
 const deps={
  observe:async()=>{calls++;active++;maxActive=Math.max(maxActive,active);const serverTime=server,clockReceivedAt=server;
   server+=1200;active--;return {report:{assessment:'WAIT',candidate:'NONE',signal:'HOLD',candleCloseTime:Math.floor(serverTime/60000)*60000-1,
    inputHash:'a'.repeat(64),orderReview:{state:'NOT_APPLICABLE'},executionAuthorized:false,ordersSubmitted:0,automaticTradingEnabled:false} as DecisionWatchReport,serverTime,clockReceivedAt};},
  wait:async(ms:number,_signal:AbortSignal)=>{waits.push(ms);server+=ms;},monotonicNow:()=>server,
  emit:(r:DecisionWatchReport)=>{emitted.push(r);},errorCode:(_error:unknown)=>'SAFE_READ_FAILURE'
 };
 return {cycles,stop,deps,waits,emitted,calls:()=>calls,maxActive:()=>maxActive,setServer:(value:number)=>server=value};
}
test('60 bounded serial cycles align to server minutes and retain zero order authority',async()=>{
 const f=fixture(60),s=await runDecisionWatch(60,f.deps,f.stop.signal);
 assert.equal(s.state,'COMPLETED');assert.equal(s.completedCycles,60);assert.equal(s.uniqueCandles,60);assert.equal(s.missedWithinSession,0);
 assert.equal(s.signals.HOLD,60);assert.equal(f.maxActive(),1);assert.equal(f.waits.length,59);assert.equal(f.waits[1],58800);
 assert.equal(s.ordersSubmitted,0);assert.equal(s.executionAuthorized,false);assert.equal(s.persistedSession,false);
});
test('local candidate review is counted while execution remains disabled',async()=>{
 const f=fixture(1),read=f.deps.observe;
 f.deps.observe=async()=>{const s=await read();s.report={...s.report,assessment:'CANDIDATE_ONLY',candidate:'BUY',signal:'BUY_CROSS',orderReview:{state:'LOCAL_CHECKS_PASSED'}};return s;};
 const s=await runDecisionWatch(1,f.deps,f.stop.signal);assert.equal(s.uniqueCandidateCandles.BUY,1);assert.equal(s.orderReviewObservations.LOCAL_CHECKS_PASSED,1);assert.equal(s.ordersSubmitted,0);
});
test('a blocked decision stops immediately without a second read or wait',async()=>{
 const f=fixture(),read=f.deps.observe;f.deps.observe=async()=>{const s=await read();s.report.assessment='BLOCKED';s.report.orderReview.state='BLOCKED';return s;};
 const s=await runDecisionWatch(10,f.deps,f.stop.signal);assert.equal(s.state,'STOPPED');assert.equal(s.stopCode,'DECISION_BLOCKED');assert.equal(f.calls(),1);assert.equal(f.waits.length,0);
});
test('read failure is not retried and returns partial summary with safe diagnostic only',async()=>{
 const f=fixture(),read=f.deps.observe;let attempts=0;f.deps.observe=async()=>{if(++attempts===2)throw Error('fixture private path');return read();};
 const s=await runDecisionWatch(10,f.deps,f.stop.signal);assert.equal(s.completedCycles,1);assert.equal(s.attemptedCycles,2);assert.equal(s.stopCode,'SAFE_READ_FAILURE');assert.equal(attempts,2);assert.ok(!JSON.stringify(s).includes('private path'));
});
test('Ctrl+C during wait preserves partial counts and does not start another cycle',async()=>{
 const f=fixture();f.deps.wait=async()=>{f.stop.abort();throw Error('aborted');};
 const s=await runDecisionWatch(10,f.deps,f.stop.signal);assert.equal(s.state,'INTERRUPTED');assert.equal(s.completedCycles,1);assert.equal(f.calls(),1);
});
test('unsafe report, changed history and regressing candle time stop the session',async()=>{
 for(const mode of ['unsafe','changed','regressed']){
  const f=fixture(),read=f.deps.observe;let n=0;
  f.deps.observe=async()=>{const s=await read();n++;if(mode==='unsafe')s.report.ordersSubmitted=1;
   else if(n===2){s.serverTime=mode==='regressed'?60001:120100;s.report.candleCloseTime=Math.floor(s.serverTime/60000)*60000-1;s.report.inputHash='b'.repeat(64);}return s;};
  const s=await runDecisionWatch(10,f.deps,f.stop.signal);assert.equal(s.state,'STOPPED');assert.equal(s.stopCode,mode==='unsafe'?'DECISION_WATCH_REPORT_INVALID':mode==='changed'?'DECISION_WATCH_SIGNAL_CHANGED':'DECISION_WATCH_TIME_REGRESSED');
 }
});
test('delayed schedule reports missing candles instead of backfilling observations',async()=>{
 const f=fixture(2);f.deps.wait=async()=>{f.setServer(300100);};
 const s=await runDecisionWatch(2,f.deps,f.stop.signal);assert.equal(s.uniqueCandles,2);assert.equal(s.missedWithinSession,2);assert.equal(s.continuousObservedSession,false);
});
test('invalid/unbounded cycle counts fail before any observation',async()=>{
 for(const n of [0,-1,121,Infinity,1.1]){const f=fixture();await assert.rejects(runDecisionWatch(n,f.deps,f.stop.signal),/CYCLES_INVALID/);assert.equal(f.calls(),0);}
});
test('both operator entrypoints share the observation implementation without sender/reset methods',()=>{
 const source=fs.readFileSync(new URL('../src/server/scopedDecisionObservation.ts',import.meta.url),'utf8');
 assert.doesNotMatch(source,/\.(submit|cancel|initialize|prepare|prepareFirstBuy|prepareFirstSell|validateTestOrder)\s*\(/);
 assert.match(source,/if\(!fs.existsSync\(file\)\)throw Error\('SCOPED_NOT_INITIALIZED'\)/);
 for(const file of ['observe_scoped_decision.ts','watch_scoped_decisions.ts'])assert.match(fs.readFileSync(new URL('../scripts/'+file,import.meta.url),'utf8'),/observeScopedDecision/);
});

test('stale-reference stop summary retains only safe numeric freshness diagnostics',async()=>{
 const f=fixture();f.deps.observe=async()=>{throw new ReferencePriceFreshnessError({kind:'REFERENCE_PRICE',price:'100',timestamp:1000,observedAt:2900},3100);};
 f.deps.errorCode=()=> 'STALE_REFERENCE_PRICE';
 const s=await runDecisionWatch(3,f.deps,f.stop.signal);
 assert.equal(s.state,'STOPPED');assert.equal(s.stopCode,'STALE_REFERENCE_PRICE');
 assert.deepEqual(s.referenceTiming,{referenceKind:'REFERENCE_PRICE',requestAgeMs:200,eventAgeMs:2100});
 assert.equal(s.completedCycles,0);assert.equal(f.waits.length,0);assert.ok(!JSON.stringify(s).includes('"price"'));
});

test('timeout summary retains partial cycles and allowlisted stream counts without another attempt',async()=>{
 const f=fixture(),read=f.deps.observe;let attempts=0;
 const counts={opened:true,messages:2,referenceEvents:2,nullPrices:2,nonNullPrices:0,waitLimitMs:4000};
 f.deps.observe=async()=>{if(++attempts===3)throw new ReferenceStreamTimeoutError({...counts,privatePayload:'secret'} as typeof counts);return read();};
 f.deps.errorCode=()=> 'STREAM_REFERENCE_TIMEOUT';
 const s=await runDecisionWatch(3,f.deps,f.stop.signal);
 assert.equal(s.state,'STOPPED');assert.equal(s.stopCode,'STREAM_REFERENCE_TIMEOUT');
 assert.equal(s.completedCycles,2);assert.equal(s.attemptedCycles,3);assert.equal(attempts,3);
 assert.deepEqual(s.streamDiagnostics,counts);assert.equal(s.ordersSubmitted,0);
 assert.ok(!JSON.stringify(s).includes('secret'));assert.ok(!JSON.stringify(s).includes('privatePayload'));
});
test('arbitrary thrown objects cannot inject stream diagnostics into the summary',async()=>{
 const f=fixture();f.deps.observe=async()=>{throw {streamDiagnostics:{privatePayload:'secret'}};};
 const s=await runDecisionWatch(3,f.deps,f.stop.signal);
 assert.equal(s.streamDiagnostics,undefined);assert.ok(!JSON.stringify(s).includes('secret'));
});
