import {ReferenceStreamTimeoutError} from '../src/server/testnetReferenceStream';
import {ReferencePriceFreshnessError} from '../src/server/priceReference';
import 'dotenv/config';
import path from 'node:path';
import {observeScopedDecision,decisionObservationErrorCode} from '../src/server/scopedDecisionObservation';
async function main(){
 const file=path.resolve(process.env.APP_TESTNET_SCOPED_JOURNAL??'.testnet_scoped/sandbox.sqlite');
 const sample=await observeScopedDecision(file,process.env.APP_TESTNET_API_KEY??'',process.env.APP_TESTNET_SECRET_KEY??'');
 console.log(JSON.stringify(sample.report,null,2));
 if(sample.report.assessment==='BLOCKED')process.exitCode=1;
}
main().catch(error=>{
 console.error(JSON.stringify({environment:'BINANCE_TESTNET',operation:'READ_ONLY_SCOPED_SIGNAL_DECISION',assessment:'BLOCKED',
  code:decisionObservationErrorCode(error),...(error instanceof ReferenceStreamTimeoutError?{streamDiagnostics:error.streamDiagnostics}:{}),...(error instanceof ReferencePriceFreshnessError?{referenceTiming:error.timing}:{}),executionAuthorized:false,ordersSubmitted:0,automaticTradingEnabled:false},null,2));process.exitCode=1;
});
