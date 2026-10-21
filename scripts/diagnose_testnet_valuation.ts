import {normalizeBalances} from '../src/server/accountSnapshot';
import {diagnoseValuationMarkets} from '../src/server/valuationDiagnostics';
async function main(){
 const assets=process.argv.slice(2);
 if(!assets.length||assets.length>1000||new Set(assets).size!==assets.length)throw Error('INVALID_DIAGNOSTIC_ASSETS');
 normalizeBalances(assets.map(asset=>({asset,free:'0',locked:'0'})));
 async function read(endpoint:string){
  const r=await fetch('https://testnet.binance.vision/api/v3/'+endpoint,{method:'GET',redirect:'error',signal:AbortSignal.timeout(12000)});
  if(!r.ok)throw Error(r.status===451?'EXCHANGE_LOCATION_RESTRICTED':'PUBLIC_HTTP_UNCONFIRMED');
  return r.json();
 }
 const info=await read('exchangeInfo'),books=await read('ticker/bookTicker');
 console.log(JSON.stringify({environment:'BINANCE_TESTNET',operation:'READ_ONLY_VALUATION_DIAGNOSTICS',observedAt:Date.now(),assets:diagnoseValuationMarkets(info,books,assets),tradingEnabled:false},null,2));
}
main().catch(error=>{
 const safe=['INVALID_DIAGNOSTIC_ASSETS','INVALID_BALANCE_ASSET','EXCHANGE_LOCATION_RESTRICTED','PUBLIC_HTTP_UNCONFIRMED','INVALID_VALUATION_MARKETS','INVALID_VALUATION_BOOKS'];
 console.error(JSON.stringify({operation:'READ_ONLY_VALUATION_DIAGNOSTICS',state:'FAIL',code:error instanceof Error&&safe.includes(error.message)?error.message:'DIAGNOSTICS_UNCONFIRMED',tradingEnabled:false}));process.exitCode=1;
});
