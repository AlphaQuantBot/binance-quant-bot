import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const aclScript = String.raw`
$ErrorActionPreference='Stop'
$p=$env:AQ_PRIVATE_STORAGE_PATH
$item=Get-Item -LiteralPath $p -Force
if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'reparse point' }
$sid=[Security.Principal.WindowsIdentity]::GetCurrent().User
$system=[Security.Principal.SecurityIdentifier]::new('S-1-5-18')
if ($env:AQ_PRIVATE_STORAGE_APPLY -eq '1') {
 if ($item.PSIsContainer) {
  $acl=[Security.AccessControl.DirectorySecurity]::new()
  $inherit=[Security.AccessControl.InheritanceFlags]'ContainerInherit,ObjectInherit'
 } else {
  $acl=[Security.AccessControl.FileSecurity]::new()
  $inherit=[Security.AccessControl.InheritanceFlags]::None
 }
 $acl.SetOwner($sid)
 $acl.SetAccessRuleProtection($true,$false)
 foreach ($identity in @($sid,$system)) {
  $rule=[Security.AccessControl.FileSystemAccessRule]::new($identity,[Security.AccessControl.FileSystemRights]::FullControl,$inherit,[Security.AccessControl.PropagationFlags]::None,[Security.AccessControl.AccessControlType]::Allow)
  [void]$acl.AddAccessRule($rule)
 }
 Set-Acl -LiteralPath $p -AclObject $acl
}
$acl=Get-Acl -LiteralPath $p
if (-not $acl.AreAccessRulesProtected -or $acl.GetOwner([Security.Principal.SecurityIdentifier]).Value -ne $sid.Value) { throw 'owner or inheritance' }
$rules=@($acl.GetAccessRules($true,$true,[Security.Principal.SecurityIdentifier]))
if ($rules.Count -ne 2) { throw 'unexpected rules' }
foreach ($identity in @($sid,$system)) {
 $matching=@($rules | Where-Object { $_.IdentityReference.Value -eq $identity.Value -and $_.AccessControlType -eq 'Allow' -and -not $_.IsInherited -and (($_.FileSystemRights -band [Security.AccessControl.FileSystemRights]::FullControl) -eq [Security.AccessControl.FileSystemRights]::FullControl) })
 if ($matching.Count -ne 1) { throw 'rights' }
}
Write-Output 'AQ_PRIVATE_OK'
`;
function windowsAcl(file:string,apply:boolean){
 const env:NodeJS.ProcessEnv={AQ_PRIVATE_STORAGE_PATH:path.resolve(file),AQ_PRIVATE_STORAGE_APPLY:apply?'1':'0'};
 for(const name of ['SystemRoot','WINDIR','SystemDrive','TEMP','TMP'])if(process.env[name])env[name]=process.env[name];
 const executable=path.join(process.env.SystemRoot??'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe');
 const result=spawnSync(executable,['-NoLogo','-NoProfile','-NonInteractive','-Command',aclScript],{env,encoding:'utf8',windowsHide:true,timeout:15000,maxBuffer:65536});
 if(result.error||result.status!==0||result.stdout.trim()!=='AQ_PRIVATE_OK')throw Error('PRIVATE_STORAGE_ACL_UNCONFIRMED');
}
export function assertPrivateDirectory(file:string){
 const info=fs.lstatSync(file);if(info.isSymbolicLink()||!info.isDirectory())throw Error('PRIVATE_STORAGE_INVALID');
 if(process.platform==='win32')windowsAcl(file,false);
 else if((info.mode&0o777)!==0o700)throw Error('PRIVATE_STORAGE_MODE_INVALID');
}
export function assertPrivateFile(file:string){
 const info=fs.lstatSync(file);if(info.isSymbolicLink()||!info.isFile())throw Error('PRIVATE_STORAGE_INVALID');
 if(process.platform==='win32')windowsAcl(file,false);
 else if((info.mode&0o777)!==0o600)throw Error('PRIVATE_STORAGE_MODE_INVALID');
}
export function protectPrivateStorage(file:string){
 const info=fs.lstatSync(file);if(info.isSymbolicLink()||(!info.isFile()&&!info.isDirectory()))throw Error('PRIVATE_STORAGE_INVALID');
 if(process.platform==='win32')windowsAcl(file,true);
 else fs.chmodSync(file,info.isDirectory()?0o700:0o600);
}
