import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import {createBinanceTestnetAdapter,testnetAccountId} from '../src/server/binanceTestnetAdapter';
import {OrderExecution} from '../src/server/orderExecution';
import {valueAccount} from '../src/server/accountValuation';
import {EquityHistory} from '../src/server/equityHistory';
import {activityFromOrders} from '../src/server/accountActivity';
async function main(){
 const apiKey=process.env.APP_TESTNET_API_KEY??'',accountId=testnetAccountId(apiKey);
 const a=createBinanceTestnetAdapter({apiKey,secretKey:process.env.APP_TESTNET_SECRET_KEY??''});
 const orderFile=path.resolve(process.env.APP_TESTNET_JOURNAL??'.testnet_order_journal.json');if(!fs.existsSync(orderFile))throw Error('EXISTING_JOURNAL_REQUIRED');
 const orders=new OrderExecution(orderFile,{query:a.query,submit:async()=>{throw Error('READ_ONLY_ACTIVITY_AUDIT');}});
 let history:EquityHistory|undefined;
 try{
  history=new EquityHistory(path.resolve(process.env.APP_TESTNET_EQUITY_HISTORY??'.testnet_equity_history.json'),accountId);
  for(const r of orders.list())await orders.reconcile(r.requestId);
  const pairs=[];for(const symbol of new Set(orders.list().map(r=>r.symbol))){const c=await a.tradeContext(symbol);pairs.push({symbol,baseAsset:c.baseAsset,quoteAsset:c.quoteAsset});}
  const first=activityFromOrders(orders.list(),pairs,accountId);
  const sample=await valueAccount({accountSnapshot:a.accountSnapshot,tradeContext:a.tradeContext},accountId);
  for(const r of orders.list())await orders.reconcile(r.requestId);
  const latest=activityFromOrders(orders.list(),pairs,accountId);
  if(JSON.stringify(first)!==JSON.stringify(latest))throw Error('ACTIVITY_CHANGED_DURING_OBSERVATION');
  const report=history.record(sample,latest);console.log(JSON.stringify({operation:'READ_ONLY_ACTIVITY_OBSERVATION',...report},null,2));
  if(report.activityIssues.length||['UNRESOLVED_ORDERS','UNEXPLAINED_BALANCE_CHANGE'].includes(report.activityAudit.state))process.exitCode=1;
 }finally{history?.close();orders.close();}
}
main().catch(()=>{console.error('Testnet işlem–bakiye eşleştirmesi tamamlanamadı. Kayıt, hesap ve mutabakatı kontrol edin. Emir gönderilmedi veya iptal edilmedi.');process.exitCode=1;});
