import {decideScopedSignal,type DecisionEvidence} from './scopedSignalDecision';
import {planTestnetOrderCheck} from './testnetOrderCheck';
import {planScopedTestnetSell} from './scopedTestnetSellPlan';
import {validateAccountSnapshot,type AccountSnapshot} from './accountSnapshot';
import type {TradeContext} from './tradingRules';
import type {CommissionSnapshot} from './commissionRates';
import type {evaluateSignal} from './testnetSignalObserver';
import type {ScopedTestnetJournal} from './scopedTestnetJournal';
import {units,decimal} from './exactDecimal';
type Signal=ReturnType<typeof evaluateSignal>;
type Audit=ReturnType<ScopedTestnetJournal['audit']>;
const safeCodes=['SANDBOX_OPEN_ORDERS_PRESENT','SANDBOX_SYMBOL_MISMATCH','SANDBOX_CAPITAL_UNAVAILABLE',
 'REQUIRED_SYMBOL_FILTER_MISSING','SANDBOX_UNSUPPORTED_INCREMENT','INVALID_BOOK_QUOTE','SANDBOX_ORDER_TOO_SMALL',
 'SCOPED_SELL_TOO_SMALL','SCOPED_CAPITAL_UNAVAILABLE','SCOPED_NONZERO_FEE_EXECUTION_UNSUPPORTED',
 'SCOPED_PRINCIPAL_AND_FEE_EXCEED_AVAILABLE_CASH','SCOPED_SELL_EXCEEDS_OWNED_BTC',
 'ACCOUNT_SNAPSHOT_MISMATCH','ACCOUNT_SNAPSHOT_STALE','ACCOUNT_TRADING_DISABLED','BASE_POSITION_UNAVAILABLE',
 'INVALID_TRADE_CONTEXT','STALE_TRADE_CONTEXT','SYMBOL_NOT_TRADABLE','INVALID_SYMBOL_FILTER',
 'UNSUPPORTED_SYMBOL_FILTER','UNSUPPORTED_EXCHANGE_FILTER','INVALID_FILTER_LIMIT','SPREAD_LIMIT_EXCEEDED',
 'SLIPPAGE_LIMIT_EXCEEDED','PRICE_FILTER_REJECTED','LOT_SIZE_REJECTED','MIN_NOTIONAL_REJECTED','NOTIONAL_REJECTED',
 'PERCENT_PRICE_REJECTED','STALE_REFERENCE_PRICE','REFERENCE_PRICE_REQUIRED','EXCHANGE_POSITION_LIMIT_EXCEEDED',
 'EXCHANGE_ORDER_COUNT_EXCEEDED','EXCHANGE_GLOBAL_ORDER_COUNT_EXCEEDED','ORDER_NOTIONAL_LIMIT_EXCEEDED',
 'STALE_COMMISSION_RATES','COMMISSION_IDENTITY_MISMATCH','UNSUPPORTED_COMMISSION_RATE','INVALID_DECIMAL'];
/** Pure local review: no exchange validation POST, durable reservation or sender exists here. */
export function reviewScopedSignalCandidate(signal:Signal,audit:Audit,evidence:DecisionEvidence,account:AccountSnapshot,
 context:TradeContext,commission:CommissionSnapshot,now:number){
 const decision=decideScopedSignal(signal,audit,evidence,now);
 const base={exchangeValidated:false,capitalReserved:false,feeReservationAuthorized:false,executionAuthorized:false};
 if(decision.assessment!=='CANDIDATE_ONLY'||!['BUY','SELL'].includes(decision.candidate))
  return {...decision,orderReview:{...base,state:'NOT_APPLICABLE',code:'NO_CURRENT_CANDIDATE'}};
 try{
  validateAccountSnapshot(account,evidence.expectedAccountId,now);
  // Reuse existing exact-decimal/filter/quote/reference validation. No rounding
  // or fee policy in the actual BUY/SELL execution functions is relaxed.
  const plan=decision.candidate==='BUY'?planTestnetOrderCheck(account,context,commission,now):
   planScopedTestnetSell(account,context,commission,audit.ownedBTC,now);
  const principal=units(plan.intent.quantity)*units(plan.intent.limitPrice!);
  const notional=(principal+10n**18n-1n)/10n**18n;
  if(decision.candidate==='BUY'&&notional+units(plan.undiscountedFeeEstimateUSDT)>units(audit.availableCashUSDT))
   throw Error('SCOPED_PRINCIPAL_AND_FEE_EXCEED_AVAILABLE_CASH');
  if(decision.candidate==='SELL'&&units(plan.intent.quantity)>units(audit.ownedBTC))
   throw Error('SCOPED_SELL_EXCEEDS_OWNED_BTC');
  const boundedNotionalUSDT=decimal(notional);
  return {...decision,executionBlockers:[...decision.executionBlockers.filter(c=>c!=='ORDER_RULES_AND_FEES_NOT_VALIDATED'),
   'LOCAL_REVIEW_IS_NOT_EXCHANGE_ORDER_VALIDATION','FEE_ASSET_RESERVATION_NOT_AUTHORIZED'],
   orderReview:{...base,state:'LOCAL_CHECKS_PASSED',code:'BOUNDED_CANDIDATE_LOCALLY_VERIFIED',side:plan.intent.side,
    quantity:plan.intent.quantity,limitPrice:plan.intent.limitPrice,boundedNotionalUSDT,
    undiscountedFeeEstimateUSDT:plan.undiscountedFeeEstimateUSDT,discountApplied:false}};
 }catch(error){
  const code=error instanceof Error&&safeCodes.includes(error.message)?error.message:'LOCAL_ORDER_REVIEW_UNCONFIRMED';
  return {...decision,assessment:'BLOCKED',candidate:'NONE',orderReview:{...base,state:'BLOCKED',code}};
 }
}
