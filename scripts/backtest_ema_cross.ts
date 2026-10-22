import {backtestEmaCross,readBacktestCandles,validateBacktestCosts} from '../src/server/emaCrossBacktest';
async function main(){
 const fee=process.argv[2],slippage=process.argv[3];
 if(process.argv.length!==4||!/^\d{1,4}$/.test(fee??'')||!/^\d{1,4}$/.test(slippage??''))throw Error('BACKTEST_COST_ASSUMPTIONS_REQUIRED');
 const costs={feeBps:Number(fee),slippageBps:Number(slippage)};validateBacktestCosts(costs);
 const sample=await readBacktestCandles();
 console.log(JSON.stringify(backtestEmaCross(sample.raw,sample.serverTime,costs),null,2));
}
main().catch(error=>{
 const allowed=['BACKTEST_COST_ASSUMPTIONS_REQUIRED','BACKTEST_READ_FAILED','BACKTEST_RATE_LIMITED','BACKTEST_LOCATION_RESTRICTED','BACKTEST_RESPONSE_INVALID',
  'BACKTEST_CLOCK_INVALID','BACKTEST_READ_STALE','BACKTEST_CANDLES_INVALID','BACKTEST_ACCOUNTING_INVALID','SIGNAL_CANDLES_INVALID','SIGNAL_CANDLE_TIMING_INVALID','SIGNAL_CANDLES_STALE','INVALID_DECIMAL'];
 const code=error instanceof Error&&allowed.includes(error.message)?error.message:'BACKTEST_UNCONFIRMED';
 console.error(JSON.stringify({environment:'BINANCE_TESTNET',operation:'READ_ONLY_EMA_BACKTEST',code,simulationOnly:true,
  executionAuthorized:false,ordersSubmitted:0,automaticTradingEnabled:false},null,2));process.exitCode=1;
});
