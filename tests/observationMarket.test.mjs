import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createMarketReader,normalizePairs} from '../src/observation/market.mjs';
const addr=n=>'0x'+n.repeat(40);
const row=(extra={})=>({chainId:'bsc',dexId:'pancakeswap',pairAddress:addr('1'),
baseToken:{address:addr('2'),symbol:'TEST'},quoteToken:{address:addr('3'),symbol:'WBNB'},
priceUsd:'0.25',liquidity:{usd:1200},priceChange:{h24:-8},...extra});

test('excludes foreign networks and dexes; missing metrics and security remain unknown',()=>{
 const pairs=normalizePairs([row(),row({chainId:'solana'}),row({dexId:'other'}),
 row({pairAddress:addr('4'),priceUsd:null,liquidity:null})],1000);
 assert.equal(pairs.length,2);assert.equal(pairs[0].change24hPct,-8);
 assert.equal(pairs[1].priceUsd,null);assert.equal(pairs[1].liquidityUsd,null);
 assert.equal(pairs[0].safety.honeypot,'UNKNOWN');
 assert.equal(pairs[0].pairCreatedAt,null);
});
test('deduplicates pools and does not accept unsafe external links or invalid numbers',()=>{
 const pairs=normalizePairs([row({url:'javascript:alert(1)',priceUsd:'Infinity'}),row()],1000);
 assert.equal(pairs.length,1);assert.equal(pairs[0].priceUsd,null);
 assert.equal(pairs[0].sourceUrl,'https://dexscreener.com/bsc/'+addr('1'));
});
test('address query uses fixed public endpoint and cache retains original retrieval time',async()=>{
 let clock=1000,calls=0;
 const read=createMarketReader(async(url,options)=>{
  calls++;assert.equal(url,'https://api.dexscreener.com/token-pairs/v1/bsc/'+addr('2'));
  assert.equal(options.redirect,'error');assert.equal(options.headers.Accept,'application/json');
  return new Response(JSON.stringify([row()]));
 },()=>clock);
 const first=await read(addr('2'));clock=2000;const second=await read(addr('2'));
 assert.equal(calls,1);assert.equal(second.cached,true);assert.equal(second.fetchedAt,first.fetchedAt);
});
test('expired cache cannot hide upstream failures or malformed responses',async()=>{
 let clock=1000,failed=false;
 const read=createMarketReader(async()=>failed?new Response('{}',{status:429}):new Response(JSON.stringify([row()])),()=>clock);
 await read(addr('2'));clock=20000;failed=true;
 await assert.rejects(read(addr('2')),/PROVIDER_RATE_LIMITED/);
 const invalid=createMarketReader(async()=>new Response('{}'));
 await assert.rejects(invalid('TEST'),/PROVIDER_SCHEMA_INVALID/);
});
test('search encodes input and invalid query does not reach provider',async()=>{
 let calls=0;
 const read=createMarketReader(async url=>{
  calls++;assert.equal(url,'https://api.dexscreener.com/latest/dex/search?q=A%26B');
  return new Response(JSON.stringify({pairs:[]}));
 });
 await read('A&B');await assert.rejects(read(' '),/QUERY_INVALID/);assert.equal(calls,1);
});
test('concurrent identical queries share one upstream request',async()=>{
 let calls=0,release;
 const gate=new Promise(resolve=>{release=resolve;});
 const read=createMarketReader(async()=>{calls++;await gate;return new Response(JSON.stringify([row()]));});
 const a=read(addr('2')),b=read(addr('2'));release();
 assert.deepEqual(await a,await b);assert.equal(calls,1);
});
