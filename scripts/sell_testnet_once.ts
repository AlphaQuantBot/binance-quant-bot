import 'dotenv/config';
import path from 'node:path';
import {ScopedTestnetJournal} from '../src/server/scopedTestnetJournal';
import {runScopedTestnetSellOnce} from '../src/server/scopedTestnetSellOnce';
import {createBinanceTestnetAdapter,testnetAccountId} from '../src/server/binanceTestnetAdapter';
import {TestnetReferenceStream} from '../src/server/testnetReferenceStream';
import {ReferencePriceFreshnessError} from '../src/server/priceReference';
async function main(){
 const key=process.env.APP_TESTNET_API_KEY??'',secret=process.env.APP_TESTNET_SECRET_KEY??'';
 const stream=new TestnetReferenceStream('BTCUSDT');let journal:ScopedTestnetJournal|undefined;
 try{
  const a=createBinanceTestnetAdapter({apiKey:key,secretKey:secret,referenceReader:s=>stream.read(s)});
  journal=new ScopedTestnetJournal(path.resolve(process.env.APP_TESTNET_SCOPED_JOURNAL??'.testnet_scoped/sandbox.sqlite'),testnetAccountId(key));
  // This command never initializes/rebases an allocation. Only the fixed testnet adapter is used.
  const r=await runScopedTestnetSellOnce(journal,{accountSnapshot:a.accountSnapshot,tradeContext:a.tradeContext,commissionRates:a.commissionRates,query:a.query,submit:a.submit});
  console.log(JSON.stringify(r,null,2));if(r.state!=='CONFIRMED')process.exitCode=1;
 }finally{stream.close();journal?.close();}
}
main().catch(error=>{
 const sqlite=error instanceof Error&&'code' in error&&error.code==='ERR_SQLITE_ERROR';
 const code=sqlite&&'errcode' in error&&[5,6].includes(Number(error.errcode))?'SCOPED_STORAGE_BUSY':error instanceof Error&&safeCodes.includes(error.message)?error.message:'SCOPED_SELL_UNCONFIRMED';
 console.error(JSON.stringify({environment:'BINANCE_TESTNET',operation:'SCOPED_TESTNET_SELL_ONCE',state:'STOPPED',code,...(error instanceof ReferencePriceFreshnessError?{referenceTiming:error.timing}:{}),automaticTradingEnabled:false,recoveryCommand:'npm.cmd run testnet:sandbox-status'},null,2));process.exitCode=1;
});
const safeCodes=['SCOPED_SELL_NOT_READY','SCOPED_SELL_TOO_SMALL','SCOPED_CLOCK_INVALID','SCOPED_NOT_INITIALIZED','SCOPED_STATE_INVALID','SCOPED_HALTED','SCOPED_RECONCILIATION_REQUIRED','SCOPED_ONESHOT_ALREADY_USED','SCOPED_ONESHOT_IDENTITY_INVALID','SCOPED_SEND_ALREADY_CLAIMED','SCOPED_CAPITAL_UNAVAILABLE','SCOPED_NONZERO_FEE_EXECUTION_UNSUPPORTED','SCOPED_DURABILITY_UNCONFIRMED','INVALID_TESTNET_CREDENTIALS','ACCOUNT_CHANGED_DURING_READ','ACCOUNT_SNAPSHOT_STALE','STALE_TRADE_CONTEXT','STALE_COMMISSION_RATES','STALE_REFERENCE_PRICE','STREAM_REFERENCE_TIMEOUT','STREAM_REFERENCE_INVALID','STREAM_REFERENCE_REGRESSED','STREAM_REFERENCE_DISCONNECTED','STREAM_REFERENCE_TRANSPORT_UNCONFIRMED','EXCHANGE_LOCATION_RESTRICTED','EXCHANGE_COOLDOWN','EXCHANGE_REQUEST_UNCONFIRMED','EXCHANGE_TRANSPORT_UNKNOWN','UNSUPPORTED_SYMBOL_FILTER','UNSUPPORTED_EXCHANGE_FILTER','PERCENT_PRICE_REJECTED','PRICE_FILTER_REJECTED','LOT_SIZE_REJECTED','NOTIONAL_REJECTED','MIN_NOTIONAL_REJECTED','SPREAD_LIMIT_EXCEEDED','SLIPPAGE_LIMIT_EXCEEDED','SANDBOX_OPEN_ORDERS_PRESENT','SANDBOX_CAPITAL_UNAVAILABLE'];
