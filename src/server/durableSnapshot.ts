import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {protectPrivateStorage,assertPrivateDirectory} from './privateStorage';
const directory=(file:string)=>file+'.durable';
function database(file:string){return path.join(directory(file),'snapshot.sqlite');}
function connect(file:string){
 const dir=directory(file);
 if(!fs.existsSync(dir)){fs.mkdirSync(dir,{mode:0o700});protectPrivateStorage(dir);}else assertPrivateDirectory(dir);
 if(fs.lstatSync(dir).isSymbolicLink()||!fs.statSync(dir).isDirectory())throw Error('SNAPSHOT_STORAGE_INVALID');
 const target=database(file);
 if(fs.existsSync(target)&&fs.lstatSync(target).isSymbolicLink())throw Error('SNAPSHOT_STORAGE_INVALID');
 const db=new DatabaseSync(target);
 try{
  db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=0;');
  if((db.prepare('PRAGMA journal_mode').get() as any).journal_mode!=='wal'||(db.prepare('PRAGMA synchronous').get() as any).synchronous!==2)throw Error('SNAPSHOT_DURABILITY_UNCONFIRMED');
  if((db.prepare('PRAGMA integrity_check').get() as any).integrity_check!=='ok')throw Error('SNAPSHOT_STORAGE_INVALID');
  return db;
 }catch(e){db.close();throw e;}
}
export function snapshotExists(file:string){return fs.existsSync(file)||(process.platform==='win32'&&fs.existsSync(directory(file)));}
function mirrorText(file:string){if(!fs.existsSync(file))return null;if(fs.lstatSync(file).isSymbolicLink()||!fs.statSync(file).isFile())throw Error('SNAPSHOT_MIRROR_INVALID');return fs.readFileSync(file,'utf8');}
/** Caller must hold its existing exclusive journal lock for this read and all writes. */
export function readSnapshot(file:string):any{
 if(process.platform!=='win32'||!fs.existsSync(directory(file)))return JSON.parse(fs.readFileSync(file,'utf8'));
 const db=connect(file);
 try{
  const row=db.prepare('SELECT payload,previous FROM snapshot WHERE id=1').get() as {payload:string;previous:string|null}|undefined;
  if(!row)throw Error('SNAPSHOT_COMMIT_MISSING');
  const raw=mirrorText(file);
  if(raw!==null&&raw!==row.payload&&raw!==row.previous)throw Error('SNAPSHOT_MIRROR_CHANGED');
  // SQLite is authoritative. Repair an interrupted JSON projection, never adopt
  // an older mirror as the new order/risk state.
  if(raw!==row.payload){
   const temp=file+'.'+randomUUID()+'.recovery.tmp';let fd:number|undefined;
   try{fd=fs.openSync(temp,'wx',0o600);protectPrivateStorage(temp);fs.writeFileSync(fd,row.payload);fs.fsyncSync(fd);fs.closeSync(fd);fd=undefined;fs.renameSync(temp,file);}
   finally{if(fd!==undefined)fs.closeSync(fd);if(fs.existsSync(temp))fs.unlinkSync(temp);}
  }
  return JSON.parse(row.payload);
 }finally{db.close();}
}
/** Temp already contains a fully written and fsynced payload. Commit before returning to any sender. */
export function commitSnapshotMirror(temp:string,file:string){
 if(process.platform!=='win32'){
  fs.renameSync(temp,file);const dir=fs.openSync(path.dirname(file),'r');try{fs.fsyncSync(dir);}finally{fs.closeSync(dir);}return;
 }
 protectPrivateStorage(temp);
 const payload=fs.readFileSync(temp,'utf8');JSON.parse(payload);
 if(fs.existsSync(directory(file)))readSnapshot(file);
 const previous=mirrorText(file);if(previous!==null)JSON.parse(previous);
 const db=connect(file);
 try{
  db.exec('CREATE TABLE IF NOT EXISTS snapshot(id INTEGER PRIMARY KEY CHECK(id=1),payload TEXT NOT NULL,previous TEXT) STRICT; BEGIN IMMEDIATE;');
  try{db.prepare('INSERT INTO snapshot VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,previous=excluded.previous').run(payload,previous);db.exec('COMMIT');}
  catch(e){try{db.exec('ROLLBACK');}catch{}throw e;}
 }finally{db.close();}
 // No unsupported directory fsync: the authoritative transaction above is durable.
 // Rename failure still propagates; reopening repairs only from that transaction.
 fs.renameSync(temp,file);
}
