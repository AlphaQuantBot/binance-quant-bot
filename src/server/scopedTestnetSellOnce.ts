import {units,decimal} from './exactDecimal';
import {ScopedTestnetJournal} from './scopedTestnetJournal';
import {planScopedTestnetSell} from './scopedTestnetSellPlan';
import type {AccountSnapshot} from './accountSnapshot';
import type {TradeContext} from './tradingRules';
import type {CommissionSnapshot} from './commissionRates';
import type {Intent,Confirmation} from './orderExecution';
export const firstSellRequestId='sandbox_first_sell_v1';
type Reader={accountSnapshot():Promise<AccountSnapshot>;tradeContext(symbol:string):Promise<TradeContext>;commissionRates(symbol:string):Promise<CommissionSnapshot>;query(intent:Intent,clientId:string):Promise<Confirmation|null>;submit(intent:Intent,clientId:string):Promise<Confirmation>};
/** One lifetime sell attempt per scoped allocation. Never a loop or recovery sender. */
export async function runScopedTestnetSellOnce(journal:ScopedTestnetJournal,reader:Reader,now=Date.now){
 let attempted=false,sendResponse:'NOT_SENT'|'RECEIVED'|'UNCONFIRMED'='NOT_SENT';
 async function recoverReport(){
  // Recovery has only query capability; terminal rows are never submitted again.
  let recoveryError=false;try{await journal.reconcile(reader.query);}catch{recoveryError=true;}
  const entry=journal.find(firstSellRequestId)!;
  const unresolved=!entry?.confirmation||!['FILLED','CANCELED','REJECTED','EXPIRED','EXPIRED_IN_MATCH'].includes(entry.confirmation.status);
  let capitalAudit:ReturnType<ScopedTestnetJournal['audit']>|undefined;
  if(!unresolved){const [snapshot,context]=await Promise.all([reader.accountSnapshot(),reader.tradeContext('BTCUSDT')]);capitalAudit=journal.audit(snapshot,context);}
  const positionClosed=capitalAudit?.ownedBTC==='0';
  const difference=capitalAudit?units(capitalAudit.allocatedCashUSDT)-units('100'):0n;
  const realizedResultUSDT=positionClosed?(difference<0n?'-':'')+decimal(difference<0n?-difference:difference):null;
  return {positionClosed,realizedResultUSDT,environment:'BINANCE_TESTNET',operation:'SCOPED_TESTNET_SELL_ONCE',state:unresolved?'RECONCILIATION_REQUIRED':capitalAudit?.halted?'HALTED':'CONFIRMED',testnetOrderAttemptedThisRun:attempted,sendResponse,recoveryError,automaticTradingEnabled:false,requestId:firstSellRequestId,orderStatus:entry?.confirmation?.status??'UNKNOWN',executedBTC:entry?.confirmation?.executedQty??null,receivedUSDT:entry?.confirmation?.quoteQty??null,fees:entry?.confirmation?.settlement?.fees??null,capitalAudit};
 }
 if(journal.find(firstSellRequestId))return recoverReport();
 // Query prior unresolved records before assessing account consistency.
 const recovery=await journal.reconcile(reader.query);if(recovery.unresolved)throw Error('SCOPED_RECONCILIATION_REQUIRED');
 const account=await reader.accountSnapshot();
 const [context,commission]=await Promise.all([reader.tradeContext('BTCUSDT'),reader.commissionRates('BTCUSDT')]);
 const audit=journal.audit(account,context);
 if(audit.halted)throw Error('SCOPED_HALTED');
 if(audit.unresolvedOrders)throw Error('SCOPED_RECONCILIATION_REQUIRED');
 const plan=planScopedTestnetSell(account,context,commission,audit.ownedBTC,now());
 // This bounded exit accepts only the observed zero-fee configuration.
 // Nonzero/unknown fee payment needs a dedicated fee-asset reservation policy.
 if(units(plan.undiscountedFeeEstimateUSDT)!==0n)throw Error('SCOPED_NONZERO_FEE_EXECUTION_UNSUPPORTED');
 const intent=plan.intent;
 const prepared=journal.prepareFirstSell(intent);
 if(!prepared.created)return recoverReport();
 // Recheck freshness after synchronous durable reservation; failure freezes the
 // pending identity rather than risking a later resend of a changed plan.
 planScopedTestnetSell(account,context,commission,audit.ownedBTC,now());
 const claimed=journal.beginFirstSellSend();
 attempted=true;
 try{
  const response=await reader.submit(claimed.intent,claimed.clientOrderId);sendResponse='RECEIVED';
  // Filled FULL responses may lack native-fee evidence; verify via order/myTrades.
  if(units(response.executedQty)===0n||response.settlement)journal.confirm(firstSellRequestId,response);
 }catch{sendResponse='UNCONFIRMED';}
 return recoverReport();
}
