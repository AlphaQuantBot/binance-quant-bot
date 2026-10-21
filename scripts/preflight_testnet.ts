import 'dotenv/config';
import {testnetPreflight} from '../src/server/testnetPreflight';
try{const report=await testnetPreflight({apiKey:process.env.APP_TESTNET_API_KEY,secretKey:process.env.APP_TESTNET_SECRET_KEY,symbol:process.env.APP_TESTNET_PREFLIGHT_SYMBOL});console.log(JSON.stringify(report,null,2));if(!report.publicReady||!report.authenticatedReady)process.exitCode=1;}catch{console.error('Testnet ön kontrolü tamamlanamadı. Emir gönderilmedi.');process.exitCode=1;}
