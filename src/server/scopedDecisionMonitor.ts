import {ReferencePriceFreshnessError} from './priceReference';
import {ReferenceStreamTimeoutError} from './testnetReferenceStream';
import {runDecisionWatch,type DecisionWatchReport,type DecisionWatchSample} from './scopedDecisionWatch';
type CycleSummary=Awaited<ReturnType<typeof runDecisionWatch>>;
type Dependencies={
 observe:(signal:AbortSignal)=>Promise<DecisionWatchSample>;wait:(ms:number,signal:AbortSignal)=>Promise<void>;monotonicNow:()=>number;
 begin:()=>string;record:(id:string,report:DecisionWatchReport)=>void;finish:(id:string,summary:CycleSummary)=>{sessionId:string;persistedSession:boolean};
 emit:(cycle:number,id:string,status:string,summary:CycleSummary)=>void;errorCode:(error:unknown)=>string;
};
/** Only typed lack-of-reference evidence permits a later, separately scheduled observation. */
export function isReferenceUnavailable(error:unknown){
 if(error instanceof ReferenceStreamTimeoutError)return true;
 if(!(error instanceof ReferencePriceFreshnessError))return false;
 const t=error.timing,youngest=t.serverEventAgeMinMs??t.eventAgeMs,oldest=t.serverEventAgeMaxMs??t.eventAgeMs;
 return typeof youngest==='number'&&Number.isFinite(youngest)&&youngest>=0&&typeof oldest==='number'&&Number.isFinite(oldest)&&
  typeof t.requestAgeMs==='number'&&t.requestAgeMs>=0&&(oldest>2000||t.requestAgeMs>2000);
}
export async function runDecisionMonitor(cycles:number,deps:Dependencies,stop:AbortSignal){
 if(!Number.isInteger(cycles)||cycles<1||cycles>120)throw Error('DECISION_MONITOR_CYCLES_INVALID');
 let state='COMPLETED',stopCode:string|null=null,observedCycles=0,unavailableCycles=0;
 const childSessionIds:string[]=[];
 for(let cycle=1;cycle<=cycles&&!stop.aborted;cycle++){
  const cycleStarted=deps.monotonicNow();if(!Number.isFinite(cycleStarted))throw Error('INVALID_CLOCK');
  const id=deps.begin();let unavailable=false;
  const summary=await runDecisionWatch(1,{
   observe:async signal=>{try{return await deps.observe(signal);}catch(error){unavailable=isReferenceUnavailable(error);throw error;}},
   wait:deps.wait,monotonicNow:deps.monotonicNow,record:report=>deps.record(id,report),emit:()=>{},errorCode:deps.errorCode
  },stop);
  const saved=deps.finish(id,summary);
  if(saved.sessionId!==id||saved.persistedSession!==true)throw Error('DECISION_MONITOR_PERSISTENCE_FAILED');
  childSessionIds.push(id);
  const status=summary.state==='COMPLETED'?'OBSERVED':summary.state==='STOPPED'&&unavailable?'UNAVAILABLE':summary.state;
  if(status==='OBSERVED')observedCycles++;if(status==='UNAVAILABLE')unavailableCycles++;
  deps.emit(cycle,id,status,summary);
  if(status!=='OBSERVED'&&status!=='UNAVAILABLE'){state=summary.state;stopCode=summary.stopCode;break;}
  if(cycle<cycles&&!stop.aborted){
   const now=deps.monotonicNow();if(!Number.isFinite(now)||now<cycleStarted)throw Error('INVALID_CLOCK');
   try{await deps.wait(Math.max(0,60000-(now-cycleStarted)),stop);}
   catch(error){if(!stop.aborted)throw error;}
  }
 }
 if(stop.aborted){state='INTERRUPTED';stopCode='OPERATOR_INTERRUPTED';}
 else if(state==='COMPLETED'&&unavailableCycles)state='COMPLETED_WITH_UNAVAILABLE_CYCLES';
 return {environment:'BINANCE_TESTNET',operation:'READ_ONLY_DECISION_MONITOR_SUMMARY',state,stopCode,requestedCycles:cycles,
  recordedCycles:childSessionIds.length,observedCycles,unavailableCycles,childSessionIds,
  schedule:'SERIAL_MINIMUM_60_SECONDS_BETWEEN_ATTEMPT_STARTS',persistedCycles:true,persistedSession:false,
  profitabilityAssessed:false,executionAuthorized:false,ordersSubmitted:0,automaticTradingEnabled:false};
}
