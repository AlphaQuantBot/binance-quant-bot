import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {protectPrivateStorage,assertPrivateDirectory,assertPrivateFile} from '../src/server/privateStorage';
import {PrivateStorageAclError} from '../src/server/privateStorageDiagnostics';
let directory:string|undefined,stage='PLATFORM_CHECK';
try{
 if(process.platform!=='win32')throw Error('WINDOWS_REQUIRED');
 directory=fs.mkdtempSync(path.join(os.tmpdir(),'aq-acl-preflight-'));
 stage='DIRECTORY_APPLY';protectPrivateStorage(directory);
 stage='DIRECTORY_VERIFY';assertPrivateDirectory(directory);
 const file=path.join(directory,'fixture.txt');fs.writeFileSync(file,'nonsecret ACL fixture');
 stage='FILE_APPLY';protectPrivateStorage(file);
 stage='FILE_VERIFY';assertPrivateFile(file);
 console.log(JSON.stringify({operation:'WINDOWS_PRIVATE_STORAGE_PREFLIGHT',state:'PASSED',ordersSubmitted:0},null,2));
}catch(error){
 console.error(JSON.stringify({operation:'WINDOWS_PRIVATE_STORAGE_PREFLIGHT',state:'FAILED',stage,
  code:error instanceof PrivateStorageAclError?'PRIVATE_STORAGE_ACL_UNCONFIRMED':'PRIVATE_STORAGE_PREFLIGHT_FAILED',
  ...(error instanceof PrivateStorageAclError?{aclDiagnostics:error.aclDiagnostics}:{}),ordersSubmitted:0},null,2));
 process.exitCode=1;
}finally{if(directory)try{fs.rmSync(directory,{recursive:true,force:true});}catch{}}
