import {units} from './exactDecimal';
export type ReferenceCadenceReport={environment:string;operation:string;state:string;stopCode:string|null;requestedSeconds:number;elapsedMs:number|null;opened:boolean;messages:number;nullPrices:number;nonNullPrices:number;intervals:number;gapBuckets:{upTo1000Ms:number;over1000To2000Ms:number;over2000To4000Ms:number;over4000Ms:number};maxMessageGapMs:number|null;firstMessageDelayMs:number|null;lastMessageAgeMs:number|null;ordersSubmitted:0;executionAuthorized:false;automaticTradingEnabled:false};
type ProbeSocket=Pick<WebSocket,'addEventListener'|'removeEventListener'|'close'>;
export function validateProbeSeconds(seconds:number){
 if(!Number.isInteger(seconds)||seconds<10||seconds>600)throw Error('REFERENCE_PROBE_DURATION_INVALID');
}
export async function probeReferenceCadence(seconds:number,createSocket:(url:string)=>ProbeSocket=url=>new WebSocket(url),
 monotonicNow:()=>number=()=>performance.now(),signal?:AbortSignal):Promise<ReferenceCadenceReport>{
 validateProbeSeconds(seconds);
 const started=monotonicNow();let opened=false,messages=0,nullPrices=0,nonNullPrices=0;
 let firstMessageAt:number|undefined,lastMessageAt:number|undefined,maxGap=0,intervals=0;
 const gapBuckets={upTo1000Ms:0,over1000To2000Ms:0,over2000To4000Ms:0,over4000Ms:0};
 let done=false,timer:ReturnType<typeof setTimeout>|undefined;
 if(signal?.aborted)return {environment:'BINANCE_TESTNET',operation:'READ_ONLY_REFERENCE_CADENCE_PROBE',state:'INTERRUPTED',stopCode:'OPERATOR_INTERRUPTED',
  requestedSeconds:seconds,elapsedMs:0,opened:false,messages:0,nullPrices:0,nonNullPrices:0,intervals:0,gapBuckets,maxMessageGapMs:null,
  firstMessageDelayMs:null,lastMessageAgeMs:null,ordersSubmitted:0,executionAuthorized:false,automaticTradingEnabled:false};
 const socket=createSocket('wss://stream.testnet.binance.vision/ws/btcusdt@referencePrice');
 return new Promise<ReferenceCadenceReport>(resolve=>{
  const finish=(state:string,stopCode:string|null)=>{
   if(done)return;done=true;if(timer!==undefined)clearTimeout(timer);
   const ended=monotonicNow(),safe=(v:number)=>Number.isFinite(v)&&v>=0?v:null;
   socket.removeEventListener('open',onOpen);socket.removeEventListener('message',onMessage);
   socket.removeEventListener('error',onError);socket.removeEventListener('close',onClose);
   signal?.removeEventListener('abort',onAbort);try{socket.close();}catch{}
   resolve({environment:'BINANCE_TESTNET',operation:'READ_ONLY_REFERENCE_CADENCE_PROBE',state,stopCode,requestedSeconds:seconds,
    elapsedMs:safe(ended-started),opened,messages,nullPrices,nonNullPrices,intervals,gapBuckets,
    maxMessageGapMs:intervals?maxGap:null,firstMessageDelayMs:firstMessageAt===undefined?null:safe(firstMessageAt-started),
    lastMessageAgeMs:lastMessageAt===undefined?null:safe(ended-lastMessageAt),
    ordersSubmitted:0,executionAuthorized:false,automaticTradingEnabled:false});
  };
  const onOpen=()=>{opened=true;};
  const onError=()=>finish('STOPPED','STREAM_REFERENCE_TRANSPORT_UNCONFIRMED');
  const onClose=()=>finish('STOPPED','STREAM_REFERENCE_DISCONNECTED');
  const onAbort=()=>finish('INTERRUPTED','OPERATOR_INTERRUPTED');
  const onMessage=(event:Event)=>{
   if(done)return;
   try{
    const raw=(event as MessageEvent).data;
    if(typeof raw!=='string'||raw.length>8192)throw Error();
    const r=JSON.parse(raw);
    if(r?.e==='serverShutdown'){finish('STOPPED','STREAM_REFERENCE_DISCONNECTED');return;}
    if(r?.e!=='referencePrice'||r.s!=='BTCUSDT'||!Number.isSafeInteger(r.t)||r.t<=0||
      (r.r!==null&&(typeof r.r!=='string'||units(r.r)<=0n)))throw Error();
    const at=monotonicNow();
    if(!Number.isFinite(at)||at<started||(lastMessageAt!==undefined&&at<lastMessageAt))throw Error();
    if(lastMessageAt!==undefined){
     const gap=at-lastMessageAt;intervals++;maxGap=Math.max(maxGap,gap);
     if(gap<=1000)gapBuckets.upTo1000Ms++;else if(gap<=2000)gapBuckets.over1000To2000Ms++;
     else if(gap<=4000)gapBuckets.over2000To4000Ms++;else gapBuckets.over4000Ms++;
    }
    firstMessageAt??=at;lastMessageAt=at;messages++;
    if(r.r===null)nullPrices++;else nonNullPrices++;
   }catch{finish('STOPPED','STREAM_REFERENCE_INVALID');}
  };
  socket.addEventListener('open',onOpen);socket.addEventListener('message',onMessage);
  socket.addEventListener('error',onError);socket.addEventListener('close',onClose);
  signal?.addEventListener('abort',onAbort,{once:true});
  timer=setTimeout(()=>finish('COMPLETED',null),seconds*1000);
  if(signal?.aborted)onAbort();
 });
}
