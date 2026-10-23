import React,{useMemo,useState,useEffect} from 'react';
import {consolidateObservation,receivedStatus} from './pancakeObservation.mjs';

type Meta={at:number|null;error:boolean};
interface Props {
  pool:unknown;radar:unknown[];listings:unknown[];history:unknown[];positions:unknown[];settings:unknown;
  metadata:Record<string,Meta>;
}
const labels:Record<string,string>={
  'pool-stats':'Havuz parametreleri','scalper/status':'Token radarı',
  'upcoming-listings':'Listeleme radarı','buyback-history':'Geri alım kayıtları'
};
const fields=[
 ['Fiyat USD',['currentPriceUsd','quantPriceUsd']],
 ['Fiyat BNB',['currentPriceBnb','quantPriceBnb']],
 ['Likidite USD',['liquidityUsd','initialLiquidityUsd']],
 ['24s hacim USD',['volume24hUsd']],
 ['Değişim %',['priceChange24h','priceChangePercent','change24hPercent']],
 ['Holders',['holdersCount']],
 ['Bildirilen skor',['safetyScore']],
 ['Bildirilen alım vergisi %',['buyTaxPercent']],
 ['Bildirilen satış vergisi %',['sellTaxPercent']],
 ['Bildirilen LP kilidi %',['liquidityLockedPercent']],
] as const;
function display(value:unknown):string {
  if(value===null||value===undefined||value==='')return 'Bilinmiyor';
  if(typeof value==='number')return Number.isFinite(value)?new Intl.NumberFormat('tr-TR',{maximumSignificantDigits:10}).format(value):'Bilinmiyor';
  return typeof value==='object'?JSON.stringify(value):String(value);
}
export function PancakeObservationSummary(props:Props) {
  const [search,setSearch]=useState(''),[now,setNow]=useState(Date.now());
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
  const combined=useMemo(()=>consolidateObservation({pool:props.pool,radar:props.radar,listings:props.listings}),[props.pool,props.radar,props.listings]);
  const rows=combined.rows.filter((r:any)=>(r.address+' '+r.symbol+' '+r.name).toLowerCase().includes(search.toLowerCase()));
  return <section className="rounded-xl border border-cyan-500/30 bg-slate-950 p-4 space-y-4">
    <div className="flex flex-wrap justify-between gap-3"><div><h2 className="text-lg font-bold text-cyan-200">PancakeSwap · Toplu Gözlem</h2><p className="text-xs text-slate-400">Mevcut modüllerin okuduğu parametreler; ek API sorgusu veya işlem başlatılmaz.</p></div><input aria-label="Toplu gözlemde token ara" placeholder="Sembol veya sözleşme adresi" value={search} onChange={e=>setSearch(e.target.value)} className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"/></div>
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">{Object.entries(labels).map(([source,label])=>{const meta=props.metadata[source];return <div className="border border-slate-800 rounded p-2 text-xs" key={source}><strong>{label}</strong><div className={meta?.error?'text-amber-300':'text-slate-400'}>{receivedStatus(meta,now)}</div><div className="text-slate-500">{meta?.at?new Date(meta.at).toLocaleTimeString('tr-TR'):'—'}</div></div>;})}</div>
    <p className="text-xs text-amber-200/80">Saatler yanıtın tarayıcıya alındığı zamanı gösterir; zincir verisinin güncelliğini doğrulamaz. Güvenlik, kilit, listeleme ve getiri alanları mevcut sunucunun bildirimleridir; bu panel bunları bağımsız doğrulamaz.</p>
    <div className="overflow-x-auto"><table className="w-full text-xs text-left"><thead className="text-slate-400"><tr><th className="p-2">Token / adres</th><th className="p-2">Modül</th>{fields.map(([label])=><th className="p-2 whitespace-nowrap" key={label}>{label}</th>)}</tr></thead><tbody>{rows.flatMap((row:any)=>row.records.map((record:any,index:number)=>{
      const values=record.parameters;
      return <tr key={row.address+':'+record.source+':'+index} className="border-t border-slate-800"><td className="p-2"><strong>{row.symbol||'Sembol yok'}</strong><div>{row.name}</div><code className="text-[10px] break-all">{row.address}</code></td><td className="p-2 whitespace-nowrap">{labels[record.source]??record.source}</td>{fields.map(([label,keys])=><td className="p-2 whitespace-nowrap" key={label}>{display(keys.map(key=>values[key]??values.securityProtocol?.[key]).find(value=>value!==undefined&&value!==null))}</td>)}</tr>;
    }))}</tbody></table></div>
    {!rows.length&&<p className="text-sm text-slate-400">Gösterilecek eşleşen gözlem yok.</p>}
    <p className="text-xs text-slate-400">{combined.rows.length} benzersiz sözleşme · {props.radar.length} radar kaydı · {props.listings.length} listeleme kaydı · {props.history.length} geri alım kaydı · {props.positions.length} bildirilen pozisyon. Aynı adresteki farklı modül değerleri birbirinin üzerine yazılmaz.</p>
    {combined.unmatchedRecords.length>0&&<p className="text-xs text-amber-300">{combined.unmatchedRecords.length} kayıt, geçerli sözleşme adresi olmadığı için tokenlarla birleştirilmedi.</p>}
    <details className="text-xs"><summary className="cursor-pointer text-cyan-300">Tüm okunan parametreleri göster</summary><pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap break-all text-slate-400">{JSON.stringify({metadata:props.metadata,pool:props.pool,radar:props.radar,listings:props.listings,history:props.history,positions:props.positions,settings:props.settings},null,2)}</pre></details>
  </section>;
}
