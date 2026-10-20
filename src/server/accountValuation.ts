import {decimal,units} from './exactDecimal';
import {normalizeBalances,validateAccountSnapshot,type AccountSnapshot} from './accountSnapshot';
import {validateTradeContext,type TradeContext} from './tradingRules';
import {balanceDigest} from './dailyRiskGate';
type Reader={accountSnapshot():Promise<AccountSnapshot>;tradeContext(symbol:string):Promise<TradeContext>};
/** Current spot bid marks, including locked balances. Not liquidation proceeds or daily PnL. */
export async function valueAccount(reader:Reader,accountId:string,now=Date.now){
 const before=await reader.accountSnapshot();validateAccountSnapshot(before,accountId,now());
 const holdings=normalizeBalances(before.balances).filter(b=>units(b.free)+units(b.locked)>0n);
 const marks=new Map<string,TradeContext>(),issues:string[]=[];
 if(holdings.filter(b=>b.asset!=='USDT').length>20)throw Error('VALUATION_ASSET_LIMIT');
 for(const b of holdings){
  if(b.asset==='USDT')continue;
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
  const c=marks.get(b.asset);
  if(c){try{validateTradeContext(c,b.asset+'USDT',observedAt);}catch{issues.push('STALE_PRICE:'+b.asset);marks.delete(b.asset);}}
  if(!marks.has(b.asset)||!c)return {asset:b.asset,quantity:decimal(quantity),priceUSDT:null,valueUSDT:null,source:'UNPRICED' as const};
  const value=quantity*units(c.quote.bid)/(10n**18n);total+=value;
  return {asset:b.asset,quantity:decimal(quantity),priceUSDT:c.quote.bid,valueUSDT:decimal(value),source:'SPOT_BID' as const,priceObservedAt:c.quote.observedAt};
 });
 const complete=issues.length===0;
 return {environment:'BINANCE_TESTNET' as const,accountId,quoteAsset:'USDT' as const,operation:'READ_ONLY_ACCOUNT_VALUATION' as const,startedAt:before.startedAt,observedAt,balanceDigest:balanceDigest(after),balances:normalizeBalances(after.balances),complete,currentEquityUSDT:complete?decimal(total):null,assets,pricedAssets:assets.filter(a=>a.valueUSDT!==null).map(a=>a.asset),unpricedAssets:assets.filter(a=>a.valueUSDT===null).map(a=>a.asset),issues,dailyRiskAuthorized:false as const};
}
