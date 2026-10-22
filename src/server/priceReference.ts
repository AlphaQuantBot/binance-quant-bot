import {referenceEventAges,type ReferenceClockEvidence} from './referenceClock';
import { units } from './exactDecimal';
export type PriceReference = {kind:'REFERENCE_PRICE'|'AVERAGE_PRICE'|'LAST_TRADE';price:string;observedAt:number;timestamp:number;avgPriceMins?:number;absenceConfirmed?:boolean;referenceClock?:ReferenceClockEvidence};
export type ReferenceFailureStage='STARTUP_WARMUP'|'INITIAL_STREAM_READ'|'POST_BOOK_SNAPSHOT'|'CONTEXT_REFERENCE_VALIDATION';
export type ReferenceFailurePhase='ACCOUNT_OBSERVATION'|'CANDIDATE_REVIEW';
const freshnessEventTimes=new WeakMap<Error,number>();
export type ReferenceWaitDiagnostics={waitLimitMs:number;requiredMaxEventAgeMs:number;waitElapsedMs:number|null;messagesDuringWait:number;referenceEventsDuringWait:number;bestNewEventMaxAgeMs:number|null;socketReadyState?:number|null;lastMessageAgeMs?:number|null};
export class ReferencePriceFreshnessError extends Error {
 readonly timing:{referenceKind:string;requestAgeMs:number|null;eventAgeMs:number|null;serverEventAgeMinMs?:number;serverEventAgeMaxMs?:number;stage?:ReferenceFailureStage;phase?:ReferenceFailurePhase;clockUncertaintyMs?:number;bookReadElapsedMs?:number|null;initialServerEventAgeMaxMs?:number;referenceEventAdvanceMs?:number|null;streamWait?:ReferenceWaitDiagnostics};
 constructor(reference:PriceReference,now:number){
  super('STALE_REFERENCE_PRICE');freshnessEventTimes.set(this,reference.timestamp);
  const age=(timestamp:number)=>Number.isSafeInteger(now)&&Number.isSafeInteger(timestamp)&&Number.isSafeInteger(now-timestamp)?now-timestamp:null;
  this.timing={referenceKind:['REFERENCE_PRICE','AVERAGE_PRICE','LAST_TRADE'].includes(reference.kind)?reference.kind:'UNKNOWN',requestAgeMs:age(reference.observedAt),eventAgeMs:age(reference.timestamp)};
  if(reference.referenceClock){const ages=referenceEventAges(reference.timestamp,now,reference.referenceClock);this.timing.serverEventAgeMinMs=ages.youngest;this.timing.serverEventAgeMaxMs=ages.oldest;this.timing.clockUncertaintyMs=ages.oldest-ages.youngest;}
 }
}
export function referenceForFilter(reference:PriceReference|undefined,filter:any,now:number) {
  if(!reference)throw Error('EXCHANGE_REFERENCE_PRICE_REQUIRED');
  const eventAges=reference.referenceClock?referenceEventAges(reference.timestamp,now,reference.referenceClock):{youngest:now-reference.timestamp,oldest:now-reference.timestamp};
  if(!Number.isSafeInteger(reference.observedAt)||!Number.isSafeInteger(reference.timestamp)||reference.observedAt>now||eventAges.youngest<0||reference.observedAt<=0||reference.timestamp<=0||now-reference.observedAt>2000||eventAges.oldest>2000||units(reference.price)<=0n)throw new ReferencePriceFreshnessError(reference,now);
  if(!Number.isSafeInteger(filter.avgPriceMins)||filter.avgPriceMins<0)throw Error('INVALID_REFERENCE_WINDOW');
  if(reference.kind==='REFERENCE_PRICE')return units(reference.price);
  if(reference.absenceConfirmed!==true)throw Error('REFERENCE_ABSENCE_UNCONFIRMED');
  if(filter.avgPriceMins===0&&reference.kind==='LAST_TRADE')return units(reference.price);
  if(filter.avgPriceMins>0&&reference.kind==='AVERAGE_PRICE'&&reference.avgPriceMins===filter.avgPriceMins)return units(reference.price);
  throw Error('REFERENCE_WINDOW_MISMATCH');
}
export function validatePercentPrice(price:bigint,side:'BUY'|'SELL',filter:any,reference:PriceReference|undefined,now:number) {
  const ref=referenceForFilter(reference,filter,now);
  const lower=units(filter.filterType==='PERCENT_PRICE'?filter.multiplierDown:side==='BUY'?filter.bidMultiplierDown:filter.askMultiplierDown);
  const upper=units(filter.filterType==='PERCENT_PRICE'?filter.multiplierUp:side==='BUY'?filter.bidMultiplierUp:filter.askMultiplierUp);
  if(lower<=0n||upper<lower)throw Error('INVALID_PERCENT_MULTIPLIERS');
  if(price*10n**18n<ref*lower||price*10n**18n>ref*upper)throw Error('PERCENT_PRICE_REJECTED');
}

/** Only typed freshness errors receive fixed diagnostic labels; preserve original ages. */
export function annotateReferenceFailure(error:unknown,stage?:ReferenceFailureStage,phase?:ReferenceFailurePhase){
 if(error instanceof ReferencePriceFreshnessError){
  if(stage&&error.timing.stage===undefined)error.timing.stage=stage;
  if(phase&&error.timing.phase===undefined)error.timing.phase=phase;
 }
 return error;
}

/** Diagnostic only: monotonic elapsed time never changes the freshness decision. */
export function annotateReferenceBookRead(error:unknown,elapsedMs:number){
 if(error instanceof ReferencePriceFreshnessError&&error.timing.bookReadElapsedMs===undefined){
  error.timing.bookReadElapsedMs=Number.isFinite(elapsedMs)&&elapsedMs>=0&&elapsedMs<=Number.MAX_SAFE_INTEGER?elapsedMs:null;
 }
 return error;
}

/** Compare actual event identities, never inferred local wall-clock offsets. */
export function annotateReferenceBookProgress(error:unknown,initial:PriceReference|undefined,bookStartedAt:number){
 if(!(error instanceof ReferencePriceFreshnessError)||!initial)return error;
 if(error.timing.referenceEventAdvanceMs===undefined){
  const timestamp=freshnessEventTimes.get(error);
  const delta=timestamp===undefined?NaN:timestamp-initial.timestamp;
  error.timing.referenceEventAdvanceMs=Number.isSafeInteger(delta)?delta:null;
 }
 if(error.timing.initialServerEventAgeMaxMs===undefined&&initial.referenceClock){
  try{error.timing.initialServerEventAgeMaxMs=referenceEventAges(initial.timestamp,bookStartedAt,initial.referenceClock).oldest;}
  catch{/* Diagnostics cannot replace the original failure. */}
 }
 return error;
}
