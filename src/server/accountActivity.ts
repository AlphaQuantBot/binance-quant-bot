import {units,decimal} from './exactDecimal';
import {normalizeBalances,type Balance} from './accountSnapshot';
import {validateSettlement,type ExecutionTrade} from './tradeSettlement';
import type {Record as OrderRecord} from './orderExecution';
export type ActivityTrade=ExecutionTrade&{baseAsset:string;quoteAsset:string};
export type ActivitySnapshot={trades:ActivityTrade[];unresolved:string[]};
const key=(t:ActivityTrade)=>t.symbol+':'+t.tradeId;
const signed=(n:bigint)=>n<0n?'-'+decimal(-n):decimal(n);
export function validateActivity(s:ActivitySnapshot){
 if(!s||!Array.isArray(s.trades)||!Array.isArray(s.unresolved)||s.unresolved.some(x=>typeof x!=='string'))throw Error('INVALID_ACTIVITY_SNAPSHOT');
 const ids=new Set<string>();
 for(const t of s.trades){
  if(!t||!/^[A-Z0-9]{1,24}$/.test(t.baseAsset)||!/^[A-Z0-9]{1,24}$/.test(t.quoteAsset)||t.baseAsset===t.quoteAsset||t.baseAsset+t.quoteAsset!==t.symbol||!/^\d{1,30}$/.test(t.tradeId)||!/^\d{1,30}$/.test(t.orderId)||!['BUY','SELL'].includes(t.side)||!/^[A-Z0-9]{1,24}$/.test(t.commissionAsset)||units(t.quantity)<=0n||units(t.quoteQuantity)<=0n)throw Error('INVALID_ACTIVITY_TRADE');units(t.commission);
  if(ids.has(key(t)))throw Error('DUPLICATE_ACTIVITY_TRADE');ids.add(key(t));
 }
}
export function activityFromOrders(rows:OrderRecord[],pairs:Array<{symbol:string;baseAsset:string;quoteAsset:string}>,accountId:string):ActivitySnapshot{
 const trades:ActivityTrade[]=[],unresolved:string[]=[];const seen=new Set<string>();
 for(const r of rows){
  if(r.accountId!==accountId||seen.has(r.requestId))throw Error('ACTIVITY_ORDER_ACCOUNT_MISMATCH');seen.add(r.requestId);
  const e=r.confirmation;
  if(['UNKNOWN','SUBMITTING'].includes(r.status)||r.cancelState&&r.cancelState!=='RESOLVED')unresolved.push(r.requestId);
  if(!e||!e.settlement){unresolved.push(r.requestId);continue;}
  if((r.status!==e.status&&r.status!=='UNKNOWN')||e.symbol!==r.symbol||e.clientOrderId!==r.clientOrderId||e.side!==r.side||units(e.executedQty)>units(r.quantity))throw Error('ACTIVITY_ORDER_IDENTITY_MISMATCH');
  validateSettlement(e,e.settlement);
  const found=pairs.filter(p=>p.symbol===r.symbol);if(found.length!==1)throw Error('ACTIVITY_PAIR_REQUIRED');
  for(const t of e.settlement.trades)trades.push({...t,baseAsset:found[0].baseAsset,quoteAsset:found[0].quoteAsset});
 }
 const result={trades:trades.sort((a,b)=>key(a).localeCompare(key(b))),unresolved:[...new Set(unresolved)].sort()};validateActivity(result);return result;
}
export function reconcileActivity(before:Balance[],after:Balance[],previous:ActivitySnapshot,current:ActivitySnapshot){
 const oldBalances=normalizeBalances(before),newBalances=normalizeBalances(after);validateActivity(previous);validateActivity(current);
 const next=new Map(current.trades.map(t=>[key(t),t])),old=new Set(previous.trades.map(key));
 for(const t of previous.trades)if(JSON.stringify(next.get(key(t)))!==JSON.stringify(t))throw Error('ACTIVITY_HISTORY_REMOVED_OR_CHANGED');
 const expected=new Map<string,bigint>();const add=(asset:string,n:bigint)=>expected.set(asset,(expected.get(asset)??0n)+n);
 const added=current.trades.filter(t=>!old.has(key(t)));
 for(const t of added){const sign=t.side==='BUY'?1n:-1n;add(t.baseAsset,sign*units(t.quantity));add(t.quoteAsset,-sign*units(t.quoteQuantity));add(t.commissionAsset,-units(t.commission));}
 const total=(rows:Balance[],asset:string)=>{const b=rows.find(x=>x.asset===asset);return b?units(b.free)+units(b.locked):0n;};
 const assets=[...new Set([...oldBalances.map(b=>b.asset),...newBalances.map(b=>b.asset),...expected.keys()])].sort();
 const changes=assets.map(asset=>{const actual=total(newBalances,asset)-total(oldBalances,asset),known=expected.get(asset)??0n;return {asset,actualChange:signed(actual),knownTradeChange:signed(known),unexplainedChange:signed(actual-known)};});
 const unexplained=changes.filter(c=>c.unexplainedChange!=='0');
 return {state:current.unresolved.length?'UNRESOLVED_ORDERS':unexplained.length?'UNEXPLAINED_BALANCE_CHANGE':'MATCHED_KNOWN_ACTIVITY',newTradeCount:added.length,unresolved:current.unresolved,changes,unexplained,externalFlowClassification:'UNVERIFIED',dailyRiskAuthorized:false};
}
