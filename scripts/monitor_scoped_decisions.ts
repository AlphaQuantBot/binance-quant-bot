import fs from 'node:fs';
import path from 'node:path';
import 'dotenv/config';
import {setTimeout as delay} from 'node:timers/promises';
import {DecisionWatchJournal} from '../src/server/decisionWatchJournal';
import {DecisionReferenceSession} from '../src/server/decisionReferenceSession';
import {observeScopedDecision,decisionObservationErrorCode} from '../src/server/scopedDecisionObservation';
import {runDecisionMonitor} from '../src/server/scopedDecisionMonitor';
async function main(){
 const args=process.argv.slice(2),text=args[0];
 if(args.length!==1||! /^[1-9]\d{0,2}$/.test(text??'')||Number(text)>120)throw Error('DECISION_MONITOR_CYCLES_INVALID');
 const file=path.resolve(process.env.APP_TESTNET_SCOPED_JOURNAL??'.testnet_scoped/sandbox.sqlite');
 if(!fs.existsSync(file))throw Error('SCOPED_NOT_INITIALIZED');
 const logFile=path.join(path.dirname(file),'decision-watch.sqlite');
 const samePath=process.platform==='win32'?logFile.toLowerCase()===file.toLowerCase():logFile===file;
 const sameFile=fs.existsSync(logFile)&&fs.statSync(logFile).dev===fs.statSync(file).dev&&fs.statSync(logFile).ino===fs.statSync(file).ino;
 if(samePath||sameFile)throw Error('DECISION_WATCH_HISTORY_INVALID');
 const stop=new AbortController(),referenceSession=new DecisionReferenceSession();
 const shutdown=()=>{stop.abort();referenceSession.close();};
 process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
 let journal:DecisionWatchJournal|undefined;
 try{
  journal=new DecisionWatchJournal(logFile);
  const summary=await runDecisionMonitor(Number(text),{
   observe:signal=>observeScopedDecision(file,process.env.APP_TESTNET_API_KEY??'',process.env.APP_TESTNET_SECRET_KEY??'',signal,referenceSession),
   wait:async(ms,signal)=>{await delay(ms,undefined,{signal});},monotonicNow:()=>performance.now(),
   begin:()=>journal!.start(1),record:(id,report)=>journal!.append(id,1,report),finish:(id,s)=>journal!.finish(id,s),
   emit:(cycle,sessionId,status,summary)=>console.log(JSON.stringify({environment:'BINANCE_TESTNET',operation:'READ_ONLY_DECISION_MONITOR_CYCLE',
    cycle,sessionId,status,summary,executionAuthorized:false,ordersSubmitted:0,automaticTradingEnabled:false},null,2)),
   errorCode:decisionObservationErrorCode
  },stop.signal);
  console.log(JSON.stringify(summary,null,2));if(summary.state==='STOPPED')process.exitCode=1;
 }finally{try{journal?.close();}finally{referenceSession.close();process.off('SIGINT',shutdown);process.off('SIGTERM',shutdown);}}
}
main().catch(error=>{
 const allowed=['DECISION_MONITOR_CYCLES_INVALID','DECISION_MONITOR_PERSISTENCE_FAILED','DECISION_WATCH_PERSISTENCE_FAILED','DECISION_WATCH_HISTORY_INVALID','SCOPED_NOT_INITIALIZED','INVALID_CLOCK'];
 const code=error instanceof Error&&allowed.includes(error.message)?error.message:'DECISION_MONITOR_UNCONFIRMED';
 console.error(JSON.stringify({environment:'BINANCE_TESTNET',operation:'READ_ONLY_DECISION_MONITOR_SUMMARY',state:'STOPPED',stopCode:code,
  executionAuthorized:false,ordersSubmitted:0,automaticTradingEnabled:false},null,2));process.exitCode=1;
});
