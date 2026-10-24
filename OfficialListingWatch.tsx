import React,{useEffect,useState} from 'react';
type Pool={pairAddress:string;sourceUrl:string;priceUsd:number|null;liquidityUsd:number|null;volume24hUsd:number|null};
type Listing={id:string;exchange:string;title:string;url:string;symbol:string|null;kind:string;status:string;publishedAt:number|null;tradingAt:number|null;contractAddress:string|null;contractEvidenceUrl?:string;detailState:string;poolState:string;pools:Pool[]};
type Report={fetchedAt:number;cached:boolean;sourceState:string;items:Listing[];sources:{exchange:string;state:string;total:number|null;returned:number}[];coverage:{unsupportedExchanges:string[];detailsExamined:number}};
const labels:Record<string,string>={SCHEDULE_REVIEW_REQUIRED:'Takvim güncellemesi var · inceleme gerekli',UPCOMING_WITH_POOL:'Yaklaşan spot + havuz eşleşti',TIME_UNCONFIRMED:'Açılış zamanı doğrulanmadı',CONTRACT_UNCONFIRMED:'Sözleşme doğrulanmadı',POOL_UNAVAILABLE:'Havuz kaynağına erişilemedi',POOL_NOT_CONFIRMED:'PancakeSwap havuzu doğrulanmadı',ALREADY_STARTED:'Açılış zamanı geçti',OUTSIDE_7_DAY_WINDOW:'7 günlük pencere dışında',NON_SPOT:'Spot dışı / ön piyasa',REVIEW_UPDATE:'Erteleme / kaldırma / güncelleme',NEW_PAIR_ONLY:'Mevcut varlık için yeni parite',REVIEW_REQUIRED:'Manuel inceleme gerekli'};
const time=(n:number|null)=>n?new Intl.DateTimeFormat('tr-TR',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Istanbul'}).format(n):'Bilinmiyor';
const usd=(n:number|null)=>n===null?'Bilinmiyor':new Intl.NumberFormat('tr-TR',{style:'currency',currency:'USD',maximumSignificantDigits:7}).format(n);
export function OfficialListingWatch() {
 const [report,setReport]=useState<Report|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [filter,setFilter]=useState('matched'),[now,setNow]=useState(Date.now());
 useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(t);},[]);
 const read=async()=>{
  if(busy)return;setBusy(true);
  try {
   const response=await fetch('/api/pancakeswap/listing-watch',{method:'GET',cache:'no-store',signal:AbortSignal.timeout(30000)});
   const data=await response.json();
   if(!Array.isArray(data.items)||!Number.isFinite(data.fetchedAt)||!['OK','PARTIAL','UNAVAILABLE'].includes(data.sourceState))throw Error('LISTING_READ_UNAVAILABLE');
   setReport(data);setError('');
  }catch {setError('Kaynak okuması tamamlanamadı. Önceki sonuçlar varsa eski veri olarak tutuluyor.');}
  finally{setBusy(false);}
 };
 const status=(row:Listing)=>row.kind==='SPOT_ANNOUNCEMENT'&&row.tradingAt&&row.tradingAt<=now?'ALREADY_STARTED':row.status;
 const rows=report?.items.filter(row=>filter==='all'||filter==='spot'&&row.kind==='SPOT_ANNOUNCEMENT'||filter==='matched'&&status(row)==='UPCOMING_WITH_POOL')??[];
 const old=!!report&&(now<report.fetchedAt||now-report.fetchedAt>120000||!!error);
 return <section className="rounded-xl border border-violet-500/30 bg-slate-950 p-4 space-y-3">
  <div className="flex flex-wrap justify-between gap-3"><div><h2 className="text-lg font-bold text-violet-200">Resmî Listeleme Takibi</h2><p className="text-xs text-slate-400">Borsa duyurusu + BSC sözleşmesi + PancakeSwap havuzu. Sembol eşleşmesi tek başına yeterli değildir.</p></div><button type="button" disabled={busy} onClick={read} className="rounded border border-violet-500/40 px-3 py-2 text-sm disabled:opacity-50">{busy?'Kaynaklar okunuyor…':'Resmî kaynakları tara'}</button></div>
  <p className="text-xs text-amber-200/80">İlk sürüm: KuCoin ve Bybit, ilk 20 duyuru / borsa; en yeni 8 spot adayın ayrıntısı. Diğer borsalar henüz taranmıyor. Havuz bulunamaması tokenın mevcut olmadığını kanıtlamaz. Veri sağlayıcı eşleşmesi güvenlik onayı değildir.</p>
  {error&&<p role="alert" className="text-sm text-amber-300">{error}</p>}
  {report&&<><p className="text-xs text-slate-400">Son okuma (Türkiye): {time(report.fetchedAt)} · {Math.max(0,Math.floor((now-report.fetchedAt)/1000))} sn önce · {old?'ESKİ SONUÇ':report.cached?'Önbellek':'Yeni sorgu'} · Kaynak durumu: {report.sourceState}</p>
   <div className="flex flex-wrap gap-3 text-xs">{report.sources.map(s=><span key={s.exchange}>{s.exchange}: {s.state} · {s.returned}/{s.total??'?'} duyuru</span>)}</div>
   <label className="text-xs">Görünüm <select value={filter} onChange={e=>setFilter(e.target.value)} className="ml-2 rounded bg-slate-900 p-2"><option value="matched">7 gün içinde açılacak ve havuzu eşleşenler</option><option value="spot">Tüm spot adaylar / eksik doğrulamalar</option><option value="all">Tüm duyurular ve ayrımlar</option></select></label>
   {!rows.length&&<p className="text-sm text-slate-400">{report.sourceState==='UNAVAILABLE'?'Kaynaklara erişilemedi; aday yok sonucu çıkarılamaz.':'Bu sınırlı taramada seçili koşulları sağlayan kayıt yok.'}</p>}
   <div className="overflow-x-auto"><table className="w-full text-xs text-left"><thead><tr>{['Token / duyuru','Borsa','Açılış · Türkiye','Sözleşme / durum','PancakeSwap havuzu'].map(h=><th className="p-2" key={h}>{h}</th>)}</tr></thead><tbody>{rows.map(row=><tr key={row.id} className="border-t border-slate-800">
    <td className="p-2"><strong>{row.symbol??'Sembol belirsiz'}</strong><div><a href={row.url} target="_blank" rel="noopener noreferrer" className="text-cyan-300">{row.title}</a></div><small>Duyuru: {time(row.publishedAt)}</small></td>
    <td className="p-2">{row.exchange}</td><td className="p-2 whitespace-nowrap">{time(row.tradingAt)}</td>
    <td className="p-2"><div>{labels[status(row)]??status(row)}</div><code className="break-all text-[10px]">{row.contractAddress??'Bilinmiyor'}</code>{row.contractEvidenceUrl&&<div><a href={row.contractEvidenceUrl} target="_blank" rel="noopener noreferrer" className="text-cyan-300">Sözleşme kaynağı</a></div>}<small>Ayrıntı: {row.detailState}</small></td>
    <td className="p-2">{row.pools.map(pool=><div key={pool.pairAddress}><a href={pool.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-cyan-300">{pool.pairAddress.slice(0,8)}…{pool.pairAddress.slice(-6)}</a><div>Fiyat {usd(pool.priceUsd)} · Likidite {usd(pool.liquidityUsd)} · 24s hacim {usd(pool.volume24hUsd)}</div></div>)}{!row.pools.length&&<span>{row.poolState}</span>}</td>
   </tr>)}</tbody></table></div>
  </>}
  {!report&&<p className="text-sm text-slate-400">Tarama henüz başlatılmadı. Bu modül yalnızca yukarıdaki düğmeyle okunur; mevcut panellerin sorgularını değiştirmez.</p>}
 </section>;
}
