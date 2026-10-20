import { units } from './exactDecimal';
export type ProtectionTarget = {symbol:string; orderId:string; clientOrderId:string; quantity:string; stopPrice:string};
export type ProtectionReader = {protectionOrder(symbol:string,orderId:string):Promise<unknown>};
/** Point-in-time evidence for one explicitly bound static stop. Never authorizes execution. */
export async function auditProtection(reader:ProtectionReader, target:ProtectionTarget, now=Date.now) {
  if(!target||!/^[A-Z0-9]{5,24}$/.test(target.symbol)||!/^(0|[1-9]\d{0,29})$/.test(target.orderId)||!/^[-_.:/A-Za-z0-9]{1,36}$/.test(target.clientOrderId)||units(target.quantity)<=0n||units(target.stopPrice)<=0n)throw Error('INVALID_PROTECTION_TARGET');
  const binding=structuredClone(target), startedAt=now();
  const first=await reader.protectionOrder(binding.symbol,binding.orderId);
  const second=await reader.protectionOrder(binding.symbol,binding.orderId);
  const observedAt=now();
  const report=(state:string)=>({environment:'BINANCE_TESTNET' as const,symbol:binding.symbol,orderId:binding.orderId,state,startedAt,observedAt,executionGuaranteed:false as const});
  if(!Number.isSafeInteger(startedAt)||!Number.isSafeInteger(observedAt)||startedAt<=0||observedAt<startedAt||observedAt-startedAt>2000)return report('STALE_READ');
  if(first===null||second===null)return report('MISSING');
  // Select fields so harmless provider field ordering cannot change the result.
  function fields(raw:any){return [raw?.symbol,String(raw?.orderId),raw?.clientOrderId,raw?.side,raw?.type,raw?.status,raw?.origQty,raw?.executedQty,raw?.stopPrice,raw?.price,raw?.timeInForce,raw?.orderListId,raw?.isWorking,raw?.workingTime,raw?.trailingDelta,raw?.updateTime];}
  if(JSON.stringify(fields(first))!==JSON.stringify(fields(second)))return report('CHANGED_DURING_READ');
  const r=second as any;
  if(!r||(typeof r.orderId==='number'&&!Number.isSafeInteger(r.orderId))||r.symbol!==binding.symbol||String(r.orderId)!==binding.orderId||r.clientOrderId!==binding.clientOrderId||r.side!=='SELL')return report('IDENTITY_MISMATCH');
  if(!['STOP_LOSS','STOP_LOSS_LIMIT'].includes(r.type))return report('NOT_A_STOP');
  // Lists/trailing require their own state machine; never infer coverage from a child alone.
  if(r.orderListId!==-1||r.trailingDelta!==undefined)return report('UNSUPPORTED_CONDITIONAL_ORDER');
  if(r.status!=='NEW'||r.isWorking!==false||r.workingTime!==-1)return report('NOT_WAITING_FOR_TRIGGER');
  if(!Number.isSafeInteger(r.updateTime)||r.updateTime<0||r.updateTime>observedAt)return report('INVALID_ORDER_TIME');
  try{
    if(units(r.origQty)<=0n||units(r.executedQty)!==0n||units(r.stopPrice)!==units(binding.stopPrice))return report('QUANTITY_OR_TRIGGER_MISMATCH');
    if(units(r.origQty)<units(binding.quantity))return report('INSUFFICIENT_QUANTITY');
    if(r.type==='STOP_LOSS_LIMIT'&&(r.timeInForce!=='GTC'||units(r.price)<=0n||units(r.price)>units(r.stopPrice)))return report('INVALID_STOP_LIMIT');
  }catch{return report('INVALID_ORDER_VALUES');}
  return report(r.type==='STOP_LOSS'?'STATIC_STOP_OBSERVED':'STATIC_STOP_LIMIT_OBSERVED');
}
