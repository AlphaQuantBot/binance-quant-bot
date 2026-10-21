import {units} from './exactDecimal';
import {ScopedTestnetJournal} from './scopedTestnetJournal';
import {planTestnetOrderCheck} from './testnetOrderCheck';
import type {AccountSnapshot} from './accountSnapshot';
import type {TradeContext} from './tradingRules';
import type {CommissionSnapshot} from './commissionRates';
import type {Intent,Confirmation} from './orderExecution';
export const firstBuyRequestId='sandbox_first_buy_v1';
type Reader={accountSnapshot():Promise<AccountSnapshot>;tradeContext(symbol:string):Promise<TradeContext>;commissionRates(symbol:string):Promise<CommissionSnapshot>;query(intent:Intent,clientId:string):Promise<Confirmation|null>;submit(intent:Intent,clientId:string):Promise<Confirmation>};
/** One lifetime buy attempt per scoped allocation. Never a loop or recovery sender. */
export async function runScopedTestnetBuyOnce(journal:ScopedTestnetJournal,reader:Reader,now=Date.now){
 let attempted=false,sendResponse:'NOT_SENT'|'RECEIVED'|'UNCONFIRMED'='NOT_SENT';
 async function recoverReport(){
  // Recovery has only query capability; terminal rows are never submitted again.
  let recoveryError=false;try{await journal.reconcile(reader.query);}catch{recoveryError=true;}
  const entry=journal.find(firstBuyRequestId)!;
  const unresolved=!entry?.confirmation||!['FILLED','CANCELED','REJECTED','EXPIRED','EXPIRED_IN_MATCH'].includes(entry.confirmation.status);
  let capitalAudit:ReturnType<ScopedTestnetJournal['audit']>|undefined;
  if(!unresolved){const [snapshot,context]=await Promise.all([reader.accountSnapshot(),reader.tradeContext('BTCUSDT')]);capitalAudit=journal.audit(snapshot,context);}
  return {environment:'BINANCE_TESTNET',operation:'SCOPED_TESTNET_BUY_ONCE',state:unresolved?'RECONCILIATION_REQUIRED':capitalAudit?.halted?'HALTED':'CONFIRMED',testnetOrderAttemptedThisRun:attempted,sendResponse,recoveryError,automaticTradingEnabled:false,requestId:firstBuyRequestId,orderStatus:entry?.confirmation?.status??'UNKNOWN',executedBTC:entry?.confirmation?.executedQty??null,spentUSDT:entry?.confirmation?.quoteQty??null,fees:entry?.confirmation?.settlement?.fees??null,capitalAudit};
 }
 if(journal.find(firstBuyRequestId))return recoverReport();
 // Query prior unresolved records before assessing account consistency.
 const recovery=await journal.reconcile(reader.query);if(recovery.unresolved)throw Error('SCOPED_RECONCILIATION_REQUIRED');
 const account=await reader.accountSnapshot();
 const [context,commission]=await Promise.all([reader.tradeContext('BTCUSDT'),reader.commissionRates('BTCUSDT')]);
 const audit=journal.audit(account,context);
 if(audit.halted)throw Error('SCOPED_HALTED');
 if(audit.unresolvedOrders)throw Error('SCOPED_RECONCILIATION_REQUIRED');
 const plan=planTestnetOrderCheck(account,context,commission,now());
 // First actual experiment accepts only the observed zero-fee configuration.
 // Nonzero/unknown fee payment needs a dedicated fee-asset reservation policy.
 if(units(plan.undiscountedFeeEstimateUSDT)!==0n)throw Error('SCOPED_NONZERO_FEE_EXECUTION_UNSUPPORTED');
 const intent={...plan.intent,requestId:firstBuyRequestId};
 const prepared=journal.prepareFirstBuy(intent,plan.undiscountedFeeEstimateUSDT);
 if(!prepared.created)return recoverReport();
 // Recheck freshness after synchronous durable reservation; failure freezes the
 // pending identity rather than risking a later resend of a changed plan.
 planTestnetOrderCheck(account,context,commission,now());
 const claimed=journal.beginFirstBuySend();
 attempted=true;
 try{
  const response=await reader.submit(claimed.intent,claimed.clientOrderId);sendResponse='RECEIVED';
  // Filled FULL responses may lack native-fee evidence; verify via order/myTrades.
  if(units(response.executedQty)===0n||response.settlement)journal.confirm(firstBuyRequestId,response);
 }catch{sendResponse='UNCONFIRMED';}
 return recoverReport();
}
