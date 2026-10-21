import {createHash} from 'node:crypto';
import {units,decimal} from './exactDecimal';
import {evaluateSignal,signalStrategy} from './testnetSignalObserver';
const SCALE=10n**18n,BPS=10000n;
const ceil=(a:bigint,b:bigint)=>(a+b-1n)/b;
const signed=(value:bigint)=>(value<0n?'-':'')+decimal(value<0n?-value:value);
export type BacktestCosts={feeBps:number;slippageBps:number};
export function validateBacktestCosts(costs:BacktestCosts){
 if(!costs||![costs.feeBps,costs.slippageBps].every(n=>Number.isInteger(n)&&n>=0&&n<=1000))throw Error('BACKTEST_COST_ASSUMPTIONS_REQUIRED');
}
export async function readBacktestCandles(fetcher:typeof fetch=fetch,monotonicNow:()=>number=()=>performance.now()){
 const started=monotonicNow();
 async function get(resource:string){
  let response:Response;try{response=await fetcher('https://testnet.binance.vision/api/v3/'+resource,{method:'GET',redirect:'error',signal:AbortSignal.timeout(12000)});}catch{throw Error('BACKTEST_READ_FAILED');}
  if(!response.ok)throw Error([418,429].includes(response.status)?'BACKTEST_RATE_LIMITED':response.status===451?'BACKTEST_LOCATION_RESTRICTED':'BACKTEST_READ_FAILED');
  try{return await response.json();}catch{throw Error('BACKTEST_RESPONSE_INVALID');}
 }
 const clock=await get('time');
 if(!Number.isSafeInteger(clock?.serverTime)||clock.serverTime<=0)throw Error('BACKTEST_CLOCK_INVALID');
 const endTime=Math.floor(clock.serverTime/60000)*60000-1;
 const raw=await get('klines?symbol=BTCUSDT&interval=1m&limit=1000&endTime='+endTime);
 const elapsed=monotonicNow()-started;
 if(!Number.isFinite(elapsed)||elapsed<0||elapsed>15000)throw Error('BACKTEST_READ_STALE');
 if(!Array.isArray(raw)||raw.length!==1000)throw Error('BACKTEST_CANDLES_INVALID');
 return {raw,serverTime:clock.serverTime};
}
/** Isolated research model. No journal, holdings, exchange filters or execution capability. */
export function backtestEmaCross(raw:unknown,serverTime:number,costs:BacktestCosts){
 validateBacktestCosts(costs);
 if(!Array.isArray(raw)||raw.length<120||raw.length>1000)throw Error('BACKTEST_CANDLES_INVALID');
 // Last window validates the final closed minute; rolling windows below validate every earlier candle.
 evaluateSignal(raw.slice(-120),serverTime);
 const observations:ReturnType<typeof evaluateSignal>[]=[];
 for(let index=119;index<raw.length;index++){
  const row=raw[index];if(!Array.isArray(row))throw Error('BACKTEST_CANDLES_INVALID');
  observations.push(evaluateSignal(raw.slice(index-119,index+1),row[6]+1));
 }
 const fee=BigInt(costs.feeBps),slip=BigInt(costs.slippageBps);
 let cash=100n*SCALE,owned=0n,entryCost=0n,totalFees=0n,realized=0n,peak=100n*SCALE,drawdown=0n;
 let pending:'BUY'|'SELL'|undefined,pendingSignalTime=0,closedTrades=0,wins=0,losses=0;
 const executions:{side:string;signalCloseTime:number;modeledOpenTime:number;quantityBTC:string;modeledPriceUSDT:string;principalUSDT:string;assumedFeeUSDT:string}[]=[];
 const signals={BUY_CROSS:0,SELL_CROSS:0,HOLD:0};
 let lastSignal='HOLD';
 for(let index=119;index<raw.length;index++){
  const row=raw[index];
  if(!Array.isArray(row))throw Error('BACKTEST_CANDLES_INVALID');
  // Fill only a signal from the prior CLOSED candle, at this candle's open plus adverse slippage.
  if(pending){
   const opening=units(row[1]);
   if(pending==='BUY'&&owned===0n){
    const price=ceil(opening*(BPS+slip),BPS),budget=cash<25n*SCALE?cash:25n*SCALE;
    // Reserve two quote atomic units for the two upward rounding steps.
    const quantity=budget>2n?(budget-2n)*SCALE*BPS/(price*(BPS+fee)):0n;
    if(quantity>0n){
     const principal=ceil(quantity*price,SCALE),commission=ceil(principal*fee,BPS);
     if(principal+commission>budget)throw Error('BACKTEST_ACCOUNTING_INVALID');
     cash-=principal+commission;owned=quantity;entryCost=principal+commission;totalFees+=commission;
     executions.push({side:'BUY',signalCloseTime:pendingSignalTime,modeledOpenTime:row[0],quantityBTC:decimal(quantity),modeledPriceUSDT:decimal(price),principalUSDT:decimal(principal),assumedFeeUSDT:decimal(commission)});
    }
   }else if(pending==='SELL'&&owned>0n){
    const price=opening*(BPS-slip)/BPS;if(price<=0n)throw Error('BACKTEST_ACCOUNTING_INVALID');
    const principal=owned*price/SCALE,commission=ceil(principal*fee,BPS);
    const net=principal-commission,change=net-entryCost;
    cash+=net;realized+=change;totalFees+=commission;closedTrades++;
    if(change>0n)wins++;else if(change<0n)losses++;
    executions.push({side:'SELL',signalCloseTime:pendingSignalTime,modeledOpenTime:row[0],quantityBTC:decimal(owned),modeledPriceUSDT:decimal(price),principalUSDT:decimal(principal),assumedFeeUSDT:decimal(commission)});
    owned=0n;entryCost=0n;
   }
   pending=undefined;
  }
  const observation=observations[index-119];
  lastSignal=observation.signal;signals[observation.signal as keyof typeof signals]++;
  const mark=units(row[4]),equity=cash+owned*mark/SCALE;
  if(equity>peak)peak=equity;if(peak-equity>drawdown)drawdown=peak-equity;
  if(index<raw.length-1){
   if(observation.signal==='BUY_CROSS'&&owned===0n)pending='BUY';
   if(observation.signal==='SELL_CROSS'&&owned>0n)pending='SELL';
   pendingSignalTime=observation.candleCloseTime;
  }
 }
 const finalMark=units(raw[raw.length-1][4]),openValue=owned*finalMark/SCALE,finalEquity=cash+openValue;
 return {environment:'BINANCE_TESTNET',operation:'READ_ONLY_EMA_BACKTEST',strategy:signalStrategy,symbol:'BTCUSDT',interval:'1m',
  evidence:'HISTORICAL_PUBLIC_TESTNET_CANDLES',simulationOnly:true,persistedResult:false,candleCount:raw.length,warmupCandles:119,evaluatedCandles:raw.length-119,
  firstCandleCloseTime:raw[0][6],lastCandleCloseTime:raw[raw.length-1][6],inputHash:createHash('sha256').update(JSON.stringify(raw)).digest('hex'),
  assumptions:{initialCashUSDT:'100',maxEntrySpendIncludingFeeUSDT:'25',feeBpsPerSide:costs.feeBps,adverseSlippageBpsPerSide:costs.slippageBps,
   feeAsset:'USDT_MODEL_ONLY',fillModel:'NEXT_CANDLE_OPEN_WITH_ADVERSE_SLIPPAGE',quantityPrecision:'18_DECIMAL_MODEL_ONLY',exchangeFiltersApplied:false,liquidityModeled:false,oneShotExecutionPolicyApplied:false,dailyLossLimitModeled:false},
  signals,modeledExecutions:executions,closedRoundTrips:closedTrades,netWinningRoundTrips:wins,netLosingRoundTrips:losses,netBreakevenRoundTrips:closedTrades-wins-losses,
  assumedFeesUSDT:decimal(totalFees),realizedNetResultUSDT:signed(realized),modeledCashUSDT:decimal(cash),modeledOwnedBTC:decimal(owned),
  finalCloseMarkedEquityUSDT:decimal(finalEquity),totalCloseMarkedResultUSDT:signed(finalEquity-100n*SCALE),
  unrealizedCloseMarkedResultUSDT:signed(openValue-entryCost),maxCloseMarkedDrawdownUSDT:decimal(drawdown),
  lastCrossHasNoNextCandle:lastSignal!=='HOLD',openPositionForcedClosed:false,
  executionAuthorized:false,ordersSubmitted:0,automaticTradingEnabled:false};
}
