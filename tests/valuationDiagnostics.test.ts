import {test} from 'node:test';
import assert from 'node:assert/strict';
import {diagnoseValuationMarkets} from '../src/server/valuationDiagnostics';
const market=(baseAsset:string,quoteAsset='USDT')=>({symbol:baseAsset+quoteAsset,baseAsset,quoteAsset,status:'TRADING',isSpotTradingAllowed:true});
const book=(asset:string)=>({symbol:asset+'USDT',bidPrice:'1',askPrice:'2',bidQty:'3',askQty:'4'});
test('market diagnostics distinguish absent markets, inverse-only pairs, inactive markets and missing books',()=>{
 const info={symbols:[market('USDT','TRY'),{...market('ABC'),status:'HALT'},market('BTC')]};
 const rows=diagnoseValuationMarkets(info,[],['TRY','456','这是测试币','ABC','BTC']);
 assert.deepEqual(rows.map(r=>r.reason),['DIRECT_MARKET_MISSING','DIRECT_MARKET_MISSING','DIRECT_MARKET_MISSING','DIRECT_MARKET_INACTIVE','BOOK_MISSING']);
 assert.equal(rows[0].inverseMarketAvailable,true);assert.equal(rows[1].inverseMarketAvailable,false);
});
test('market diagnostics distinguish zero prices, zero size, crossed books and malformed decimal strings',()=>{
 const assets=['A','B','C','D','E'];const books=assets.map(book);books[0].bidPrice='0';books[1].askQty='0';books[2].askPrice='0.5';books[3].bidPrice='bad';
 assert.deepEqual(diagnoseValuationMarkets({symbols:assets.map(a=>market(a))},books,assets).map(r=>r.reason),['BOOK_PRICE_ZERO','BOOK_QUANTITY_ZERO','BOOK_CROSSED','BOOK_DECIMAL_INVALID','DIRECT_BOOK_VALID']);
});
test('contradictory or duplicated metadata cannot fabricate a valid market diagnosis',()=>{
 assert.equal(diagnoseValuationMarkets({symbols:[{...market('BTC'),baseAsset:'WRONG'}]},[book('BTC')],['BTC'])[0].reason,'MARKET_IDENTITY_INVALID');
 assert.throws(()=>diagnoseValuationMarkets({symbols:[market('BTC'),market('BTC')]},[],['BTC']),/INVALID_VALUATION_MARKETS/);
 assert.throws(()=>diagnoseValuationMarkets({symbols:[market('BTC')]},[book('BTC'),book('BTC')],['BTC']),/INVALID_VALUATION_BOOKS/);
});
