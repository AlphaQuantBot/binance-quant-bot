import {compareBacktestScenarios} from './backtestComparison';
import {validateBacktestDataset,type BacktestDataset} from './backtestDataset';
import type {BacktestCosts} from './emaCrossBacktest';
export function compareBacktestPeriods(datasets:readonly BacktestDataset[],costs:readonly BacktestCosts[]){
 if(datasets.length<2||datasets.length>5)throw Error('BACKTEST_PERIODS_INVALID');
 const periods=datasets.map(dataset=>compareBacktestScenarios(dataset,costs)).sort((a,b)=>a.firstCandleCloseTime-b.firstCandleCloseTime);
 for(let i=0;i<periods.length;i++){
  if(periods[i].candleCount!==1000)throw Error('BACKTEST_PERIODS_INVALID');
  if(i>0&&periods[i-1].lastCandleCloseTime>=periods[i].firstCandleCloseTime)throw Error('BACKTEST_PERIODS_OVERLAP');
 }
 return {environment:'BINANCE_TESTNET',operation:'READ_ONLY_BACKTEST_PERIOD_COMPARISON',simulationOnly:true,
  strategy:periods[0].strategy,symbol:'BTCUSDT',interval:'1m',periodCount:periods.length,
  independentInitialCashUSDT:'100',positionsCarriedBetweenPeriods:false,combinedPortfolioResultAssessed:false,
  nonOverlappingRawCandlesVerified:true,periods,executionAuthorized:false,ordersSubmitted:0,automaticTradingEnabled:false};
}
export function previousBacktestPeriodEnd(dataset:BacktestDataset){
 const result=validateBacktestDataset(dataset);
 if(result.candleCount!==1000)throw Error('BACKTEST_PERIODS_INVALID');
 // Close times end in 59999; the preceding window ends one minute before the first close.
 const end=result.firstCandleCloseTime-60000;
 if(!Number.isSafeInteger(end)||end<=0||end%60000!==59999)throw Error('BACKTEST_PERIODS_INVALID');
 return end;
}
