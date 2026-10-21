import 'dotenv/config';
import path from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {observeScopedDecision,decisionObservationErrorCode} from '../src/server/scopedDecisionObservation';
import {runDecisionWatch} from '../src/server/scopedDecisionWatch';
async function main(){
 const text=process.argv[2]??'10';
 if(!/^[1-9]\d{0,2}$/.test(text)||Number(text)>120)throw Error('DECISION_WATCH_CYCLES_INVALID');
 const stop=new AbortController(),shutdown=()=>stop.abort();process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
 const file=path.resolve(process.env.APP_TESTNET_SCOPED_JOURNAL??'.testnet_scoped/sandbox.sqlite');
 try{
  const summary=await runDecisionWatch(Number(text),{
   observe:signal=>observeScopedDecision(file,process.env.APP_TESTNET_API_KEY??'',process.env.APP_TESTNET_SECRET_KEY??'',signal),
   wait:async(ms,signal)=>{await delay(ms,undefined,{signal});},monotonicNow:()=>performance.now(),
   emit:(report,cycle)=>console.log(JSON.stringify({cycle,...report},null,2)),errorCode:decisionObservationErrorCode
  },stop.signal);
  console.log(JSON.stringify(summary,null,2));if(summary.state==='STOPPED')process.exitCode=1;
 }finally{process.off('SIGINT',shutdown);process.off('SIGTERM',shutdown);}
}
main().catch(error=>{
 const code=error instanceof Error&&error.message==='DECISION_WATCH_CYCLES_INVALID'?error.message:'DECISION_WATCH_STOPPED';
 console.error(JSON.stringify({environment:'BINANCE_TESTNET',operation:'READ_ONLY_DECISION_WATCH_SUMMARY',state:'STOPPED',stopCode:code,
  executionAuthorized:false,ordersSubmitted:0,automaticTradingEnabled:false},null,2));process.exitCode=1;
});
