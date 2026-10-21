import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import {createBinanceTestnetAdapter,testnetAccountId} from '../src/server/binanceTestnetAdapter';
import {OrderExecution} from '../src/server/orderExecution';
import {planStopReplacement} from '../src/server/stopReplacement';
async function main(){
 const config=process.env.APP_TESTNET_REPLACEMENT_PLAN;if(!config)throw Error('REPLACEMENT_PLAN_REQUIRED');
 const input=JSON.parse(fs.readFileSync(config,'utf8'));
 const file=path.resolve(process.env.APP_TESTNET_JOURNAL??'.testnet_order_journal.json');
 if(!fs.existsSync(file))throw Error('EXISTING_JOURNAL_REQUIRED');
 const apiKey=process.env.APP_TESTNET_API_KEY??'';
 const a=createBinanceTestnetAdapter({apiKey,secretKey:process.env.APP_TESTNET_SECRET_KEY??''});
 const engine=new OrderExecution(file,{query:a.query,submit:async()=>{throw Error('READ_ONLY_REPLACEMENT_PLAN');}});
 try{
  const previous=await engine.reconcile(input.previousRequestId);
  if(previous.accountId!==testnetAccountId(apiKey))throw Error('JOURNAL_ACCOUNT_MISMATCH');
  const before=await a.accountSnapshot();
  const context=await a.tradeContext(previous.symbol);
  const account=await a.accountSnapshot();
  const fingerprint=(s:typeof account)=>JSON.stringify({canTrade:s.canTrade,balances:s.balances,openOrders:s.openOrders});
  if(fingerprint(before)!==fingerprint(account)||Date.now()-before.startedAt>10000)throw Error('ACCOUNT_CHANGED_DURING_PLAN');
  const report=planStopReplacement({previous,account,context,policy:input.policy,requestId:input.requestId,stopPrice:input.stopPrice,limitPrice:input.limitPrice});
  console.log(JSON.stringify({environment:'BINANCE_TESTNET',operation:'READ_ONLY_REPLACEMENT_PLAN',...report},null,2));
 }finally{engine.close();}
}
main().catch(()=>{console.error('Testnet stop değişim planı hazırlanamadı. Emir, mutabakat ve risk ayarlarını kontrol edin. Hiçbir emir gönderilmedi veya iptal edilmedi.');process.exitCode=1;});
