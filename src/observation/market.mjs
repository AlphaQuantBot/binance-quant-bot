const ADDRESS = /^0x[a-fA-F0-9]{40}$/;
export const isAddress = value => typeof value === 'string' && ADDRESS.test(value);
const number = (v, signed = false) => {
  if (v === null || v === undefined || v === '' || !['number','string'].includes(typeof v)) return null;
  const n = Number(v);
  return Number.isFinite(n) && (signed || n >= 0) ? n : null;
};
const count = v => Number.isSafeInteger(v) && v >= 0 ? v : null;
export function normalizePairs(rows, fetchedAt) {
  if (!Array.isArray(rows) || rows.length > 1000) throw Error('PROVIDER_SCHEMA_INVALID');
  const seen = new Set();
  return rows.filter(p => p && p.chainId === 'bsc' && p.dexId === 'pancakeswap' &&
    isAddress(p.pairAddress) && isAddress(p.baseToken?.address) && isAddress(p.quoteToken?.address))
    .filter(p => { const k=p.pairAddress.toLowerCase(); if(seen.has(k)) return false; seen.add(k); return true; })
    .map(p => ({
      pairAddress:p.pairAddress, chainId:'bsc', dexId:'pancakeswap',
      baseToken:{address:p.baseToken.address,name:String(p.baseToken.name ?? '').slice(0,100),symbol:String(p.baseToken.symbol ?? '').slice(0,30)},
      quoteToken:{address:p.quoteToken.address,symbol:String(p.quoteToken.symbol ?? '').slice(0,30)},
      priceUsd:number(p.priceUsd), liquidityUsd:number(p.liquidity?.usd),
      volume24hUsd:number(p.volume?.h24), change24hPct:number(p.priceChange?.h24,true),
      buys24h:count(p.txns?.h24?.buys), sells24h:count(p.txns?.h24?.sells),
      marketCapUsd:number(p.marketCap), fdvUsd:number(p.fdv),
      pairCreatedAt:Number.isSafeInteger(p.pairCreatedAt) && p.pairCreatedAt > 0 && p.pairCreatedAt <= fetchedAt ? p.pairCreatedAt : null,
      sourceUrl:'https://dexscreener.com/bsc/'+p.pairAddress,
      safety:{honeypot:'UNKNOWN',liquidityLock:'UNKNOWN',ownership:'UNKNOWN',tax:'UNKNOWN'},
    })).sort((a,b)=>(b.liquidityUsd ?? -1)-(a.liquidityUsd ?? -1));
}
export function createMarketReader(fetcher=fetch, now=Date.now) {
  const cache=new Map(), inFlight=new Map();
  return async function read(query) {
    if(typeof query !== 'string' || !query.trim() || query.trim().length > 80) throw Error('QUERY_INVALID');
    query=query.trim();
    const key=isAddress(query)?query.toLowerCase():query;
    const cached=cache.get(key);
    if(cached && now()-cached.fetchedAt >= 0 && now()-cached.fetchedAt < 15000)
      return {...cached,cached:true};
    if(inFlight.has(key)) return inFlight.get(key);
    if(inFlight.size>=8) throw Error('PROVIDER_BUSY');
    const promise=(async()=>{
      const endpoint=isAddress(query)?'/token-pairs/v1/bsc/'+query:'/latest/dex/search?q='+encodeURIComponent(query);
      const response=await fetcher('https://api.dexscreener.com'+endpoint,{
        redirect:'error',signal:AbortSignal.timeout(8000),headers:{Accept:'application/json'}
      });
      if(!response.ok) throw Error(response.status===429?'PROVIDER_RATE_LIMITED':'PROVIDER_UNAVAILABLE');
      const raw=await response.json(), fetchedAt=now();
      const rows=isAddress(query)?raw:raw?.pairs;
      const pairs=normalizePairs(rows,fetchedAt);
      const result={source:'DEX Screener',scope:'BSC_PANCAKESWAP_INDEXED_PAIRS',fetchedAt,
        upstreamEventTimeKnown:false,cached:false,pairs};
      if(cache.size>=64) cache.delete(cache.keys().next().value);
      cache.set(key,result);
      return result;
    })();
    inFlight.set(key,promise);
    try {return await promise;} finally {inFlight.delete(key);}
  };
}
