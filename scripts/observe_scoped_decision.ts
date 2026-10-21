import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import {ScopedTestnetJournal} from '../src/server/scopedTestnetJournal';
import {createBinanceTestnetAdapter,testnetAccountId} from '../src/server/binanceTestnetAdapter';
import {TestnetReferenceStream} from '../src/server/testnetReferenceStream';
import {readSignalCandles,evaluateSignal} from '../src/server/testnetSignalObserver';
import {decideScopedSignal} from '../src/server/scopedSignalDecision';
import {reviewScopedSignalCandidate} from '../src/server/scopedSignalOrderReview';
async function main(){
 const file=path.resolve(process.env.APP_TESTNET_SCOPED_JOURNAL??'.testnet_scoped/sandbox.sqlite');
 if(!fs.existsSync(file))throw Error('SCOPED_NOT_INITIALIZED');
 const apiKey=process.env.APP_TESTNET_API_KEY??'',secretKey=process.env.APP_TESTNET_SECRET_KEY??'',accountId=testnetAccountId(apiKey);
 let stream:TestnetReferenceStream|undefined,journal:ScopedTestnetJournal|undefined;
 try{
  const adapter=createBinanceTestnetAdapter({apiKey,secretKey});
  // Narrow capability object: submit/cancel are never passed or invoked here.
  const recoveryReader={query:adapter.query};
  journal=new ScopedTestnetJournal(file,accountId);
  const recovery=await journal.reconcile(recoveryReader.query);
  if(recovery.unresolved)throw Error('SCOPED_RECONCILIATION_REQUIRED');
  const sample=await readSignalCandles();
  const observation=evaluateSignal(sample.raw,sample.serverTime);
  stream=new TestnetReferenceStream('BTCUSDT');
  const exchange=createBinanceTestnetAdapter({apiKey,secretKey,referenceReader:s=>stream!.read(s)});
  const reader={accountSnapshot:exchange.accountSnapshot,tradeContext:exchange.tradeContext};
  const [account,context]=await Promise.all([reader.accountSnapshot(),reader.tradeContext('BTCUSDT')]);
  const audit=journal.audit(account,context);
  const decision=decideScopedSignal(observation,audit,{accountId:account.accountId,expectedAccountId:accountId,auditObservedAt:account.observedAt,
   buyOnceUsed:!!journal.find('sandbox_first_buy_v1'),sellOnceUsed:!!journal.find('sandbox_first_sell_v1')},Date.now());
  let reviewed:ReturnType<typeof reviewScopedSignalCandidate>|undefined;
  if(decision.assessment==='CANDIDATE_ONLY'){
   // Refresh quote/reference and read actual commissions concurrently; HOLD never forces an order review.
   const reviewReader={tradeContext:exchange.tradeContext,commissionRates:exchange.commissionRates};
   const [currentContext,commission]=await Promise.all([reviewReader.tradeContext('BTCUSDT'),reviewReader.commissionRates('BTCUSDT')]);
   const currentAudit=journal.audit(account,currentContext);
   reviewed=reviewScopedSignalCandidate(observation,currentAudit,{accountId:account.accountId,expectedAccountId:accountId,
    auditObservedAt:account.observedAt,buyOnceUsed:!!journal.find('sandbox_first_buy_v1'),sellOnceUsed:!!journal.find('sandbox_first_sell_v1')},
    account,currentContext,commission,Date.now());
  }
  const report=reviewed??{...decision,orderReview:{state:'NOT_APPLICABLE',code:'NO_CURRENT_CANDIDATE',
   exchangeValidated:false,capitalReserved:false,feeReservationAuthorized:false,executionAuthorized:false}};
  console.log(JSON.stringify({...report,recovery},null,2));
  if(report.assessment==='BLOCKED')process.exitCode=1;
 }finally{stream?.close();journal?.close();}
}
main().catch(error=>{
 const allowed=['SCOPED_NOT_INITIALIZED','SCOPED_RECONCILIATION_REQUIRED','SCOPED_STATE_INVALID','INVALID_TESTNET_CREDENTIALS',
 'SIGNAL_RATE_LIMITED','SIGNAL_LOCATION_RESTRICTED','SIGNAL_READ_FAILED','SIGNAL_READ_STALE','SIGNAL_CLOCK_INVALID',
 'SIGNAL_CANDLES_INVALID','SIGNAL_CANDLE_TIMING_INVALID','SIGNAL_CANDLES_STALE','ACCOUNT_CHANGED_DURING_READ','ACCOUNT_SNAPSHOT_STALE',
 'EXCHANGE_LOCATION_RESTRICTED','EXCHANGE_COOLDOWN','STREAM_REFERENCE_TIMEOUT','STREAM_REFERENCE_DISCONNECTED','STALE_REFERENCE_PRICE'];
 const code=error instanceof Error&&allowed.includes(error.message)?error.message:'DECISION_OBSERVATION_UNCONFIRMED';
 console.error(JSON.stringify({environment:'BINANCE_TESTNET',operation:'READ_ONLY_SCOPED_SIGNAL_DECISION',assessment:'BLOCKED',code,
  executionAuthorized:false,ordersSubmitted:0,automaticTradingEnabled:false},null,2));process.exitCode=1;
});
