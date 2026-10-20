import 'dotenv/config';
import path from 'node:path';
import {createBinanceTestnetAdapter,testnetAccountId} from '../src/server/binanceTestnetAdapter';
import {HistoryRecovery} from '../src/server/historyRecovery';
async function main(){
 const symbol=process.env.APP_TESTNET_HISTORY_SYMBOL,start=process.env.APP_TESTNET_HISTORY_START_MS,end=process.env.APP_TESTNET_HISTORY_END_MS;
 if(!symbol||!start||!end||!/^\d+$/.test(start)||!/^\d+$/.test(end))throw Error('EXPLICIT_HISTORY_WINDOW_REQUIRED');
 const apiKey=process.env.APP_TESTNET_API_KEY??'',a=createBinanceTestnetAdapter({apiKey,secretKey:process.env.APP_TESTNET_SECRET_KEY??''});
 const recovery=new HistoryRecovery(path.resolve(process.env.APP_TESTNET_RECOVERY_JOURNAL??'.testnet_history_recovery.json'),testnetAccountId(apiKey),a.tradeHistory);
 try{const report=await recovery.recover({symbol,startTime:Number(start),endTime:Number(end)});console.log(JSON.stringify({operation:'READ_ONLY_HISTORY_RECOVERY',...report},null,2));if(report.state!=='STABLE_SYMBOL_WINDOW')process.exitCode=1;}finally{recovery.close();}
}
main().catch(()=>{console.error('Testnet geçmiş kurtarma tamamlanamadı. Kayıtları, zaman aralığını ve yapılandırmayı kontrol edin. Emir gönderilmedi veya iptal edilmedi.');process.exitCode=1;});
