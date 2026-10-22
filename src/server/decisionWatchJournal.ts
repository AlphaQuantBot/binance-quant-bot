import {validateMonitorChildren,validateMonitorSummary,type MonitorChild,type MonitorSummary} from './decisionMonitorSummary';
import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {summarizeDecisionWatch,type DecisionWatchReport, type runDecisionWatch} from './scopedDecisionWatch';
type Summary=Awaited<ReturnType<typeof runDecisionWatch>>;
type SessionRow={id:string;requested:number;started_at:number;summary:string|null};
function sessionId(id:string){if(!/^[a-f0-9-]{36}$/.test(id))throw Error('DECISION_WATCH_HISTORY_INVALID');}
function safeReport(r:DecisionWatchReport){
 if(!r||r.executionAuthorized!==false||r.ordersSubmitted!==0||r.automaticTradingEnabled!==false||
 !['WAIT','CANDIDATE_ONLY','BLOCKED'].includes(r.assessment)||!['NONE','BUY','SELL'].includes(r.candidate)||
 !r.orderReview||!['LOCAL_CHECKS_PASSED','BLOCKED','NOT_APPLICABLE'].includes(r.orderReview.state))throw Error('DECISION_WATCH_HISTORY_INVALID');
}
function reports(db:DatabaseSync,id:string){
 return (db.prepare('SELECT payload FROM decision_reports WHERE session_id=? ORDER BY cycle').all(id) as {payload:string}[])
 .map(row=>{const r=JSON.parse(row.payload) as DecisionWatchReport;safeReport(r);return r;});
}
/** Independent observation evidence only; no scoped-capital or exchange capability. */
export class DecisionWatchJournal{
 private db:DatabaseSync;private closed=false;
 constructor(file:string){
  fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});
  this.db=new DatabaseSync(file);
  try{
   this.db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=0; PRAGMA foreign_keys=ON;');
   this.db.exec('CREATE TABLE IF NOT EXISTS decision_sessions(id TEXT PRIMARY KEY,requested INTEGER NOT NULL CHECK(requested BETWEEN 1 AND 120),started_at INTEGER NOT NULL,summary TEXT) STRICT; CREATE TABLE IF NOT EXISTS decision_reports(session_id TEXT NOT NULL REFERENCES decision_sessions(id),cycle INTEGER NOT NULL CHECK(cycle BETWEEN 1 AND 120),payload TEXT NOT NULL,PRIMARY KEY(session_id,cycle)) STRICT;');
   this.db.exec('CREATE TABLE IF NOT EXISTS decision_monitors(id TEXT PRIMARY KEY,requested INTEGER NOT NULL CHECK(requested BETWEEN 1 AND 120),started_at INTEGER NOT NULL,summary TEXT) STRICT; CREATE TABLE IF NOT EXISTS decision_monitor_children(monitor_id TEXT NOT NULL REFERENCES decision_monitors(id),cycle INTEGER NOT NULL,session_id TEXT NOT NULL UNIQUE REFERENCES decision_sessions(id),status TEXT,PRIMARY KEY(monitor_id,cycle)) STRICT;');
   const mode=this.db.prepare('PRAGMA journal_mode').get() as {journal_mode:string};
   const sync=this.db.prepare('PRAGMA synchronous').get() as {synchronous:number};
   if(mode.journal_mode!=='wal'||sync.synchronous!==2)throw Error('durability settings unavailable');
   const check=this.db.prepare('PRAGMA quick_check').get() as {quick_check:string};
   if(check.quick_check!=='ok')throw Error('invalid database');
  }catch{this.db.close();throw Error('DECISION_WATCH_PERSISTENCE_FAILED');}
 }
 private transaction<T>(operation:()=>T):T{
  if(this.closed)throw Error('DECISION_WATCH_HISTORY_CLOSED');
  try{this.db.exec('BEGIN IMMEDIATE');}
  catch{throw Error('DECISION_WATCH_PERSISTENCE_FAILED');}
  try{const value=operation();this.db.exec('COMMIT');return value;}
  catch(error){try{this.db.exec('ROLLBACK');}catch{}
   if(error instanceof Error&&error.message==='DECISION_WATCH_HISTORY_INVALID')throw error;
   throw Error('DECISION_WATCH_PERSISTENCE_FAILED');
  }
 }
 start(requested:number,startedAt=Date.now()){
  if(!Number.isInteger(requested)||requested<1||requested>120||!Number.isSafeInteger(startedAt)||startedAt<=0)throw Error('DECISION_WATCH_HISTORY_INVALID');
  const id=randomUUID();return this.transaction(()=>{this.db.prepare('INSERT INTO decision_sessions VALUES(?,?,?,NULL)').run(id,requested,startedAt);return id;});
 }
 append(id:string,cycle:number,report:DecisionWatchReport){
  sessionId(id);safeReport(report);
  if(!Number.isInteger(cycle)||cycle<1||cycle>120)throw Error('DECISION_WATCH_HISTORY_INVALID');
  const payload=JSON.stringify(report);
  this.transaction(()=>{
   const s=this.db.prepare('SELECT * FROM decision_sessions WHERE id=?').get(id) as SessionRow|undefined;
   if(!s||s.summary!==null||cycle>s.requested)throw Error('DECISION_WATCH_HISTORY_INVALID');
   const previous=this.db.prepare('SELECT payload FROM decision_reports WHERE session_id=? AND cycle=?').get(id,cycle) as {payload:string}|undefined;
   if(previous){if(previous.payload!==payload)throw Error('DECISION_WATCH_HISTORY_INVALID');return;}
   const count=this.db.prepare('SELECT COUNT(*) AS n FROM decision_reports WHERE session_id=?').get(id) as {n:number};
   if(cycle!==count.n+1)throw Error('DECISION_WATCH_HISTORY_INVALID');
   this.db.prepare('INSERT INTO decision_reports VALUES(?,?,?)').run(id,cycle,payload);
  });
 }
 finish(id:string,summary:Summary){
  sessionId(id);
  return this.transaction(()=>{
   const s=this.db.prepare('SELECT * FROM decision_sessions WHERE id=?').get(id) as SessionRow|undefined;
   if(!s||!['COMPLETED','STOPPED','INTERRUPTED'].includes(summary.state)||summary.requestedCycles!==s.requested||
    !Number.isInteger(summary.attemptedCycles)||summary.attemptedCycles<summary.completedCycles||summary.attemptedCycles>s.requested||
    (summary.state==='COMPLETED'&&(summary.completedCycles!==s.requested||summary.stopCode!==null)))throw Error('DECISION_WATCH_HISTORY_INVALID');
   const expected=summarizeDecisionWatch(reports(this.db,id),s.requested,summary.attemptedCycles,summary.state,summary.stopCode,summary.referenceTiming,summary.streamDiagnostics,summary.clockDiagnostics,summary.contextTiming);
   for(const key of Object.keys(expected) as (keyof typeof expected)[])if(JSON.stringify(expected[key])!==JSON.stringify(summary[key]))throw Error('DECISION_WATCH_HISTORY_INVALID');
   const result={...expected,sessionId:id,persistedSession:true};
   const payload=JSON.stringify(result);
   if(s.summary!==null&&s.summary!==payload)throw Error('DECISION_WATCH_HISTORY_INVALID');
   this.db.prepare('UPDATE decision_sessions SET summary=? WHERE id=?').run(payload,id);
   return result;
  });
 }

 startMonitor(requested:number,startedAt=Date.now()){
  if(!Number.isInteger(requested)||requested<1||requested>120||!Number.isSafeInteger(startedAt)||startedAt<=0)throw Error('DECISION_WATCH_HISTORY_INVALID');
  const id=randomUUID();return this.transaction(()=>{this.db.prepare('INSERT INTO decision_monitors VALUES(?,?,?,NULL)').run(id,requested,startedAt);return id;});
 }
 startMonitorCycle(monitorId:string,startedAt=Date.now()){
  sessionId(monitorId);if(!Number.isSafeInteger(startedAt)||startedAt<=0)throw Error('DECISION_WATCH_HISTORY_INVALID');
  return this.transaction(()=>{
   const parent=this.db.prepare('SELECT * FROM decision_monitors WHERE id=?').get(monitorId) as SessionRow|undefined;
   const previous=this.db.prepare('SELECT cycle,status FROM decision_monitor_children WHERE monitor_id=? ORDER BY cycle DESC LIMIT 1').get(monitorId) as {cycle:number;status:string|null}|undefined;
   if(!parent||parent.summary!==null||(previous&&!['OBSERVED','UNAVAILABLE'].includes(previous.status??''))||(previous?.cycle??0)>=parent.requested)throw Error('DECISION_WATCH_HISTORY_INVALID');
   const id=randomUUID(),cycle=(previous?.cycle??0)+1;
   this.db.prepare('INSERT INTO decision_sessions VALUES(?,1,?,NULL)').run(id,startedAt);
   this.db.prepare('INSERT INTO decision_monitor_children VALUES(?,?,?,NULL)').run(monitorId,cycle,id);return id;
  });
 }
 markMonitorCycle(monitorId:string,id:string,status:string){
  sessionId(monitorId);sessionId(id);
  this.transaction(()=>{
   const parent=this.db.prepare('SELECT * FROM decision_monitors WHERE id=?').get(monitorId) as SessionRow|undefined;
   const child=this.db.prepare('SELECT status FROM decision_monitor_children WHERE monitor_id=? AND session_id=?').get(monitorId,id) as {status:string|null}|undefined;
   const row=this.db.prepare('SELECT summary FROM decision_sessions WHERE id=?').get(id) as {summary:string|null}|undefined;
   if(!parent||parent.summary!==null||!child||child.status!==null||!row?.summary)throw Error('DECISION_WATCH_HISTORY_INVALID');
   validateMonitorChildren([{cycle:1,sessionId:id,status,summary:JSON.parse(row.summary)}],1,true);
   this.db.prepare('UPDATE decision_monitor_children SET status=? WHERE monitor_id=? AND session_id=?').run(status,monitorId,id);
  });
 }
 finishMonitor(id:string,summary:MonitorSummary){
  sessionId(id);return this.transaction(()=>{
   const parent=this.db.prepare('SELECT * FROM decision_monitors WHERE id=?').get(id) as SessionRow|undefined;
   if(!parent)throw Error('DECISION_WATCH_HISTORY_INVALID');
   const children=monitorChildren(this.db,id);validateMonitorSummary(summary,children,parent.requested);
   const result={...summary,monitorId:id,persistedSession:true},payload=JSON.stringify(result);
   if(parent.summary!==null&&parent.summary!==payload)throw Error('DECISION_WATCH_HISTORY_INVALID');
   this.db.prepare('UPDATE decision_monitors SET summary=? WHERE id=?').run(payload,id);return result;
  });
 }

 close(){if(this.closed)return;this.closed=true;this.db.close();}
}
/** Read-only opening cannot create a missing file or finalize an interrupted writer. */
export function validateDecisionSessionIds(ids:readonly string[]){
 if(!Array.isArray(ids)||ids.length<1||ids.length>120||new Set(ids).size!==ids.length||
  ids.some(id=>typeof id!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id)))throw Error('DECISION_WATCH_HISTORY_INVALID');
}
export function readDecisionWatchHistory(file:string,limit=5,id?:string,includeObservations=false,selectedIds?:readonly string[]){
 if(!Number.isInteger(limit)||limit<1||limit>20)throw Error('DECISION_WATCH_HISTORY_INVALID');
 if(id!==undefined)sessionId(id);
 if(selectedIds!==undefined){validateDecisionSessionIds(selectedIds);if(id!==undefined)throw Error('DECISION_WATCH_HISTORY_INVALID');}
 if(!fs.existsSync(file))throw Error('DECISION_WATCH_HISTORY_MISSING');
 const db=new DatabaseSync(file,{readOnly:true});
 try{
  db.exec('BEGIN');
  const rows=(selectedIds?selectedIds.map(selected=>{
   const row=db.prepare('SELECT * FROM decision_sessions WHERE id=?').get(selected);
   if(!row)throw Error('DECISION_WATCH_HISTORY_MISSING');return row;
  }):id?db.prepare('SELECT * FROM decision_sessions WHERE id=?').all(id):
   db.prepare('SELECT * FROM decision_sessions ORDER BY started_at DESC,id DESC LIMIT ?').all(limit)) as SessionRow[];
  return rows.map(row=>{
   const observations=reports(db,row.id);
   const result=row.summary?JSON.parse(row.summary):{state:'UNFINALIZED',sessionId:row.id,requestedCycles:row.requested,
    completedCycles:observations.length,persistedObservations:true,persistedSession:false,executionAuthorized:false,ordersSubmitted:0,automaticTradingEnabled:false};
   if(row.summary){
    if(result.sessionId!==row.id||result.persistedSession!==true||!['COMPLETED','STOPPED','INTERRUPTED'].includes(result.state)||
     result.requestedCycles!==row.requested||!Number.isInteger(result.attemptedCycles)||result.attemptedCycles<observations.length||result.attemptedCycles>row.requested||
     (result.state==='COMPLETED'&&(observations.length!==row.requested||result.stopCode!==null)))throw Error('DECISION_WATCH_HISTORY_INVALID');
    const expected=summarizeDecisionWatch(observations,row.requested,result.attemptedCycles,result.state,result.stopCode,result.referenceTiming,result.streamDiagnostics,result.clockDiagnostics,result.contextTiming);
    for(const key of Object.keys(expected) as (keyof typeof expected)[])if(key!=='persistedSession'&&JSON.stringify(expected[key])!==JSON.stringify(result[key]))throw Error('DECISION_WATCH_HISTORY_INVALID');
   }
   if(result.executionAuthorized!==false||result.ordersSubmitted!==0||result.automaticTradingEnabled!==false)throw Error('DECISION_WATCH_HISTORY_INVALID');
   return {startedAt:row.started_at,summary:result,...(id||includeObservations||selectedIds?{observations}:{})};
  });
 }finally{try{db.exec('ROLLBACK');}finally{db.close();}}
}

/** One read-only transaction; missing IDs fail the entire selection without partial analysis. */
export function readDecisionWatchHistoryByIds(file:string,ids:readonly string[]){
 return readDecisionWatchHistory(file,1,undefined,true,ids);
}

function monitorChildren(db:DatabaseSync,id:string):MonitorChild[]{
 return (db.prepare('SELECT c.cycle,c.session_id,c.status,s.summary,s.requested FROM decision_monitor_children c JOIN decision_sessions s ON s.id=c.session_id WHERE c.monitor_id=? ORDER BY c.cycle').all(id) as {cycle:number;session_id:string;status:string|null;summary:string|null;requested:number}[])
 .map(c=>({cycle:c.cycle,sessionId:c.session_id,status:c.status,summary:c.summary?JSON.parse(c.summary):{state:'UNFINALIZED',requestedCycles:c.requested,completedCycles:0,executionAuthorized:false,ordersSubmitted:0,automaticTradingEnabled:false}}));
}
/** Read-only monitor manifest; old runs without manifests are not inferred. */
export function readDecisionMonitor(file:string,id:string){
 validateDecisionSessionIds([id]);if(!fs.existsSync(file))throw Error('DECISION_WATCH_HISTORY_MISSING');
 const db=new DatabaseSync(file,{readOnly:true});
 let parent:SessionRow,children:MonitorChild[];
 try{
  db.exec('BEGIN');
  const table=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='decision_monitors'").get();
  if(!table)throw Error('DECISION_WATCH_HISTORY_MISSING');
  const row=db.prepare('SELECT * FROM decision_monitors WHERE id=?').get(id) as SessionRow|undefined;
  if(!row)throw Error('DECISION_WATCH_HISTORY_MISSING');parent=row;children=monitorChildren(db,id);
 }finally{try{db.exec('ROLLBACK');}finally{db.close();}}
 validateMonitorChildren(children,parent.requested,parent.summary!==null);
 const rows=children.length?readDecisionWatchHistoryByIds(file,children.map(c=>c.sessionId)):[];
 const checked=children.map((c,i)=>({...c,summary:rows[i].summary}));
 validateMonitorChildren(checked,parent.requested,parent.summary!==null);
 const summary=parent.summary?JSON.parse(parent.summary):{environment:'BINANCE_TESTNET',operation:'READ_ONLY_DECISION_MONITOR_SUMMARY',state:'UNFINALIZED',monitorId:id,requestedCycles:parent.requested,recordedCycles:children.length,childSessionIds:children.map(c=>c.sessionId),persistedSession:false,executionAuthorized:false,ordersSubmitted:0,automaticTradingEnabled:false};
 if(parent.summary){
  if(summary.monitorId!==id||summary.persistedSession!==true)throw Error('DECISION_WATCH_HISTORY_INVALID');
  validateMonitorSummary(summary,checked,parent.requested);
 }
 return {startedAt:parent.started_at,summary,children:checked,observationsBySession:rows};
}
