import type {ReferenceClockEvidence} from './referenceClock';
import {units} from './exactDecimal';
import {referenceForFilter,ReferencePriceFreshnessError,type PriceReference} from './priceReference';
type Socket=Pick<WebSocket,'addEventListener'|'removeEventListener'|'close'>;
/** One public, fixed-testnet subscription. No credentials, reconnects or order capabilities. */
export class TestnetReferenceStream {
 private socket:Socket;private latest?:PriceReference;private failure?:Error;private lastAgeError?:ReferencePriceFreshnessError;private closed=false;
 private waiter?:{resolve:(r:PriceReference)=>void;reject:(e:Error)=>void;timer:ReturnType<typeof setTimeout>};
 constructor(private symbol:string,private now:()=>number=Date.now,createSocket:(url:string)=>Socket=url=>new WebSocket(url),private referenceClock?:()=>ReferenceClockEvidence){
  if(!/^[A-Z0-9]{5,24}$/.test(symbol))throw Error('INVALID_SYMBOL');
  this.socket=createSocket('wss://stream.testnet.binance.vision/ws/'+symbol.toLowerCase()+'@referencePrice');
  this.socket.addEventListener('message',this.message);
  this.socket.addEventListener('error',this.error);
  this.socket.addEventListener('close',this.disconnected);
 }
 private fresh(){
  if(!this.latest)return false;
  if(this.referenceClock)this.latest.referenceClock=this.referenceClock();
  try{referenceForFilter(this.latest,{avgPriceMins:0},this.now());return true;}
  catch(e){if(e instanceof ReferencePriceFreshnessError)this.lastAgeError=e;return false;}
 }
 private message=(event:Event)=>{
  if(this.closed||this.failure)return;
  try{
   const data=(event as MessageEvent).data;
   if(typeof data!=='string'||data.length>8192)throw Error('STREAM_REFERENCE_INVALID');
   const r=JSON.parse(data);
   if(r?.e==='serverShutdown')throw Error('STREAM_REFERENCE_DISCONNECTED');
   if(!r||r.e!=='referencePrice'||r.s!==this.symbol||!Number.isSafeInteger(r.t)||r.t<=0)throw Error('STREAM_REFERENCE_INVALID');
   if(r.r===null){this.latest=undefined;this.lastAgeError=undefined;return;}
   if(typeof r.r!=='string'||units(r.r)<=0n)throw Error('STREAM_REFERENCE_INVALID');
   if(this.latest&&(r.t<this.latest.timestamp||r.t===this.latest.timestamp&&r.r!==this.latest.price))throw Error('STREAM_REFERENCE_REGRESSED');
   this.latest={kind:'REFERENCE_PRICE',price:r.r,timestamp:r.t,observedAt:this.now(),...(this.referenceClock?{referenceClock:this.referenceClock()}: {})};
   if(this.fresh()&&this.waiter){const w=this.waiter;this.waiter=undefined;clearTimeout(w.timer);w.resolve(structuredClone(this.latest));}
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
 /** Synchronous cached observation only: no wait, reconnect or timestamp refresh. */
 snapshot(symbol:string):PriceReference{
  if(symbol!==this.symbol)throw Error('STREAM_REFERENCE_SYMBOL_MISMATCH');
  if(this.failure)throw this.failure;if(this.closed)throw Error('STREAM_REFERENCE_CLOSED');
  if(!this.latest)throw Error('STREAM_REFERENCE_UNAVAILABLE');
  if(this.referenceClock)this.latest.referenceClock=this.referenceClock();
  referenceForFilter(this.latest,{avgPriceMins:0},this.now());
  return structuredClone(this.latest);
 }
 async read(symbol:string):Promise<PriceReference>{
  if(symbol!==this.symbol)throw Error('STREAM_REFERENCE_SYMBOL_MISMATCH');
  if(this.failure)throw this.failure;if(this.closed)throw Error('STREAM_REFERENCE_CLOSED');
  if(this.fresh())return structuredClone(this.latest!);
  if(this.waiter)throw Error('STREAM_REFERENCE_READER_BUSY');
  return new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>{this.waiter=undefined;reject(this.lastAgeError??Error('STREAM_REFERENCE_TIMEOUT'));},4000);
   this.waiter={resolve,reject,timer};
  });
 }
 close(){
  if(this.closed)return;this.closed=true;
  if(this.waiter){const w=this.waiter;this.waiter=undefined;clearTimeout(w.timer);w.reject(Error('STREAM_REFERENCE_CLOSED'));}
  this.socket.removeEventListener('message',this.message);this.socket.removeEventListener('error',this.error);this.socket.removeEventListener('close',this.disconnected);this.socket.close();
 }
}
