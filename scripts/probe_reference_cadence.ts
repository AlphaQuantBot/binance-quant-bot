import {probeReferenceCadence,validateProbeSeconds} from '../src/server/referenceCadenceProbe';
async function main(){
 const args=process.argv.slice(2);if(args.length!==1)throw Error('REFERENCE_PROBE_DURATION_INVALID');
 const seconds=Number(args[0]);validateProbeSeconds(seconds);
 const stop=new AbortController(),interrupt=()=>stop.abort();process.once('SIGINT',interrupt);
 try{console.log(JSON.stringify(await probeReferenceCadence(seconds,undefined,undefined,stop.signal),null,2));}
 finally{process.removeListener('SIGINT',interrupt);}
}
main().catch(error=>{
 const code=error instanceof Error&&error.message==='REFERENCE_PROBE_DURATION_INVALID'?error.message:'REFERENCE_PROBE_UNCONFIRMED';
 console.error(JSON.stringify({environment:'BINANCE_TESTNET',operation:'READ_ONLY_REFERENCE_CADENCE_PROBE',code,
  executionAuthorized:false,ordersSubmitted:0,automaticTradingEnabled:false},null,2));process.exitCode=1;
});
