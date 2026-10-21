import {OrderExecution,type Intent} from './orderExecution';
import {CapitalLedger,type Debit} from './capitalLedger';
import {DailyRiskGate,balanceDigest} from './dailyRiskGate';
import {planStopReplacement} from './stopReplacement';
import type {AccountAdapter} from './fundedExecution';
import {assertPolicy,type RiskPolicy,type TradeContext} from './tradingRules';
import {units} from './exactDecimal';
import type {AccountSnapshot} from './accountSnapshot';
export type StopFeeEvidence={environment:'BINANCE_TESTNET';accountId:string;symbol:string;source:'SERVER_COMMISSION_RESERVE';observedAt:number;debits:Debit[]};
type ReplacementAdapter=AccountAdapter&{stopFeeEvidence?(intent:Intent,snapshot:AccountSnapshot,context:TradeContext):Promise<StopFeeEvidence>};
/** Internal worker foundation only. No HTTP/browser/CLI sender is registered. */
export class ProtectiveReplacementExecution{
 private orders:OrderExecution;private capital:CapitalLedger;private daily:DailyRiskGate;private busy=false;
 constructor(orderFile:string,capitalFile:string,private accountId:string,private adapter:ReplacementAdapter,private policy:RiskPolicy,private now=Date.now){
  this.orders=new OrderExecution(orderFile,{submit:adapter.submit.bind(adapter),query:async(i,id,c)=>{const result=await adapter.query(i,id,c);if(!result)throw Error('ORDER_NOT_FOUND_ON_EXCHANGE');return result;}});
  try{this.capital=new CapitalLedger(capitalFile,accountId,now,true);}catch(e){this.orders.close();throw e;}
  try{this.daily=new DailyRiskGate(capitalFile+'.daily-risk',accountId);}catch(e){this.capital.close();this.orders.close();throw e;}
 }
 async replace(input:{previousRequestId:string;requestId:string;stopPrice:string;limitPrice:string}){
  if(this.busy)throw Error('PROTECTIVE_EXECUTION_BUSY');input=structuredClone(input);assertPolicy(this.policy);
  if(!this.adapter.tradeContext||!this.adapter.dailyRiskEvidence||!this.adapter.stopFeeEvidence)throw Error('PROTECTIVE_RISK_PROVIDERS_REQUIRED');
  // Existing requests are read-reconciliation only, never another send or a new funding calculation.
  if(this.orders.list().some(r=>r.requestId===input.requestId))throw Error('EXISTING_REPLACEMENT_RECONCILE_ONLY');
  this.busy=true;this.capital.invalidate();
  try{
   for(const r of this.orders.list())await this.orders.reconcile(r.requestId);
   const previous=this.orders.list().find(r=>r.requestId===input.previousRequestId);
   if(!previous||previous.accountId!==this.accountId)throw Error('PREVIOUS_STOP_ACCOUNT_MISMATCH');
   const context=await this.adapter.tradeContext(previous.symbol),account=await this.adapter.accountSnapshot();
   const initial=planStopReplacement({previous,account,context,policy:this.policy,...input},this.now());
   if(initial.state==='POSITION_CLOSED')return initial;
   const intent=initial.candidate;
   const result=this.capital.reconcile(account,this.orders.list());if(!result.ready)throw Error('CAPITAL_RECONCILIATION_REQUIRED');
   const fee=await this.adapter.stopFeeEvidence(structuredClone(intent),structuredClone(account),structuredClone(context));
   this.validateFee(fee,intent);
   const fresh=await this.adapter.accountSnapshot();
   if(balanceDigest(fresh)!==balanceDigest(account)||JSON.stringify(fresh.openOrders)!==JSON.stringify(account.openOrders))throw Error('ACCOUNT_CHANGED_DURING_REPLACEMENT');
   // Risk evidence must bind the latest account snapshot and remain fresh after all I/O.
   const evidence=await this.adapter.dailyRiskEvidence(structuredClone(fresh));
   this.daily.assess(evidence,fresh,this.policy.dailyLossLimitQuote,this.now());
   const final=planStopReplacement({previous,account:fresh,context,policy:this.policy,...input},this.now());
   if(final.state!=='REPLACEMENT_PROPOSED'||JSON.stringify(final.candidate)!==JSON.stringify(intent))throw Error('REPLACEMENT_PLAN_CHANGED');
   this.validateFee(fee,intent);
   const ready=this.capital.reconcile(fresh,this.orders.list());if(!ready.ready)throw Error('CAPITAL_RECONCILIATION_REQUIRED');
   this.capital.reserve(intent,[{asset:context.baseAsset,amount:intent.quantity},...fee.debits]);
   this.capital.invalidate();
   return await this.orders.submit(intent);
  }catch(e){this.capital.invalidate();throw e;}finally{this.busy=false;}
 }
 private validateFee(fee:StopFeeEvidence,intent:Intent){
  const now=this.now();
  if(!fee||fee.environment!=='BINANCE_TESTNET'||fee.accountId!==this.accountId||fee.symbol!==intent.symbol||fee.source!=='SERVER_COMMISSION_RESERVE'||!Number.isSafeInteger(fee.observedAt)||fee.observedAt>now||now-fee.observedAt>2000||!Array.isArray(fee.debits)||!fee.debits.length)throw Error('STOP_FEE_RESERVE_REQUIRED');
  for(const d of fee.debits)if(!d||!/^[A-Z0-9]{1,24}$/.test(d.asset)||units(d.amount)<=0n)throw Error('INVALID_STOP_FEE_RESERVE');
 }
 async reconcile(){if(this.busy)throw Error('PROTECTIVE_EXECUTION_BUSY');this.busy=true;this.capital.invalidate();try{for(const r of this.orders.list())await this.orders.reconcile(r.requestId);const account=await this.adapter.accountSnapshot();return this.capital.reconcile(account,this.orders.list());}finally{this.busy=false;}}
 list(){return this.orders.list();}
 emergencyHalt(){this.daily.halt();}
 close(){if(this.busy)throw Error('PROTECTIVE_EXECUTION_BUSY');this.orders.close();this.capital.close();this.daily.close();}
}
