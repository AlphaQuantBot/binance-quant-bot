import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {captureBacktestDataset,readBacktestDataset} from '../src/server/backtestDataset';
import {parseBacktestScenarios,compareBacktestScenarios} from '../src/server/backtestComparison';
import {backtestEmaCross,readBacktestCandles} from '../src/server/emaCrossBacktest';
function candles(count=124){
 return Array.from({length:count},(_,i)=>{
  const close=i===120||i===121?'110':i===122?'50':i>=123?'110.1':'100',open=i===121||i===122?'110':i>=123?'110.1':'100',time=(i+1)*60000;
  return [time,open,String(Math.max(Number(open),Number(close))),String(Math.min(Number(open),Number(close))),close,'1',time+59999];
 });
}
function fixture(){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'backtest-data-'));return {file:path.join(dir,'data.sqlite'),clean:()=>fs.rmSync(dir,{recursive:true,force:true})};}
test('captured dataset survives reopen and all cost scenarios retain its hash, window and signal counts',()=>{
 const f=fixture();
 try{
  const raw=candles(),time=Number(raw[raw.length-1][6])+1000;
  const stored=captureBacktestDataset(f.file,raw,time),loaded=readBacktestDataset(f.file,stored.inputHash);
  assert.deepEqual(loaded,stored);
  const result=compareBacktestScenarios(loaded,parseBacktestScenarios(['0:0','10:0','10:5']));
  assert.equal(result.inputHash,stored.inputHash);assert.equal(result.sameInputVerified,true);
  assert.equal(result.scenarios[2].realizedNetResultUSDT,backtestEmaCross(raw,time,{feeBps:10,slippageBps:5}).realizedNetResultUSDT);
  assert.equal(result.scenarios.length,3);assert.equal(result.signals.BUY_CROSS,1);assert.equal(result.signals.SELL_CROSS,1);
  assert.equal(result.scenarios[0].netWinningRoundTrips,1);assert.equal(result.scenarios[1].netLosingRoundTrips,1);
  assert.equal(result.executionAuthorized,false);assert.equal(result.ordersSubmitted,0);
 }finally{f.clean();}
});
test('replay is deterministic and duplicate captures preserve the first metadata instead of overwriting it',()=>{
 const f=fixture();
 try{
  const raw=candles(),time=Number(raw[raw.length-1][6])+1000,dataset=captureBacktestDataset(f.file,raw,time);
  assert.deepEqual(captureBacktestDataset(f.file,raw,time+1),dataset);
  const costs=parseBacktestScenarios(['0:0','10:5']);
  const first=compareBacktestScenarios(dataset,costs),second=compareBacktestScenarios(readBacktestDataset(f.file,dataset.inputHash),costs);
  assert.deepEqual(first,second);assert.deepEqual(dataset.raw,raw);
 }finally{f.clean();}
});
test('expected-hash mismatch cannot create storage and corrupted stored candles cannot be replayed',()=>{
 const f=fixture();
 try{
  const raw=candles(),time=Number(raw[raw.length-1][6])+1000;
  assert.throws(()=>captureBacktestDataset(f.file,raw,time,time,'f'.repeat(64)),/HASH_MISMATCH/);
  assert.equal(fs.existsSync(f.file),false);
  const dataset=captureBacktestDataset(f.file,raw,time),db=new DatabaseSync(f.file);
  try{const changed=structuredClone(raw);changed[0][5]='2';db.prepare('UPDATE backtest_datasets SET raw_json=? WHERE input_hash=?').run(JSON.stringify(changed),dataset.inputHash);}
  finally{db.close();}
  assert.throws(()=>readBacktestDataset(f.file,dataset.inputHash),/HASH_MISMATCH/);
 }finally{f.clean();}
});
test('missing snapshots and invalid or repeated scenario definitions fail instead of falling back to new data',()=>{
 const f=fixture();
 try{
  assert.throws(()=>readBacktestDataset(f.file,'a'.repeat(64)),/DATASET_MISSING/);assert.equal(fs.existsSync(f.file),false);
  for(const args of [[],['0:0'],['0:0','0:0'],['0:0','1001:0'],['0:0','bad'],Array(9).fill('0:0')]){
   assert.throws(()=>parseBacktestScenarios(args),/COST/);
  }
 }finally{f.clean();}
});
test('pinned historical capture retains observed server time separately from evaluation boundary',async()=>{
 const raw=candles(1000),last=Number(raw[raw.length-1][6]),current=last+600000,urls:string[]=[];
 const sample=await readBacktestCandles(async(url,init)=>{
  urls.push(String(url));assert.equal(init?.method,'GET');assert.equal(init?.headers,undefined);
  return new Response(JSON.stringify(urls.length===1?{serverTime:current}:raw));
 },()=>1000,last);
 assert.equal(urls.length,2);assert.equal(new URL(urls[1]).searchParams.get('endTime'),String(last));
 assert.equal(sample.serverTime,current);assert.equal(sample.evaluationTime,last+1);
 assert.doesNotThrow(()=>backtestEmaCross(sample.raw,sample.evaluationTime,{feeBps:0,slippageBps:0}));
 let calls=0;
 await assert.rejects(readBacktestCandles(async()=>{calls++;return new Response('{}');},()=>1000,last-1),/WINDOW_INVALID/);assert.equal(calls,0);
 await assert.rejects(readBacktestCandles(async()=>{calls++;return new Response(JSON.stringify({serverTime:last+1}));},()=>1000,last+60000),/WINDOW_INVALID/);assert.equal(calls,1);
});
test('comparison CLI replay branch reads only local storage and requires explicit scenario assumptions',()=>{
 const cli=fs.readFileSync(new URL('../scripts/compare_backtest_costs.ts',import.meta.url),'utf8');
 assert.match(cli,/else dataset=readBacktestDataset/);
 assert.doesNotMatch(cli,/APP_TESTNET_API_KEY|APP_TESTNET_SECRET_KEY|createBinance|ScopedTestnetJournal/);
 assert.ok(cli.indexOf('parseBacktestScenarios(process.argv.slice')<cli.indexOf('await readBacktestCandles'));
});
