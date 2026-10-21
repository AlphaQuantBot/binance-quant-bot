import {decimal,units} from './exactDecimal';
import {validateAccountSnapshot,type AccountSnapshot} from './accountSnapshot';
import {commissionSummary,type CommissionSnapshot} from './commissionRates';
import {validateTrade,type TradeContext} from './tradingRules';
import type {Intent} from './orderExecution';
/** Sell only journal-owned BTC. Never use the account's pre-existing BTC as size. */
export function planScopedTestnetSell(account:AccountSnapshot,context:TradeContext,commission:CommissionSnapshot,ownedBTC:string,now:number){
 validateAccountSnapshot(account,account.accountId,now);
 if(account.openOrders.length)throw Error('SANDBOX_OPEN_ORDERS_PRESENT');
 if(context.symbol!=='BTCUSDT'||context.baseAsset!=='BTC'||context.quoteAsset!=='USDT')throw Error('SANDBOX_SYMBOL_MISMATCH');
 const prices=context.filters.filter(f=>f?.filterType==='PRICE_FILTER'),lots=context.filters.filter(f=>f?.filterType==='LOT_SIZE');
 if(prices.length!==1||lots.length!==1)throw Error('REQUIRED_SYMBOL_FILTER_MISSING');
 const scale=10n**18n,tick=units(prices[0].tickSize),step=units(lots[0].stepSize);
 if(tick<=0n||step<=0n)throw Error('SANDBOX_UNSUPPORTED_INCREMENT');
 const price=units(context.quote.bid)/tick*tick;
 if(price<=0n)throw Error('INVALID_BOOK_QUOTE');
 const owned=units(ownedBTC),cap=units('25')*scale/price;
 const quantity=(owned<cap?owned:cap)/step*step;
 if(quantity<=0n)throw Error('SCOPED_SELL_TOO_SMALL');
 const intent:Intent={requestId:'sandbox_first_sell_v1',accountId:account.accountId,symbol:'BTCUSDT',side:'SELL',quantity:decimal(quantity),limitPrice:decimal(price)};
 validateTrade(intent,context,account,{halted:false,dailyLossLimitQuote:'5',maxSpreadBps:20,maxSlippageBps:20,maxOpenOrders:1,symbols:{BTCUSDT:{maxOrderNotional:'25',maxBasePosition:'1000000'}}},now);
 if(quantity>units(account.balances.find(b=>b.asset==='BTC')?.free??'0'))throw Error('SCOPED_CAPITAL_UNAVAILABLE');
 const rates=commissionSummary(commission,account.accountId,'BTCUSDT',now);
 if(units(rates.sell.maker)!==0n||units(rates.sell.taker)!==0n)throw Error('SCOPED_NONZERO_FEE_EXECUTION_UNSUPPORTED');
 return {intent,undiscountedFeeEstimateUSDT:'0'};
}
