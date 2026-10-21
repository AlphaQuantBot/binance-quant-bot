export type ReferenceClockEvidence={serverTime:number;localStartedAt:number;localReceivedAt:number};
/** Conservative server-time interval; calibration expires after 30 seconds. */
export function referenceEventAges(timestamp:number,now:number,clock:ReferenceClockEvidence){
 const {serverTime,localStartedAt,localReceivedAt}=clock;
 const rtt=localReceivedAt-localStartedAt,elapsed=now-localReceivedAt;
 if(![timestamp,now,serverTime,localStartedAt,localReceivedAt].every(Number.isSafeInteger)||serverTime<=0||localStartedAt<=0||rtt<0||rtt>1000||elapsed<0||elapsed>30000)throw Error('REFERENCE_CLOCK_UNCONFIRMED');
 const youngest=serverTime+elapsed-1-timestamp,oldest=serverTime+elapsed+rtt+1-timestamp;
 if(!Number.isSafeInteger(youngest)||!Number.isSafeInteger(oldest))throw Error('REFERENCE_CLOCK_UNCONFIRMED');
 return {youngest,oldest};
}
export function measuredReferenceClock(serverTime:number,localStartedAt:number,localReceivedAt:number,monotonicStartedAt:number,monotonicReceivedAt:number,now:()=>number=Date.now,monotonicNow:()=>number=()=>performance.now()){
 const evidence={serverTime,localStartedAt,localReceivedAt};
 const duration=monotonicReceivedAt-monotonicStartedAt;
 if(!Number.isFinite(duration)||duration<0||Math.abs(localReceivedAt-localStartedAt-duration)>5)throw Error('REFERENCE_CLOCK_UNCONFIRMED');
 referenceEventAges(serverTime,localReceivedAt,evidence);
 return ()=>{
  const localNow=now(),elapsed=monotonicNow()-monotonicReceivedAt;
  if(!Number.isFinite(elapsed)||elapsed<0||Math.abs(localNow-localReceivedAt-elapsed)>5)throw Error('REFERENCE_CLOCK_UNCONFIRMED');
  referenceEventAges(serverTime,localNow,evidence);
  return {...evidence};
 };
}
