import 'dotenv/config';
import path from 'node:path';
import { createBinanceTestnetAdapter, testnetAccountId } from '../src/server/binanceTestnetAdapter';
import { reconcileTestnetOrders } from '../src/server/reconcileTestnetOrders';

// Separate testnet variables; never use active production credentials or print raw exchange errors.
async function main() {
  const apiKey = process.env.APP_TESTNET_API_KEY ?? '';
  const secretKey = process.env.APP_TESTNET_SECRET_KEY ?? '';
  const adapter = createBinanceTestnetAdapter({apiKey, secretKey});
  const file = path.resolve(process.env.APP_TESTNET_JOURNAL ?? '.testnet_order_journal.json');
  const results = await reconcileTestnetOrders(file, testnetAccountId(apiKey), adapter);
  console.log(JSON.stringify({environment:'BINANCE_TESTNET',operation:'READ_ONLY_EXCHANGE_RECONCILIATION',orders:results},null,2));
  if (results.some(order => !order.verified)) process.exitCode = 1;
}
main().catch(() => {
  console.error('Testnet doğrulaması tamamlanamadı. Testnet yapılandırmasını, günlük dosyasını ve süreç kilidini kontrol edin. Hiçbir emir gönderilmedi.');
  process.exitCode = 1;
});
