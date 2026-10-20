import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {createBinanceTestnetAdapter,testnetAccountId} from '../src/server/binanceTestnetAdapter';
import {HistoryRecovery} from '../src/server/historyRecovery';
import {RecoveryMonitor,validateMonitorConfig,type MonitorConfig} from '../src/server/recoveryMonitor';
import {EquityHistory} from '../src/server/equityHistory';
import {valueAccount} from '../src/server/accountValuation';
async function main(){
 const file=process.env.APP_TESTNET_MONITOR_CONFIG,cyclesText=process.env.APP_TESTNET_WATCH_CYCLES;
 if(!file||!cyclesText||!/^(0|[1-9]\d{0,5})$/.test(cyclesText))throw Error('EXPLICIT_MONITOR_CONFIG_AND_CYCLES_REQUIRED');
 const config:MonitorConfig=JSON.parse(fs.readFileSync(file,'utf8'));validateMonitorConfig(config);const cycles=Number(cyclesText);
 const stop=new AbortController();const shutdown=()=>stop.abort();process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
 const apiKey=process.env.APP_TESTNET_API_KEY??'',accountId=testnetAccountId(apiKey);
 const a=createBinanceTestnetAdapter({apiKey,secretKey:process.env.APP_TESTNET_SECRET_KEY??'',fetcher:(url,init)=>fetch(url,{...init,signal:AbortSignal.any([stop.signal,...(init?.signal?[init.signal]:[])])})});
 let recovery:HistoryRecovery|undefined,monitor:RecoveryMonitor|undefined,history:EquityHistory|undefined;
 try{
  recovery=new HistoryRecovery(path.resolve(process.env.APP_TESTNET_RECOVERY_JOURNAL??'.testnet_history_recovery.json'),accountId,a.tradeHistory);
  monitor=new RecoveryMonitor(path.resolve(process.env.APP_TESTNET_MONITOR_STATE??'.testnet_monitor_state.json'),accountId,config,scope=>recovery!.recover(scope));
  // Separate observation journal: do not erase diagnostic activity cursors used by testnet:activity.
  history=new EquityHistory(path.resolve(process.env.APP_TESTNET_MONITOR_EQUITY??'.testnet_monitor_equity.json'),accountId);
  for(let cycle=1;!stop.signal.aborted&&(cycles===0||cycle<=cycles);cycle++){
   let observation:unknown={state:'VALUATION_UNCONFIRMED'};
   let sample:Awaited<ReturnType<typeof valueAccount>>|undefined;
   try{sample=await valueAccount({accountSnapshot:a.accountSnapshot,tradeContext:a.tradeContext},accountId);}catch{if(stop.signal.aborted)break;}
   if(sample?.complete)observation=history.record(sample);else process.exitCode=1;
   if(stop.signal.aborted)break;
   const recoveryReport=await monitor.tick();
   if(recoveryReport.events.some(e=>e.state!=='ENUMERATED'))process.exitCode=1;
   console.log(JSON.stringify({operation:'READ_ONLY_MONITOR_CYCLE',cycle,observation,recovery:recoveryReport}));
   if(cycles!==0&&cycle>=cycles)break;
   try{await delay(config.intervalMs,undefined,{signal:stop.signal});}catch{if(!stop.signal.aborted)throw Error('MONITOR_WAIT_FAILED');}
  }
 }finally{history?.close();monitor?.close();recovery?.close();process.off('SIGINT',shutdown);process.off('SIGTERM',shutdown);}
}
main().catch(()=>{console.error('Testnet izleme durdu. Yapılandırmayı ve özel kayıt kilitlerini kontrol edin. Emir gönderilmedi veya iptal edilmedi.');process.exitCode=1;});
