import 'dotenv/config';
import {createBinanceTestnetAdapter,testnetAccountId} from '../src/server/binanceTestnetAdapter';
import {valueAccount} from '../src/server/accountValuation';
async function main(){
 const apiKey=process.env.APP_TESTNET_API_KEY??'';
 const a=createBinanceTestnetAdapter({apiKey,secretKey:process.env.APP_TESTNET_SECRET_KEY??''});
 const report=await valueAccount({accountSnapshot:a.accountSnapshot,tradeContext:a.tradeContext,valuationMarks:a.valuationMarks},testnetAccountId(apiKey));
 console.log(JSON.stringify({environment:report.environment,operation:report.operation,complete:report.complete,holdingCount:report.assets.length,pricedAssetCount:report.pricedAssets.length,unpricedAssetCount:report.unpricedAssets.length,currentEquityUSDT:report.currentEquityUSDT,unpricedAssets:report.unpricedAssets,issues:report.issues,dailyRiskAuthorized:report.dailyRiskAuthorized},null,2));if(!report.complete)process.exitCode=1;
}
main().catch(()=>{console.error('Testnet hesap değerlemesi tamamlanamadı. Hesap ve fiyat kaynaklarını kontrol edin. Emir gönderilmedi.');process.exitCode=1;});
