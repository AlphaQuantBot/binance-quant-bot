import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import './style.css';

type Token={address:string;symbol:string;name?:string};
type Pair={pairAddress:string;baseToken:Token;quoteToken:Token;priceUsd:number|null;liquidityUsd:number|null;volume24hUsd:number|null;change24hPct:number|null;buys24h:number|null;sells24h:number|null;marketCapUsd:number|null;fdvUsd:number|null;pairCreatedAt:number|null;sourceUrl:string};
type Snapshot={source:string;scope:string;fetchedAt:number;cached:boolean;pairs:Pair[]};
type Rule={id:string;address:string;symbol:string;direction:'ABOVE'|'BELOW';price:number};
type Event={id:string;at:number;message:string};
type History={at:number;pairAddress:string;symbol:string;priceUsd:number|null;liquidityUsd:number|null};
const addressPattern=/^0x[a-fA-F0-9]{40}$/;
const key='alfaquant-observation-v1';
function readLocal() {
  try {
    const raw=JSON.parse(localStorage.getItem(key)||'{}');
    return {
      watch:Array.isArray(raw.watch)?raw.watch.filter((t:any)=>t && typeof t.symbol==='string' && addressPattern.test(t.address)).slice(0,40):[],
      rules:Array.isArray(raw.rules)?raw.rules.filter((r:any)=>r && typeof r.id==='string' && typeof r.symbol==='string' && addressPattern.test(r.address) && ['ABOVE','BELOW'].includes(r.direction) && Number.isFinite(r.price) && r.price>0).slice(0,40):[],
    };
  } catch {return {watch:[],rules:[]};}
}
const money=(v:number|null)=>v===null?'Bilinmiyor':new Intl.NumberFormat('tr-TR',{style:'currency',currency:'USD',maximumSignificantDigits:7}).format(v);
const date=(v:number|null)=>v===null?'Bilinmiyor':new Date(v).toLocaleString('tr-TR');
function App() {
  const initial=useRef(readLocal());
  const [watch,setWatch]=useState<Token[]>(initial.current.watch);
  const [rules,setRules]=useState<Rule[]>(initial.current.rules);
  const [input,setInput]=useState(''),[query,setQuery]=useState('');
  const [data,setData]=useState<Snapshot|null>(null),[error,setError]=useState('');
  const [busy,setBusy]=useState(false),[now,setNow]=useState(Date.now());
  const [selected,setSelected]=useState(''),[tab,setTab]=useState('Araştırma');
  const [events,setEvents]=useState<Event[]>([]),[history,setHistory]=useState<History[]>([]);
  const [storageError,setStorageError]=useState(false);
  const [threshold,setThreshold]=useState(''),[direction,setDirection]=useState<'ABOVE'|'BELOW'>('ABOVE');
  const [refresh,setRefresh]=useState(0);
  const fired=useRef(new Set<string>()),lastSnapshot=useRef('');
  useEffect(()=>{
    try {localStorage.setItem(key,JSON.stringify({watch,rules}));setStorageError(false);}
    catch {setStorageError(true);}
  },[watch,rules]);
  useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(t);},[]);
  useEffect(()=>{
    if(!query) return;
    let stopped=false,timer:ReturnType<typeof setTimeout>|undefined;
    const controller=new AbortController();
    const run=async()=>{
      setBusy(true);
      try {
        const response=await fetch('/api/market?q='+encodeURIComponent(query),{signal:controller.signal,cache:'no-store'});
        const body=await response.json();
        if(!response.ok) throw Error(body.code||'PROVIDER_UNAVAILABLE');
        if(!Array.isArray(body.pairs)||!Number.isFinite(body.fetchedAt)) throw Error('PROVIDER_SCHEMA_INVALID');
        if(!stopped){setData(body);setError('');setSelected(previous=>body.pairs.some((p:Pair)=>p.pairAddress===previous)?previous:body.pairs[0]?.pairAddress||'');}
      } catch(e) {if(!stopped)setError(e instanceof Error?e.message:'PROVIDER_UNAVAILABLE');}
      finally {if(!stopped){setBusy(false);timer=setTimeout(run,30000);}}
    };
    run();
    return()=>{stopped=true;controller.abort();if(timer)clearTimeout(timer);};
  },[query,refresh]);
  const age=data?Math.max(0,now-data.fetchedAt):null;
  const fresh=!!data&&!error&&age!==null&&age<60000;
  const active=data?.pairs.find(p=>p.pairAddress===selected);
  useEffect(()=>{
    if(!data||!fresh)return;
    const identity=query+':'+data.fetchedAt;
    if(lastSnapshot.current===identity)return;
    lastSnapshot.current=identity;
    const additions=data.pairs.map(p=>({at:data.fetchedAt,pairAddress:p.pairAddress,symbol:p.baseToken.symbol,priceUsd:p.priceUsd,liquidityUsd:p.liquidityUsd}));
    setHistory(old=>[...additions,...old].slice(0,500));
    const triggered:Event[]=[];
    for(const rule of rules) {
      const pair=data.pairs.find(p=>p.baseToken.address.toLowerCase()===rule.address.toLowerCase());
      if(!pair||pair.priceUsd===null)continue;
      const hit=rule.direction==='ABOVE'?pair.priceUsd>=rule.price:pair.priceUsd<=rule.price;
      if(hit&&!fired.current.has(rule.id)) {
        fired.current.add(rule.id);
        triggered.push({id:rule.id+':'+data.fetchedAt,at:data.fetchedAt,message:rule.symbol+' fiyat eşiğine ulaştı: '+money(pair.priceUsd)+' · Havuz '+pair.pairAddress});
      } else if(!hit) fired.current.delete(rule.id);
    }
    if(triggered.length)setEvents(old=>[...triggered,...old].slice(0,100));
  },[data,fresh,query,rules]);
  const openToken=(token:Token)=>{setInput(token.address);setData(null);setError('');setQuery(token.address);setRefresh(v=>v+1);setTab('Araştırma');};
  const addWatch=(token:Token)=>setWatch(old=>old.some(t=>t.address.toLowerCase()===token.address.toLowerCase())?old:[...old,token].slice(0,40));
  const addRule=()=>{
    const price=Number(threshold);
    if(!active||!Number.isFinite(price)||price<=0)return;
    setRules(old=>[...old,{id:crypto.randomUUID(),address:active.baseToken.address,symbol:active.baseToken.symbol,direction,price}].slice(0,40));
    setThreshold('');
  };
  return <main>
    <header><div className="brand">ALFA<span>QUANT</span><small>PancakeSwap Gözlem Terminali</small></div><div className="badge">SALT OKUNUR · BSC</div></header>
    <section className="intro"><h1>Veriyi izle. Kaynağını gör. Kararını kendin ver.</h1><p>BNB Chain üzerindeki PancakeSwap havuzlarını araştır. Bu terminal cüzdan bağlamaz ve işlem göndermez.</p></section>
    <form className="search" onSubmit={e=>{e.preventDefault();if(!input.trim())return;setData(null);setError('');setQuery(input.trim());setRefresh(v=>v+1);setTab('Araştırma');}}>
      <input aria-label="Token sözleşme adresi veya sembolü" maxLength={80} value={input} onChange={e=>setInput(e.target.value)} placeholder="BEP-20 sözleşme adresi veya token sembolü"/>
      <button disabled={busy||!input.trim()}>Araştır</button>
    </form>
    <p className="muted">Sembol eşleşmesi kimlik doğrulaması değildir; sözleşme adresini kontrol et. Sonuçlar sağlayıcının indekslediği havuzlarla sınırlıdır.</p>
    <nav>{['Araştırma','Takip listesi','Alarmlar','Gözlem geçmişi'].map(name=><button className={tab===name?'current':''} key={name} onClick={()=>setTab(name)}>{name}{name==='Alarmlar'&&events.length?' ('+events.length+')':''}</button>)}</nav>
    {storageError&&<aside>Tarayıcı kaydı kullanılamıyor. Takip listesi ve alarm kuralları bu oturumdan sonra korunamayabilir.</aside>}
    {tab==='Araştırma'&&<>
      <div className="status"><span className={fresh?'good':'muted'}>{busy?'Veri alınıyor…':fresh?'Güncel sorgu sonucu':data?'VERİ ESKİ / DOĞRULANAMADI':'Henüz sorgulanmadı'}</span><span>Kaynak: DEX Screener · Sorgu zamanı: {data?date(data.fetchedAt):'—'} {age!==null?'· '+Math.floor(age/1000)+' sn önce':''}</span><button disabled={busy||!query} onClick={()=>setRefresh(v=>v+1)}>Yenile</button></div>
      <p className="muted">30 saniyede bir sorgulanır. Sorgu zamanı, zincir olay zamanı değildir; sağlayıcının veri gecikmesi bilinmiyor.</p>
      {error&&<aside role="alert">Veri alınamadı: {error}. Önceki değerler varsa eski veri olarak gösterilir; örnek veriyle doldurulmaz.</aside>}
      {data&&data.pairs.length===0&&<section className="panel">Bu sorguda indekslenmiş BSC / PancakeSwap havuzu bulunamadı. Bu sonuç tokenın bulunmadığını kanıtlamaz.</section>}
      {!!data?.pairs.length&&<><div className="tablewrap"><table><thead><tr><th>Token / Havuz</th><th>Fiyat</th><th>Likidite</th><th>24s hacim</th><th>24s değişim</th><th>Alım / Satım adedi</th><th/></tr></thead><tbody>{data.pairs.map(p=><tr key={p.pairAddress} className={selected===p.pairAddress?'selected':''}><td><button className="link" onClick={()=>setSelected(p.pairAddress)}>{p.baseToken.symbol} / {p.quoteToken.symbol}</button><small>{p.pairAddress.slice(0,10)}…{p.pairAddress.slice(-6)}</small></td><td>{money(p.priceUsd)}</td><td>{money(p.liquidityUsd)}</td><td>{money(p.volume24hUsd)}</td><td>{p.change24hPct===null?'Bilinmiyor':p.change24hPct.toFixed(2)+'%'}</td><td>{p.buys24h??'?'} / {p.sells24h??'?'}</td><td><button onClick={()=>addWatch(p.baseToken)}>Takibe ekle</button></td></tr>)}</tbody></table></div>
      {active&&<div className="grid"><section className="panel"><h2>{active.baseToken.name||active.baseToken.symbol}</h2><label>Sözleşme adresi</label><code>{active.baseToken.address}</code><label>Havuz adresi</label><code>{active.pairAddress}</code><dl><dt>Havuz oluşturulma zamanı</dt><dd>{date(active.pairCreatedAt)}</dd><dt>Piyasa değeri</dt><dd>{money(active.marketCapUsd)}</dd><dt>Tam seyreltilmiş değer</dt><dd>{money(active.fdvUsd)}</dd></dl><a href={active.sourceUrl} target="_blank" rel="noreferrer noopener">DEX Screener kaynağı ↗</a> · <a href={'https://bscscan.com/token/'+active.baseToken.address} target="_blank" rel="noreferrer noopener">BscScan sözleşmesi ↗</a></section>
      <section className="panel"><h2>Risk ve veri özeti</h2><p>{active.liquidityUsd===null?'Likidite bilgisi eksik.':active.liquidityUsd<10000?'Havuz likiditesi 10.000 USD altında; fiyat etkisi riski incelenmeli.':'Likidite miktarı sağlayıcıdan alınmıştır; güvenlik onayı değildir.'}</p><p>Honeypot, alım/satım vergisi, LP kilidi, sahiplik ve büyük cüzdan yoğunluğu: <strong>BİLİNMİYOR</strong>.</p><p className="muted">Bu özet sayısal verilere dayalı kurallardan oluşur; AI analizi veya sözleşme denetimi değildir. Listeleme ihtimali ve beklenen kâr üretilmez.</p><h3>Fiyat alarmı</h3><select aria-label="Alarm yönü" value={direction} onChange={e=>setDirection(e.target.value as 'ABOVE'|'BELOW')}><option value="ABOVE">Üzerinde veya eşit</option><option value="BELOW">Altında veya eşit</option></select><input aria-label="Alarm fiyatı USD" type="number" min="0" step="any" placeholder="USD fiyat eşiği" value={threshold} onChange={e=>setThreshold(e.target.value)}/><button onClick={addRule} disabled={!Number.isFinite(Number(threshold))||Number(threshold)<=0}>Alarm ekle</button></section></div>}</>}
    </>}
    {tab==='Takip listesi'&&<section className="panel"><h2>Takip listesi</h2><p className="muted">Bu tarayıcıda saklanır. Tokeni açtığında havuzları sorgulanır; kapalı sayfada izleme yapılmaz.</p>{watch.length===0?<p>Araştırma sonuçlarından token ekleyebilirsin.</p>:watch.map(t=><div className="item" key={t.address}><button className="link" onClick={()=>openToken(t)}>{t.symbol}</button><code>{t.address}</code><button onClick={()=>setWatch(old=>old.filter(x=>x.address!==t.address))}>Kaldır</button></div>)}</section>}
    {tab==='Alarmlar'&&<section className="panel"><h2>Alarm kuralları</h2><p className="muted">Yalnızca açık araştırma sorgusundaki tokenlar, güncel sonuç geldikçe değerlendirilir. Arka plan servisi veya bildirim gönderimi yoktur. Birden çok havuz varsa en yüksek likiditeli baz-token havuzu kullanılır. Oturum başlangıcında eşik zaten sağlanıyorsa alarm oluşabilir.</p>{rules.map(r=><div className="item" key={r.id}><span>{r.symbol} {r.direction==='ABOVE'?'≥':'≤'} {money(r.price)}</span><button onClick={()=>{fired.current.delete(r.id);setRules(old=>old.filter(x=>x.id!==r.id));}}>Sil</button></div>)}{!rules.length&&<p>Henüz alarm yok.</p>}<h3>Bu oturumun alarm kayıtları</h3>{events.map(e=><p key={e.id}>{date(e.at)} — {e.message}</p>)}</section>}
    {tab==='Gözlem geçmişi'&&<section className="panel"><h2>Oturum gözlemleri</h2><p className="muted">Son 500 havuz gözlemi yalnızca bu oturumda tutulur. Sorgulanmamış aralıklar doldurulmaz; mum geçmişi veya işlem geçmişi değildir.</p>{history.map((h,i)=><div className="item" key={h.pairAddress+':'+h.at+':'+i}><span>{date(h.at)}</span><strong>{h.symbol}</strong><span>{money(h.priceUsd)}</span><span>Likidite: {money(h.liquidityUsd)}</span></div>)}{!history.length&&<p>Henüz gözlem yok.</p>}</section>}
    <footer>AlfaQuant · Kaynaklı gözlem, manuel değerlendirme. Veri sağlayıcısı erişilebilirliği ve veri kapsamı ayrı konulardır.</footer>
  </main>;
}
createRoot(document.getElementById('root')!).render(<App/>);
