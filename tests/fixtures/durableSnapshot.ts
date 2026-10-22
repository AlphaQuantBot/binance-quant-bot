import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import {commitSnapshotMirror} from '../../src/server/durableSnapshot';
/** Test-only coherent crash-state injection: never used by production commands. */
export function writeSnapshotFixture(file:string,value:unknown){
 const temp=file+'.'+randomUUID()+'.fixture.tmp';let fd:number|undefined;
 try{fd=fs.openSync(temp,'wx',0o600);fs.writeFileSync(fd,JSON.stringify(value));fs.fsyncSync(fd);fs.closeSync(fd);fd=undefined;commitSnapshotMirror(temp,file);}
 finally{if(fd!==undefined)fs.closeSync(fd);if(fs.existsSync(temp))fs.unlinkSync(temp);}
}
/** Remove only a temporary test fixture's companion before explicitly starting over. */
export function removeSnapshotFixtureCompanion(file:string){fs.rmSync(file+'.durable',{recursive:true,force:true});}
