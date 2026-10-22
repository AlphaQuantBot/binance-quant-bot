export type PrivateStorageAclDiagnostics={failure:'TIMEOUT'|'START_FAILED'|'PROCESS_FAILED'|'UNEXPECTED_OUTPUT';exitStatus:number|null;elapsedMs:number|null};
export class PrivateStorageAclError extends Error{
 readonly aclDiagnostics:PrivateStorageAclDiagnostics;
 constructor(diagnostics:PrivateStorageAclDiagnostics){super('PRIVATE_STORAGE_ACL_UNCONFIRMED');this.aclDiagnostics={...diagnostics};}
}
/** Keep subprocess output and errors private; expose only a fixed category and numbers. */
export function confirmWindowsAclResult(result:{error?:unknown;status:number|null;stdout:string},elapsedMs:number){
 if(!result.error&&result.status===0&&result.stdout.trim()==='AQ_PRIVATE_OK')return;
 const code=result.error&&typeof result.error==='object'&&'code' in result.error?(result.error as {code:unknown}).code:undefined;
 const failure:PrivateStorageAclDiagnostics['failure']=code==='ETIMEDOUT'?'TIMEOUT':result.error?'START_FAILED':result.status!==0?'PROCESS_FAILED':'UNEXPECTED_OUTPUT';
 throw new PrivateStorageAclError({failure,exitStatus:Number.isSafeInteger(result.status)?result.status:null,
  elapsedMs:Number.isFinite(elapsedMs)&&elapsedMs>=0?elapsedMs:null});
}
