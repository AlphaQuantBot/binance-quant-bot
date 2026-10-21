import {ReferencePriceFreshnessError} from './priceReference';
import {nextSignalDelay} from './testnetSignalTiming';
export type DecisionWatchReport={assessment:string;candidate:string;signal?:string;candleCloseTime?:number;inputHash?:string;
 orderReview:{state:string};executionAuthorized:boolean;ordersSubmitted:number;automaticTradingEnabled:boolean};
export type DecisionWatchSample={report:DecisionWatchReport;serverTime:number;clockReceivedAt:number};
type Dependencies={observe:(signal:AbortSignal)=>Promise<DecisionWatchSample>;wait:(ms:number,signal:AbortSignal)=>Promise<void>;
 monotonicNow:()=>number;emit:(report:DecisionWatchReport,cycle:number)=>void;errorCode:(error:unknown)=>string};
export function summarizeDecisionWatch(reports:readonly DecisionWatchReport[],requestedCycles:number,attemptedCycles:number,state:string,stopCode:string|null,referenceTiming?:ReferencePriceFreshnessError['timing']){
 const unique=new Map<number,DecisionWatchReport>();
 for(const r of reports)if(r.candleCloseTime!==undefined&&!unique.has(r.candleCloseTime))unique.set(r.candleCloseTime,r);
 const rows=[...unique.values()].sort((a,b)=>a.candleCloseTime!-b.candleCloseTime!);
 let missedWithinSession=0,gapEventsWithinSession=0;
 for(let i=1;i<rows.length;i++){const missed=Math.max(0,(rows[i].candleCloseTime!-rows[i-1].candleCloseTime!)/60000-1);
  if(missed){missedWithinSession+=missed;gapEventsWithinSession++;}}
 return {environment:'BINANCE_TESTNET',operation:'READ_ONLY_DECISION_WATCH_SUMMARY',state,stopCode,...(referenceTiming?{referenceTiming}:{}),
  requestedCycles,attemptedCycles,completedCycles:reports.length,uniqueCandles:rows.length,
  duplicateObservations:reports.filter(r=>r.candleCloseTime!==undefined).length-rows.length,
  signals:{BUY_CROSS:rows.filter(r=>r.signal==='BUY_CROSS').length,SELL_CROSS:rows.filter(r=>r.signal==='SELL_CROSS').length,HOLD:rows.filter(r=>r.signal==='HOLD').length},
  uniqueCandidateCandles:{BUY:rows.filter(r=>r.candidate==='BUY').length,SELL:rows.filter(r=>r.candidate==='SELL').length},
  decisionObservations:{WAIT:reports.filter(r=>r.assessment==='WAIT').length,CANDIDATE_ONLY:reports.filter(r=>r.assessment==='CANDIDATE_ONLY').length,BLOCKED:reports.filter(r=>r.assessment==='BLOCKED').length},
  orderReviewObservations:{LOCAL_CHECKS_PASSED:reports.filter(r=>r.orderReview.state==='LOCAL_CHECKS_PASSED').length,
   BLOCKED:reports.filter(r=>r.orderReview.state==='BLOCKED').length,NOT_APPLICABLE:reports.filter(r=>r.orderReview.state==='NOT_APPLICABLE').length},
  firstCandleCloseTime:rows[0]?.candleCloseTime??null,lastCandleCloseTime:rows.at(-1)?.candleCloseTime??null,
  missedWithinSession,gapEventsWithinSession,continuousObservedSession:rows.length>=2&&missedWithinSession===0,
  persistedSession:false,executionAuthorized:false,ordersSubmitted:0,automaticTradingEnabled:false};
}
/** Bounded serial observation only: never retries failed reads or accepts an execution-capable report. */
export async function runDecisionWatch(cycles:number,deps:Dependencies,stop:AbortSignal){
 if(!Number.isInteger(cycles)||cycles<1||cycles>120)throw Error('DECISION_WATCH_CYCLES_INVALID');
 const reports:DecisionWatchReport[]=[];let state='COMPLETED',stopCode:string|null=null,attempted=0;
 let referenceTiming:ReferencePriceFreshnessError['timing']|undefined;
 try{
  for(let cycle=1;cycle<=cycles&&!stop.aborted;cycle++){
   attempted++;const sample=await deps.observe(stop);if(stop.aborted)break;
   const r=sample.report;
   if(!r||r.executionAuthorized!==false||r.ordersSubmitted!==0||r.automaticTradingEnabled!==false||
    !['WAIT','CANDIDATE_ONLY','BLOCKED'].includes(r.assessment)||!['NONE','BUY','SELL'].includes(r.candidate)||
    !r.orderReview||!['LOCAL_CHECKS_PASSED','BLOCKED','NOT_APPLICABLE'].includes(r.orderReview.state))
    throw Error('DECISION_WATCH_REPORT_INVALID');
   if((r.assessment==='CANDIDATE_ONLY'&&(r.candidate==='NONE'||r.orderReview.state!=='LOCAL_CHECKS_PASSED'))||
    (r.assessment!=='CANDIDATE_ONLY'&&r.candidate!=='NONE'))throw Error('DECISION_WATCH_REPORT_INVALID');
   if(r.assessment!=='BLOCKED'&&(!Number.isSafeInteger(r.candleCloseTime)||r.candleCloseTime!==Math.floor(sample.serverTime/60000)*60000-1||
    !['HOLD','BUY_CROSS','SELL_CROSS'].includes(r.signal??'')||!/^[a-f0-9]{64}$/.test(r.inputHash??'')))throw Error('DECISION_WATCH_REPORT_INVALID');
   if(r.candleCloseTime!==undefined){
    const previous=reports.filter(p=>p.candleCloseTime!==undefined).at(-1);
    if(previous&&r.candleCloseTime<previous.candleCloseTime!)throw Error('DECISION_WATCH_TIME_REGRESSED');
    if(previous&&r.candleCloseTime===previous.candleCloseTime&&r.inputHash!==previous.inputHash)throw Error('DECISION_WATCH_SIGNAL_CHANGED');
   }
   // Validate the scheduling anchor even on the final cycle, without a wall-clock rebase.
   nextSignalDelay(sample.serverTime,sample.clockReceivedAt,deps.monotonicNow());
   reports.push(r);deps.emit(r,cycle);
   if(r.assessment==='BLOCKED'){state='STOPPED';stopCode='DECISION_BLOCKED';break;}
   if(cycle<cycles)await deps.wait(nextSignalDelay(sample.serverTime,sample.clockReceivedAt,deps.monotonicNow()),stop);
  }
 }catch(error){
  if(error instanceof ReferencePriceFreshnessError)referenceTiming=error.timing;
  if(stop.aborted){state='INTERRUPTED';stopCode='OPERATOR_INTERRUPTED';}
  else{state='STOPPED';stopCode=error instanceof Error&&/^DECISION_WATCH_[A-Z_]+$/.test(error.message)?error.message:deps.errorCode(error);}
 }
 if(stop.aborted){state='INTERRUPTED';stopCode='OPERATOR_INTERRUPTED';}
 return summarizeDecisionWatch(reports,cycles,attempted,state,stopCode,referenceTiming);
}
