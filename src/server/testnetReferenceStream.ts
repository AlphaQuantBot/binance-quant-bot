import {referenceEventAges,type ReferenceClockEvidence} from './referenceClock';
import {units} from './exactDecimal';
import {referenceForFilter,ReferencePriceFreshnessError,type PriceReference,type ReferenceWaitDiagnostics} from './priceReference';
type Socket=Pick<WebSocket,'addEventListener'|'removeEventListener'|'close'>&Partial<Pick<WebSocket,'readyState'>>;
export type ReferenceStreamDiagnostics={opened:boolean;messages:number;referenceEvents:number;nullPrices:number;nonNullPrices:number;waitLimitMs:number;waitPhase?:'STARTUP';requiredMaxEventAgeMs?:number;streamWait?:ReferenceWaitDiagnostics};
export class ReferenceStreamTimeoutError extends Error{
 readonly streamDiagnostics:ReferenceStreamDiagnostics;
 constructor(diagnostics:ReferenceStreamDiagnostics){
  super('STREAM_REFERENCE_TIMEOUT');
  this.streamDiagnostics={...(diagnostics.streamWait?{streamWait:{...diagnostics.streamWait}}:{}),opened:diagnostics.opened,messages:diagnostics.messages,referenceEvents:diagnostics.referenceEvents,
   nullPrices:diagnostics.nullPrices,nonNullPrices:diagnostics.nonNullPrices,waitLimitMs:diagnostics.waitLimitMs,...(diagnostics.waitPhase?{waitPhase:diagnostics.waitPhase}:{}),...(diagnostics.requiredMaxEventAgeMs!==undefined?{requiredMaxEventAgeMs:diagnostics.requiredMaxEventAgeMs}:{})};
 }
}
/** One public, fixed-testnet subscription. No credentials, reconnects or order capabilities. */
export class TestnetReferenceStream {
 private diagnostics:ReferenceStreamDiagnostics={opened:false,messages:0,referenceEvents:0,nullPrices:0,nonNullPrices:0,waitLimitMs:4000};
 private startupComplete=false;
 private lastMessageAt?:number;
 private socketState(){try{const state=this.socket.readyState;return typeof state==='number'&&Number.isInteger(state)&&state>=0&&state<=3?state:null;}catch{return null;}}
 private opened=()=>{this.diagnostics.opened=true;};
 private socket:Socket;private latest?:PriceReference;private failure?:Error;private lastAgeError?:ReferencePriceFreshnessError;private closed=false;
 private waiter?:{resolve:(r:PriceReference)=>void;reject:(e:Error)=>void;timer:ReturnType<typeof setTimeout>;maxEventAgeMs:number;startedAt:number;initialMessages:number;initialEvents:number;bestNewEventMaxAgeMs:number|null};
 constructor(private symbol:string,private now:()=>number=Date.now,createSocket:(url:string)=>Socket=url=>new WebSocket(url),private referenceClock?:()=>ReferenceClockEvidence,private monotonicNow:()=>number=()=>performance.now()){
  if(!/^[A-Z0-9]{5,24}$/.test(symbol))throw Error('INVALID_SYMBOL');
  this.socket=createSocket('wss://stream.testnet.binance.vision/ws/'+symbol.toLowerCase()+'@referencePrice');
  this.socket.addEventListener('open',this.opened);
  this.socket.addEventListener('message',this.message);
  this.socket.addEventListener('error',this.error);
  this.socket.addEventListener('close',this.disconnected);
 }
 private fresh(maxEventAgeMs=2000){
  if(!this.latest)return false;
  if(this.referenceClock)this.latest.referenceClock=this.referenceClock();
  try{const now=this.now();
   const ages=this.latest.referenceClock?referenceEventAges(this.latest.timestamp,now,this.latest.referenceClock):{youngest:now-this.latest.timestamp,oldest:now-this.latest.timestamp};
   if(this.waiter&&ages.youngest>=0&&Number.isSafeInteger(ages.oldest))this.waiter.bestNewEventMaxAgeMs=Math.min(this.waiter.bestNewEventMaxAgeMs??Infinity,ages.oldest);
   referenceForFilter(this.latest,{avgPriceMins:0},now);this.lastAgeError=undefined;
   return ages.oldest<=maxEventAgeMs;}
  catch(e){if(e instanceof ReferencePriceFreshnessError)this.lastAgeError=e;return false;}
 }
 private message=(event:Event)=>{
  if(this.closed||this.failure)return;
  this.diagnostics.messages++;this.lastMessageAt=this.monotonicNow();
  try{
   const data=(event as MessageEvent).data;
   if(typeof data!=='string'||data.length>8192)throw Error('STREAM_REFERENCE_INVALID');
   const r=JSON.parse(data);
   if(r?.e==='serverShutdown')throw Error('STREAM_REFERENCE_DISCONNECTED');
   if(!r||r.e!=='referencePrice'||r.s!==this.symbol||!Number.isSafeInteger(r.t)||r.t<=0)throw Error('STREAM_REFERENCE_INVALID');
   this.diagnostics.referenceEvents++;
   if(r.r===null){this.diagnostics.nullPrices++;this.latest=undefined;this.lastAgeError=undefined;return;}
   if(typeof r.r!=='string'||units(r.r)<=0n)throw Error('STREAM_REFERENCE_INVALID');
   this.diagnostics.nonNullPrices++;
   if(this.latest&&(r.t<this.latest.timestamp||r.t===this.latest.timestamp&&r.r!==this.latest.price))throw Error('STREAM_REFERENCE_REGRESSED');
   this.latest={kind:'REFERENCE_PRICE',price:r.r,timestamp:r.t,observedAt:this.now()};
   if(this.waiter&&this.fresh(this.waiter.maxEventAgeMs)){const w=this.waiter;this.waiter=undefined;clearTimeout(w.timer);w.resolve(structuredClone(this.latest));}
  }catch(e){this.fail(e instanceof Error&&['STREAM_REFERENCE_INVALID','STREAM_REFERENCE_DISCONNECTED','STREAM_REFERENCE_REGRESSED','REFERENCE_CLOCK_UNCONFIRMED'].includes(e.message)?e:Error('STREAM_REFERENCE_INVALID'));}
 };
 private error=()=>this.fail(Error('STREAM_REFERENCE_TRANSPORT_UNCONFIRMED'));
 private disconnected=()=>this.fail(Error('STREAM_REFERENCE_DISCONNECTED'));
 private fail(error:Error){
  if(this.closed||this.failure)return;this.failure=error;
  if(this.waiter){const w=this.waiter;this.waiter=undefined;clearTimeout(w.timer);w.reject(error);}
  // An error before read() is retained, not an unhandled rejected promise.
  this.socket.close();
 }
 /** Refresh measurement evidence without reconnecting or changing cached event times. */
 setReferenceClock(clock:()=>ReferenceClockEvidence){
  if(this.failure)throw this.failure;if(this.closed)throw Error('STREAM_REFERENCE_CLOSED');
  if(this.waiter)throw Error('STREAM_REFERENCE_READER_BUSY');
  clock();this.referenceClock=clock;this.lastAgeError=undefined;
 }
 /** Synchronous cached observation only: no wait, reconnect or timestamp refresh. */
 snapshot(symbol:string):PriceReference{
  if(symbol!==this.symbol)throw Error('STREAM_REFERENCE_SYMBOL_MISMATCH');
  if(this.failure)throw this.failure;if(this.closed)throw Error('STREAM_REFERENCE_CLOSED');
  if(!this.latest)throw Error('STREAM_REFERENCE_UNAVAILABLE');
  if(this.referenceClock)this.latest.referenceClock=this.referenceClock();
  referenceForFilter(this.latest,{avgPriceMins:0},this.now());
  return structuredClone(this.latest);
 }
 /** Startup is awaited before account/context collection; it never relaxes price freshness. */
 async warmup(symbol:string):Promise<void>{
  if(symbol!==this.symbol)throw Error('STREAM_REFERENCE_SYMBOL_MISMATCH');
  if(this.failure)throw this.failure;if(this.closed)throw Error('STREAM_REFERENCE_CLOSED');
  if(this.startupComplete)return;
  await this.readWithWait(symbol,12000,'STARTUP');this.startupComplete=true;
 }
 async read(symbol:string):Promise<PriceReference>{return this.readWithWait(symbol,4000);}
 /** Preparation only: reserve a bounded preparation budget within the unchanged 2000 ms final window. */
 async readForBook(symbol:string,reserveMs=1000):Promise<PriceReference>{
  if(!Number.isSafeInteger(reserveMs)||reserveMs<1||reserveMs>=2000)throw Error('STREAM_REFERENCE_CONFIGURATION_INVALID');
  return this.readWithWait(symbol,4000,undefined,2000-reserveMs);
 }
 private async readWithWait(symbol:string,waitLimitMs:number,waitPhase?:'STARTUP',maxEventAgeMs=2000):Promise<PriceReference>{
  if(symbol!==this.symbol)throw Error('STREAM_REFERENCE_SYMBOL_MISMATCH');
  if(this.failure)throw this.failure;if(this.closed)throw Error('STREAM_REFERENCE_CLOSED');
  if(this.fresh(maxEventAgeMs))return structuredClone(this.latest!);
  if(this.waiter)throw Error('STREAM_REFERENCE_READER_BUSY');
  return new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>{
    const w=this.waiter;this.waiter=undefined;
    let streamWait:ReferenceWaitDiagnostics|undefined;
    if(w&&maxEventAgeMs<2000){
     const elapsed=this.monotonicNow()-w.startedAt;
     const messageAge=this.lastMessageAt===undefined?NaN:this.monotonicNow()-this.lastMessageAt;
     streamWait={waitLimitMs,requiredMaxEventAgeMs:maxEventAgeMs,waitElapsedMs:Number.isFinite(elapsed)&&elapsed>=0?elapsed:null,
      messagesDuringWait:this.diagnostics.messages-w.initialMessages,referenceEventsDuringWait:this.diagnostics.referenceEvents-w.initialEvents,bestNewEventMaxAgeMs:w.bestNewEventMaxAgeMs,socketReadyState:this.socketState(),lastMessageAgeMs:Number.isFinite(messageAge)&&messageAge>=0?messageAge:null};
    }
    if(this.lastAgeError){if(streamWait)this.lastAgeError.timing.streamWait=streamWait;reject(this.lastAgeError);}
    else reject(new ReferenceStreamTimeoutError({...this.diagnostics,waitLimitMs,...(waitPhase?{waitPhase}:{}),...(maxEventAgeMs<2000?{requiredMaxEventAgeMs:maxEventAgeMs}:{}),...(streamWait?{streamWait}:{})}));
   },waitLimitMs);
   this.waiter={resolve,reject,timer,maxEventAgeMs,startedAt:this.monotonicNow(),initialMessages:this.diagnostics.messages,initialEvents:this.diagnostics.referenceEvents,bestNewEventMaxAgeMs:null};
  });
 }
 close(){
  if(this.closed)return;this.closed=true;
  if(this.waiter){const w=this.waiter;this.waiter=undefined;clearTimeout(w.timer);w.reject(Error('STREAM_REFERENCE_CLOSED'));}
  this.socket.removeEventListener('open',this.opened);
  this.socket.removeEventListener('message',this.message);this.socket.removeEventListener('error',this.error);this.socket.removeEventListener('close',this.disconnected);this.socket.close();
 }
}
