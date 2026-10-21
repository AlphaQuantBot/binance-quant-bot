import {measuredReferenceClock,ReferenceClockError} from './referenceClock';
export type DecisionClockSample={serverTime:number;clockLocalStartedAt:number;clockLocalReceivedAt:number;clockStartedAt:number;clockReceivedAt:number};
/** A fixed measurement batch, never an error-triggered retry or fallback. */
export async function sampleDecisionReferenceClock(initial:DecisionClockSample,fetcher:typeof fetch=fetch,now:()=>number=Date.now,monotonicNow:()=>number=()=>performance.now()){
 const calibrate=(s:DecisionClockSample)=>measuredReferenceClock(s.serverTime,s.clockLocalStartedAt,s.clockLocalReceivedAt,s.clockStartedAt,s.clockReceivedAt,now,monotonicNow);
 const samples=[initial],clocks=[calibrate(initial)];clocks[0]();
 for(let index=0;index<2;index++){
  const clockLocalStartedAt=now(),clockStartedAt=monotonicNow();
  let response:Response;
  try{response=await fetcher('https://testnet.binance.vision/api/v3/time',{method:'GET',redirect:'error',signal:AbortSignal.timeout(12000)});}
  catch{throw Error('SIGNAL_READ_FAILED');}
  if(!response.ok)throw Error([418,429].includes(response.status)?'SIGNAL_RATE_LIMITED':response.status===451?'SIGNAL_LOCATION_RESTRICTED':'SIGNAL_READ_FAILED');
  let raw:unknown;try{raw=await response.json();}catch{throw Error('SIGNAL_CLOCK_INVALID');}
  const clockReceivedAt=monotonicNow(),clockLocalReceivedAt=now();
  const serverTime=(raw as {serverTime?:unknown}|null)?.serverTime;
  if(typeof serverTime!=='number'||!Number.isSafeInteger(serverTime)||serverTime<=0)throw Error('SIGNAL_CLOCK_INVALID');
  const sample={serverTime,clockLocalStartedAt,clockLocalReceivedAt,clockStartedAt,clockReceivedAt};
  const clock=calibrate(sample);clock();samples.push(sample);clocks.push(clock);
 }
 // Every sample must be valid and consistent; a fast sample never hides a failed one.
 for(const clock of clocks)clock();
 const offsetLower=Math.max(...samples.map(s=>s.serverTime-s.clockLocalReceivedAt-1));
 const offsetUpper=Math.min(...samples.map(s=>s.serverTime-s.clockLocalStartedAt+1));
 if(offsetLower>offsetUpper)throw new ReferenceClockError('MEASUREMENTS_DISAGREE');
 const roundTrips=samples.map(s=>s.clockLocalReceivedAt-s.clockLocalStartedAt);
 const selected=roundTrips.indexOf(Math.min(...roundTrips));
 return {referenceClock:clocks[selected],diagnostics:{sampleCount:3,roundTripMs:roundTrips,selectedRoundTripMs:roundTrips[selected]}};
}
