import 'dotenv/config';
import fs from 'node:fs';
import {createBinanceTestnetAdapter} from '../src/server/binanceTestnetAdapter';
import {auditProtection} from '../src/server/protectionAudit';
async function main(){
  const file=process.env.APP_TESTNET_PROTECTION_TARGET;
  if(!file)throw Error('PROTECTION_TARGET_REQUIRED');
  const target=JSON.parse(fs.readFileSync(file,'utf8'));
  const adapter=createBinanceTestnetAdapter({apiKey:process.env.APP_TESTNET_API_KEY??'',secretKey:process.env.APP_TESTNET_SECRET_KEY??''});
  // Pass only the read capability; no submit/cancel/replace operation is available.
  const result=await auditProtection({protectionOrder:adapter.protectionOrder},target);
  console.log(JSON.stringify(result,null,2));
  if(!['STATIC_STOP_OBSERVED','STATIC_STOP_LIMIT_OBSERVED'].includes(result.state))process.exitCode=1;
}
main().catch(()=>{console.error('Testnet stop denetimi tamamlanamadı. Hedef emir ve yapılandırmayı kontrol edin. Hiçbir emir gönderilmedi.');process.exitCode=1;});
