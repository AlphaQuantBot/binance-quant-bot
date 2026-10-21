import {assertPrivateFile} from '../src/server/privateStorage';
import {removeSnapshotFixtureCompanion} from './fixtures/durableSnapshot';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DailyRiskGate,balanceDigest,type DailyRiskEvidence } from '../src/server/dailyRiskGate';
import type { AccountSnapshot } from '../src/server/accountSnapshot';
const time=Date.parse('2026-10-20T12:00:00Z'),accountId='testnet_fixture';
const snapshot=(now=time):AccountSnapshot=>({environment:'BINANCE_TESTNET',accountId,startedAt:now-1000,observedAt:now-1,canTrade:true,balances:[{asset:'USDT',free:'1000',locked:'0'}],openOrders:[]});
const evidence=(s=snapshot(),patch:Partial<DailyRiskEvidence>={}):DailyRiskEvidence=>({environment:'BINANCE_TESTNET',accountId,quoteAsset:'USDT',source:'RECONCILED_ACCOUNT_HISTORY',scope:'REALIZED_AND_UNREALIZED',day:new Date(s.observedAt).toISOString().slice(0,10),coverageFrom:Date.parse(new Date(s.observedAt).toISOString().slice(0,10)+'T00:00:00Z'),coverageTo:s.observedAt,observedAt:s.observedAt,balanceDigest:balanceDigest(s),openingEquity:'1000',currentEquity:'1000',externalInflows:'0',externalOutflows:'0',pricedAssets:['USDT'],unpricedAssets:[],...patch});
function setup(){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'aq-daily-')),file=path.join(dir,'risk');return {dir,file,gate:new DailyRiskGate(file,accountId)};}
function clean(s:ReturnType<typeof setup>){s.gate.close();fs.rmSync(s.dir,{recursive:true,force:true});}
test('complete evidence accounts for flows and includes exact threshold equality',()=>{
 const s=setup();try{assert.equal(s.gate.assess(evidence(undefined,{currentEquity:'990',externalOutflows:'10'}),snapshot(),'20',time).lossQuote,'0');const next=snapshot(time+1);const r=s.gate.assess(evidence(next,{currentEquity:'1070',externalInflows:'100',externalOutflows:'10'}),next,'20',time+1);assert.equal(r.lossQuote,'20');assert.equal(r.latched,true);assertPrivateFile(s.file);}finally{clean(s);}
});
test('loss breach survives restart and later recovery cannot clear same-day latch',()=>{
 const s=setup();try{s.gate.assess(evidence(undefined,{currentEquity:'980'}),snapshot(),'20',time);s.gate.close();s.gate=new DailyRiskGate(s.file,accountId);const next=snapshot(time+1);assert.equal(s.gate.assess(evidence(next,{currentEquity:'1100'}),next,'20',time+1).latched,true);}finally{clean(s);}
});
test('baseline/limit/flow revisions and stale evidence cannot reset the budget',()=>{
 const s=setup();try{s.gate.assess(evidence(undefined,{externalInflows:'10'}),snapshot(),'20',time);for(const patch of [{openingEquity:'999'},{externalInflows:'0'}])assert.throws(()=>s.gate.assess(evidence(undefined,patch),snapshot(),'20',time),/BASELINE_CHANGED/);assert.throws(()=>s.gate.assess(evidence(undefined,{externalInflows:'10'}),snapshot(),'21',time),/BASELINE_CHANGED/);assert.throws(()=>s.gate.assess(evidence(),snapshot(time+5000),'20',time+5000),/EVIDENCE_REQUIRED/);}finally{clean(s);}
});
test('partial-day, realized-only, wrong balance/account and unpriced assets cannot authorize',()=>{
 const s=setup();try{for(const patch of [{coverageFrom:time-1000},{scope:'REALIZED_ONLY' as any},{balanceDigest:'wrong'},{accountId:'other'},{observedAt:time+1}])assert.throws(()=>s.gate.assess(evidence(undefined,patch),snapshot(),'20',time),/EVIDENCE_REQUIRED/);assert.throws(()=>s.gate.assess(undefined,snapshot(),'20',time),/EVIDENCE_REQUIRED/);assert.throws(()=>s.gate.assess(evidence(undefined,{unpricedAssets:['BNB']}),snapshot(),'20',time),/UNPRICED/);assert.throws(()=>s.gate.assess(evidence(undefined,{pricedAssets:[]}),snapshot(),'20',time),/UNPRICED/);}finally{clean(s);}
});
test('UTC day rollover needs new full coverage; manual halt survives day rollover and restart',()=>{
 const s=setup();try{s.gate.assess(evidence(undefined,{currentEquity:'970'}),snapshot(),'20',time);const now=time+86400000;assert.throws(()=>s.gate.assess(evidence(),snapshot(now),'20',now),/EVIDENCE_REQUIRED/);assert.equal(s.gate.assess(evidence(snapshot(now)),snapshot(now),'20',now).latched,false);s.gate.halt();s.gate.close();s.gate=new DailyRiskGate(s.file,accountId);assert.throws(()=>s.gate.assess(evidence(snapshot(now)),snapshot(now),'20',now),/EMERGENCY_HALT/);}finally{clean(s);}
});
test('lock/corrupt state and disk failure fail closed',()=>{
 const s=setup();try{assert.throws(()=>new DailyRiskGate(s.file,accountId),/EEXIST/);s.gate.close();fs.writeFileSync(s.file,'broken');assert.throws(()=>new DailyRiskGate(s.file,accountId));fs.unlinkSync(s.file);removeSnapshotFixtureCompanion(s.file);s.gate=new DailyRiskGate(s.file,accountId);fs.mkdirSync(s.file);assert.throws(()=>s.gate.assess(evidence(),snapshot(),'20',time));assert.throws(()=>s.gate.assess(evidence(),snapshot(),'20',time),/CLOSED/);}finally{clean(s);}
});
