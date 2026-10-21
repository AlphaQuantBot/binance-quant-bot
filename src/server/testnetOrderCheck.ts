import {createHash} from 'node:crypto';
import {decimal,units} from './exactDecimal';
import {validateAccountSnapshot,type AccountSnapshot} from './accountSnapshot';
import {commissionSummary,type CommissionSnapshot} from './commissionRates';
import {validateTrade,type TradeContext} from './tradingRules';
import type {Intent} from './orderExecution';
export const sandboxProposal={symbol:'BTCUSDT',capitalUSDT:'100',maxOrderUSDT:'25',lossLimitUSDT:'5'} as const;
/** Proposal + exchange order validation only. No allocation journal and no matching-engine capability. */
export function planTestnetOrderCheck(account:AccountSnapshot,context:TradeContext,commission:CommissionSnapshot,now:number){
 validateAccountSnapshot(account,account.accountId,now);
 if(account.openOrders.length)throw Error('SANDBOX_OPEN_ORDERS_PRESENT');
 if(context.symbol!=='BTCUSDT'||context.baseAsset!=='BTC'||context.quoteAsset!=='USDT')throw Error('SANDBOX_SYMBOL_MISMATCH');
 const cash=account.balances.find(b=>b.asset==='USDT'),btc=account.balances.find(b=>b.asset==='BTC');
 if(!cash||units(cash.free)<units(sandboxProposal.capitalUSDT)||!btc)throw Error('SANDBOX_CAPITAL_UNAVAILABLE');
 const priceFilters=context.filters.filter(f=>f?.filterType==='PRICE_FILTER'),lots=context.filters.filter(f=>f?.filterType==='LOT_SIZE');
 if(priceFilters.length!==1||lots.length!==1)throw Error('REQUIRED_SYMBOL_FILTER_MISSING');
 const scale=10n**18n,tick=units(priceFilters[0].tickSize),step=units(lots[0].stepSize);
 if(tick<=0n||step<=0n)throw Error('SANDBOX_UNSUPPORTED_INCREMENT');
 const ask=units(context.quote.ask),price=(ask+tick-1n)/tick*tick;
 if(price<=0n)throw Error('INVALID_BOOK_QUOTE');
 const quantity=units(sandboxProposal.maxOrderUSDT)*scale/price/step*step;
 if(quantity<=0n)throw Error('SANDBOX_ORDER_TOO_SMALL');
 const intent:Intent={requestId:'sandbox_order_check',accountId:account.accountId,symbol:'BTCUSDT',side:'BUY',quantity:decimal(quantity),limitPrice:decimal(price)};
 // This limit permits only the proposed incremental test quantity, while exchange
 // MAX_POSITION still includes the actual full BTC balance. Never zero the account.
 const maxBasePosition=decimal(units(btc.free)+units(btc.locked)+quantity);
 const verified=validateTrade(intent,context,account,{halted:false,dailyLossLimitQuote:sandboxProposal.lossLimitUSDT,maxSpreadBps:20,maxSlippageBps:20,maxOpenOrders:1,symbols:{BTCUSDT:{maxOrderNotional:sandboxProposal.maxOrderUSDT,maxBasePosition}}},now);
 const rates=commissionSummary(commission,account.accountId,'BTCUSDT',now);
 const feeRate=units(rates.buy.maker)>units(rates.buy.taker)?units(rates.buy.maker):units(rates.buy.taker);
 const feeEstimate=(units(verified.maximumBuyPrincipal)*feeRate+scale-1n)/scale;
 if(units(verified.maximumBuyPrincipal)+feeEstimate>units(sandboxProposal.capitalUSDT))throw Error('SANDBOX_CAPITAL_UNAVAILABLE');
 return {intent,clientOrderId:'aq_'+createHash('sha256').update(JSON.stringify(intent)).digest('hex').slice(0,32),proposal:sandboxProposal,principalUSDT:verified.maximumBuyPrincipal,undiscountedFeeEstimateUSDT:decimal(feeEstimate),discountApplied:false as const,capitalReserved:false as const,lossLimitEnforced:false as const,dailyRiskAuthorized:false as const,tradingEnabled:false as const,executionBlockers:['SCOPED_CAPITAL_JOURNAL_REQUIRED','SCOPED_LOSS_TRACKING_REQUIRED','RESTART_RECOVERY_REQUIRED']};
}
export async function runTestnetOrderCheck(reader:{accountSnapshot():Promise<AccountSnapshot>;tradeContext(symbol:string):Promise<TradeContext>;commissionRates(symbol:string):Promise<CommissionSnapshot>;validateTestOrder(intent:Intent,clientOrderId:string):Promise<void>},now=Date.now){
 const account=await reader.accountSnapshot();
 const [context,commission]=await Promise.all([reader.tradeContext('BTCUSDT'),reader.commissionRates('BTCUSDT')]);
 const plan=planTestnetOrderCheck(account,context,commission,now());
 await reader.validateTestOrder(plan.intent,plan.clientOrderId);
 const {intent,clientOrderId,...summary}=plan;
 return {environment:'BINANCE_TESTNET',operation:'ORDER_VALIDATION_ONLY',state:'PASS',symbol:intent.symbol,side:intent.side,quantity:intent.quantity,limitPrice:intent.limitPrice,...summary,matchingEngineOrderCreated:false};
}
