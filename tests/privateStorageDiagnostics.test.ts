import {test} from 'node:test';
import assert from 'node:assert/strict';
import {confirmWindowsAclResult,PrivateStorageAclError} from '../src/server/privateStorageDiagnostics';
test('ACL confirmation requires exact success marker, zero status and no subprocess error',()=>{
 assert.doesNotThrow(()=>confirmWindowsAclResult({status:0,stdout:'AQ_PRIVATE_OK\r\n'},2));
 for(const result of [{status:1,stdout:'AQ_PRIVATE_OK'},{status:0,stdout:'private output'},{status:0,stdout:'AQ_PRIVATE_OK',error:{code:'EACCES',message:'private'}}]){
  assert.throws(()=>confirmWindowsAclResult(result,3),(error:unknown)=>{
   assert.ok(error instanceof PrivateStorageAclError);assert.equal(error.message,'PRIVATE_STORAGE_ACL_UNCONFIRMED');
   assert.ok(!JSON.stringify(error).includes('private'));return true;
  });
 }
});
test('timeout, start failure, nonzero exit and unexpected output remain distinct and fail closed',()=>{
 const cases=[
  {result:{status:null,stdout:'',error:{code:'ETIMEDOUT'}},failure:'TIMEOUT'},
  {result:{status:null,stdout:'',error:{code:'ENOENT'}},failure:'START_FAILED'},
  {result:{status:1,stdout:''},failure:'PROCESS_FAILED'},
  {result:{status:0,stdout:''},failure:'UNEXPECTED_OUTPUT'}
 ];
 for(const {result,failure} of cases)assert.throws(()=>confirmWindowsAclResult(result,15000),(error:unknown)=>{
  assert.ok(error instanceof PrivateStorageAclError);assert.equal(error.aclDiagnostics.failure,failure);
  assert.equal(error.aclDiagnostics.elapsedMs,15000);return true;
 });
});
