import {createBinanceTestnetAdapter} from './binanceTestnetAdapter';
type Check={name:string;state:'PASS'|'FAIL'|'BLOCKED'|'SKIPPED';code:string;httpStatus?:number};
/** Actual fixed-host public/authenticated read checks only. Never places an order. */
export async function testnetPreflight(options:{apiKey?:string;secretKey?:string;symbol?:string;fetcher?:typeof fetch;now?:()=>number}={}){
 const symbol=options.symbol??'BTCUSDT';if(!/^[A-Z0-9]{5,24}$/.test(symbol))throw Error('INVALID_PREFLIGHT_SYMBOL');
 const fetcher=options.fetcher??fetch,now=options.now??Date.now,checks:Check[]=[];
 const credentialsConfigured=!!options.apiKey&&!!options.secretKey;
 const result=()=>({environment:'BINANCE_TESTNET',observedAt:now(),symbol,credentialsConfigured,checks,publicReady:checks.filter(c=>['ping','time','exchangeInfo'].includes(c.name)).length===3&&checks.filter(c=>['ping','time','exchangeInfo'].includes(c.name)).every(c=>c.state==='PASS'),authenticatedReady:checks.some(c=>c.name==='account'&&c.state==='PASS')&&checks.some(c=>c.name==='commission'&&c.state==='PASS'),tradingEnabled:false});
 for(const [name,path] of [['ping','/api/v3/ping'],['time','/api/v3/time'],['exchangeInfo','/api/v3/exchangeInfo?symbol='+symbol]]){
  try{
   const start=now();const r=await fetcher('https://testnet.binance.vision'+path,{method:'GET',redirect:'error',signal:AbortSignal.timeout(12000)});
   if(!r.ok){checks.push({name,state:r.status===451?'BLOCKED':'FAIL',code:r.status===451?'EXCHANGE_LOCATION_RESTRICTED':'PUBLIC_HTTP_ERROR',httpStatus:r.status});break;}
   let b:any;try{b=await r.json();}catch{throw Error('INVALID_PUBLIC_RESPONSE');}
   if(!b||typeof b!=='object'||Array.isArray(b)||typeof b.code==='number'&&b.code<0)throw Error('INVALID_PUBLIC_RESPONSE');
   if(name==='time'&&(!Number.isSafeInteger(b.serverTime)||b.serverTime<=0||Math.abs(b.serverTime-(start+now())/2)>4000))throw Error('CLOCK_OR_SERVER_TIME_INVALID');
   if(name==='exchangeInfo'&&(!Array.isArray(b.symbols)||b.symbols.length!==1||b.symbols[0]?.symbol!==symbol||b.symbols[0]?.status!=='TRADING'||b.symbols[0]?.isSpotTradingAllowed!==true))throw Error('SYMBOL_UNAVAILABLE');
   checks.push({name,state:'PASS',code:'READ_CONFIRMED',httpStatus:r.status});
  }catch(e){const code=e instanceof Error&&['INVALID_PUBLIC_RESPONSE','CLOCK_OR_SERVER_TIME_INVALID','SYMBOL_UNAVAILABLE'].includes(e.message)?e.message:'NETWORK_UNCONFIRMED';checks.push({name,state:'FAIL',code});break;}
 }
 for(const name of ['ping','time','exchangeInfo'])if(!checks.some(c=>c.name===name))checks.push({name,state:'SKIPPED',code:'PUBLIC_PREFLIGHT_FAILED'});
 if(!checks.every(c=>c.state==='PASS')){checks.push({name:'account',state:'SKIPPED',code:'PUBLIC_PREFLIGHT_FAILED'},{name:'commission',state:'SKIPPED',code:'PUBLIC_PREFLIGHT_FAILED'});return result();}
 if(!credentialsConfigured){checks.push({name:'account',state:'SKIPPED',code:'TESTNET_CREDENTIALS_MISSING'},{name:'commission',state:'SKIPPED',code:'TESTNET_CREDENTIALS_MISSING'});return result();}
 let adapter:ReturnType<typeof createBinanceTestnetAdapter>;
 try{adapter=createBinanceTestnetAdapter({apiKey:options.apiKey!,secretKey:options.secretKey!,fetcher,now});}catch{checks.push({name:'account',state:'FAIL',code:'INVALID_TESTNET_CREDENTIALS'},{name:'commission',state:'SKIPPED',code:'ACCOUNT_CHECK_FAILED'});return result();}
 for(const name of ['account','commission']){
  try{if(name==='account')await adapter.accountSnapshot();else await adapter.commissionRates(symbol);checks.push({name,state:'PASS',code:'AUTHENTICATED_READ_CONFIRMED'});}
  catch(e){const allowed=['EXCHANGE_LOCATION_RESTRICTED','EXCHANGE_COOLDOWN','EXCHANGE_REQUEST_UNCONFIRMED','EXCHANGE_TRANSPORT_UNKNOWN','EXCHANGE_RESPONSE_UNKNOWN','INVALID_EXCHANGE_RESPONSE','INVALID_SPOT_ACCOUNT','ACCOUNT_CAN_TRADE_INVALID','ACCOUNT_TYPE_UNSUPPORTED','ACCOUNT_PERMISSIONS_MISSING','ACCOUNT_SPOT_PERMISSION_MISSING','INVALID_BALANCES','INVALID_BALANCE_ASSET','INVALID_DECIMAL','INVALID_OPEN_ORDERS','UNSAFE_EXCHANGE_ID','INVALID_OPEN_ORDER','INVALID_OPEN_ORDER_TOTALS','DUPLICATE_OPEN_ORDER','ACCOUNT_CHANGED_DURING_READ','ACCOUNT_SNAPSHOT_STALE','ACCOUNT_SNAPSHOT_MISMATCH','COMMISSION_IDENTITY_MISMATCH','COMMISSION_COMPONENT_REQUIRED','UNSUPPORTED_COMMISSION_RATE','INVALID_COMMISSION_DISCOUNT','COMMISSION_DISCOUNT_MISSING','COMMISSION_DISCOUNT_FLAGS_INVALID','COMMISSION_DISCOUNT_ASSET_TYPE_INVALID','COMMISSION_DISCOUNT_ASSET_EMPTY','COMMISSION_DISCOUNT_ASSET_UNSUPPORTED','COMMISSION_DISCOUNT_RATE_UNSUPPORTED','STALE_COMMISSION_RATES'];const code=e instanceof Error&&allowed.includes(e.message)?e.message:'AUTHENTICATED_READ_UNCONFIRMED';checks.push({name,state:code==='EXCHANGE_LOCATION_RESTRICTED'?'BLOCKED':'FAIL',code});break;}
 }
 if(!checks.some(c=>c.name==='commission'))checks.push({name:'commission',state:'SKIPPED',code:'ACCOUNT_CHECK_FAILED'});
 return result();
}
