import {test} from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';
import {protectPrivateStorage,assertPrivateDirectory,assertPrivateFile} from '../src/server/privateStorage';
function mutate(file:string,command:string){
 const env:NodeJS.ProcessEnv={AQ_TEST_ACL_PATH:file};
 for(const name of ['SystemRoot','WINDIR','SystemDrive','TEMP','TMP'])if(process.env[name])env[name]=process.env[name];
 const exe=path.join(process.env.SystemRoot??'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe');
 const result=spawnSync(exe,['-NoLogo','-NoProfile','-NonInteractive','-Command',"$ErrorActionPreference='Stop'; $PSModuleAutoLoadingPreference='None'; "+command],
  {env,encoding:'utf8',windowsHide:true,timeout:15000});
 assert.equal(Boolean(result.error),false,'ACL fixture process must complete');assert.equal(result.status,0,'ACL fixture mutation must succeed');
}
test('Windows file verification rejects an additional Everyone rule after successful private protection',{skip:process.platform!=='win32'},()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'acl-rule-test-')),file=path.join(dir,'fixture.txt');
 try{
  protectPrivateStorage(dir);fs.writeFileSync(file,'nonsecret fixture');protectPrivateStorage(file);assertPrivateFile(file);
  mutate(file,"$p=$env:AQ_TEST_ACL_PATH; $acl=[IO.File]::GetAccessControl($p); $everyone=[Security.Principal.SecurityIdentifier]::new('S-1-1-0'); $rule=[Security.AccessControl.FileSystemAccessRule]::new($everyone,[Security.AccessControl.FileSystemRights]::Read,[Security.AccessControl.AccessControlType]::Allow); [void]$acl.AddAccessRule($rule); [IO.File]::SetAccessControl($p,$acl)");
  assert.throws(()=>assertPrivateFile(file),/PRIVATE_STORAGE_ACL_UNCONFIRMED/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('Windows directory verification rejects re-enabled inheritance without bypassing the ACL check',{skip:process.platform!=='win32'},()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'acl-inherit-test-'));
 try{
  protectPrivateStorage(dir);assertPrivateDirectory(dir);
  mutate(dir,"$p=$env:AQ_TEST_ACL_PATH; $acl=[IO.Directory]::GetAccessControl($p); $acl.SetAccessRuleProtection($false,$true); [IO.Directory]::SetAccessControl($p,$acl)");
  assert.throws(()=>assertPrivateDirectory(dir),/PRIVATE_STORAGE_ACL_UNCONFIRMED/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
