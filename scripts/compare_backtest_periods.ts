import path from 'node:path';
import {readBacktestDataset,captureBacktestDataset} from '../src/server/backtestDataset';
import {readBacktestCandles} from '../src/server/emaCrossBacktest';
import {parseBacktestScenarios} from '../src/server/backtestComparison';
import {compareBacktestPeriods,previousBacktestPeriodEnd} from '../src/server/backtestPeriods';
async function main(){
 const [mode,idsOrAnchor,countOrCost,...rest]=process.argv.slice(2);
 const file=path.resolve('.testnet_backtests/datasets.sqlite');
 if(mode!=='capture'&&mode!=='replay')throw Error('BACKTEST_PERIODS_ARGUMENTS_INVALID');
 const ids=(idsOrAnchor??'').split(',');
 if(ids.some(id=>! /^[a-f0-9]{64}$/.test(id)))throw Error('BACKTEST_PERIODS_ARGUMENTS_INVALID');
 const count=mode==='capture'?Number(countOrCost):ids.length;
 if(!Number.isInteger(count)||count<2||count>5||(mode==='capture'&&ids.length!==1)||new Set(ids).size!==ids.length)throw Error('BACKTEST_PERIODS_ARGUMENTS_INVALID');
 const costs=parseBacktestScenarios(mode==='capture'?rest:[countOrCost,...rest]);
 const datasets=ids.map(id=>readBacktestDataset(file,id));
 if(mode==='capture'){
  while(datasets.length<count){
   const end=previousBacktestPeriodEnd(datasets[datasets.length-1]);
   const sample=await readBacktestCandles(undefined,undefined,end);
   datasets.push(captureBacktestDataset(file,sample.raw,sample.serverTime,sample.evaluationTime));
  }
 }
 const result=compareBacktestPeriods(datasets,costs);
 console.log(JSON.stringify({...result,datasetPersisted:true,dataAccess:mode==='replay'?'LOCAL_REPLAY_NO_NETWORK':'LOCAL_ANCHOR_AND_PUBLIC_HISTORICAL_FETCH',
  replayDatasetIds:result.periods.map(period=>period.datasetId).join(',')},null,2));
}
main().catch(error=>{
 const allowed=/^(BACKTEST_(PERIODS_(INVALID|OVERLAP|ARGUMENTS_INVALID)|DATASET_(INVALID|HASH_MISMATCH|MISSING|STORAGE_FAILED)|COMPARISON_COSTS_REQUIRED|COST_ASSUMPTIONS_REQUIRED|WINDOW_INVALID|READ_FAILED|RATE_LIMITED|LOCATION_RESTRICTED|RESPONSE_INVALID|CLOCK_INVALID|READ_STALE|CANDLES_INVALID|ACCOUNTING_INVALID)|SIGNAL_(CANDLES_INVALID|CANDLE_TIMING_INVALID|CANDLES_STALE)|INVALID_DECIMAL)$/;
 const code=error instanceof Error&&allowed.test(error.message)?error.message:'BACKTEST_PERIOD_COMPARISON_UNCONFIRMED';
 console.error(JSON.stringify({environment:'BINANCE_TESTNET',operation:'READ_ONLY_BACKTEST_PERIOD_COMPARISON',code,simulationOnly:true,executionAuthorized:false,ordersSubmitted:0,automaticTradingEnabled:false},null,2));process.exitCode=1;
});
