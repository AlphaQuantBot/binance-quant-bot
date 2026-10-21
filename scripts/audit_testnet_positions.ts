import 'dotenv/config';
import fs from 'node:fs';
import {createBinanceTestnetAdapter,testnetAccountId} from '../src/server/binanceTestnetAdapter';
import {auditPositions} from '../src/server/positionProtection';
async function main(){
 const file=process.env.APP_TESTNET_POSITION_PLAN;if(!file)throw Error('POSITION_PLAN_REQUIRED');
 const apiKey=process.env.APP_TESTNET_API_KEY??'';
 const plan=JSON.parse(fs.readFileSync(file,'utf8'));
 if(plan.accountId!==testnetAccountId(apiKey))throw Error('PLAN_ACCOUNT_MISMATCH');
 const a=createBinanceTestnetAdapter({apiKey,secretKey:process.env.APP_TESTNET_SECRET_KEY??''});
 const report=await auditPositions({accountSnapshot:a.accountSnapshot,protectionOrder:a.protectionOrder},plan);
 console.log(JSON.stringify(report,null,2));if(!report.coverageObserved)process.exitCode=1;
}
main().catch(()=>{console.error('Testnet pozisyon–stop denetimi tamamlanamadı. Hesap ve planı kontrol edin. Emir gönderilmedi.');process.exitCode=1;});
