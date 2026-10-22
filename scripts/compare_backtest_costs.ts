import path from 'node:path';
import {readBacktestCandles} from '../src/server/emaCrossBacktest';
import {captureBacktestDataset,readBacktestDataset} from '../src/server/backtestDataset';
import {parseBacktestScenarios,compareBacktestScenarios} from '../src/server/backtestComparison';
async function main(){
 const mode=process.argv[2];
 if(mode!=='capture'&&mode!=='replay'&&mode!=='capture-at')throw Error('BACKTEST_COMPARISON_ARGUMENTS_INVALID');
 const inputHash=mode==='replay'?process.argv[3]:mode==='capture-at'?process.argv[4]:undefined;
 const endTime=mode==='capture-at'?Number(process.argv[3]):undefined;
 if(mode==='capture-at'&&(typeof endTime!=='number'||!Number.isSafeInteger(endTime)||endTime<=0||endTime%60000!==59999||!/^[a-f0-9]{64}$/.test(inputHash??'')))throw Error('BACKTEST_COMPARISON_ARGUMENTS_INVALID');
 if(mode==='replay'&&!/^[a-f0-9]{64}$/.test(inputHash??''))throw Error('BACKTEST_DATASET_INVALID');
 // Validate every cost scenario before any network or storage operation.
 const costs=parseBacktestScenarios(process.argv.slice(mode==='capture-at'?5:mode==='replay'?4:3));
 const file=path.resolve('.testnet_backtests/datasets.sqlite');
 let dataset;
 if(mode!=='replay'){
  const sample=await readBacktestCandles(undefined,undefined,endTime);dataset=captureBacktestDataset(file,sample.raw,sample.serverTime,sample.evaluationTime,inputHash);
 }else dataset=readBacktestDataset(file,inputHash!);
 const result=compareBacktestScenarios(dataset,costs);
 console.log(JSON.stringify({...result,datasetPersisted:true,dataAccess:mode==='replay'?'LOCAL_REPLAY_NO_NETWORK':'PUBLIC_FETCH_ONCE'},null,2));
}
main().catch(error=>{
 const allowed=['BACKTEST_COMPARISON_ARGUMENTS_INVALID','BACKTEST_COMPARISON_COSTS_REQUIRED','BACKTEST_DATASET_INVALID','BACKTEST_DATASET_HASH_MISMATCH','BACKTEST_WINDOW_INVALID','BACKTEST_DATASET_MISSING','BACKTEST_DATASET_STORAGE_FAILED',
  'BACKTEST_COST_ASSUMPTIONS_REQUIRED','BACKTEST_READ_FAILED','BACKTEST_RATE_LIMITED','BACKTEST_LOCATION_RESTRICTED','BACKTEST_RESPONSE_INVALID','BACKTEST_CLOCK_INVALID','BACKTEST_READ_STALE',
  'BACKTEST_CANDLES_INVALID','BACKTEST_ACCOUNTING_INVALID','SIGNAL_CANDLES_INVALID','SIGNAL_CANDLE_TIMING_INVALID','SIGNAL_CANDLES_STALE','INVALID_DECIMAL'];
 const code=error instanceof Error&&allowed.includes(error.message)?error.message:'BACKTEST_COMPARISON_UNCONFIRMED';
 console.error(JSON.stringify({environment:'BINANCE_TESTNET',operation:'READ_ONLY_BACKTEST_COST_COMPARISON',code,simulationOnly:true,
  executionAuthorized:false,ordersSubmitted:0,automaticTradingEnabled:false},null,2));process.exitCode=1;
});
