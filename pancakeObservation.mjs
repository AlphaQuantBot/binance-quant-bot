/** Consolidate values already received by the existing panels; no I/O or trading. */
export function consolidateObservation({pool=null,radar=[],listings=[]}={}) {
  const rows=new Map(), invalid=[];
  const add=(source,item,address)=>{
    if(typeof address!=='string'||!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      invalid.push({source,reason:'CONTRACT_ADDRESS_MISSING_OR_INVALID'});return;
    }
    const key=address.toLowerCase();
    if(!rows.has(key)) rows.set(key,{address,symbol:item.symbol??item.tokenSymbol??'',name:item.name??item.tokenName??'',records:[]});
    rows.get(key).records.push({source,parameters:structuredClone(item)});
  };
  if(pool&&typeof pool==='object')add('pool-stats',pool,pool.tokenAddress);
  if(Array.isArray(radar))for(const item of radar)if(item&&typeof item==='object')add('scalper/status',item,item.address);
  if(Array.isArray(listings))for(const item of listings)if(item&&typeof item==='object')add('upcoming-listings',item,item.address);
  return {rows:[...rows.values()],unmatchedRecords:invalid};
}
export function receivedStatus(meta,now) {
  if(!meta?.at)return 'HENÜZ ALINMADI';
  if(meta.error)return 'SON OKUMA BAŞARISIZ · ÖNCEKİ VERİ';
  if(!Number.isFinite(now)||now<meta.at||now-meta.at>60000)return 'ESKİ OKUMA';
  return 'ALINDI';
}
