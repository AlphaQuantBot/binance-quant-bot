import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {readSignalCandles,evaluateSignal,SignalObservationJournal} from '../src/server/testnetSignalObserver';
const base=60000*1000,serverTime=base+120*60000+1000;
function rows(start=base,prices=Array(120).fill(100)){return prices.map((c,i)=>[start+i*60000,String(c),String(c),String(c),String(c),'1',start+i*60000+59999]);}
test('uses only two fixed public GET endpoints; forming candle is excluded by endTime',async()=>{
 const calls:string[]=[];const sample=await readSignalCandles(async(url,init)=>{const u=new URL(String(url));assert.equal(u.origin,'https://testnet.binance.vision');assert.equal(init?.method,'GET');assert.equal(init?.redirect,'error');assert.equal(init?.headers,undefined);calls.push(u.pathname);if(u.pathname.endsWith('/time'))return new Response(JSON.stringify({serverTime}));assert.equal(u.searchParams.get('endTime'),String(base+120*60000-1));return new Response(JSON.stringify(rows()));});
 assert.deepEqual(calls,['/api/v3/time','/api/v3/klines']);assert.equal(evaluateSignal(sample.raw,sample.serverTime).signal,'HOLD');
});
test('closed candles yield deterministic BUY/SELL crossings and HOLD without trade simulation',()=>{
 const buy=Array.from({length:120},(_,i)=>i===119?10000:200-i);const sell=Array.from({length:120},(_,i)=>i===119?1:100+i/100);
 assert.equal(evaluateSignal(rows(base,buy),serverTime).signal,'BUY_CROSS');assert.equal(evaluateSignal(rows(base,sell),serverTime).signal,'SELL_CROSS');
 const result=evaluateSignal(rows(),serverTime);assert.equal(result.ordersSubmitted,0);assert.equal(result.automaticTradingEnabled,false);assert.equal(result.closedCandlesOnly,true);
});
test('missing, stale, forming, noncontiguous and malformed OHLC candles are rejected',()=>{
 assert.throws(()=>evaluateSignal(rows().slice(1),serverTime));assert.throws(()=>evaluateSignal(rows(base-60000),serverTime),/STALE/);assert.throws(()=>evaluateSignal(rows(),serverTime-2000),/TIMING/);
 for(const mutate of [(r:any[])=>r[5][0]+=1,(r:any[])=>r[5][6]+=1,(r:any[])=>r[5][2]='1',(r:any[])=>r[5][4]='Infinity',(r:any[])=>r[5][5]='-1']){const r=rows();mutate(r);assert.throws(()=>evaluateSignal(r,serverTime));}
});
test('rate limits and HTTP failures stop reads without retry or fallback',async()=>{for(const status of [418,429,451,500]){let calls=0;await assert.rejects(readSignalCandles(async()=>{calls++;return new Response('{}',{status});}));assert.equal(calls,1);}});
test('SQLite observation survives reopen, deduplicates, rejects revisions and reports gaps',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'aq-signals-')),file=path.join(dir,'signals.sqlite');let j=new SignalObservationJournal(file);
 try{const observation=evaluateSignal(rows(),serverTime);assert.equal(j.record(observation).recorded,true);j.close();j=new SignalObservationJournal(file);assert.equal(j.record(observation).recorded,false);
 assert.throws(()=>j.record({...observation,close:101}),/HISTORY_CHANGED/);
 const next=evaluateSignal(rows(base+180000),serverTime+180000);const gap=j.record(next);assert.equal(gap.observationGap,true);assert.equal(gap.missedCandles,2);
 assert.throws(()=>j.record(evaluateSignal(rows(base+60000),serverTime+60000)),/TIME_REGRESSED/);
 }finally{j.close();fs.rmSync(dir,{recursive:true,force:true});}
});
