import { units } from './exactDecimal';
export type PriceReference = {kind:'REFERENCE_PRICE'|'AVERAGE_PRICE'|'LAST_TRADE';price:string;observedAt:number;timestamp:number;avgPriceMins?:number;absenceConfirmed?:boolean};
export function referenceForFilter(reference:PriceReference|undefined,filter:any,now:number) {
  if(!reference)throw Error('EXCHANGE_REFERENCE_PRICE_REQUIRED');
  if(!Number.isSafeInteger(reference.observedAt)||!Number.isSafeInteger(reference.timestamp)||reference.observedAt>now||reference.timestamp>now||reference.observedAt<=0||reference.timestamp<=0||now-reference.observedAt>2000||now-reference.timestamp>2000||units(reference.price)<=0n)throw Error('STALE_REFERENCE_PRICE');
  if(!Number.isSafeInteger(filter.avgPriceMins)||filter.avgPriceMins<0)throw Error('INVALID_REFERENCE_WINDOW');
  if(reference.kind==='REFERENCE_PRICE')return units(reference.price);
  if(reference.absenceConfirmed!==true)throw Error('REFERENCE_ABSENCE_UNCONFIRMED');
  if(filter.avgPriceMins===0&&reference.kind==='LAST_TRADE')return units(reference.price);
  if(filter.avgPriceMins>0&&reference.kind==='AVERAGE_PRICE'&&reference.avgPriceMins===filter.avgPriceMins)return units(reference.price);
  throw Error('REFERENCE_WINDOW_MISMATCH');
}
export function validatePercentPrice(price:bigint,side:'BUY'|'SELL',filter:any,reference:PriceReference|undefined,now:number) {
  const ref=referenceForFilter(reference,filter,now);
  const lower=units(filter.filterType==='PERCENT_PRICE'?filter.multiplierDown:side==='BUY'?filter.bidMultiplierDown:filter.askMultiplierDown);
  const upper=units(filter.filterType==='PERCENT_PRICE'?filter.multiplierUp:side==='BUY'?filter.bidMultiplierUp:filter.askMultiplierUp);
  if(lower<=0n||upper<lower)throw Error('INVALID_PERCENT_MULTIPLIERS');
  if(price*10n**18n<ref*lower||price*10n**18n>ref*upper)throw Error('PERCENT_PRICE_REJECTED');
}
