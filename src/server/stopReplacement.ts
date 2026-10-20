import {units,decimal} from './exactDecimal';
import {validateAccountSnapshot,type AccountSnapshot} from './accountSnapshot';
import {validateSettlement} from './tradeSettlement';
import {assertPolicy,validateTradeContext,type TradeContext,type RiskPolicy} from './tradingRules';
import {validatePercentPrice} from './priceReference';
import type {Record as OrderRecord} from './orderExecution';
/** Pure proposal only. No adapter, journal mutation or submission capability. */
export function planStopReplacement(input:{previous:OrderRecord;account:AccountSnapshot;context:TradeContext;policy:RiskPolicy;requestId:string;stopPrice:string;limitPrice:string},now=Date.now()){
 const {previous:r,account:a,context:c,policy}=input;
 assertPolicy(policy);validateAccountSnapshot(a,r.accountId,now);validateTradeContext(c,r.symbol,now);
 const e=r.confirmation;
 if(r.stopPrice===undefined||r.side!=='SELL'||r.cancelState!=='RESOLVED'||!e||!['CANCELED','EXPIRED','EXPIRED_IN_MATCH','FILLED'].includes(r.status)||e.status!==r.status||e.clientOrderId!==r.clientOrderId||e.symbol!==r.symbol||e.side!=='SELL'||!/^\d{1,30}$/.test(e.orderId))throw Error('PREVIOUS_STOP_UNRESOLVED');
 if(!Number.isSafeInteger(e.updateTime)||e.updateTime<0||e.updateTime>a.startedAt||now-a.startedAt>2000)throw Error('POST_CANCEL_ACCOUNT_REQUIRED');
 if(!e.settlement)throw Error('SETTLEMENT_REQUIRED');validateSettlement(e,e.settlement);
 if(!a.canTrade||c.status!=='TRADING'||!c.spotAllowed||!c.orderTypes.includes('STOP_LOSS_LIMIT'))throw Error('STOP_NOT_TRADABLE');
 if(a.openOrders.length)throw Error('OPEN_ORDERS_REQUIRE_RECONCILIATION');
 if(!/^[\w-]{8,80}$/.test(input.requestId)||input.requestId===r.requestId)throw Error('NEW_REQUEST_ID_REQUIRED');
 const original=units(r.quantity),executed=units(e.executedQty),baseFee=e.settlement.fees.filter(f=>f.asset===c.baseAsset).reduce((sum,f)=>sum+units(f.amount),0n);
 if(original<=0n||executed>original||executed+baseFee>original||(r.status==='FILLED'&&executed!==original))throw Error('INVALID_REMAINING_POSITION');
 const remaining=original-executed-baseFee;
 const balance=a.balances.find(b=>b.asset===c.baseAsset);
 if(!balance||units(balance.locked)!==0n||units(balance.free)!==remaining)throw Error('REMAINING_BALANCE_MISMATCH');
 if(remaining===0n)return {state:'POSITION_CLOSED' as const,remainingQuantity:'0',dustQuantity:'0',submissionAuthorized:false as const};
 const price=units(input.limitPrice),stop=units(input.stopPrice);
 if(price<=0n||stop<=0n||price>stop||stop>=units(c.quote.bid))throw Error('INVALID_REPLACEMENT_PRICES');
 const risk=policy.symbols[r.symbol];if(!risk)throw Error('SYMBOL_NOT_ALLOWED');
 const seen=new Set<string>();let quantity=remaining;
 const lots=c.filters.filter(f=>f?.filterType==='LOT_SIZE');if(lots.length!==1)throw Error('LOT_SIZE_REQUIRED');
 const step=units(lots[0].stepSize);if(step<=0n)throw Error('INVALID_LOT_STEP');quantity-=quantity%step;
 if(quantity===0n)throw Error('REMAINING_POSITION_IS_DUST');
 const scale=10n**18n,notional=quantity*price;
 if(notional>units(risk.maxOrderNotional)*scale)throw Error('ORDER_NOTIONAL_LIMIT_EXCEEDED');
 for(const f of c.filters){
  if(!f||typeof f.filterType!=='string'||seen.has(f.filterType))throw Error('INVALID_SYMBOL_FILTER');seen.add(f.filterType);
  switch(f.filterType){
   case 'PRICE_FILTER':{const min=units(f.minPrice),max=units(f.maxPrice),tick=units(f.tickSize);for(const p of [price,stop])if((max>0n&&min>max)||(min>0n&&p<min)||(max>0n&&p>max)||(tick>0n&&p%tick!==0n))throw Error('STOP_PRICE_FILTER_REJECTED');break;}
   case 'LOT_SIZE':if(units(f.minQty)>units(f.maxQty)||quantity<units(f.minQty)||quantity>units(f.maxQty))throw Error('STOP_LOT_SIZE_REJECTED');break;
   case 'MIN_NOTIONAL':if(notional<units(f.minNotional)*scale)throw Error('STOP_MIN_NOTIONAL_REJECTED');break;
   case 'NOTIONAL':if(notional<units(f.minNotional)*scale||notional>units(f.maxNotional)*scale)throw Error('STOP_NOTIONAL_REJECTED');break;
   case 'PERCENT_PRICE':case 'PERCENT_PRICE_BY_SIDE':validatePercentPrice(price,'SELL',f,c.reference,now);validatePercentPrice(stop,'SELL',f,c.reference,now);break;
   case 'MAX_NUM_ORDERS':case 'MAX_NUM_ALGO_ORDERS':{const n=f.filterType==='MAX_NUM_ORDERS'?f.maxNumOrders:f.maxNumAlgoOrders;if(!Number.isSafeInteger(n)||n<1)throw Error('STOP_ORDER_COUNT_REJECTED');break;}
   // These do not apply to a static, non-iceberg SELL stop-limit with no amendment.
   case 'MARKET_LOT_SIZE':case 'ICEBERG_PARTS':case 'MAX_NUM_ICEBERG_ORDERS':case 'TRAILING_DELTA':case 'MAX_NUM_ORDER_AMENDS':case 'MAX_POSITION':break;
   default:throw Error('UNSUPPORTED_STOP_FILTER');
  }
 }
 if(!seen.has('PRICE_FILTER')||(!seen.has('MIN_NOTIONAL')&&!seen.has('NOTIONAL')))throw Error('STOP_FILTERS_REQUIRED');
 for(const f of c.exchangeFilters){if(['EXCHANGE_MAX_NUM_ORDERS','EXCHANGE_MAX_NUM_ALGO_ORDERS'].includes(f?.filterType)){const n=f.filterType==='EXCHANGE_MAX_NUM_ORDERS'?f.maxNumOrders:f.maxNumAlgoOrders;if(!Number.isSafeInteger(n)||n<1)throw Error('STOP_EXCHANGE_LIMIT_REJECTED');}else if(f?.filterType!=='EXCHANGE_MAX_NUM_ICEBERG_ORDERS')throw Error('UNSUPPORTED_STOP_EXCHANGE_FILTER');}
 return {state:'REPLACEMENT_PROPOSED' as const,remainingQuantity:decimal(remaining),dustQuantity:decimal(remaining-quantity),submissionAuthorized:false as const,candidate:{requestId:input.requestId,accountId:r.accountId,symbol:r.symbol,side:'SELL' as const,quantity:decimal(quantity),stopPrice:input.stopPrice,limitPrice:input.limitPrice},observedAt:now};
}
