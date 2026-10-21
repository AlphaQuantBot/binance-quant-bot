import {annotateReferenceFailure,type ReferenceFailurePhase} from './priceReference';
import type {DecisionReferenceSession} from './decisionReferenceSession';
import {measuredReferenceClock} from './referenceClock';
import fs from 'node:fs';
import {ScopedTestnetJournal} from './scopedTestnetJournal';
import {createBinanceTestnetAdapter,testnetAccountId} from './binanceTestnetAdapter';
import {TestnetReferenceStream} from './testnetReferenceStream';
import {readSignalCandles,evaluateSignal} from './testnetSignalObserver';
import {decideScopedSignal} from './scopedSignalDecision';
import {reviewScopedSignalCandidate} from './scopedSignalOrderReview';
export async function observeScopedDecision(file:string,apiKey:string,secretKey:string,abortSignal?:AbortSignal,referenceSession?:DecisionReferenceSession){
 if(!fs.existsSync(file))throw Error('SCOPED_NOT_INITIALIZED');
 const accountId=testnetAccountId(apiKey);
 abortSignal?.throwIfAborted();
 const fetcher:typeof fetch=(url,init)=>fetch(url,{...init,signal:abortSignal?AbortSignal.any([abortSignal,...(init?.signal?[init.signal]:[])]):init?.signal});
 let phase:ReferenceFailurePhase='ACCOUNT_OBSERVATION';
 let stream:TestnetReferenceStream|undefined,journal:ScopedTestnetJournal|undefined;
 const shutdown=()=>stream?.close();abortSignal?.addEventListener('abort',shutdown,{once:true});
 try{
  const adapter=createBinanceTestnetAdapter({apiKey,secretKey,fetcher});
  // Narrow capability object: submit/cancel are never passed or invoked here.
  const recoveryReader={query:adapter.query};
  journal=new ScopedTestnetJournal(file,accountId);
  const recovery=await journal.reconcile(recoveryReader.query);
  if(recovery.unresolved)throw Error('SCOPED_RECONCILIATION_REQUIRED');
  const sample=await readSignalCandles(fetcher);
  const observation=evaluateSignal(sample.raw,sample.serverTime);
  const referenceClock=measuredReferenceClock(sample.serverTime,sample.clockLocalStartedAt,sample.clockLocalReceivedAt,sample.clockStartedAt,sample.clockReceivedAt);
  stream=referenceSession?referenceSession.get(referenceClock):new TestnetReferenceStream('BTCUSDT',Date.now,undefined,referenceClock);
  // Let the first stream event arrive before starting freshness-bounded account/context reads.
  await stream.warmup('BTCUSDT').catch(error=>{throw annotateReferenceFailure(error,'STARTUP_WARMUP');});
  const exchange=createBinanceTestnetAdapter({apiKey,secretKey,fetcher,referenceReader:s=>stream!.read(s),referenceSnapshot:s=>stream!.snapshot(s)});
  const reader={accountSnapshot:exchange.accountSnapshot,tradeContext:exchange.tradeContext};
  const [account,context]=await Promise.all([reader.accountSnapshot(),reader.tradeContext('BTCUSDT')]);
  const audit=journal.audit(account,context);
  const decision=decideScopedSignal(observation,audit,{accountId:account.accountId,expectedAccountId:accountId,auditObservedAt:account.observedAt,
   buyOnceUsed:!!journal.find('sandbox_first_buy_v1'),sellOnceUsed:!!journal.find('sandbox_first_sell_v1')},Date.now());
  let reviewed:ReturnType<typeof reviewScopedSignalCandidate>|undefined;
  if(decision.assessment==='CANDIDATE_ONLY'){
   phase='CANDIDATE_REVIEW';
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
  abortSignal?.throwIfAborted();
  return {report:{...report,recovery},serverTime:sample.serverTime,clockReceivedAt:sample.clockReceivedAt};
 }catch(error){throw annotateReferenceFailure(error,undefined,phase);}
 finally{abortSignal?.removeEventListener('abort',shutdown);if(!referenceSession)stream?.close();journal?.close();}
}
export {decisionObservationErrorCode} from './decisionObservationErrors';
