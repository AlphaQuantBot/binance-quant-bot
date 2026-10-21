import path from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {readSignalCandles,evaluateSignal,SignalObservationJournal} from '../src/server/testnetSignalObserver';
import {nextSignalDelay,summarizeSignalSession} from '../src/server/testnetSignalTiming';
async function main(){
 const value=process.argv[2]??'10';if(!/^[1-9]\d{0,2}$/.test(value)||Number(value)>120)throw Error('SIGNAL_CYCLES_INVALID');
 const stop=new AbortController(),shutdown=()=>stop.abort();process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
 const journal=new SignalObservationJournal(path.resolve('.testnet_scoped/signals.sqlite'));
 const observations=[];let state='COMPLETED';
 try{for(let cycle=1;cycle<=Number(value)&&!stop.signal.aborted;cycle++){
  const sample=await readSignalCandles((url,init)=>fetch(url,{...init,signal:AbortSignal.any([stop.signal,...(init?.signal?[init.signal]:[])])}));
  const observation=journal.record(evaluateSignal(sample.raw,sample.serverTime));
  observations.push(observation);
  console.log(JSON.stringify({cycle,...observation},null,2));
  if(cycle<Number(value))try{
   await delay(nextSignalDelay(sample.serverTime,sample.clockReceivedAt,performance.now()),undefined,{signal:stop.signal});
  }catch{if(!stop.signal.aborted)throw Error('SIGNAL_WAIT_FAILED');}
 }}catch(error){state=stop.signal.aborted?'INTERRUPTED':'STOPPED';if(!stop.signal.aborted)throw error;}
 finally{
  if(stop.signal.aborted)state='INTERRUPTED';
  try{console.log(JSON.stringify(summarizeSignalSession(observations,Number(value),state),null,2));}
  finally{journal.close();process.off('SIGINT',shutdown);process.off('SIGTERM',shutdown);}
 }
}
main().catch(error=>{const code=error instanceof Error&&/^SIGNAL_[A-Z_]+$/.test(error.message)?error.message:'SIGNAL_OBSERVATION_STOPPED';console.error(JSON.stringify({environment:'BINANCE_TESTNET',operation:'READ_ONLY_SIGNAL_OBSERVATION',state:'STOPPED',code,ordersSubmitted:0,automaticTradingEnabled:false}));process.exitCode=1;});
