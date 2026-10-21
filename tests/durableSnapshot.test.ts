import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {readSnapshot,snapshotExists} from '../src/server/durableSnapshot';
import {assertPrivateFile} from '../src/server/privateStorage';
import {OrderExecution} from '../src/server/orderExecution';
import {writeSnapshotFixture} from './fixtures/durableSnapshot';
test('snapshot is readable after reopen and projection permissions use actual platform security',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'snapshot-'));const file=path.join(dir,'state.json');
 try{assert.equal(snapshotExists(file),false);writeSnapshotFixture(file,{version:1,value:1});assert.deepEqual(readSnapshot(file),{version:1,value:1});assertPrivateFile(file);
  if(process.platform==='win32')assert.equal(fs.existsSync(path.join(file+'.durable','snapshot.sqlite')),true);
  fs.writeFileSync(file,'broken');assert.throws(()=>readSnapshot(file));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('rename failure propagates; Windows recovers committed payload instead of trusting older JSON',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'snapshot-'));const file=path.join(dir,'state.json');
 try{writeSnapshotFixture(file,{value:1});
  const rename=t.mock.method(fs,'renameSync',()=>{throw Error('fixture rename failed');});
  try{assert.throws(()=>writeSnapshotFixture(file,{value:2}),/fixture rename failed/);}finally{rename.mock.restore();}
  assert.deepEqual(readSnapshot(file),{value:process.platform==='win32'?2:1});
  if(process.platform==='win32'){
   fs.writeFileSync(file,JSON.stringify({value:1}));assert.deepEqual(readSnapshot(file),{value:2});
   fs.unlinkSync(file);assert.equal(snapshotExists(file),true);assert.deepEqual(readSnapshot(file),{value:2});
   fs.writeFileSync(path.join(file+'.durable','snapshot.sqlite'),'broken sqlite');
   assert.throws(()=>readSnapshot(file)); // Never fall back to an apparently good JSON mirror.
  }
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('failed durable intent cannot reach sender; cleanup is idempotent and Windows restart stays query-only',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'snapshot-order-')),file=path.join(dir,'orders.json');let sends=0;
 const adapter={submit:async()=>{sends++;throw Error('must not send');},query:async()=>null};
 const intent={requestId:'request_windows_1',accountId:'fixture',symbol:'BTCUSDT',side:'BUY' as const,quantity:'1',limitPrice:'100'};
 let engine=new OrderExecution(file,adapter);
 try{
  const rename=t.mock.method(fs,'renameSync',()=>{throw Error('fixture rename failed');});
  try{await assert.rejects(engine.submit(intent),/fixture rename failed/);}finally{rename.mock.restore();}
  assert.equal(sends,0);engine.close();engine.close();
  engine=new OrderExecution(file,adapter);
  if(process.platform==='win32'){assert.equal(engine.list()[0].status,'UNKNOWN');await engine.submit(intent);assert.equal(sends,0);}
  else assert.equal(engine.list().length,0);
 }finally{engine.close();fs.rmSync(dir,{recursive:true,force:true});}
});
