import fs from 'node:fs';
import {DecisionWatchJournal} from '../src/server/decisionWatchJournal';
import {DecisionReferenceSession} from '../src/server/decisionReferenceSession';
import 'dotenv/config';
import path from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {observeScopedDecision,decisionObservationErrorCode} from '../src/server/scopedDecisionObservation';
import {runDecisionWatch} from '../src/server/scopedDecisionWatch';
async function main(){
 const text=process.argv[2]??'10';
 if(!/^[1-9]\d{0,2}$/.test(text)||Number(text)>120)throw Error('DECISION_WATCH_CYCLES_INVALID');
 const stop=new AbortController(),shutdown=()=>stop.abort();process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
 const referenceSession=new DecisionReferenceSession();
 const closeReference=()=>referenceSession.close();stop.signal.addEventListener('abort',closeReference,{once:true});
 let journal:DecisionWatchJournal|undefined;
 const file=path.resolve(process.env.APP_TESTNET_SCOPED_JOURNAL??'.testnet_scoped/sandbox.sqlite');
 try{
  if(!fs.existsSync(file))throw Error('SCOPED_NOT_INITIALIZED');
  const logFile=path.join(path.dirname(file),'decision-watch.sqlite');
  const samePath=process.platform==='win32'?logFile.toLowerCase()===file.toLowerCase():logFile===file;
  const sameFile=fs.existsSync(logFile)&&fs.statSync(logFile).dev===fs.statSync(file).dev&&fs.statSync(logFile).ino===fs.statSync(file).ino;
  if(samePath||sameFile)throw Error('DECISION_WATCH_HISTORY_INVALID');
  journal=new DecisionWatchJournal(logFile);const sessionId=journal.start(Number(text));
  const summary=await runDecisionWatch(Number(text),{
   observe:signal=>observeScopedDecision(file,process.env.APP_TESTNET_API_KEY??'',process.env.APP_TESTNET_SECRET_KEY??'',signal,referenceSession),
   wait:async(ms,signal)=>{await delay(ms,undefined,{signal});},monotonicNow:()=>performance.now(),
   record:(report,cycle)=>journal!.append(sessionId,cycle,report),
   emit:(report,cycle)=>console.log(JSON.stringify({cycle,...report},null,2)),errorCode:decisionObservationErrorCode
  },stop.signal);
  const persisted=journal.finish(sessionId,summary);
  console.log(JSON.stringify(persisted,null,2));if(summary.state==='STOPPED')process.exitCode=1;
 }finally{try{journal?.close();}finally{stop.signal.removeEventListener('abort',closeReference);referenceSession.close();process.off('SIGINT',shutdown);process.off('SIGTERM',shutdown);}}
}
main().catch(error=>{
 const allowed=['DECISION_WATCH_CYCLES_INVALID','DECISION_WATCH_PERSISTENCE_FAILED','DECISION_WATCH_HISTORY_INVALID','SCOPED_NOT_INITIALIZED'];
 const code=error instanceof Error&&allowed.includes(error.message)?error.message:'DECISION_WATCH_STOPPED';
 console.error(JSON.stringify({environment:'BINANCE_TESTNET',operation:'READ_ONLY_DECISION_WATCH_SUMMARY',state:'STOPPED',stopCode:code,
  executionAuthorized:false,ordersSubmitted:0,automaticTradingEnabled:false},null,2));process.exitCode=1;
});
