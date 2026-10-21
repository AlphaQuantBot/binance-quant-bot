import React, { useEffect, useState } from 'react';

export function OperatorGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    fetch('/api/auth/session', { cache: 'no-store' }).then(r => {
      if (!r.ok) throw new Error(); return r.json();
    }).then(d => { setConfigured(d.configured === true); setReady(d.authenticated === true); })
      .catch(() => setError('Oturum durumu alınamadı. Sayfayı yenileyin.'));
  }, []);
  async function login(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
      setPassword('');
      if (!response.ok) { setError(response.status === 429 ? 'Çok fazla deneme. Bir dakika bekleyin.' : 'Giriş tamamlanamadı. Parolayı ve sunucu ayarlarını kontrol edin.'); return; }
      const status = await fetch('/api/auth/session', { cache: 'no-store' });
      const data = await status.json();
      if (data.authenticated === true) setReady(true); else setError('Oturum doğrulanamadı. HTTPS ve APP_URL ayarlarını kontrol edin.');
    } catch { setError('Sunucuya ulaşılamadı.'); }
    finally { setBusy(false); }
  }
  async function logout() {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok && response.status !== 401) { setError('Çıkış doğrulanamadı.'); return; }
      setReady(false); setPassword('');
    } catch { setError('Çıkış doğrulanamadı. Sunucuya ulaşılamadı.'); }
  }
  if (ready) return <><div className="flex items-center justify-end gap-3 bg-slate-950 p-2 text-sm text-slate-200"><span role="alert">{error}</span><button type="button" onClick={logout} className="rounded border border-slate-600 px-3 py-1">Operatör çıkışı</button></div>{children}</>;
  return <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6"><section className="w-full max-w-md rounded-2xl border border-slate-700 p-6">
    <h1 className="text-2xl font-bold">AlfaQuant • Operatör Girişi</h1>
    <p className="my-4 text-slate-400">Terminal tek operatör için korunmaktadır. Canlı emir yürütme geçici olarak kapalıdır.</p>
    {configured === false ? <p role="status">Sunucuda APP_AUTH_PASSWORD_HASH ayarlanmalı. Kurulum talimatlarını inceleyin.</p> : <form onSubmit={login}>
      <label htmlFor="operator-password" className="block mb-2">Operatör parolası</label>
      <input id="operator-password" type="password" autoComplete="current-password" required minLength={12} maxLength={256} value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded border border-slate-600 bg-slate-900 p-3" />
      <button disabled={busy || configured !== true} className="mt-4 rounded bg-emerald-500 px-5 py-3 font-bold text-slate-950 disabled:opacity-50">{busy ? 'Kontrol ediliyor…' : 'Giriş yap'}</button>
    </form>}
    <p role="alert" className="mt-4 text-amber-300">{error}</p>
  </section></main>;
}
