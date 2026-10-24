import {createListingCollector} from '../listingWatch.mjs';
try {
 const report=await createListingCollector()();
 if(process.argv.includes('--summary')) {
  console.log(JSON.stringify({sourceState:report.sourceState,fetchedAt:report.fetchedAt,
   coverage:report.coverage,sources:report.sources,
   items:report.items.map(r=>({exchange:r.exchange,title:r.title,status:r.status,symbol:r.symbol,
    tradingAt:r.tradingAt,contractAddress:r.contractAddress,poolCount:r.pools.length,url:r.url})),
   executionEnabled:false},null,2));
 }else console.log(JSON.stringify(report,null,2));
 if(report.sourceState==='UNAVAILABLE')process.exitCode=2;
}catch{console.error(JSON.stringify({code:'LISTING_WATCH_UNAVAILABLE',executionEnabled:false}));process.exitCode=1;}
