import type {DecisionWatchReport} from './scopedDecisionWatch';
type History={startedAt:number;summary:{state:string;sessionId:string;requestedCycles:number;completedCycles:number;executionAuthorized:boolean;ordersSubmitted:number;automaticTradingEnabled:boolean;stopCode?:string|null};observations?:readonly DecisionWatchReport[]};
type RecordedReport=DecisionWatchReport & {environment?:string;strategy?:string;symbol?:string;reasonCodes?:unknown;executionBlockers?:unknown};
function fail():never{throw Error('DECISION_ANALYSIS_INVALID');}
function codes(value:unknown):string[]{
 if(value===undefined)return [];
 if(!Array.isArray(value)||value.length>100||value.some(v=>typeof v!=='string'||!/^[A-Z][A-Z0-9_]{0,95}$/.test(v)))return fail();
 return [...new Set(value as string[])];
}
function increment(target:Map<string,number>,values:string[]){for(const value of values)target.set(value,(target.get(value)??0)+1);}
function counts(target:Map<string,number>){return Object.fromEntries([...target].sort(([a],[b])=>a.localeCompare(b)));}
/** Recorded evidence only: no price lookup, fill simulation or executable intent. */
export function analyzeDecisionHistory(history:readonly History[]){
 if(!Array.isArray(history)||history.length>20)return fail();
 const ids=new Set<string>(),candles=new Map<number,{inputHash:string;signal:string}>();
 const uniqueBuy=new Set<number>(),uniqueSell=new Set<number>(),reviewed=new Set<number>();
 const reasonCounts=new Map<string,number>(),blockerCounts=new Map<string,number>(),stopCounts=new Map<string,number>();
 const decisions={WAIT:0,CANDIDATE_ONLY:0,BLOCKED:0},reviews={LOCAL_CHECKS_PASSED:0,BLOCKED:0,NOT_APPLICABLE:0};
 const sessions={COMPLETED:0,STOPPED:0,INTERRUPTED:0,UNFINALIZED:0};
 let observations=0,duplicateCandleObservations=0,unattributedBlockedObservations=0;
 for(const row of history){
  const s=row.summary,records=row.observations;
  if(!s||typeof s.sessionId!=='string'||!/^[a-f0-9-]{36}$/.test(s.sessionId)||ids.has(s.sessionId)||
   !Object.prototype.hasOwnProperty.call(sessions,s.state)||s.executionAuthorized!==false||s.ordersSubmitted!==0||s.automaticTradingEnabled!==false||
   !Number.isInteger(s.requestedCycles)||s.requestedCycles<1||s.requestedCycles>120||!Array.isArray(records)||records.length>120||
   s.completedCycles!==records.length||records.length>s.requestedCycles||(s.state==='COMPLETED'&&records.length!==s.requestedCycles))return fail();
  ids.add(s.sessionId);sessions[s.state as keyof typeof sessions]++;
  if(s.stopCode!==undefined&&s.stopCode!==null)increment(stopCounts,codes([s.stopCode]));
  for(const record of records){
   const r=record as RecordedReport;
   if(r.environment!=='BINANCE_TESTNET'||r.strategy!=='EMA20_50_CROSS_1M_V1'||r.symbol!=='BTCUSDT')return fail();
   if(r.executionAuthorized!==false||r.ordersSubmitted!==0||r.automaticTradingEnabled!==false||
    !Object.prototype.hasOwnProperty.call(decisions,r.assessment)||!r.orderReview||
    !Object.prototype.hasOwnProperty.call(reviews,r.orderReview.state)||!['NONE','BUY','SELL'].includes(r.candidate))return fail();
   if((r.assessment==='CANDIDATE_ONLY'&&(r.candidate==='NONE'||r.orderReview.state!=='LOCAL_CHECKS_PASSED'))||
    (r.assessment!=='CANDIDATE_ONLY'&&r.candidate!=='NONE')||(r.orderReview.state==='LOCAL_CHECKS_PASSED'&&r.assessment!=='CANDIDATE_ONLY'))return fail();
   const review=r.orderReview as {state:string;executionAuthorized?:boolean;capitalReserved?:boolean;feeReservationAuthorized?:boolean;exchangeValidated?:boolean};
   if(review.executionAuthorized===true||review.capitalReserved===true||review.feeReservationAuthorized===true||review.exchangeValidated===true)return fail();
   observations++;decisions[r.assessment as keyof typeof decisions]++;reviews[r.orderReview.state as keyof typeof reviews]++;
   increment(reasonCounts,codes(r.reasonCodes));increment(blockerCounts,codes(r.executionBlockers));
   const keyed=Number.isSafeInteger(r.candleCloseTime)&&r.candleCloseTime!>0&&r.candleCloseTime!%60000===59999&&
    /^[a-f0-9]{64}$/.test(r.inputHash??'')&&['BUY_CROSS','SELL_CROSS','HOLD'].includes(r.signal??'');
   if(!keyed){if(r.assessment!=='BLOCKED')return fail();unattributedBlockedObservations++;continue;}
   const time=r.candleCloseTime!,inputHash=r.inputHash!,signal=r.signal!;
   const previous=candles.get(time);
   if(previous){if(previous.inputHash!==inputHash||previous.signal!==signal)throw Error('DECISION_ANALYSIS_SIGNAL_CONFLICT');duplicateCandleObservations++;}
   else candles.set(time,{inputHash,signal});
   if(r.candidate==='BUY'){if(signal!=='BUY_CROSS')return fail();uniqueBuy.add(time);}
   if(r.candidate==='SELL'){if(signal!=='SELL_CROSS')return fail();uniqueSell.add(time);}
   if(r.orderReview.state==='LOCAL_CHECKS_PASSED')reviewed.add(time);
  }
 }
 const times=[...candles.keys()].sort((a,b)=>a-b);
 let unobservedCandlesBetweenRecords=0,gapIntervals=0;
 for(let index=1;index<times.length;index++){
  const gap=(times[index]-times[index-1])/60000-1;
  if(gap>0){gapIntervals++;unobservedCandlesBetweenRecords+=gap;}
 }
 const signals={BUY_CROSS:0,SELL_CROSS:0,HOLD:0};
 for(const r of candles.values())signals[r.signal as keyof typeof signals]++;
 return {environment:'BINANCE_TESTNET',operation:'READ_ONLY_DECISION_ANALYSIS',symbol:'BTCUSDT',strategy:'EMA20_50_CROSS_1M_V1',
  scope:'RECORDED_DECISION_OBSERVATIONS_ONLY',sessionsAnalyzed:ids.size,sessionStates:sessions,observations,
  uniqueCandles:candles.size,duplicateCandleObservations,unattributedBlockedObservations,signals,
  decisionObservations:decisions,orderReviewObservations:reviews,uniqueCandidateCandles:{BUY:uniqueBuy.size,SELL:uniqueSell.size},
  uniqueLocallyReviewedCandles:reviewed.size,reasonCodeObservations:counts(reasonCounts),executionBlockerObservations:counts(blockerCounts),stopCodeSessions:counts(stopCounts),
  firstCandleCloseTime:times[0]??null,lastCandleCloseTime:times[times.length-1]??null,
  unobservedCandlesBetweenRecords,gapIntervals,continuousRecordedCoverage:times.length>=2&&gapIntervals===0,
  profitabilityAssessed:false,executionAuthorized:false,ordersSubmitted:0,automaticTradingEnabled:false};
}
