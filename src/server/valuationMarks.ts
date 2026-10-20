import {decimal,units} from './exactDecimal';
export type ValuationMark={asset:string;symbol:string;bid:string;startedAt:number;observedAt:number}&({route?:undefined;ask?:never}|{route:'INVERSE_ASK';ask:string});
/** Direct bid or inverse ask marks only. Never execution/filter/risk evidence. */
export function normalizeValuationMarks(info:any,tickers:unknown,assets:string[],startedAt:number,observedAt:number):ValuationMark[]{
 if(!info||!Array.isArray(info.symbols)||info.symbols.length>10000||!Array.isArray(tickers)||tickers.length>10000)throw Error('INVALID_VALUATION_MARKETS');
 const wanted=new Set(assets),markets=new Map<string,{asset:string;inverse:boolean;active:boolean}>(),seen=new Set<string>();
 for(const row of info.symbols){
  if(!row)continue;
  const direct=wanted.has(row.baseAsset)&&row.quoteAsset==='USDT';
  const inverse=row.baseAsset==='USDT'&&wanted.has(row.quoteAsset);
  if(!direct&&!inverse)continue;
  const asset=direct?row.baseAsset:row.quoteAsset;
  if(typeof row.symbol!=='string'||row.symbol!==(direct?asset+'USDT':'USDT'+asset)||markets.has(row.symbol))throw Error('INVALID_VALUATION_MARKETS');
  markets.set(row.symbol,{asset,inverse:!direct,active:row.status==='TRADING'&&row.isSpotTradingAllowed===true});
 }
 const directMarks=new Map<string,ValuationMark>(),inverseMarks=new Map<string,ValuationMark>();
 for(const row of tickers){
  if(!row||!markets.has(row.symbol))continue;
  if(seen.has(row.symbol))throw Error('DUPLICATE_VALUATION_QUOTE');seen.add(row.symbol);
  const market=markets.get(row.symbol)!;if(!market.active)continue;
  try{const bid=units(row.bidPrice),ask=units(row.askPrice);if(bid<=0n||ask<bid||units(row.bidQty)<=0n||units(row.askQty)<=0n)continue;
   const common={asset:market.asset,symbol:row.symbol,bid:decimal(bid),startedAt,observedAt};
   const mark:ValuationMark=market.inverse?{...common,route:'INVERSE_ASK',ask:decimal(ask)}:common;
   (market.inverse?inverseMarks:directMarks).set(market.asset,mark);
  }catch{/* Invalid/missing market evidence remains unpriced, never zero. */}
 }
 // Prefer a valid direct market; response order cannot select a different route.
 return assets.flatMap(asset=>{const mark=directMarks.get(asset)??inverseMarks.get(asset);return mark?[mark]:[];});
}
export function validateValuationMark(mark:ValuationMark,asset:string,now:number){
 if(!mark||mark.asset!==asset||mark.route!==undefined&&mark.route!=='INVERSE_ASK'||mark.symbol!==(mark.route==='INVERSE_ASK'?'USDT'+asset:asset+'USDT')||units(mark.bid)<=0n||!Number.isSafeInteger(mark.startedAt)||!Number.isSafeInteger(mark.observedAt)||mark.startedAt<=0||mark.observedAt<mark.startedAt||mark.observedAt>now||now-mark.startedAt>2000)throw Error('INVALID_OR_STALE_VALUATION_MARK');
 if(mark.route==='INVERSE_ASK'&&(units(mark.ask)<=0n||units(mark.ask)<units(mark.bid)))throw Error('INVALID_INVERSE_VALUATION_MARK');
}
