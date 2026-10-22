import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {calculateEMA} from '../utils/cryptoMath';
export const signalStrategy='EMA20_50_CROSS_1M_V1';
/** Fixed public GET endpoints only. This reader has no credentials or order capability. */
export async function readSignalCandles(fetcher:typeof fetch=fetch){
 async function get(resource:string){
  const response=await fetcher('https://testnet.binance.vision/api/v3/'+resource,{method:'GET',redirect:'error',signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw Error([418,429].includes(response.status)?'SIGNAL_RATE_LIMITED':response.status===451?'SIGNAL_LOCATION_RESTRICTED':'SIGNAL_READ_FAILED');
  return response.json();
 }
 const clockLocalStartedAt=Date.now(),start=performance.now(),clock=await get('time');
 const clockReceivedAt=performance.now(),clockLocalReceivedAt=Date.now();
 if(!Number.isSafeInteger(clock?.serverTime)||clock.serverTime<=0)throw Error('SIGNAL_CLOCK_INVALID');
 const endTime=Math.floor(clock.serverTime/60000)*60000-1;
 const raw=await get('klines?symbol=BTCUSDT&interval=1m&limit=120&endTime='+endTime);
 if(performance.now()-start>15000)throw Error('SIGNAL_READ_STALE');
 return {raw,serverTime:clock.serverTime,clockReceivedAt,clockStartedAt:start,clockLocalStartedAt,clockLocalReceivedAt};
}
export function evaluateSignal(raw:unknown,serverTime:number){
 if(!Number.isSafeInteger(serverTime)||serverTime<=0||!Array.isArray(raw)||raw.length!==120)throw Error('SIGNAL_CANDLES_INVALID');
 let previous=-1;
 const candles=raw.map(row=>{
  if(!Array.isArray(row)||row.length<7)throw Error('SIGNAL_CANDLES_INVALID');
  const [time,o,h,l,c,v,closeTime]=row;
  if(!Number.isSafeInteger(time)||time<=0||time%60000!==0||!Number.isSafeInteger(closeTime)||closeTime!==time+59999||closeTime>=serverTime||(previous!==-1&&time!==previous+60000))throw Error('SIGNAL_CANDLE_TIMING_INVALID');
  const values=[o,h,l,c,v].map(x=>typeof x==='string'&&/^\d+(\.\d+)?$/.test(x)?Number(x):NaN);
  const [open,high,low,close,volume]=values;
  if(!values.every(Number.isFinite)||low<=0||volume<0||low>Math.min(open,close)||high<Math.max(open,close))throw Error('SIGNAL_CANDLES_INVALID');
  previous=time;return {time,open,high,low,close,volume,closeTime};
 });
 const last=candles.at(-1)!;
 if(last.time!==Math.floor(serverTime/60000)*60000-60000)throw Error('SIGNAL_CANDLES_STALE');
 const prices=candles.map(c=>c.close),fast=calculateEMA(prices,20),slow=calculateEMA(prices,50),n=prices.length-1;
 const signal=fast[n]>slow[n]&&fast[n-1]<=slow[n-1]?'BUY_CROSS':fast[n]<slow[n]&&fast[n-1]>=slow[n-1]?'SELL_CROSS':'HOLD';
 return {environment:'BINANCE_TESTNET',operation:'READ_ONLY_SIGNAL_OBSERVATION',strategy:signalStrategy,symbol:'BTCUSDT',interval:'1m',candleCount:120,candleCloseTime:last.closeTime,close:last.close,ema20:fast[n],ema50:slow[n],signal,source:'BINANCE_TESTNET_REST',closedCandlesOnly:true,ordersSubmitted:0,automaticTradingEnabled:false,inputHash:createHash('sha256').update(JSON.stringify(candles)).digest('hex')};
}
export class SignalObservationJournal{
 private db:DatabaseSync;
 constructor(file:string){
  fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});this.db=new DatabaseSync(file);
  this.db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=0; CREATE TABLE IF NOT EXISTS signals(strategy TEXT NOT NULL,close_time INTEGER NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(strategy,close_time)) STRICT;');
 }
 record(observation:ReturnType<typeof evaluateSignal>){
  this.db.exec('BEGIN IMMEDIATE');try{
   const row=this.db.prepare('SELECT payload FROM signals WHERE strategy=? AND close_time=?').get(signalStrategy,observation.candleCloseTime) as {payload:string}|undefined;
   if(row&&row.payload!==JSON.stringify(observation))throw Error('SIGNAL_HISTORY_CHANGED');
   const latest=this.db.prepare('SELECT MAX(close_time) AS time FROM signals WHERE strategy=?').get(signalStrategy) as {time:number|null};
   if(!row&&latest.time!==null&&observation.candleCloseTime<latest.time)throw Error('SIGNAL_TIME_REGRESSED');
   if(!row)this.db.prepare('INSERT INTO signals VALUES(?,?,?)').run(signalStrategy,observation.candleCloseTime,JSON.stringify(observation));
   const gap=latest.time!==null&&observation.candleCloseTime>latest.time+60000;
   this.db.exec('COMMIT');return {...observation,recorded:!row,observationGap:gap,missedCandles:gap?(observation.candleCloseTime-latest.time!)/60000-1:0};
  }catch(e){this.db.exec('ROLLBACK');throw e;}
 }
 close(){this.db.close();}
}
