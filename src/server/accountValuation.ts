import {validateValuationMark,type ValuationMark} from './valuationMarks';
import {decimal,units} from './exactDecimal';
import {normalizeBalances,validateAccountSnapshot,type AccountSnapshot} from './accountSnapshot';
import {validateTradeContext,type TradeContext} from './tradingRules';
import {balanceDigest} from './dailyRiskGate';
type Reader={accountSnapshot():Promise<AccountSnapshot>;tradeContext(symbol:string):Promise<TradeContext>;valuationMarks?(assets:string[]):Promise<ValuationMark[]>};
/** Current spot bid marks, including locked balances. Not liquidation proceeds or daily PnL. */
export async function valueAccount(reader:Reader,accountId:string,now=Date.now){
 const before=await reader.accountSnapshot();validateAccountSnapshot(before,accountId,now());
 const holdings=normalizeBalances(before.balances).filter(b=>units(b.free)+units(b.locked)>0n);
 const marks=new Map<string,TradeContext>(),batchMarks=new Map<string,ValuationMark>(),issues:string[]=[];
 const nonQuote=holdings.filter(b=>b.asset!=='USDT');
 const wanted=new Set(nonQuote.map(b=>b.asset));
 const batch=!!reader.valuationMarks&&nonQuote.length>0;
 if(batch){
  try{const rows=await reader.valuationMarks!(nonQuote.map(b=>b.asset));
   if(!Array.isArray(rows)||rows.length>nonQuote.length)throw Error('INVALID_VALUATION_MARKS');
   for(const row of rows){if(!wanted.has(row.asset)||batchMarks.has(row.asset))throw Error('INVALID_VALUATION_MARKS');validateValuationMark(row,row.asset,now());batchMarks.set(row.asset,row);}
  }catch{batchMarks.clear();issues.push('BATCH_PRICES_UNCONFIRMED');}
 }
 const sequentialAllowed=nonQuote.length<=20;
 if(!batch&&!sequentialAllowed)issues.push('BATCH_VALUATION_REQUIRED');
 for(const b of holdings){
  if(b.asset==='USDT')continue;
  if(batch||!sequentialAllowed){if(!batchMarks.has(b.asset))issues.push('PRICE_UNAVAILABLE:'+b.asset);continue;}
  try{
   const c=structuredClone(await reader.tradeContext(b.asset+'USDT'));validateTradeContext(c,b.asset+'USDT',now());
   if(c.baseAsset!==b.asset||c.quoteAsset!=='USDT'||!c.spotAllowed||c.status!=='TRADING')throw Error('UNSUPPORTED_VALUATION_MARKET');
   marks.set(b.asset,c);
  }catch{issues.push('PRICE_UNAVAILABLE:'+b.asset);}
 }
 const after=await reader.accountSnapshot();const observedAt=now();validateAccountSnapshot(after,accountId,observedAt);
 if(balanceDigest(before)!==balanceDigest(after)||JSON.stringify(before.openOrders)!==JSON.stringify(after.openOrders)||before.canTrade!==after.canTrade)issues.push('ACCOUNT_CHANGED_DURING_VALUATION');
 if(observedAt<before.observedAt||observedAt-before.startedAt>10000)issues.push('VALUATION_WINDOW_INVALID');
 let total=0n;
 const assets=holdings.map(b=>{
  const quantity=units(b.free)+units(b.locked);
  if(b.asset==='USDT'){total+=quantity;return {asset:b.asset,quantity:decimal(quantity),priceUSDT:'1',valueUSDT:decimal(quantity),source:'QUOTE_UNIT' as const};}
  const mark=batchMarks.get(b.asset);
  if(mark){try{
   validateValuationMark(mark,b.asset,observedAt);
   // Buying USDT with the held quote asset consumes the inverse market ask.
   // Divide the full quantity directly, avoiding an intermediate rounded reciprocal.
   if(mark.route==='INVERSE_ASK'){
    const ask=units(mark.ask),value=quantity*(10n**18n)/ask;total+=value;
    return {asset:b.asset,quantity:decimal(quantity),priceUSDT:decimal((10n**36n)/ask),valueUSDT:decimal(value),source:'SPOT_INVERSE_ASK' as const,conversionSymbol:mark.symbol,conversionAsk:mark.ask,priceObservedAt:mark.observedAt};
   }
   const value=quantity*units(mark.bid)/(10n**18n);total+=value;
   return {asset:b.asset,quantity:decimal(quantity),priceUSDT:mark.bid,valueUSDT:decimal(value),source:'SPOT_BID' as const,priceObservedAt:mark.observedAt};
  }catch{issues.push('STALE_PRICE:'+b.asset);}}
  const c=marks.get(b.asset);
  if(c){try{validateTradeContext(c,b.asset+'USDT',observedAt);}catch{issues.push('STALE_PRICE:'+b.asset);marks.delete(b.asset);}}
  if(!marks.has(b.asset)||!c)return {asset:b.asset,quantity:decimal(quantity),priceUSDT:null,valueUSDT:null,source:'UNPRICED' as const};
  const value=quantity*units(c.quote.bid)/(10n**18n);total+=value;
  return {asset:b.asset,quantity:decimal(quantity),priceUSDT:c.quote.bid,valueUSDT:decimal(value),source:'SPOT_BID' as const,priceObservedAt:c.quote.observedAt};
 });
 const complete=issues.length===0;
 return {environment:'BINANCE_TESTNET' as const,accountId,quoteAsset:'USDT' as const,operation:'READ_ONLY_ACCOUNT_VALUATION' as const,startedAt:before.startedAt,observedAt,balanceDigest:balanceDigest(after),balances:normalizeBalances(after.balances),complete,currentEquityUSDT:complete?decimal(total):null,assets,pricedAssets:assets.filter(a=>a.valueUSDT!==null).map(a=>a.asset),unpricedAssets:assets.filter(a=>a.valueUSDT===null).map(a=>a.asset),issues,dailyRiskAuthorized:false as const};
}
