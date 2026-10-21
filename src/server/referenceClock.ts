export type ReferenceClockEvidence={serverTime:number;localStartedAt:number;localReceivedAt:number};
export type ReferenceClockFailureReason='INVALID_MEASUREMENT'|'ROUND_TRIP_OUT_OF_RANGE'|'MEASUREMENT_TIME_REGRESSED'|'MEASUREMENT_EXPIRED'|'CALIBRATION_CLOCK_MISMATCH'|'CURRENT_CLOCK_MISMATCH'|'UNSAFE_TIME_ARITHMETIC';
export type ReferenceClockDiagnostics={reason:ReferenceClockFailureReason;roundTripMs:number|null;measurementAgeMs:number|null;monotonicElapsedMs:number|null;wallClockDriftMs:number|null};
export class ReferenceClockError extends Error{
 readonly clockDiagnostics:ReferenceClockDiagnostics;
 constructor(reason:ReferenceClockFailureReason,roundTripMs?:number,measurementAgeMs?:number,monotonicElapsedMs?:number,wallClockDriftMs?:number){
  super('REFERENCE_CLOCK_UNCONFIRMED');
  const numeric=(value:number|undefined)=>typeof value==='number'&&Number.isFinite(value)?value:null;
  this.clockDiagnostics={reason,roundTripMs:numeric(roundTripMs),measurementAgeMs:numeric(measurementAgeMs),
   monotonicElapsedMs:numeric(monotonicElapsedMs),wallClockDriftMs:numeric(wallClockDriftMs)};
 }
}
/** Conservative server-time interval; calibration expires after 30 seconds. */
export function referenceEventAges(timestamp:number,now:number,clock:ReferenceClockEvidence){
 const {serverTime,localStartedAt,localReceivedAt}=clock;
 const rtt=localReceivedAt-localStartedAt,elapsed=now-localReceivedAt;
 if(![timestamp,now,serverTime,localStartedAt,localReceivedAt].every(Number.isSafeInteger)||serverTime<=0||localStartedAt<=0)throw new ReferenceClockError('INVALID_MEASUREMENT',rtt,elapsed);
 if(rtt<0||rtt>1000)throw new ReferenceClockError('ROUND_TRIP_OUT_OF_RANGE',rtt,elapsed);
 if(elapsed<0)throw new ReferenceClockError('MEASUREMENT_TIME_REGRESSED',rtt,elapsed);
 if(elapsed>30000)throw new ReferenceClockError('MEASUREMENT_EXPIRED',rtt,elapsed);
 const youngest=serverTime+elapsed-1-timestamp,oldest=serverTime+elapsed+rtt+1-timestamp;
 if(!Number.isSafeInteger(youngest)||!Number.isSafeInteger(oldest))throw new ReferenceClockError('UNSAFE_TIME_ARITHMETIC',rtt,elapsed);
 return {youngest,oldest};
}
export function measuredReferenceClock(serverTime:number,localStartedAt:number,localReceivedAt:number,monotonicStartedAt:number,monotonicReceivedAt:number,now:()=>number=Date.now,monotonicNow:()=>number=()=>performance.now()){
 const evidence={serverTime,localStartedAt,localReceivedAt};
 const duration=monotonicReceivedAt-monotonicStartedAt,rtt=localReceivedAt-localStartedAt,drift=rtt-duration;
 if(!Number.isFinite(duration)||duration<0||Math.abs(drift)>5)throw new ReferenceClockError('CALIBRATION_CLOCK_MISMATCH',rtt,0,duration,drift);
 referenceEventAges(serverTime,localReceivedAt,evidence);
 return ()=>{
  const localNow=now(),elapsed=monotonicNow()-monotonicReceivedAt;
  const age=localNow-localReceivedAt,currentDrift=age-elapsed;
  if(!Number.isFinite(elapsed)||elapsed<0||Math.abs(currentDrift)>5)throw new ReferenceClockError('CURRENT_CLOCK_MISMATCH',rtt,age,elapsed,currentDrift);
  referenceEventAges(serverTime,localNow,evidence);
  return {...evidence};
 };
}
