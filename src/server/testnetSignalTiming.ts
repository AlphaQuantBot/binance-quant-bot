export type SignalSessionObservation = {
 candleCloseTime:number;
 signal:string;
 recorded:boolean;
 missedCandles:number;
};
/** Server-minute scheduling; no exchange or order capability. */
export function nextSignalDelay(serverTime:number, clockReceivedAt:number, monotonicNow:number) {
 if (!Number.isSafeInteger(serverTime) || serverTime <= 0 ||
     !Number.isFinite(clockReceivedAt) || clockReceivedAt < 0 ||
     !Number.isFinite(monotonicNow) || monotonicNow < clockReceivedAt) throw Error('SIGNAL_CLOCK_INVALID');
 // A two-second publication margin after the next server minute. Subtract work
 // already spent on klines/SQLite/output instead of adding 60s after each read.
 const target = (Math.floor(serverTime / 60000) + 1) * 60000 + 2000;
 return Math.max(0, Math.ceil(target - serverTime - (monotonicNow - clockReceivedAt)));
}
export function summarizeSignalSession(observations:readonly SignalSessionObservation[], requestedCycles:number, state:string) {
 const unique = new Map<number,SignalSessionObservation>();
 let duplicateObservations = 0;
 for (const observation of observations) {
  if (unique.has(observation.candleCloseTime)) duplicateObservations++;
  else unique.set(observation.candleCloseTime, observation);
 }
 const rows = [...unique.values()].sort((a,b) => a.candleCloseTime - b.candleCloseTime);
 let missedWithinSession = 0, gapEventsWithinSession = 0;
 for (let i = 1; i < rows.length; i++) {
  const missing = Math.max(0, (rows[i].candleCloseTime - rows[i-1].candleCloseTime) / 60000 - 1);
  if (missing) { missedWithinSession += missing; gapEventsWithinSession++; }
 }
 return {environment:'BINANCE_TESTNET',operation:'READ_ONLY_SIGNAL_SESSION_SUMMARY',state,
  requestedCycles,completedCycles:observations.length,uniqueCandles:rows.length,
  newlyRecorded:observations.filter(o=>o.recorded).length,duplicateObservations,
  signals:{BUY_CROSS:rows.filter(o=>o.signal==='BUY_CROSS').length,
   SELL_CROSS:rows.filter(o=>o.signal==='SELL_CROSS').length,
   HOLD:rows.filter(o=>o.signal==='HOLD').length},
  firstCandleCloseTime:rows[0]?.candleCloseTime??null,lastCandleCloseTime:rows.at(-1)?.candleCloseTime??null,
  missedBeforeSession:observations[0]?.missedCandles??0,missedWithinSession,gapEventsWithinSession,
  continuousObservedSession:rows.length>=2 && missedWithinSession===0,
  ordersSubmitted:0,automaticTradingEnabled:false};
}
