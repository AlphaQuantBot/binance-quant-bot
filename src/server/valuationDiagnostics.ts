import {units} from './exactDecimal';
export type ValuationDiagnostic={asset:string;reason:string;inverseMarketAvailable:boolean};
/** Read-only explanation, never a price mark or permission to trade. */
export function diagnoseValuationMarkets(info:any,books:unknown,assets:string[]):ValuationDiagnostic[]{
 if(!info||!Array.isArray(info.symbols)||info.symbols.length>10000||!Array.isArray(books)||books.length>10000)throw Error('INVALID_VALUATION_MARKETS');
 const markets=new Map<string,any>(),quotes=new Map<string,any>();
 for(const row of info.symbols){if(!row||typeof row.symbol!=='string'||markets.has(row.symbol))throw Error('INVALID_VALUATION_MARKETS');markets.set(row.symbol,row);}
 for(const row of books){if(!row||typeof row.symbol!=='string'||quotes.has(row.symbol))throw Error('INVALID_VALUATION_BOOKS');quotes.set(row.symbol,row);}
 return assets.map(asset=>{
  const direct=markets.get(asset+'USDT'),inverse=markets.get('USDT'+asset);
  const inverseMarketAvailable=!!inverse&&inverse.baseAsset==='USDT'&&inverse.quoteAsset===asset&&inverse.status==='TRADING'&&inverse.isSpotTradingAllowed===true;
  let reason='DIRECT_MARKET_MISSING';
  if(asset==='USDT')reason='QUOTE_UNIT';
  else if(direct){
   if(direct.baseAsset!==asset||direct.quoteAsset!=='USDT')reason='MARKET_IDENTITY_INVALID';
   else if(direct.status!=='TRADING'||direct.isSpotTradingAllowed!==true)reason='DIRECT_MARKET_INACTIVE';
   else {const q=quotes.get(direct.symbol);
    if(!q)reason='BOOK_MISSING';
    else try{
     const bid=units(q.bidPrice),ask=units(q.askPrice),bidQty=units(q.bidQty),askQty=units(q.askQty);
     reason=bid===0n||ask===0n?'BOOK_PRICE_ZERO':bidQty===0n||askQty===0n?'BOOK_QUANTITY_ZERO':ask<bid?'BOOK_CROSSED':'DIRECT_BOOK_VALID';
    }catch{reason='BOOK_DECIMAL_INVALID';}
   }
  }
  return {asset,reason,inverseMarketAvailable};
 });
}
