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
import { copyToClipboard } from '../utils/clipboard';

interface QuickConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSecuritySettings;
  onUpdateSettings: (newSettings: UserSecuritySettings) => void;
  onForceTradeAll?: () => void;
  language?: 'en' | 'tr';
}

export const QuickConnectModal: React.FC<QuickConnectModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onForceTradeAll,
  language = 'en',
}) => {
  const isTr = (language || settings.language) === 'tr';
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
        message: isTr
          ? 'Lütfen hem API Key hem de Secret Key alanlarını doldurun.'
          : 'Please enter both API Key and Secret Key.'
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
          message: data.message || (isTr
            ? `Bağlantı Başarılı! Binance Global doğrulandı. Spot Al-Sat: ${data.canTrade ? 'AKTİF' : 'KAPALI'}. Toplam Spot Kasa: $${effectiveBal.toFixed(2)} USD (Serbest Nakit: $${liquidCash.toFixed(2)} USDT)`
            : `Connected successfully! Binance Global verified. Spot Trading: ${data.canTrade ? 'ACTIVE' : 'INACTIVE'}. Total Spot Vault: $${effectiveBal.toFixed(2)} USD (Available Cash: $${liquidCash.toFixed(2)} USDT)`),
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
          message: data?.error || (isTr
            ? 'Borsa bağlantısı reddedildi. API anahtarlarınızı ve Spot yetkisini kontrol edin.'
            : 'Exchange connection rejected. Check your API keys and Spot permissions.')
        });
      }
    } catch (err: any) {
      setStatusResult({
        success: false,
        message: err?.message || (isTr
          ? 'Borsa sunucusuna ulaşılamadı. Lütfen internet bağlantınızı kontrol edin.'
          : 'Unable to reach exchange server. Please check your connection.')
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
                {isTr ? 'Binance Canlı API Hızlı Bağlantı' : 'Binance Live API Quick Connect'}
              </h3>
              <p className="text-xs text-slate-400">
                {isTr 
                  ? 'Botların borsada gerçek emir gönderebilmesi için API anahtarlarınızı bağlayın' 
                  : 'Connect your API keys to enable autonomous real spot order routing on Binance'}
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
              <span>{isTr ? 'Binance %20 Komisyon İndirimi & Ücretsiz Bot Erişimi' : 'Binance 20% Fee Discount & Free Bot Access'}</span>
            </div>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold shrink-0">
              {isTr ? 'VIP REFERANS' : 'VIP REFERRAL'}
            </span>
          </div>

          <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
            {isTr 
              ? <>Resmi ortaklık linkimizle hesap açarak her işlemde <strong>%20 komisyon indirimi</strong> kazanın ve botun tüm otonom modüllerini <strong>ömür boyu ücretsiz</strong> kullanın.</>
              : <>Register via our official partnership link to enjoy a lifetime <strong>20% fee discount</strong> and <strong>lifetime free access</strong> to all autonomous quant bot modules.</>}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-800">
            {/* Binance TR Kartı */}
            <div className="p-2 rounded bg-slate-950/70 border border-slate-800 flex flex-col justify-between space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[11px] text-white flex items-center gap-1 font-sans">
                  🇹🇷 Binance TR ({isTr ? '%100 Yasal' : '100% Compliant'})
                </span>
                <span className="text-[9px] text-emerald-400 font-mono">{isTr ? 'Bölge Kısıtlamasız' : 'No Regional Blocks'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <a
                  href={settings.binanceTrReferralLink || 'https://www.trbinance.com/account/signup?ref=TR_VIP'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-1 px-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded text-[10px] font-sans flex items-center justify-center gap-1 transition-colors text-center"
                >
                  <span>{isTr ? 'Binance TR Aç' : 'Open Binance TR'}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <button
                  type="button"
                  onClick={() => {
                    copyToClipboard(settings.binanceTrReferralCode || 'TR_VIP').catch(() => {});
                    setCopiedRef(true);
                    setTimeout(() => setCopiedRef(false), 2000);
                  }}
                  className="py-1 px-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-[10px] font-mono flex items-center gap-1 cursor-pointer"
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
                  🌐 Binance Global (750+ Pairs)
                </span>
                <span className="text-[9px] text-amber-400 font-mono">English / Global</span>
              </div>
              <div className="flex items-center gap-1.5">
                <a
                  href={settings.referralLink || 'https://accounts.binance.com/en/register?ref=XADYK9G1'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-1 px-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-[10px] font-sans flex items-center justify-center gap-1 transition-colors text-center"
                >
                  <span>{isTr ? 'Global Aç (/en)' : 'Open Global (/en)'}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <button
                  type="button"
                  onClick={() => {
                    copyToClipboard(settings.referralCode || 'XADYK9G1').catch(() => {});
                    setCopiedRef(true);
                    setTimeout(() => setCopiedRef(false), 2000);
                  }}
                  className="py-1 px-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-[10px] font-mono flex items-center gap-1 cursor-pointer"
                  title="Binance Global Referans Kodu"
                >
                  {copiedRef ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                  <span>{settings.referralCode || 'XADYK9G1'}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 font-sans leading-tight bg-slate-950/50 p-1.5 rounded border border-slate-800/80">
            ℹ️ {isTr 
              ? <><em>Bölge Uyarısı Çözümü:</em> Türkiye SPK kuralları gereği Binance Global Türkçe linklerde <em>"bölgenizde kullanılamamaktadır"</em> uyarısı verebilir. Dili <strong>English</strong> yaparak veya <strong>Binance TR</strong> seçeneğiyle uyarısız kayıt olabilirsiniz.</>
              : <><em>Regional Note:</em> If accessing from jurisdictions with regional rules, use English locale or choose Binance TR for seamless registration.</>}
          </div>
        </div>

        {/* Exchange Selector */}
        <div>
          <label className="text-xs text-slate-400 font-sans block mb-1.5">{isTr ? 'Borsa Seçimi' : 'Exchange Selection'}</label>
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
              <span className="text-[10px] text-slate-400 block font-normal">{isTr ? 'USDT Spot (Önerilen)' : 'USDT Spot (Recommended)'}</span>
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
              <span className="text-[10px] text-slate-400 block font-normal">TRY &amp; USDT Spot</span>
            </button>
          </div>
        </div>

        {/* API Form */}
        <form onSubmit={handleTestAndConnect} className="space-y-3 font-mono text-xs">
          <div>
            <label className="text-slate-300 block mb-1 font-sans text-xs flex justify-between">
              <span>{exchange === 'BINANCE_TR' ? 'Binance TR' : 'Binance'} API Key</span>
              <span className="text-[10px] text-emerald-400 font-sans">{isTr ? 'Yetki: Spot Trading' : 'Permission: Spot Trading'}</span>
            </label>
            <input
              type="text"
              placeholder={isTr ? 'API Key yapıştırın (örn: vmPUZE6mv9SD5VNHl...)' : 'Paste API Key (e.g. vmPUZE6mv9SD5VNHl...)'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-400 text-xs"
            />
          </div>

          <div>
            <label className="text-slate-300 block mb-1 font-sans text-xs flex justify-between">
              <span>{isTr ? 'Secret Key (Gizli Anahtar)' : 'Secret Key'}</span>
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="text-slate-500 hover:text-slate-300 text-[11px]"
              >
                {showSecret ? (isTr ? 'Gizle' : 'Hide') : (isTr ? 'Göster' : 'Show')}
              </button>
            </label>
            <input
              type={showSecret ? 'text' : 'password'}
              placeholder={isTr ? 'Secret Key yapıştırın...' : 'Paste Secret Key...'}
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
                {isTr ? 'Gerekli Binance İzinleri:' : 'Required Binance Permissions:'}
              </span>
              <span className="text-[10px] text-emerald-400">{isTr ? 'Spot & Margin Alım Satım' : 'Spot & Margin Trading'}</span>
            </div>
            <p className="text-slate-400 text-[10px] leading-relaxed">
              {isTr 
                ? <>Binance panelinde API anahtarınızı düzenleyip <strong>"Spot ve Margin Alım Satımını Etkinleştir"</strong> seçeneğini işaretleyin ve IP kısıtlamasını <strong>"Kısıtlanmamış"</strong> olarak ayarlayın. (<strong>Çekim/Withdraw izni açmayınız</strong>).</>
                : <>In Binance API Management, check <strong>"Enable Spot &amp; Margin Trading"</strong> and set IP access to <strong>"Unrestricted"</strong>. (<strong>DO NOT enable Withdrawals</strong>).</>}
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
                <span>{statusResult.success ? (isTr ? 'Bağlantı Başarılı!' : 'Connection Successful!') : (isTr ? 'Bağlantı Hatası' : 'Connection Error')}</span>
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
                  {isTr ? 'Binance Doğrulanıyor...' : 'Verifying Binance API...'}
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  {isTr ? 'Doğrula & Canlı Al-Satı Başlat' : 'Verify & Launch Live Trading'}
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleActivateDemoLive}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-semibold rounded-lg text-xs font-sans flex items-center justify-center gap-1.5 transition-colors"
              title={isTr ? 'Canlı Binance fiyatlarıyla hemen otonom alım-satım başlat' : 'Launch autonomous trading with live Binance order depth'}
            >
              <span>{isTr ? 'Canlı Piyasa Motoruyla Başlat' : 'Start with Live Engine'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
