import 'dotenv/config';
import {createBinanceTestnetAdapter,testnetAccountId} from '../src/server/binanceTestnetAdapter';
import {valueAccount} from '../src/server/accountValuation';
async function main(){
 const apiKey=process.env.APP_TESTNET_API_KEY??'';
 const a=createBinanceTestnetAdapter({apiKey,secretKey:process.env.APP_TESTNET_SECRET_KEY??''});
 const report=await valueAccount({accountSnapshot:a.accountSnapshot,tradeContext:a.tradeContext},testnetAccountId(apiKey));
 console.log(JSON.stringify(report,null,2));if(!report.complete)process.exitCode=1;
}
main().catch(()=>{console.error('Testnet hesap değerlemesi tamamlanamadı. Hesap ve fiyat kaynaklarını kontrol edin. Emir gönderilmedi.');process.exitCode=1;});
