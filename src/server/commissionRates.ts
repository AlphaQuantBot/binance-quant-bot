import {units,decimal} from './exactDecimal';
type Rates={maker:string;taker:string;buyer:string;seller:string};
export type CommissionSnapshot={environment:'BINANCE_TESTNET';accountId:string;symbol:string;startedAt:number;observedAt:number;source:'EXCHANGE_ACCOUNT_COMMISSION';standard:Rates;special:Rates;tax:Rates;discount:{enabledForAccount:boolean;enabledForSymbol:boolean;discountAsset:string|null;discount:string}};
const SCALE=10n**18n;
function rates(raw:any):Rates{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('COMMISSION_COMPONENT_REQUIRED');
 const result={} as Rates;
 for(const key of ['maker','taker','buyer','seller'] as const){const n=units(raw[key]);if(n>SCALE)throw Error('UNSUPPORTED_COMMISSION_RATE');result[key]=decimal(n);}
 return result;
}
export function normalizeCommission(raw:any,accountId:string,symbol:string,startedAt:number,observedAt:number):CommissionSnapshot{
 if(!raw||raw.symbol!==symbol||!/^testnet_[a-f0-9]{24}$/.test(accountId)||!/^[A-Z0-9]{5,24}$/.test(symbol))throw Error('COMMISSION_IDENTITY_MISMATCH');
 const d=raw.discount;
 if(!d||typeof d!=='object'||Array.isArray(d))throw Error('COMMISSION_DISCOUNT_MISSING');
 if(typeof d.enabledForAccount!=='boolean'||typeof d.enabledForSymbol!=='boolean')throw Error('COMMISSION_DISCOUNT_FLAGS_INVALID');
 // Observed testnet response: both flags true with an explicit null asset.
 // Preserve that incomplete metadata; reading undiscounted rates does not authorize a discount.
 const assetAbsent=d.discountAsset==null||d.discountAsset==='';
 const disabled=d.enabledForAccount===false&&d.enabledForSymbol===false;
 if(assetAbsent&&!disabled&&d.discountAsset!==null)throw Error(d.discountAsset===''?'COMMISSION_DISCOUNT_ASSET_EMPTY':'COMMISSION_DISCOUNT_ASSET_TYPE_INVALID');
 if(!assetAbsent&&typeof d.discountAsset!=='string')throw Error('COMMISSION_DISCOUNT_ASSET_TYPE_INVALID');
 if(!assetAbsent&&!/^[A-Z0-9]{1,24}$/.test(d.discountAsset))throw Error('COMMISSION_DISCOUNT_ASSET_UNSUPPORTED');
 if(units(d.discount)>SCALE)throw Error('COMMISSION_DISCOUNT_RATE_UNSUPPORTED');
 const snapshot:CommissionSnapshot={environment:'BINANCE_TESTNET',accountId,symbol,startedAt,observedAt,source:'EXCHANGE_ACCOUNT_COMMISSION',standard:rates(raw.standardCommission),special:rates(raw.specialCommission),tax:rates(raw.taxCommission),discount:{enabledForAccount:d.enabledForAccount,enabledForSymbol:d.enabledForSymbol,discountAsset:assetAbsent?null:d.discountAsset,discount:decimal(units(d.discount))}};
 commissionSummary(snapshot,accountId,symbol,observedAt);return snapshot;
}
/** Undiscounted current rates only; never future GTC fee-reservation evidence. */
export function commissionSummary(s:CommissionSnapshot,accountId:string,symbol:string,now:number){
 if(!s||s.environment!=='BINANCE_TESTNET'||s.source!=='EXCHANGE_ACCOUNT_COMMISSION'||s.accountId!==accountId||s.symbol!==symbol)throw Error('COMMISSION_IDENTITY_MISMATCH');
 if(!Number.isSafeInteger(now)||!Number.isSafeInteger(s.startedAt)||!Number.isSafeInteger(s.observedAt)||s.startedAt<=0||s.observedAt<s.startedAt||s.observedAt>now||now-s.startedAt>2000)throw Error('STALE_COMMISSION_RATES');
 const groups=[rates(s.standard),rates(s.special),rates(s.tax)];
 function total(side:'buyer'|'seller',liquidity:'maker'|'taker'){
  const sum=groups.reduce((n,g)=>n+units(g[side])+units(g[liquidity]),0n);if(sum>SCALE)throw Error('UNSUPPORTED_COMMISSION_RATE');return decimal(sum);
 }
 return {buy:{maker:total('buyer','maker'),taker:total('buyer','taker')},sell:{maker:total('seller','maker'),taker:total('seller','taker')},discountMetadataComplete:s.discount.discountAsset!==null,discountApplied:false as const,reservationAuthorized:false as const};
}
