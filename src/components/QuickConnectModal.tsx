import React, { useState } from 'react';
import { UserSecuritySettings } from '../types/crypto';
import { 
  ShieldCheck, 
  Zap, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Key, 
  HelpCircle, 
  ExternalLink,
  Gift,
  Copy,
  Check
} from 'lucide-react';

interface QuickConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSecuritySettings;
  onUpdateSettings: (newSettings: UserSecuritySettings) => void;
  onForceTradeAll?: () => void;
}

export const QuickConnectModal: React.FC<QuickConnectModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onForceTradeAll,
}) => {
  const [exchange, setExchange] = useState<'BINANCE' | 'BINANCE_TR' | 'BYBIT' | 'COINBASE' | 'OKX'>(settings.exchange || 'BINANCE');
  const [apiKey, setApiKey] = useState(settings.binanceApiKey || '');
  const [secretKey, setSecretKey] = useState(settings.binanceSecretKey || '');
  const [showSecret, setShowSecret] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);
  const [statusResult, setStatusResult] = useState<{
    success: boolean;
    message: string;
    canTrade?: boolean;
    balance?: number;
  } | null>(null);

  if (!isOpen) return null;

  const handleTestAndConnect = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanApiKey = apiKey.trim();
    const cleanSecretKey = secretKey.trim();

    if (!cleanApiKey || !cleanSecretKey) {
      setStatusResult({
        success: false,
        message: 'Lütfen hem API Key hem de Secret Key alanlarını doldurun.'
      });
      return;
    }

    setIsVerifying(true);
    setStatusResult(null);

    try {
      const response = await fetch('/api/binance/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: cleanApiKey,
          secretKey: cleanSecretKey,
          exchange,
        }),
      });

      const data = await response.json();

      if (data && data.success) {
        const vaultTotal = typeof data.totalSpotVaultUsdt === 'number'
          ? data.totalSpotVaultUsdt
          : (typeof data.freeUsdt === 'number' ? data.freeUsdt : parseFloat(data.freeUsdt) || 0);
        const liquidCash = typeof data.availableCashUsdt === 'number' ? data.availableCashUsdt : 0;
        const freeTryNumber = parseFloat(data.freeTry) || 0;
        const effectiveBal = exchange === 'BINANCE' ? vaultTotal : (vaultTotal > 0 ? vaultTotal : freeTryNumber);

        const updatedSettings: UserSecuritySettings = {
          ...settings,
          exchange,
          tradingMode: 'LIVE_API',
          binanceApiKey: cleanApiKey,
          binanceSecretKey: cleanSecretKey,
          autoLiveExecutionEnabled: true,
          liveSpotBalanceUsdt: effectiveBal,
          availableCashUsdt: liquidCash,
          liveSpotBalanceTry: exchange === 'BINANCE' ? undefined : (freeTryNumber > 0 ? freeTryNumber : undefined),
          simulatedBalanceUsdt: effectiveBal > 0 ? effectiveBal : settings.simulatedBalanceUsdt,
        };

        onUpdateSettings(updatedSettings);

        // Also sync to server session & disk vault
        fetch('/api/binance/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey: cleanApiKey, secretKey: cleanSecretKey, exchange })
        }).catch(() => {});

        setStatusResult({
          success: true,
          message: data.message || `Bağlantı Başarılı! Binance Global doğrulandı. Spot Al-Sat: ${data.canTrade ? 'AKTİF' : 'KAPALI'}. Toplam Spot Kasa: $${effectiveBal.toFixed(2)} USD (Serbest Nakit: $${liquidCash.toFixed(2)} USDT)`,
          canTrade: data.canTrade,
          balance: effectiveBal
        });

        if (onForceTradeAll) {
          setTimeout(onForceTradeAll, 800);
        }

        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setStatusResult({
          success: false,
          message: data?.error || 'Borsa bağlantısı reddedildi. API anahtarlarınızı ve Spot yetkisini kontrol edin.'
        });
      }
    } catch (err: any) {
      setStatusResult({
        success: false,
        message: err?.message || 'Borsa sunucusuna ulaşılamadı. Lütfen internet bağlantınızı kontrol edin.'
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleActivateDemoLive = () => {
    // 1-Click Sandbox / Testnet activation with live price autonomous engine
    const demoSettings: UserSecuritySettings = {
      ...settings,
      tradingMode: 'LIVE_API',
      autoLiveExecutionEnabled: true,
      liveSpotBalanceUsdt: settings.liveSpotBalanceUsdt || 500.0,
      simulatedBalanceUsdt: 500.0,
    };
    onUpdateSettings(demoSettings);
    if (onForceTradeAll) {
      setTimeout(onForceTradeAll, 300);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0b1120] border border-slate-700/80 rounded-xl max-w-lg w-full p-5 shadow-2xl relative space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-sans flex items-center gap-2">
                Binance Canlı API Hızlı Bağlantı
              </h3>
              <p className="text-xs text-slate-400">
                Botların borsada gerçek emir gönderebilmesi için API anahtarlarınızı bağlayın
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Binance %20 Komisyon İndirimi & Referans Kartı */}
        <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-emerald-950/40 border border-amber-500/40 rounded-lg p-3 text-xs space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-xs font-sans">
              <Gift className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Binance %20 Komisyon İndirimi &amp; Ücretsiz Bot Erişimi</span>
            </div>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold shrink-0">
              VIP REFERANS
            </span>
          </div>

          <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
            Resmi ortaklık linkimizle hesap açarak her işlemde <strong>%20 komisyon indirimi</strong> kazanın ve botun tüm otonom modüllerini <strong>ömür boyu ücretsiz</strong> kullanın.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-800">
            {/* Binance TR Kartı */}
            <div className="p-2 rounded bg-slate-950/70 border border-slate-800 flex flex-col justify-between space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[11px] text-white flex items-center gap-1 font-sans">
                  🇹🇷 Binance TR (%100 Yasal)
                </span>
                <span className="text-[9px] text-emerald-400 font-mono">Bölge Kısıtlamasız</span>
              </div>
              <div className="flex items-center gap-1.5">
                <a
                  href={settings.binanceTrReferralLink || 'https://www.trbinance.com/account/signup?ref=TR_VIP'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-1 px-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded text-[10px] font-sans flex items-center justify-center gap-1 transition-colors text-center"
                >
                  <span>Binance TR Aç</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(settings.binanceTrReferralCode || 'TR_VIP');
                    setCopiedRef(true);
                    setTimeout(() => setCopiedRef(false), 2000);
                  }}
                  className="py-1 px-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-[10px] font-mono flex items-center gap-1"
                  title="Binance TR Referans Kodu"
                >
                  {copiedRef ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                  <span>{settings.binanceTrReferralCode || 'TR_VIP'}</span>
                </button>
              </div>
            </div>

            {/* Binance Global Kartı */}
            <div className="p-2 rounded bg-slate-950/70 border border-slate-800 flex flex-col justify-between space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[11px] text-white flex items-center gap-1 font-sans">
                  🌐 Binance Global (750+ Çift)
                </span>
                <span className="text-[9px] text-amber-400 font-mono">English / Global</span>
              </div>
              <div className="flex items-center gap-1.5">
                <a
                  href={settings.referralLink || 'https://accounts.binance.com/en/register?ref=VIP_BOT'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-1 px-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-[10px] font-sans flex items-center justify-center gap-1 transition-colors text-center"
                >
                  <span>Global Aç (/en)</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(settings.referralCode || 'VIP_BOT');
                    setCopiedRef(true);
                    setTimeout(() => setCopiedRef(false), 2000);
                  }}
                  className="py-1 px-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-[10px] font-mono flex items-center gap-1"
                  title="Binance Global Referans Kodu"
                >
                  {copiedRef ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                  <span>{settings.referralCode || 'VIP_BOT'}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 font-sans leading-tight bg-slate-950/50 p-1.5 rounded border border-slate-800/80">
            ℹ️ <em>Bölge Uyarısı Çözümü:</em> Türkiye SPK kuralları gereği Binance Global Türkçe linklerde *"bölgenizde kullanılamamaktadır"* uyarısı verebilir. Dili <strong>English</strong> yaparak veya <strong>Binance TR</strong> seçeneğiyle uyarısız kayıt olabilirsiniz.
          </div>
        </div>

        {/* Exchange Selector */}
        <div>
          <label className="text-xs text-slate-400 font-sans block mb-1.5">Borsa Seçimi</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setExchange('BINANCE')}
              className={`p-2.5 rounded-lg border text-left font-mono text-xs transition-colors ${
                exchange === 'BINANCE'
                  ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-bold'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>Binance Global</span>
                {exchange === 'BINANCE' && <span className="w-2 h-2 rounded-full bg-amber-400" />}
              </div>
              <span className="text-[10px] text-slate-400 block font-normal">USDT Spot (Önerilen)</span>
            </button>

            <button
              type="button"
              onClick={() => setExchange('BINANCE_TR')}
              className={`p-2.5 rounded-lg border text-left font-mono text-xs transition-colors ${
                exchange === 'BINANCE_TR'
                  ? 'bg-red-500/15 border-red-500 text-red-300 font-bold'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>Binance TR</span>
                {exchange === 'BINANCE_TR' && <span className="w-2 h-2 rounded-full bg-red-400" />}
              </div>
              <span className="text-[10px] text-slate-400 block font-normal">TRY & USDT Spot</span>
            </button>
          </div>
        </div>

        {/* API Form */}
        <form onSubmit={handleTestAndConnect} className="space-y-3 font-mono text-xs">
          <div>
            <label className="text-slate-300 block mb-1 font-sans text-xs flex justify-between">
              <span>{exchange === 'BINANCE_TR' ? 'Binance TR' : 'Binance'} API Key</span>
              <span className="text-[10px] text-emerald-400 font-sans">Yetki: Spot Trading</span>
            </label>
            <input
              type="text"
              placeholder="API Key yapıştırın (örn: vmPUZE6mv9SD5VNHl...)"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-400 text-xs"
            />
          </div>

          <div>
            <label className="text-slate-300 block mb-1 font-sans text-xs flex justify-between">
              <span>Secret Key (Gizli Anahtar)</span>
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="text-slate-500 hover:text-slate-300 text-[11px]"
              >
                {showSecret ? 'Gizle' : 'Göster'}
              </button>
            </label>
            <input
              type={showSecret ? 'text' : 'password'}
              placeholder="Secret Key yapıştırın..."
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-400 text-xs"
            />
          </div>

          {/* Quick Security & Permission Notice */}
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-sans text-slate-300 space-y-1">
            <div className="flex items-center justify-between text-amber-400 font-bold">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Gerekli Binance İzinleri:
              </span>
              <span className="text-[10px] text-emerald-400">Spot &amp; Margin Alım Satım</span>
            </div>
            <p className="text-slate-400 text-[10px] leading-relaxed">
              Binance panelinde API anahtarınızı düzenleyip <strong>"Spot ve Margin Alım Satımını Etkinleştir"</strong> seçeneğini işaretleyin ve IP kısıtlamasını <strong>"Kısıtlanmamış"</strong> olarak ayarlayın. (<strong>Çekim/Withdraw izni açmayınız</strong>).
            </p>
          </div>

          {/* Verification Feedback */}
          {statusResult && (
            <div
              className={`p-3 rounded-lg border text-xs font-sans ${
                statusResult.success
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold mb-1">
                {statusResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                )}
                <span>{statusResult.success ? 'Bağlantı Başarılı!' : 'Bağlantı Hatası'}</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-300">
                {statusResult.message}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row gap-2">
            <button
              type="submit"
              disabled={isVerifying}
              className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold rounded-lg text-xs font-sans flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Binance Doğrulanıyor...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Doğrula &amp; Canlı Al-Satı Başlat
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleActivateDemoLive}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-semibold rounded-lg text-xs font-sans flex items-center justify-center gap-1.5 transition-colors"
              title="Canlı Binance fiyatlarıyla hemen otonom alım-satım başlat"
            >
              <span>Canlı Piyasa Motoruyla Başlat</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
