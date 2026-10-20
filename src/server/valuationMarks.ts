import {decimal,units} from './exactDecimal';
export type ValuationMark={asset:string;symbol:string;bid:string;startedAt:number;observedAt:number};
/** Direct USDT bid marks only. No filter/risk evidence and no execution authorization. */
export function normalizeValuationMarks(info:any,tickers:unknown,assets:string[],startedAt:number,observedAt:number):ValuationMark[]{
 if(!info||!Array.isArray(info.symbols)||info.symbols.length>10000||!Array.isArray(tickers)||tickers.length>10000)throw Error('INVALID_VALUATION_MARKETS');
 const wanted=new Set(assets),markets=new Map<string,string>(),seen=new Set<string>();
 for(const row of info.symbols){
  if(!row||!wanted.has(row.baseAsset)||row.quoteAsset!=='USDT')continue;
  if(typeof row.symbol!=='string'||row.symbol!==row.baseAsset+'USDT'||markets.has(row.symbol))throw Error('INVALID_VALUATION_MARKETS');
  // Even inactive duplicate identities must not overwrite a valid market.
  markets.set(row.symbol,row.status==='TRADING'&&row.isSpotTradingAllowed===true?row.baseAsset:'');
 }
 const result:ValuationMark[]=[];
 for(const row of tickers){
  if(!row||!markets.has(row.symbol))continue;
  if(seen.has(row.symbol))throw Error('DUPLICATE_VALUATION_QUOTE');seen.add(row.symbol);
  const asset=markets.get(row.symbol);if(!asset)continue;
  try{const bid=units(row.bidPrice),ask=units(row.askPrice);if(bid<=0n||ask<bid||units(row.bidQty)<=0n||units(row.askQty)<=0n)continue;
   result.push({asset,symbol:row.symbol,bid:decimal(bid),startedAt,observedAt});
  }catch{/* Invalid/missing market evidence remains unpriced, never zero. */}
 }
 return result;
}
export function validateValuationMark(mark:ValuationMark,asset:string,now:number){
 if(!mark||mark.asset!==asset||mark.symbol!==asset+'USDT'||units(mark.bid)<=0n||!Number.isSafeInteger(mark.startedAt)||!Number.isSafeInteger(mark.observedAt)||mark.startedAt<=0||mark.observedAt<mark.startedAt||mark.observedAt>now||now-mark.startedAt>2000)throw Error('INVALID_OR_STALE_VALUATION_MARK');
}
