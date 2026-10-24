import {test} from 'node:test';
import assert from 'node:assert/strict';
import {classifyAnnouncement,listingTime,articleEvidence,officialArticle,normalizeFeed,currencyContract,matchingPools,listingStatus,createListingCollector} from '../listingWatch.mjs';
import {installOfficialListingWatch} from '../listingWatchRoute.mjs';
const a='0x'+'a'.repeat(40),b='0x'+'b'.repeat(40),p='0x'+'c'.repeat(40);
const now=Date.UTC(2026,9,24,0),future=Date.UTC(2026,9,25,10);
const url='https://www.kucoin.com/announcement/en-mock-listed';
const ku={code:'200000',data:{totalNum:1,items:[{annTitle:'Mock Token (MOCK) Listed on KuCoin',annUrl:url,annDesc:'Trading: 10:00 on October 25, 2026 (UTC)',cTime:now-1000,annType:['new-listings']}]}};
const by={retCode:0,result:{total:0,list:[]}};
const pool={chainId:'bsc',dexId:'pancakeswap',pairAddress:p,baseToken:{address:a},quoteToken:{address:b},priceUsd:'0.25',liquidity:{usd:1234},volume:{h24:30}};
function mockFetch(overrides={}) {
 return async(url,options)=>{
  assert.equal(options.method,'GET');assert.equal(options.redirect,'error');
  assert.equal(options.headers.Authorization,undefined);
  if(overrides[url])return overrides[url]();
  if(url.includes('/api/v3/announcements'))return Response.json(ku);
  if(url.includes('/v5/announcements'))return Response.json(by);
  if(url===ku.data.items[0].annUrl)return new Response('<article><p>Trading: 10:00 on October 25, 2026 (UTC)</p></article>');
  if(url.endsWith('/api/v3/currencies/MOCK'))return Response.json({code:'200000',data:{currency:'MOCK',chains:[{chainId:'bsc',contractAddress:a}]}});
  if(url==='https://api.dexscreener.com/token-pairs/v1/bsc/'+a)return Response.json([pool]);
  throw Error('Unexpected URL '+url);
 };
}
test('separates spot, derivatives, pre-market, updates and new pairs',()=>{
 assert.equal(classifyAnnouncement('Mock Listed on KuCoin'),'SPOT_ANNOUNCEMENT');
 assert.equal(classifyAnnouncement('New Listing: X',['Spot Listings']),'SPOT_ANNOUNCEMENT');
 assert.equal(classifyAnnouncement('Mock perpetual listing',['Spot']),'NON_SPOT');
 assert.equal(classifyAnnouncement('Pre-Market Trading'),'NON_SPOT');
 assert.equal(classifyAnnouncement('Spot listing postponed'),'REVIEW_UPDATE');
 assert.equal(classifyAnnouncement('Adds New Spot Trading Pairs'),'NEW_PAIR_ONLY');
});
test('accepts only explicit UTC trading time, not deposit or publication timestamps',()=>{
 assert.equal(listingTime('Trading: 10:00 on October 25, 2026 (UTC)'),future);
 assert.equal(listingTime('Trading Starts: 2026-10-25 10:00 (UTC)'),future);
 assert.equal(listingTime('Deposit: 10:00 on October 25, 2026 (UTC)'),null);
 assert.equal(listingTime('Trading: 10:00 on October 25, 2026'),null);
 assert.equal(listingTime('Trading: 10:00 on February 31, 2026 (UTC)'),null);
 assert.equal(listingTime('Trading: 10:00 on October 25, 2026 (UTC)\nTrading: 11:00 on October 25, 2026 (UTC)'),null);
});
test('official URL allowlist rejects lookalikes and unsafe protocols',()=>{
 assert.equal(officialArticle('KuCoin',url),url);
 for(const bad of ['https://www.kucoin.com.attacker.test/announcement/a','http://www.kucoin.com/announcement/a','https://user@www.kucoin.com/announcement/a','https://www.kucoin.com:8080/announcement/a'])
  assert.equal(officialArticle('KuCoin',bad),null);
});
test('contract extraction excludes scripts and content outside article; ambiguity is preserved',()=>{
 const html='<nav>https://bscscan.com/token/'+b+'</nav><article><script>https://bscscan.com/token/'+b+'</script><a href="https://bscscan.com/token/'+a+'">contract</a></article>';
 assert.deepEqual(articleEvidence(html).addresses,[a]);
 assert.deepEqual(articleEvidence('<div>https://bscscan.com/token/'+a+'</div>').addresses,[]);
 assert.equal(articleEvidence('<article>https://bscscan.com/token/'+a+' https://bscscan.com/token/'+b+'</article>').addresses.length,2);
});
test('same ticker is not identity and non-BSC/quote-token pools do not match',()=>{
 assert.deepEqual(currencyContract({code:'200000',data:{currency:'OTHER',chains:[{chainId:'bsc',contractAddress:a}]}},'MOCK'),[]);
 assert.equal(matchingPools([pool,{...pool,pairAddress:b,chainId:'ethereum'},{...pool,pairAddress:b,baseToken:{address:b},quoteToken:{address:a}}],a).length,1);
 assert.equal(matchingPools([{...pool,priceUsd:null,liquidity:null}],a)[0].priceUsd,null);
});
test('official feed times remain publication times, never opening times by inference',()=>{
 const row=normalizeFeed('Bybit',{retCode:0,result:{total:1,list:[{title:'New Listing: Mock (MOCK)',tags:['Spot'],url:'https://announcements.bybit.com/en-US/article/mock/',dateTimestamp:future,startDateTimestamp:future}]}},now).rows[0];
 assert.equal(row.publishedAt,future);assert.equal(row.tradingAt,null);
 assert.throws(()=>normalizeFeed('KuCoin',{code:'200000',data:{}},now),/SCHEMA/);
});
test('fixture collection matches actual address, caches retrieval time and recomputes passed schedule',async()=>{
 let clock=now,calls=0;const upstream=mockFetch();
 const collect=createListingCollector({fetcher:async(...args)=>{calls++;return upstream(...args);},now:()=>clock});
 const first=await collect();assert.equal(first.items[0].status,'UPCOMING_WITH_POOL');
 assert.equal(first.items[0].contractAddress,a);assert.equal(first.items[0].pools[0].liquidityUsd,1234);
 clock+=1000;const cached=await collect();assert.equal(cached.fetchedAt,first.fetchedAt);assert.equal(cached.cached,true);assert.equal(calls,5);
 assert.equal(listingStatus({...first.items[0],tradingAt:clock-1},clock),'ALREADY_STARTED');
});
test('both provider failures remain unavailable, not a successful empty scan',async()=>{
 const r=await createListingCollector({fetcher:async()=>{throw Error('private transport detail');},now:()=>now})();
 assert.equal(r.sourceState,'UNAVAILABLE');assert.equal(r.items.length,0);
 assert.ok(!JSON.stringify(r).includes('private transport'));
});
test('one failed provider is partial and conflicting identities are not matched',async()=>{
 const r=await createListingCollector({fetcher:mockFetch({
  'https://api.bybit.com/v5/announcements/index?locale=en-US&type=new_crypto&page=1&limit=20':()=>new Response('',{status:403}),
  [url]:()=>new Response('<article>https://bscscan.com/token/'+b+'</article>')
 }),now:()=>now})();
 assert.equal(r.sourceState,'PARTIAL');assert.equal(r.items[0].contractAddress,null);
 assert.equal(r.items[0].contractState,'AMBIGUOUS');assert.equal(r.items[0].status,'CONTRACT_UNCONFIRMED');
});
test('route is GET-only, does not call providers for rejected methods and hides errors',async()=>{
 let handler,calls=0;
 installOfficialListingWatch({all:(route,h)=>{assert.equal(route,'/api/pancakeswap/listing-watch');handler=h;}},{collect:async()=>{calls++;throw Error('secret');}});
 const response=()=>({setHeader(){},status(n){this.statusCode=n;return this;},json(v){this.body=v;return this;}});
 const mutation=response();await handler({method:'POST'},mutation);assert.equal(mutation.statusCode,405);assert.equal(calls,0);
 const read=response();await handler({method:'GET'},read);assert.equal(read.statusCode,503);assert.ok(!JSON.stringify(read).includes('secret'));
});

test('a newer same-symbol postponement blocks the upcoming classification',async()=>{
 const updated=structuredClone(ku);
 updated.data.items.push({annTitle:'Mock (MOCK) Spot Listing Postponed',annUrl:'https://www.kucoin.com/announcement/en-mock-postponed',annDesc:'',cTime:now,annType:['new-listings']});
 const report=await createListingCollector({fetcher:mockFetch({
  'https://api.kucoin.com/api/v3/announcements?currentPage=1&pageSize=20&annType=new-listings&lang=en_US':()=>Response.json(updated)
 }),now:()=>now})();
 assert.equal(report.items.find(r=>r.kind==='SPOT_ANNOUNCEMENT').status,'SCHEDULE_REVIEW_REQUIRED');
});
