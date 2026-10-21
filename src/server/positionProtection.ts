import {decimal,units} from './exactDecimal';
import {validateAccountSnapshot,type AccountSnapshot} from './accountSnapshot';
import {auditProtection,type ProtectionTarget,type ProtectionReader} from './protectionAudit';
export type PositionProtectionPlan={accountId:string; cashAssets:string[]; positions:Array<{positionId:string;baseAsset:string;quoteAsset:string;stop:ProtectionTarget}>};
export async function auditPositions(reader:ProtectionReader&{accountSnapshot():Promise<AccountSnapshot>},input:PositionProtectionPlan,now=Date.now){
  const plan=structuredClone(input);
  if(!plan||typeof plan.accountId!=='string'||!Array.isArray(plan.cashAssets)||!Array.isArray(plan.positions)||!plan.positions.length)throw Error('INVALID_POSITION_PLAN');
  const assets=new Set<string>(),positions=new Set<string>(),orders=new Set<string>(),clients=new Set<string>();
  const totals=new Map<string,bigint>();
  for(const asset of plan.cashAssets){if(!/^[A-Z0-9]{1,24}$/.test(asset)||assets.has(asset))throw Error('INVALID_CASH_ASSETS');assets.add(asset);}
  for(const p of plan.positions){
    if(!p||!/^[-_A-Za-z0-9]{1,80}$/.test(p.positionId)||positions.has(p.positionId)||!/^[A-Z0-9]{1,24}$/.test(p.baseAsset)||!/^[A-Z0-9]{1,24}$/.test(p.quoteAsset)||p.baseAsset===p.quoteAsset||assets.has(p.baseAsset)||!p.stop||p.stop.symbol!==p.baseAsset+p.quoteAsset||units(p.stop.quantity)<=0n)throw Error('INVALID_POSITION_BINDING');
    const key=p.stop.symbol+':'+p.stop.orderId;
    if(orders.has(key)||clients.has(p.stop.clientOrderId))throw Error('STOP_REUSED');
    positions.add(p.positionId);orders.add(key);clients.add(p.stop.clientOrderId);
    totals.set(p.baseAsset,(totals.get(p.baseAsset)??0n)+units(p.stop.quantity));
  }
  const before=await reader.accountSnapshot();validateAccountSnapshot(before,plan.accountId,now());
  const issues:string[]=[];
  const results=[];
  for(const p of plan.positions){
    try{
      const result=await auditProtection({protectionOrder:async(symbol,id)=>{
        const raw=await reader.protectionOrder(symbol,id) as any;
        if(raw&&units(raw.origQty)!==units(p.stop.quantity))throw Error('STOP_QUANTITY_NOT_EXACT');
        return raw;
      }},p.stop,now);
      results.push({positionId:p.positionId,...result});
      if(!['STATIC_STOP_OBSERVED','STATIC_STOP_LIMIT_OBSERVED'].includes(result.state))issues.push('STOP_UNCONFIRMED:'+p.positionId);
      const open=before.openOrders.find(o=>o.symbol===p.stop.symbol&&o.orderId===p.stop.orderId);
      if(!open||open.clientOrderId!==p.stop.clientOrderId||open.side!=='SELL'||open.status!=='NEW'||units(open.quantity)!==units(p.stop.quantity)||units(open.executedQty)!==0n)issues.push('STOP_NOT_IN_ACCOUNT_SNAPSHOT:'+p.positionId);
    }catch{issues.push('STOP_READ_FAILED:'+p.positionId);}
  }
  const after=await reader.accountSnapshot();validateAccountSnapshot(after,plan.accountId,now());
  const fingerprint=(s:AccountSnapshot)=>JSON.stringify({canTrade:s.canTrade,balances:s.balances,openOrders:s.openOrders});
  if(fingerprint(before)!==fingerprint(after))issues.push('ACCOUNT_CHANGED_DURING_AUDIT');
  if(!after.canTrade)issues.push('ACCOUNT_TRADING_DISABLED');
  for(const [asset,quantity] of totals){
    const balance=after.balances.find(b=>b.asset===asset);
    if(!balance||units(balance.free)+units(balance.locked)!==quantity)issues.push('POSITION_BALANCE_MISMATCH:'+asset);
  }
  for(const b of after.balances)if(units(b.free)+units(b.locked)>0n&&!assets.has(b.asset)&&!totals.has(b.asset))issues.push('UNCLASSIFIED_HOLDING:'+b.asset);
  for(const o of after.openOrders)if(!orders.has(o.symbol+':'+o.orderId))issues.push('UNBOUND_OPEN_ORDER:'+o.symbol+':'+o.orderId);
  const observedAt=now();
  if(observedAt-before.startedAt>10000||observedAt<after.observedAt)issues.push('AUDIT_WINDOW_INVALID');
  return {environment:'BINANCE_TESTNET',accountId:plan.accountId,coverageObserved:issues.length===0,executionGuaranteed:false,observedAt,issues,positions:results,quantities:[...totals].map(([asset,q])=>({asset,quantity:decimal(q)}))};
}
