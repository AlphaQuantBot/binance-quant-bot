import 'dotenv/config';
import {createBinanceTestnetAdapter} from '../src/server/binanceTestnetAdapter';
async function main(){
 const symbol=process.env.APP_TESTNET_HISTORY_SYMBOL,start=process.env.APP_TESTNET_HISTORY_START_MS,end=process.env.APP_TESTNET_HISTORY_END_MS;
 if(!symbol||!start||!end||!/^\d+$/.test(start)||!/^\d+$/.test(end))throw Error('EXPLICIT_HISTORY_WINDOW_REQUIRED');
 const a=createBinanceTestnetAdapter({apiKey:process.env.APP_TESTNET_API_KEY??'',secretKey:process.env.APP_TESTNET_SECRET_KEY??''});
 const report=await a.tradeHistory(symbol,Number(start),Number(end));
 console.log(JSON.stringify({operation:'READ_ONLY_TRADE_BACKFILL',...report},null,2));
}
main().catch(()=>{console.error('Testnet işlem geçmişi eksiksiz okunamadı. Sembol, zaman aralığı ve yapılandırmayı kontrol edin. Emir gönderilmedi veya iptal edilmedi.');process.exitCode=1;});
