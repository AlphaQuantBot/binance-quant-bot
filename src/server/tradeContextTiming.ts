export type TradeContextTiming={contextAgeMs:number|null;quoteAgeMs:number|null;beforeQuoteMs:number|null;contextLimitMs:5000;quoteLimitMs:2000;reasons:string[];collectionPhases?:{metadataReadElapsedMs:number|null;referenceWaitElapsedMs:number|null;bookReadElapsedMs:number|null}};
/** Fixed codes and durations only; never retain the context payload or timestamps. */
export class TradeContextFreshnessError extends Error{
 readonly contextTiming:TradeContextTiming;
 constructor(startedAt:unknown,quoteAt:unknown,now:unknown){
  super('STALE_TRADE_CONTEXT');
  const valid=(v:unknown):v is number=>typeof v==='number'&&Number.isSafeInteger(v);
  const duration=(a:unknown,b:unknown)=>valid(a)&&valid(b)&&Number.isSafeInteger(a-b)?a-b:null;
  const contextAgeMs=duration(now,startedAt),quoteAgeMs=duration(now,quoteAt),beforeQuoteMs=duration(quoteAt,startedAt);
  const reasons:string[]=[];
  if(!valid(now)||!valid(startedAt)||!valid(quoteAt))reasons.push('INVALID_TIMESTAMPS');
  if(valid(now)&&valid(startedAt)&&valid(quoteAt)&&(contextAgeMs===null||quoteAgeMs===null||beforeQuoteMs===null))reasons.push('UNSAFE_TIME_ARITHMETIC');
  if(valid(startedAt)&&startedAt<=0)reasons.push('INVALID_START');
  if(valid(startedAt)&&valid(quoteAt)&&startedAt>quoteAt)reasons.push('QUOTE_BEFORE_CONTEXT');
  if(valid(quoteAt)&&valid(now)&&quoteAt>now)reasons.push('QUOTE_IN_FUTURE');
  if(contextAgeMs!==null&&contextAgeMs>5000)reasons.push('CONTEXT_TOO_OLD');
  if(quoteAgeMs!==null&&quoteAgeMs>2000)reasons.push('QUOTE_TOO_OLD');
  this.contextTiming={contextAgeMs,quoteAgeMs,beforeQuoteMs,contextLimitMs:5000,quoteLimitMs:2000,reasons};
 }
}

/** Attach only local duration measurements to the original typed failure. */
export function annotateTradeContextPhases(error:unknown,metadataReadElapsedMs:number,referenceWaitElapsedMs:number,bookReadElapsedMs:number){
 if(error instanceof TradeContextFreshnessError&&error.contextTiming.collectionPhases===undefined){
  const safe=(v:number)=>Number.isFinite(v)&&v>=0&&v<=Number.MAX_SAFE_INTEGER?v:null;
  error.contextTiming.collectionPhases={metadataReadElapsedMs:safe(metadataReadElapsedMs),referenceWaitElapsedMs:safe(referenceWaitElapsedMs),bookReadElapsedMs:safe(bookReadElapsedMs)};
 }
 return error;
}
