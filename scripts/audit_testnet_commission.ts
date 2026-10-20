import 'dotenv/config';
import {createBinanceTestnetAdapter,testnetAccountId} from '../src/server/binanceTestnetAdapter';
import {commissionSummary} from '../src/server/commissionRates';
async function main(){
 const symbol=process.env.APP_TESTNET_COMMISSION_SYMBOL;if(!symbol)throw Error('COMMISSION_SYMBOL_REQUIRED');
 const apiKey=process.env.APP_TESTNET_API_KEY??'';
 const adapter=createBinanceTestnetAdapter({apiKey,secretKey:process.env.APP_TESTNET_SECRET_KEY??''});
 const snapshot=await adapter.commissionRates(symbol);
 console.log(JSON.stringify({operation:'READ_ONLY_COMMISSION_AUDIT',snapshot,summary:commissionSummary(snapshot,testnetAccountId(apiKey),symbol,Date.now())},null,2));
}
main().catch(()=>{console.error('Testnet komisyon verisi doğrulanamadı. Sembol ve yapılandırmayı kontrol edin. Emir gönderilmedi.');process.exitCode=1;});
