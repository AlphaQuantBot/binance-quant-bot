const ADDR=/^0x[a-fA-F0-9]{40}$/;
const SOURCES=[
 {exchange:'KuCoin',feed:'https://api.kucoin.com/api/v3/announcements?currentPage=1&pageSize=20&annType=new-listings&lang=en_US',host:'www.kucoin.com',prefix:'/announcement/'},
 {exchange:'Bybit',feed:'https://api.bybit.com/v5/announcements/index?locale=en-US&type=new_crypto&page=1&limit=20',host:'announcements.bybit.com',prefix:'/en-US/article/'}
];
export const sourceDefinitions=()=>SOURCES.map(s=>({...s}));
const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))&&Number(v)>=0?Number(v):null;
function validTime(t){return Number.isSafeInteger(t)&&t>0?t:null;}
export function officialArticle(exchange,raw) {
 const source=SOURCES.find(s=>s.exchange===exchange);
 try {
  const u=new URL(raw);
  return source&&u.protocol==='https:'&&u.hostname===source.host&&!u.port&&!u.username&&!u.password&&u.pathname.startsWith(source.prefix)?u.href:null;
 } catch {return null;}
}
export function classifyAnnouncement(title,tags=[]) {
 const text=String(title)+' '+tags.join(' ');
 if(/delist|postpon|suspend|cancel|delay|reschedul/i.test(text))return 'REVIEW_UPDATE';
 if(/(?:adds?|introduc(?:e|es|ing))\s+(?:new\s+)?(?:spot\s+)?trading pairs?|new trading pairs?/i.test(text))return 'NEW_PAIR_ONLY';
 if(/futures|perpetual|derivatives|pre.market|margin|leveraged|options/i.test(text))return 'NON_SPOT';
 if(/\bspot\b|listed on kucoin|kucoin will (?:list|add)/i.test(text))return 'SPOT_ANNOUNCEMENT';
 return 'REVIEW_REQUIRED';
}
export function listingTime(text) {
 // Only an explicitly named trading line with full year and UTC is accepted.
 const lines=String(text).split(/\n|<br\s*\/?\s*>|<\/p>|<\/li>/i);
 const values=[];
 const months=['january','february','march','april','may','june','july','august','september','october','november','december'];
 for(const raw of lines) {
  const line=raw.replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/\s+/g,' ').trim();
  if(!/^(?:spot\s+)?trading(?:\s+(?:starts?|opens?|opening|start time|in innovation zone))?\s*:/i.test(line)||!/\(UTC\)/i.test(line))continue;
  let m=line.match(/:\s*(\d{1,2}):(\d{2})\s+on\s+([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})\s*\(UTC\)/i);
  let year,month,day,hour,minute;
  if(m){hour=+m[1];minute=+m[2];month=months.findIndex(x=>x===m[3].toLowerCase())+1;day=+m[4];year=+m[5];}
  else {
   m=line.match(/:\s*(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})\s*\(UTC\)/);
   if(!m)continue;[,year,month,day,hour,minute]=m.map(Number);
  }
  if(!month||hour>23||minute>59)continue;
  const t=Date.UTC(year,month-1,day,hour,minute),d=new Date(t);
  if(d.getUTCFullYear()!==year||d.getUTCMonth()!==month-1||d.getUTCDate()!==day)continue;
  values.push(t);
 }
 const unique=[...new Set(values)];
 return unique.length===1?unique[0]:null;
}
export function articleEvidence(html) {
 // Do not infer identities from navigation, related articles, or script payloads.
 const scoped=String(html).match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
 if(!scoped)return {scope:'UNSUPPORTED_HTML',text:'',addresses:[]};
 const body=scoped[1].replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'');
 const addresses=[...body.matchAll(/https:\/\/(?:www\.)?bscscan\.com\/token\/(0x[a-fA-F0-9]{40})(?![a-fA-F0-9])/g)].map(m=>m[1].toLowerCase());
 const text=body.replace(/<br\s*\/?>|<\/p>|<\/li>/gi,'\n').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ');
 return {scope:'ARTICLE_ELEMENT',text,addresses:[...new Set(addresses)]};
}
export function normalizeFeed(exchange,body,at) {
 const ku=exchange==='KuCoin';
 if(ku?body?.code!=='200000':body?.retCode!==0)throw Error('FEED_SCHEMA_INVALID');
 const data=ku?body.data:body.result,items=ku?data?.items:data?.list;
 if(!Array.isArray(items)||items.length>100)throw Error('FEED_SCHEMA_INVALID');
 const rows=[],seen=new Set();
 for(const item of items) {
  const title=ku?item?.annTitle:item?.title,url=officialArticle(exchange,ku?item?.annUrl:item?.url);
  if(typeof title!=='string'||!url||seen.has(url))continue;
  seen.add(url);
  const rawTags=ku?item.annType:item.tags,tags=Array.isArray(rawTags)?rawTags.filter(v=>typeof v==='string'):[];
  const symbolMatches=[...title.matchAll(/\(([A-Z][A-Z0-9]{1,14})\)/g)].map(m=>m[1]).filter(s=>!['UTC','USDT','USDC'].includes(s));
  const symbols=[...new Set(symbolMatches)];
  const description=String(ku?item.annDesc??'':item.description??'').slice(0,12000);
  rows.push({id:exchange+':'+url,exchange,title:title.slice(0,500),url,description,
   symbol:symbols.length===1?symbols[0]:null,kind:classifyAnnouncement(title,tags),
   publishedAt:validTime(ku?item.cTime:item.publishTime??item.dateTimestamp),
   tradingAt:listingTime(description),contractAddress:null,contractEvidenceUrl:null,
   detailState:'NOT_CHECKED',poolState:'NOT_CHECKED',pools:[],receivedAt:at});
 }
 return {rows,total:Number.isFinite(ku?data.totalNum:data.total)?Number(ku?data.totalNum:data.total):null,returned:items.length};
}
export function currencyContract(body,symbol) {
 if(body?.code!=='200000'||body?.data?.currency!==symbol||!Array.isArray(body?.data?.chains))return [];
 return [...new Set(body.data.chains.filter(c=>c?.chainId==='bsc'&&ADDR.test(c.contractAddress)).map(c=>c.contractAddress.toLowerCase()))];
}
export function matchingPools(rows,address) {
 if(!Array.isArray(rows)||rows.length>500)throw Error('POOL_SCHEMA_INVALID');
 return rows.filter(p=>p?.chainId==='bsc'&&p.dexId==='pancakeswap'&&ADDR.test(p.pairAddress)&&
   ADDR.test(p.baseToken?.address)&&p.baseToken.address.toLowerCase()===address.toLowerCase())
 .map(p=>({pairAddress:p.pairAddress,sourceUrl:'https://dexscreener.com/bsc/'+p.pairAddress,
  priceUsd:finite(p.priceUsd),liquidityUsd:finite(p.liquidity?.usd),volume24hUsd:finite(p.volume?.h24)}))
 .filter((p,i,a)=>a.findIndex(x=>x.pairAddress.toLowerCase()===p.pairAddress.toLowerCase())===i)
 .sort((a,b)=>(b.liquidityUsd??-1)-(a.liquidityUsd??-1));
}
export function listingStatus(row,now) {
 if(row.kind!=='SPOT_ANNOUNCEMENT')return row.kind;
 if(row.scheduleReviewRequired)return 'SCHEDULE_REVIEW_REQUIRED';
 if(!row.tradingAt)return 'TIME_UNCONFIRMED';
 if(row.tradingAt<=now)return 'ALREADY_STARTED';
 if(row.tradingAt>now+7*86400000)return 'OUTSIDE_7_DAY_WINDOW';
 if(!row.contractAddress)return 'CONTRACT_UNCONFIRMED';
 if(row.poolState==='PROVIDER_FAILED')return 'POOL_UNAVAILABLE';
 return row.pools.length?'UPCOMING_WITH_POOL':'POOL_NOT_CONFIRMED';
}
async function limitedText(response) {
 const reader=response.body?.getReader();
 if(!reader)throw Error('EMPTY_RESPONSE');
 const chunks=[];let size=0;
 try {
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;
   if(size>1500000){await reader.cancel();throw Error('RESPONSE_TOO_LARGE');}chunks.push(value);}
 } finally {reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 return new TextDecoder().decode(bytes);
}
export function createListingCollector({fetcher=fetch,now=Date.now}={}) {
 let snapshot=null,pending=null;
 const project=(value)=>({...value,ageMs:Math.max(0,now()-value.fetchedAt),
  items:value.items.map(row=>({...row,status:listingStatus(row,now())}))});
 return async function collect() {
  if(snapshot&&now()>=snapshot.fetchedAt&&now()-snapshot.fetchedAt<120000)return {...project(snapshot),cached:true};
  if(pending)return pending;
  pending=(async()=>{
   const runSignal=AbortSignal.timeout(25000);
   let requestCount=0;
   const get=async(url,json=true)=>{
    if(++requestCount>34)throw Error('REQUEST_BUDGET_EXHAUSTED');
    const response=await fetcher(url,{method:'GET',redirect:'error',signal:AbortSignal.any([runSignal,AbortSignal.timeout(5000)]),headers:{Accept:json?'application/json':'text/html'}});
    if(!response.ok)throw Error(response.status===429?'RATE_LIMITED':'PROVIDER_UNAVAILABLE');
    const text=await limitedText(response);return json?JSON.parse(text):text;
   };
   const sources=await Promise.all(SOURCES.map(async source=>{
    try {const feed=normalizeFeed(source.exchange,await get(source.feed),now());
     return {exchange:source.exchange,feedUrl:source.feed,state:'OK',coverage:'FIRST_PAGE_ONLY',...feed};
    } catch {return {exchange:source.exchange,feedUrl:source.feed,state:'UNAVAILABLE',coverage:'FIRST_PAGE_ONLY',rows:[],total:null,returned:0};}
   }));
   const items=sources.flatMap(s=>s.rows).sort((a,b)=>(b.publishedAt??0)-(a.publishedAt??0));
   for(const row of items) {
    row.scheduleReviewRequired=row.kind==='SPOT_ANNOUNCEMENT'&&!!row.symbol&&items.some(update=>
     update.kind==='REVIEW_UPDATE'&&update.exchange===row.exchange&&update.symbol===row.symbol&&
     update.publishedAt!==null&&row.publishedAt!==null&&update.publishedAt>=row.publishedAt);
   }
   const candidates=items.filter(r=>r.kind==='SPOT_ANNOUNCEMENT'&&!r.scheduleReviewRequired).slice(0,8);
   let cursor=0;
   async function worker() {
    while(cursor<candidates.length) {
     const row=candidates[cursor++];
     let evidence={scope:'UNSUPPORTED_HTML',text:'',addresses:[]},currency=[];
     try {evidence=articleEvidence(await get(row.url,false));row.detailState=evidence.scope;
      const time=listingTime(evidence.text);
      if(row.tradingAt&&time&&row.tradingAt!==time){row.tradingAt=null;row.detailState='TIME_CONFLICT';}
      else row.tradingAt=time??row.tradingAt;
     } catch {row.detailState='DETAIL_UNAVAILABLE';}
     let currencyUrl=null;
     if(row.exchange==='KuCoin'&&row.symbol) {
      currencyUrl='https://api.kucoin.com/api/v3/currencies/'+encodeURIComponent(row.symbol);
      try {currency=currencyContract(await get(currencyUrl),row.symbol);}catch {}
     }
     const identities=[...new Set([...evidence.addresses,...currency])];
     if(identities.length!==1){row.contractState=identities.length?'AMBIGUOUS':'UNCONFIRMED';continue;}
     row.contractAddress=identities[0];row.contractState='EXCHANGE_SOURCE';
     row.contractEvidenceUrl=currency.includes(identities[0])?currencyUrl:row.url;
     row.poolSourceUrl='https://api.dexscreener.com/token-pairs/v1/bsc/'+row.contractAddress;
     try {row.pools=matchingPools(await get(row.poolSourceUrl),row.contractAddress);
      row.poolState=row.pools.length?'EXACT_BASE_ADDRESS_MATCH':'NO_INDEXED_BASE_POOL';
     } catch {row.poolState='PROVIDER_FAILED';}
    }
   }
   await Promise.all([worker(),worker()]);
   const available=sources.filter(s=>s.state==='OK').length;
   const value={mode:'READ_ONLY_LISTING_WATCH',fetchedAt:now(),cached:false,executionEnabled:false,
    sourceState:available===sources.length?'OK':available?'PARTIAL':'UNAVAILABLE',
    coverage:{supportedExchanges:SOURCES.map(s=>s.exchange),unsupportedExchanges:['Binance','MEXC','Gate','Bitget','LBank','BitMart'],
     pagesPerExchange:1,pageSize:20,detailsLimit:8,detailsExamined:candidates.length,windowDays:7,
     exhaustive:false,poolScope:'PROVIDER_INDEXED_BSC_PANCAKESWAP_BASE_TOKEN',poolEventTimeKnown:false},
    sources:sources.map(({rows,...rest})=>rest),items,requestCount};
   snapshot=value;return project(value);
  })();
  try {return await pending;}finally {pending=null;}
 };
}
