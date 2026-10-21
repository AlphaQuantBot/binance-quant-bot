import path from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {readSignalCandles,evaluateSignal,SignalObservationJournal} from '../src/server/testnetSignalObserver';
async function main(){
 const value=process.argv[2]??'10';if(!/^[1-9]\d{0,2}$/.test(value)||Number(value)>120)throw Error('SIGNAL_CYCLES_INVALID');
 const stop=new AbortController(),shutdown=()=>stop.abort();process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
 const journal=new SignalObservationJournal(path.resolve('.testnet_scoped/signals.sqlite'));
 try{for(let cycle=1;cycle<=Number(value)&&!stop.signal.aborted;cycle++){
  const sample=await readSignalCandles((url,init)=>fetch(url,{...init,signal:AbortSignal.any([stop.signal,...(init?.signal?[init.signal]:[])])}));
  console.log(JSON.stringify({cycle,...journal.record(evaluateSignal(sample.raw,sample.serverTime))},null,2));
  if(cycle<Number(value))try{await delay(60000,undefined,{signal:stop.signal});}catch{if(!stop.signal.aborted)throw Error('SIGNAL_WAIT_FAILED');}
 }}finally{journal.close();process.off('SIGINT',shutdown);process.off('SIGTERM',shutdown);}
}
main().catch(error=>{const code=error instanceof Error&&/^SIGNAL_[A-Z_]+$/.test(error.message)?error.message:'SIGNAL_OBSERVATION_STOPPED';console.error(JSON.stringify({environment:'BINANCE_TESTNET',operation:'READ_ONLY_SIGNAL_OBSERVATION',state:'STOPPED',code,ordersSubmitted:0,automaticTradingEnabled:false}));process.exitCode=1;});
