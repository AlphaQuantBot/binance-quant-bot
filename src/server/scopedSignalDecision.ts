import {units} from './exactDecimal';
import type {evaluateSignal} from './testnetSignalObserver';
import type {ScopedTestnetJournal} from './scopedTestnetJournal';
type Signal=ReturnType<typeof evaluateSignal>;
type Audit=ReturnType<ScopedTestnetJournal['audit']>;
export type DecisionEvidence={accountId:string;expectedAccountId:string;auditObservedAt:number;buyOnceUsed:boolean;sellOnceUsed:boolean};
/** An observation classifier, never an order/risk authorization or executable intent. */
export function decideScopedSignal(signal:Signal,audit:Audit,evidence:DecisionEvidence,now:number){
 const executionBlockers=['AUTOMATIC_TRADING_NOT_ENABLED','FULL_ACCOUNT_DAILY_RISK_NOT_AUTHORIZED','ORDER_RULES_AND_FEES_NOT_VALIDATED'];
 const reasonCodes:string[]=[];
 let candidate='NONE',assessment='BLOCKED';
 const result=()=>({environment:'BINANCE_TESTNET',operation:'READ_ONLY_SCOPED_SIGNAL_DECISION',strategy:'EMA20_50_CROSS_1M_V1',symbol:'BTCUSDT',
  observedAt:Number.isSafeInteger(now)?now:null,assessment,candidate,reasonCodes,executionBlockers,
  executionAuthorized:false,ordersSubmitted:0,automaticTradingEnabled:false});
 try{
  if(!Number.isSafeInteger(now)||now<=0||!signal||!audit||!evidence||
   signal.environment!=='BINANCE_TESTNET'||signal.operation!=='READ_ONLY_SIGNAL_OBSERVATION'||
   signal.strategy!=='EMA20_50_CROSS_1M_V1'||signal.symbol!=='BTCUSDT'||signal.interval!=='1m'||
   signal.candleCount!==120||signal.source!=='BINANCE_TESTNET_REST'||signal.closedCandlesOnly!==true||
   signal.ordersSubmitted!==0||signal.automaticTradingEnabled!==false||
   !['BUY_CROSS','SELL_CROSS','HOLD'].includes(signal.signal)||!/^[a-f0-9]{64}$/.test(signal.inputHash)||
   ![signal.close,signal.ema20,signal.ema50].every(x=>Number.isFinite(x)&&x>0)||
   audit.environment!=='BINANCE_TESTNET'||audit.operation!=='SCOPED_CAPITAL_AUDIT'||
   audit.scope!=='LOCAL_BTCUSDT_EXPERIMENT_ONLY'||audit.limits?.symbol!=='BTCUSDT'||
   audit.limits.capitalUSDT!=='100'||audit.limits.maxOrderUSDT!=='25'||audit.limits.lossLimitUSDT!=='5'||
   typeof audit.halted!=='boolean'||typeof audit.accountConsistent!=='boolean'||
   !Array.isArray(audit.haltReasons)||!Number.isSafeInteger(audit.unresolvedOrders)||audit.unresolvedOrders<0||
   typeof evidence.buyOnceUsed!=='boolean'||typeof evidence.sellOnceUsed!=='boolean'||
   !/^testnet_[a-f0-9]{24}$/.test(evidence.accountId)||evidence.accountId!==evidence.expectedAccountId)
   throw Error('INVALID_DECISION_EVIDENCE');
  if(!Number.isSafeInteger(signal.candleCloseTime)||signal.candleCloseTime%60000!==59999||signal.candleCloseTime>=now||now-signal.candleCloseTime>90000)reasonCodes.push('SIGNAL_STALE_OR_FUTURE');
  if(!Number.isSafeInteger(evidence.auditObservedAt)||evidence.auditObservedAt<=0||evidence.auditObservedAt>now||now-evidence.auditObservedAt>5000)reasonCodes.push('ACCOUNT_AUDIT_STALE_OR_FUTURE');
  const owned=units(audit.ownedBTC),cash=units(audit.availableCashUSDT),loss=units(audit.lossUSDT);
  if(cash>units(audit.allocatedCashUSDT))throw Error('INVALID_DECISION_EVIDENCE');
  if(audit.halted||audit.haltReasons.length)reasonCodes.push('SCOPED_HALT_ACTIVE');
  if(!audit.accountConsistent)reasonCodes.push('ACCOUNT_INCONSISTENT');
  if(audit.unresolvedOrders)reasonCodes.push('UNRESOLVED_ORDERS');
  if(loss>=units('5'))reasonCodes.push('SCOPED_LOSS_LIMIT_REACHED');
  if(reasonCodes.length)return result();
  if(signal.signal==='HOLD'){assessment='WAIT';reasonCodes.push('NO_NEW_CROSS');}
  else if(signal.signal==='BUY_CROSS'){
   if(owned>0n){assessment='WAIT';reasonCodes.push('EXPERIMENT_POSITION_ALREADY_OPEN');}
   else if(cash<units('25')){reasonCodes.push('SCOPED_CASH_BELOW_PROPOSED_ORDER_CAP');}
   else{assessment='CANDIDATE_ONLY';candidate='BUY';reasonCodes.push('BUY_CROSS_WHILE_EXPERIMENT_FLAT');}
  }else if(owned===0n){assessment='WAIT';reasonCodes.push('NO_EXPERIMENT_BTC_TO_SELL');}
  else{assessment='CANDIDATE_ONLY';candidate='SELL';reasonCodes.push('SELL_CROSS_WITH_EXPERIMENT_POSITION');}
  if(candidate==='BUY'&&evidence.buyOnceUsed)executionBlockers.push('EXPERIMENT_BUY_ONCE_ALREADY_USED');
  if(candidate==='SELL'&&evidence.sellOnceUsed)executionBlockers.push('EXPERIMENT_SELL_ONCE_ALREADY_USED');
  return {...result(),signal:signal.signal,candleCloseTime:signal.candleCloseTime,inputHash:signal.inputHash,
   scopedPosition:{ownedBTC:audit.ownedBTC,availableCashUSDT:audit.availableCashUSDT,lossUSDT:audit.lossUSDT},
   proposedMaxOrderUSDT:'25',signalAgeMs:now-signal.candleCloseTime,accountAuditAgeMs:now-evidence.auditObservedAt};
 }catch{reasonCodes.push('INVALID_DECISION_EVIDENCE');return result();}
}
