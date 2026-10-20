import { units, decimal } from './exactDecimal';
import { validateAccountSnapshot, type AccountSnapshot } from './accountSnapshot';
import type { Intent } from './orderExecution';
export type TradeContext = {
  environment:'BINANCE_TESTNET'; symbol:string; baseAsset:string; quoteAsset:string;
  status:string; spotAllowed:boolean; orderTypes:string[]; filters:any[]; exchangeFilters:any[];
  startedAt:number; quote:{bid:string;ask:string;bidQty:string;askQty:string;observedAt:number};
};
export type RiskPolicy = {
  halted:boolean; maxSpreadBps:number; maxSlippageBps:number; maxOpenOrders:number;
  symbols:{[symbol:string]:{maxOrderNotional:string;maxBasePosition:string}};
};
export function assertPolicy(policy:RiskPolicy|undefined): asserts policy is RiskPolicy {
  if(!policy || typeof policy.halted!=='boolean' || !Number.isInteger(policy.maxSpreadBps) || policy.maxSpreadBps<0 || policy.maxSpreadBps>1000 || !Number.isInteger(policy.maxSlippageBps) || policy.maxSlippageBps<0 || policy.maxSlippageBps>1000 || !Number.isSafeInteger(policy.maxOpenOrders) || policy.maxOpenOrders<1 || !policy.symbols || typeof policy.symbols!=='object' || Array.isArray(policy.symbols))throw Error('RISK_POLICY_REQUIRED');
  for(const [symbol,limit] of Object.entries(policy.symbols))if(!/^[A-Z0-9]{5,24}$/.test(symbol)||!limit||units(limit.maxOrderNotional)<=0n||units(limit.maxBasePosition)<=0n)throw Error('INVALID_RISK_POLICY');
  if(policy.halted)throw Error('RISK_HALTED');
}
const SCALE=10n**18n;
export function limitNotional(intent:Intent) {
  if(!intent.limitPrice)throw Error('BOUNDED_LIMIT_REQUIRED');
  return decimal((units(intent.quantity)*units(intent.limitPrice)+SCALE-1n)/SCALE);
}
function int(value:unknown) {if(!Number.isSafeInteger(value)||Number(value)<0)throw Error('INVALID_FILTER_LIMIT');return Number(value);}
export function validateTradeContext(c:TradeContext, symbol:string, now:number) {
  if(!c||c.environment!=='BINANCE_TESTNET'||c.symbol!==symbol||typeof c.baseAsset!=='string'||typeof c.quoteAsset!=='string'||!/^[A-Z0-9]{1,24}$/.test(c.baseAsset)||!/^[A-Z0-9]{1,24}$/.test(c.quoteAsset)||c.baseAsset===c.quoteAsset||c.baseAsset+c.quoteAsset!==symbol||typeof c.spotAllowed!=='boolean'||!Array.isArray(c.orderTypes)||!Array.isArray(c.filters)||!Array.isArray(c.exchangeFilters))throw Error('INVALID_TRADE_CONTEXT');
  if(!Number.isSafeInteger(now)||!Number.isSafeInteger(c.startedAt)||!Number.isSafeInteger(c.quote?.observedAt)||c.startedAt<=0||c.startedAt>c.quote.observedAt||c.quote.observedAt>now||now-c.startedAt>5000||now-c.quote.observedAt>2000)throw Error('STALE_TRADE_CONTEXT');
  if(units(c.quote.bid)<=0n||units(c.quote.ask)<units(c.quote.bid)||units(c.quote.bidQty)<=0n||units(c.quote.askQty)<=0n)throw Error('INVALID_BOOK_QUOTE');
}
/** No rounding up quantities or changing requested price. Unsupported relevant filters fail closed. */
export function validateTrade(intent:Intent,c:TradeContext,account:AccountSnapshot,policy:RiskPolicy,now:number) {
  assertPolicy(policy);validateTradeContext(c,intent.symbol,now);validateAccountSnapshot(account,intent.accountId,now);
  if(!account.canTrade)throw Error('ACCOUNT_TRADING_DISABLED');
  if(!['BUY','SELL'].includes(intent.side))throw Error('INVALID_ORDER_SIDE');
  if(c.status!=='TRADING'||!c.spotAllowed||!c.orderTypes.includes('LIMIT'))throw Error('SYMBOL_NOT_TRADABLE');
  const risk=policy.symbols[intent.symbol];if(!risk)throw Error('SYMBOL_NOT_ALLOWED');
  if(!intent.limitPrice||units(intent.limitPrice)<=0n||units(intent.quantity)<=0n)throw Error('BOUNDED_LIMIT_REQUIRED');
  const quantity=units(intent.quantity),price=units(intent.limitPrice),notional=quantity*price;
  const bid=units(c.quote.bid),ask=units(c.quote.ask);
  if((ask-bid)*10000n>bid*BigInt(policy.maxSpreadBps))throw Error('SPREAD_LIMIT_EXCEEDED');
  if(intent.side==='BUY'){
    if(price<ask)throw Error('LIMIT_NOT_MARKETABLE');
    if((price-ask)*10000n>ask*BigInt(policy.maxSlippageBps))throw Error('SLIPPAGE_LIMIT_EXCEEDED');
  }else{
    if(price>bid)throw Error('LIMIT_NOT_MARKETABLE');
    if((bid-price)*10000n>bid*BigInt(policy.maxSlippageBps))throw Error('SLIPPAGE_LIMIT_EXCEEDED');
  }
  if(notional>units(risk.maxOrderNotional)*SCALE)throw Error('ORDER_NOTIONAL_LIMIT_EXCEEDED');
  if(account.openOrders.length>=policy.maxOpenOrders)throw Error('OPEN_ORDER_LIMIT_EXCEEDED');
  const holding=account.balances.find(b=>b.asset===c.baseAsset);
  if(!holding)throw Error('BASE_POSITION_UNAVAILABLE');
  let exposure=units(holding.free)+units(holding.locked);
  for(const open of account.openOrders.filter(o=>o.side==='BUY')){
    if(open.symbol!==intent.symbol&&intent.side==='BUY')throw Error('OTHER_SYMBOL_EXPOSURE_UNVERIFIED');
    if(open.symbol===intent.symbol)exposure+=units(open.quantity)-units(open.executedQty);
  }
  const resulting=exposure+(intent.side==='BUY'?quantity:0n);
  if(intent.side==='BUY'&&resulting>units(risk.maxBasePosition))throw Error('BASE_POSITION_LIMIT_EXCEEDED');
  const seen=new Set<string>();
  for(const f of c.filters){
    if(!f||typeof f.filterType!=='string'||seen.has(f.filterType))throw Error('INVALID_SYMBOL_FILTER');seen.add(f.filterType);
    switch(f.filterType){
      case 'PRICE_FILTER': {
        const min=units(f.minPrice),max=units(f.maxPrice),tick=units(f.tickSize);
        if((max>0n&&min>max)||(min>0n&&price<min)||(max>0n&&price>max)||(tick>0n&&price%tick!==0n))throw Error('PRICE_FILTER_REJECTED');break;
      }
      case 'LOT_SIZE': {
        const min=units(f.minQty),max=units(f.maxQty),step=units(f.stepSize);
        if(min>max||quantity<min||quantity>max||(step>0n&&quantity%step!==0n))throw Error('LOT_SIZE_REJECTED');break;
      }
      case 'MIN_NOTIONAL': if(notional<units(f.minNotional)*SCALE)throw Error('MIN_NOTIONAL_REJECTED');break;
      case 'NOTIONAL': if(notional<units(f.minNotional)*SCALE||notional>units(f.maxNotional)*SCALE)throw Error('NOTIONAL_REJECTED');break;
      case 'MAX_POSITION': if(intent.side==='BUY'&&resulting>units(f.maxPosition))throw Error('EXCHANGE_POSITION_LIMIT_EXCEEDED');break;
      case 'MAX_NUM_ORDERS': if(account.openOrders.filter(o=>o.symbol===intent.symbol).length+1>int(f.maxNumOrders))throw Error('EXCHANGE_ORDER_COUNT_EXCEEDED');break;
      // These do not apply: we submit only non-iceberg, non-algo LIMIT IOC with no amendment.
      case 'MARKET_LOT_SIZE': case 'ICEBERG_PARTS': case 'MAX_NUM_ICEBERG_ORDERS': case 'MAX_NUM_ALGO_ORDERS': case 'TRAILING_DELTA': case 'MAX_NUM_ORDER_AMENDS': break;
      case 'PERCENT_PRICE': case 'PERCENT_PRICE_BY_SIDE': throw Error('EXCHANGE_REFERENCE_PRICE_REQUIRED');
      default: throw Error('UNSUPPORTED_SYMBOL_FILTER');
    }
  }
  if(!seen.has('PRICE_FILTER')||!seen.has('LOT_SIZE')||(!seen.has('MIN_NOTIONAL')&&!seen.has('NOTIONAL')))throw Error('REQUIRED_SYMBOL_FILTER_MISSING');
  for(const f of c.exchangeFilters){
    if(f?.filterType==='EXCHANGE_MAX_NUM_ORDERS'){if(account.openOrders.length+1>int(f.maxNumOrders))throw Error('EXCHANGE_ORDER_COUNT_EXCEEDED');}
    else if(!['EXCHANGE_MAX_NUM_ALGO_ORDERS','EXCHANGE_MAX_NUM_ICEBERG_ORDERS'].includes(f?.filterType))throw Error('UNSUPPORTED_EXCHANGE_FILTER');
  }
  return {baseAsset:c.baseAsset,quoteAsset:c.quoteAsset,maximumBuyPrincipal:limitNotional(intent)};
}
