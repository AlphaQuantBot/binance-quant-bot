import {units} from './exactDecimal';
import type {ExecutionTrade} from './tradeSettlement';
export type HistoricalTrade=ExecutionTrade&{time:number};
export type TradeHistoryWindow={environment:'BINANCE_TESTNET';accountId:string;symbol:string;startTime:number;endTime:number;observedAt:number;requestCount:number;trades:HistoricalTrade[];fullAccountCoverage:false;dailyRiskAuthorized:false};
function id(v:unknown){if(typeof v==='number'&&Number.isSafeInteger(v)&&v>=0)return String(v);if(typeof v==='string'&&/^(0|[1-9]\d{0,29})$/.test(v))return v;throw Error('UNSAFE_HISTORY_ID');}
/** Split saturated inclusive time windows; never advance from a potentially truncated recent page. */
export async function backfillTrades(read:(params:{symbol:string;startTime:string;endTime:string;limit:string})=>Promise<unknown>,accountId:string,symbol:string,startTime:number,endTime:number,now=Date.now):Promise<TradeHistoryWindow>{
 const startedAt=now();
 if(!Number.isSafeInteger(startedAt)||startedAt<=0)throw Error('INVALID_HISTORY_CLOCK');
 if(!/^testnet_[a-f0-9]{24}$/.test(accountId)||!/^[A-Z0-9]{5,24}$/.test(symbol)||!Number.isSafeInteger(startTime)||!Number.isSafeInteger(endTime)||startTime<=0||endTime<startTime||endTime-startTime>86400000||endTime>startedAt)throw Error('INVALID_HISTORY_WINDOW');
 const queue:Array<[number,number]>=[[startTime,endTime]],trades=new Map<string,HistoricalTrade>();let requestCount=0;
 while(queue.length){
  if(requestCount>=64)throw Error('HISTORY_REQUEST_BUDGET_EXCEEDED');
  const [start,end]=queue.pop()!;requestCount++;
  const rows=await read({symbol,startTime:String(start),endTime:String(end),limit:'1000'});
  if(!Array.isArray(rows)||rows.length>1000)throw Error('INVALID_HISTORY_RESPONSE');
  const page:HistoricalTrade[]=[],seen=new Set<string>();
  for(const t of rows){
   if(!t||t.symbol!==symbol||typeof t.isBuyer!=='boolean'||!Number.isSafeInteger(t.time)||t.time<start||t.time>end||!/^[A-Z0-9]{1,24}$/.test(t.commissionAsset)||units(t.qty)<=0n||units(t.quoteQty)<=0n||units(t.price)<=0n)throw Error('INVALID_HISTORY_TRADE');units(t.commission);
   const tradeId=id(t.id);if(seen.has(tradeId))throw Error('DUPLICATE_HISTORY_TRADE');seen.add(tradeId);
   page.push({tradeId,orderId:id(t.orderId),symbol,side:t.isBuyer?'BUY':'SELL',quantity:t.qty,quoteQuantity:t.quoteQty,commission:t.commission,commissionAsset:t.commissionAsset,time:t.time});
  }
  if(rows.length===1000){
   if(start===end)throw Error('HISTORY_TIMESTAMP_SATURATED');
   const mid=start+Math.floor((end-start)/2);queue.push([mid+1,end],[start,mid]);continue;
  }
  for(const t of page){if(trades.has(t.tradeId))throw Error('HISTORY_ID_REUSED');trades.set(t.tradeId,t);}
  if(trades.size>20000)throw Error('HISTORY_TRADE_BUDGET_EXCEEDED');
 }
 const observedAt=now();if(!Number.isSafeInteger(observedAt)||observedAt<startedAt)throw Error('HISTORY_CLOCK_REGRESSED');
 return {environment:'BINANCE_TESTNET',accountId,symbol,startTime,endTime,observedAt,requestCount,trades:[...trades.values()].sort((a,b)=>a.time-b.time||(BigInt(a.tradeId)<BigInt(b.tradeId)?-1:1)),fullAccountCoverage:false,dailyRiskAuthorized:false};
}
