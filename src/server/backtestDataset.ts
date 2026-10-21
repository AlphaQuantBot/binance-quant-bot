import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import {backtestEmaCross} from './emaCrossBacktest';
export type BacktestDataset={inputHash:string;serverTime:number;evaluationTime:number;raw:unknown};
export function validateBacktestDataset(dataset:BacktestDataset){
 if(!dataset||!Number.isSafeInteger(dataset.serverTime)||!Number.isSafeInteger(dataset.evaluationTime)||dataset.serverTime<dataset.evaluationTime||!/^[a-f0-9]{64}$/.test(dataset.inputHash))throw Error('BACKTEST_DATASET_INVALID');
 const result=backtestEmaCross(dataset.raw,dataset.evaluationTime,{feeBps:0,slippageBps:0});
 if(result.inputHash!==dataset.inputHash)throw Error('BACKTEST_DATASET_HASH_MISMATCH');
 return result;
}
function stored(row:{input_hash:string;server_time:number;evaluation_time:number;raw_json:string}):BacktestDataset{
 const dataset={inputHash:row.input_hash,serverTime:row.server_time,evaluationTime:row.evaluation_time,raw:JSON.parse(row.raw_json)};
 validateBacktestDataset(dataset);return dataset;
}
/** Append-only content-addressed public market data. No account or order journal is opened. */
export function captureBacktestDataset(file:string,raw:unknown,serverTime:number,evaluationTime=serverTime,expectedHash?:string){
 const result=backtestEmaCross(raw,evaluationTime,{feeBps:0,slippageBps:0}),payload=JSON.stringify(raw);
 const candidate={inputHash:result.inputHash,serverTime,evaluationTime,raw};validateBacktestDataset(candidate);
 if(expectedHash!==undefined&&expectedHash!==result.inputHash)throw Error('BACKTEST_DATASET_HASH_MISMATCH');
 fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});
 const db=new DatabaseSync(file);
 try{
  db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=0;');
  const mode=db.prepare('PRAGMA journal_mode').get() as {journal_mode:string},sync=db.prepare('PRAGMA synchronous').get() as {synchronous:number};
  if(mode.journal_mode!=='wal'||sync.synchronous!==2)throw Error('BACKTEST_DATASET_STORAGE_FAILED');
  db.exec('CREATE TABLE IF NOT EXISTS backtest_datasets(input_hash TEXT PRIMARY KEY,server_time INTEGER NOT NULL,evaluation_time INTEGER NOT NULL,raw_json TEXT NOT NULL) STRICT; BEGIN IMMEDIATE;');
  try{
   const existing=db.prepare('SELECT * FROM backtest_datasets WHERE input_hash=?').get(result.inputHash) as {input_hash:string;server_time:number;evaluation_time:number;raw_json:string}|undefined;
   if(existing){
    if(existing.raw_json!==payload)throw Error('BACKTEST_DATASET_INVALID');
    const dataset=stored(existing);db.exec('COMMIT');return dataset;
   }
   db.prepare('INSERT INTO backtest_datasets VALUES(?,?,?,?)').run(result.inputHash,serverTime,evaluationTime,payload);
   db.exec('COMMIT');return {inputHash:result.inputHash,serverTime,evaluationTime,raw:structuredClone(raw)};
  }catch(error){try{db.exec('ROLLBACK');}catch{}throw error;}
 }finally{db.close();}
}
export function readBacktestDataset(file:string,inputHash:string){
 if(!/^[a-f0-9]{64}$/.test(inputHash))throw Error('BACKTEST_DATASET_INVALID');
 if(!fs.existsSync(file))throw Error('BACKTEST_DATASET_MISSING');
 const db=new DatabaseSync(file,{readOnly:true});
 try{
  const row=db.prepare('SELECT * FROM backtest_datasets WHERE input_hash=?').get(inputHash) as {input_hash:string;server_time:number;evaluation_time:number;raw_json:string}|undefined;
  if(!row)throw Error('BACKTEST_DATASET_MISSING');
  return stored(row);
 }finally{db.close();}
}
