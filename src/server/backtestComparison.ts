import {backtestEmaCross,validateBacktestCosts,type BacktestCosts} from './emaCrossBacktest';
import {validateBacktestDataset,type BacktestDataset} from './backtestDataset';
export function parseBacktestScenarios(tokens:readonly string[]):BacktestCosts[]{
 if(tokens.length<2||tokens.length>8)throw Error('BACKTEST_COMPARISON_COSTS_REQUIRED');
 const seen=new Set<string>();
 return tokens.map(token=>{
  if(!/^(0|[1-9][0-9]{0,3}):(0|[1-9][0-9]{0,3})$/.test(token)||seen.has(token))throw Error('BACKTEST_COMPARISON_COSTS_REQUIRED');
  seen.add(token);const [feeBps,slippageBps]=token.split(':').map(Number);
  const costs={feeBps,slippageBps};validateBacktestCosts(costs);return costs;
 });
}
export function compareBacktestScenarios(dataset:BacktestDataset,costs:readonly BacktestCosts[]){
 if(costs.length<2||costs.length>8)throw Error('BACKTEST_COMPARISON_COSTS_REQUIRED');
 const seen=new Set<string>();
 for(const cost of costs){validateBacktestCosts(cost);const key=cost.feeBps+':'+cost.slippageBps;if(seen.has(key))throw Error('BACKTEST_COMPARISON_COSTS_REQUIRED');seen.add(key);}
 const frozen=structuredClone(dataset),baseline=validateBacktestDataset(frozen);
 const scenarios=costs.map(cost=>{
  const result=backtestEmaCross(frozen.raw,frozen.evaluationTime,cost);
  if(result.inputHash!==frozen.inputHash||JSON.stringify(result.signals)!==JSON.stringify(baseline.signals))throw Error('BACKTEST_DATASET_INVALID');
  return {feeBpsPerSide:cost.feeBps,adverseSlippageBpsPerSide:cost.slippageBps,
   closedRoundTrips:result.closedRoundTrips,netWinningRoundTrips:result.netWinningRoundTrips,netLosingRoundTrips:result.netLosingRoundTrips,
   netBreakevenRoundTrips:result.netBreakevenRoundTrips,assumedFeesUSDT:result.assumedFeesUSDT,
   realizedNetResultUSDT:result.realizedNetResultUSDT,unrealizedCloseMarkedResultUSDT:result.unrealizedCloseMarkedResultUSDT,
   finalCloseMarkedEquityUSDT:result.finalCloseMarkedEquityUSDT,totalCloseMarkedResultUSDT:result.totalCloseMarkedResultUSDT,
   modeledOwnedBTC:result.modeledOwnedBTC,maxCloseMarkedDrawdownUSDT:result.maxCloseMarkedDrawdownUSDT};
 });
 return {environment:'BINANCE_TESTNET',operation:'READ_ONLY_BACKTEST_COST_COMPARISON',simulationOnly:true,
  strategy:baseline.strategy,symbol:baseline.symbol,interval:baseline.interval,datasetId:frozen.inputHash,inputHash:frozen.inputHash,
  sameInputVerified:true,observedServerTime:frozen.serverTime,evaluationTime:frozen.evaluationTime,candleCount:baseline.candleCount,warmupCandles:baseline.warmupCandles,evaluatedCandles:baseline.evaluatedCandles,
  firstCandleCloseTime:baseline.firstCandleCloseTime,lastCandleCloseTime:baseline.lastCandleCloseTime,
  signals:baseline.signals,modelAssumptions:{...baseline.assumptions,feeBpsPerSide:undefined,adverseSlippageBpsPerSide:undefined},
  scenarios,openPositionForcedClosed:false,executionAuthorized:false,ordersSubmitted:0,automaticTradingEnabled:false};
}
