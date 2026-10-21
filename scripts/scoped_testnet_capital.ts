import 'dotenv/config';
import path from 'node:path';
import {ScopedTestnetJournal} from '../src/server/scopedTestnetJournal';
import {createBinanceTestnetAdapter,testnetAccountId} from '../src/server/binanceTestnetAdapter';
import {TestnetReferenceStream} from '../src/server/testnetReferenceStream';
async function main(){
 const action=process.argv[2];if(!['init','status','halt'].includes(action))throw Error('SCOPED_ACTION_INVALID');
 const key=process.env.APP_TESTNET_API_KEY??'',accountId=testnetAccountId(key);
 if(!/^[A-Za-z0-9]{8,256}$/.test(key))throw Error('INVALID_TESTNET_CREDENTIALS');
 const journal=new ScopedTestnetJournal(path.resolve(process.env.APP_TESTNET_SCOPED_JOURNAL??'.testnet_scoped/sandbox.sqlite'),accountId);
 let stream:TestnetReferenceStream|undefined;
 try{
  if(action==='halt'){journal.halt();console.log(JSON.stringify({operation:'SCOPED_CAPITAL_HALT',state:'PERSISTED',tradingEnabled:false}));return;}
  const a=createBinanceTestnetAdapter({apiKey:key,secretKey:process.env.APP_TESTNET_SECRET_KEY??''});
  if(action==='init'){const first=await a.accountSnapshot();const initialized=journal.initialize(first);console.log(JSON.stringify({operation:'SCOPED_CAPITAL_INITIALIZE',...initialized,tradingEnabled:false}));}
  const recovery=await journal.reconcile(a.query);
  stream=new TestnetReferenceStream('BTCUSDT');
  const reader=createBinanceTestnetAdapter({apiKey:key,secretKey:process.env.APP_TESTNET_SECRET_KEY??'',referenceReader:s=>stream!.read(s)});
  // Query-only recovery. No submit/cancel capability is passed into this workflow.
  const [snapshot,context]=await Promise.all([reader.accountSnapshot(),reader.tradeContext('BTCUSDT')]);
  const report=journal.audit(snapshot,context);
  console.log(JSON.stringify({...report,recovery},null,2));if(report.halted||report.unresolvedOrders)process.exitCode=1;
 }finally{stream?.close();journal.close();}
}
main().catch(error=>{
 const sqlite=error instanceof Error&&'code' in error&&error.code==='ERR_SQLITE_ERROR';
 const code=sqlite&&'errcode' in error&&[5,6].includes(Number(error.errcode))?'SCOPED_STORAGE_BUSY':error instanceof Error&&safeCodes.includes(error.message)?error.message:'SCOPED_CAPITAL_UNCONFIRMED';
 console.error(JSON.stringify({operation:'SCOPED_CAPITAL_AUDIT',state:'FAIL',code,tradingEnabled:false},null,2));process.exitCode=1;
});
const safeCodes=['SCOPED_ACTION_INVALID','SCOPED_ACCOUNT_INVALID','SCOPED_DURABILITY_UNCONFIRMED','SCOPED_STORAGE_INVALID','SCOPED_NOT_INITIALIZED','SCOPED_STATE_INVALID','SCOPED_INITIAL_ACCOUNT_BLOCKED','SCOPED_CAPITAL_UNAVAILABLE','SCOPED_BALANCE_MISSING','SCOPED_PRICE_UNCONFIRMED','SCOPED_FEES_UNCONFIRMED','SCOPED_FEE_ASSET_UNSUPPORTED','SCOPED_CONFIRMATION_MISMATCH','SCOPED_CONFIRMATION_REGRESSED','SCOPED_SETTLED_TRADE_CHANGED','SCOPED_TERMINAL_CHANGED','SCOPED_EXECUTION_TOTALS_INVALID','SCOPED_DUPLICATE_TRADE','SCOPED_CAPITAL_NEGATIVE','SCOPED_RESERVATION_EXCEEDED','SCOPED_ORDER_ID_REUSED','INVALID_TESTNET_CREDENTIALS','ACCOUNT_CHANGED_DURING_READ','ACCOUNT_SNAPSHOT_STALE','STALE_TRADE_CONTEXT','STALE_REFERENCE_PRICE','REFERENCE_REFRESH_UNCONFIRMED','EXCHANGE_REQUEST_UNCONFIRMED','EXCHANGE_TRANSPORT_UNKNOWN','EXCHANGE_COOLDOWN','EXCHANGE_LOCATION_RESTRICTED','STREAM_REFERENCE_TIMEOUT','STREAM_REFERENCE_INVALID','STREAM_REFERENCE_REGRESSED','STREAM_REFERENCE_DISCONNECTED','STREAM_REFERENCE_TRANSPORT_UNCONFIRMED'];
