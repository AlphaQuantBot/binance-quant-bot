import 'dotenv/config';
import path from 'node:path';
import { createBinanceTestnetAdapter, testnetAccountId } from '../src/server/binanceTestnetAdapter';
import { FundedExecution } from '../src/server/fundedExecution';
async function main() {
  const apiKey=process.env.APP_TESTNET_API_KEY??'',secretKey=process.env.APP_TESTNET_SECRET_KEY??'';
  const adapter=createBinanceTestnetAdapter({apiKey,secretKey});
  // Runtime safety: this operator command has no usable submission capability.
  const engine=new FundedExecution(
    path.resolve(process.env.APP_TESTNET_JOURNAL??'.testnet_order_journal.json'),
    path.resolve(process.env.APP_TESTNET_CAPITAL_JOURNAL??'.testnet_capital_journal.json'),
    testnetAccountId(apiKey),{...adapter,submit:async()=>{throw Error('READ_ONLY_ACCOUNT_AUDIT');}},
  );
  try{
    const report=await engine.refresh();
    console.log(JSON.stringify({environment:'BINANCE_TESTNET',operation:'READ_ONLY_ACCOUNT_AUDIT',...report},null,2));
    if(!report.ready)process.exitCode=1;
  }finally{engine.close();}
}
main().catch(()=>{
  console.error('Testnet hesap mutabakatı tamamlanamadı. Bakiye, açık emir, yapılandırma ve süreç kilitlerini kontrol edin. Hiçbir emir gönderilmedi.');
  process.exitCode=1;
});
