import React, { useState } from 'react';
import { 
  Cpu, 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  Target, 
  RefreshCw, 
  Zap, 
  CheckCircle2, 
  Sliders, 
  Layers,
  ArrowRight
} from 'lucide-react';
import { AIPredictionResult, StrategyOptimizationResult, Ticker } from '../types/crypto';
import { formatCryptoPrice, formatUSDT } from '../utils/cryptoMath';

interface AIPredictionPanelProps {
  selectedSymbol: string;
  currentTicker: Ticker | null;
  prediction: AIPredictionResult | null;
  isLoadingPrediction: boolean;
  onRefreshPrediction: () => void;
  onApplyAIToBot: (prediction: AIPredictionResult) => void;
}

export const AIPredictionPanel: React.FC<AIPredictionPanelProps> = ({
  selectedSymbol,
  currentTicker,
  prediction,
  isLoadingPrediction,
  onRefreshPrediction,
  onApplyAIToBot,
}) => {
  const [optimizerResult, setOptimizerResult] = useState<StrategyOptimizationResult | null>(null);
  const [isLoadingOptimizer, setIsLoadingOptimizer] = useState(false);
  const [riskProfile, setRiskProfile] = useState<'Düşük Risk / Koruma' | 'Dengeli / Büyüme' | 'Agresif Scalping'>('Dengeli / Büyüme');

  const handleRunOptimizer = async () => {
    setIsLoadingOptimizer(true);
    try {
      const res = await fetch('/api/ai/optimize-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botStrategy: 'AI Volatility Scalper & Grid',
          riskProfile,
          currentWinRate: 72,
          totalTrades: 58,
          maxDrawdown: 3.4
        }),
      });
      const data = await res.json();
      if (data.success && data.result) {
        setOptimizerResult(data.result);
      }
    } catch (err) {
      console.error('Failed to run strategy optimizer:', err);
    } finally {
      setIsLoadingOptimizer(false);
    }
  };

  const getSignalBadgeColor = (sig?: string) => {
    switch (sig) {
      case 'STRONG_BUY': return 'bg-emerald-500 text-slate-950 border-emerald-400 font-extrabold';
      case 'BUY': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 font-bold';
      case 'SELL': return 'bg-rose-500/20 text-rose-400 border-rose-500/40 font-bold';
      case 'STRONG_SELL': return 'bg-rose-600 text-white border-rose-400 font-extrabold';
      default: return 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold';
    }
  };

  const getSignalLabel = (sig?: string) => {
    switch (sig) {
      case 'STRONG_BUY': return 'GÜÇLÜ ALIM (STRONG BUY)';
      case 'BUY': return 'ALIM (BUY)';
      case 'SELL': return 'SATIM (SELL)';
      case 'STRONG_SELL': return 'GÜÇLÜ SATIM (STRONG SELL)';
      default: return 'NÖTR / BEKLE (NEUTRAL)';
    }
  };

  const lastPrice = currentTicker ? parseFloat(currentTicker.lastPrice) : 94000;

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-[#0b101d] rounded-lg border border-slate-800/80 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-cyan-600 to-emerald-500 p-[1px]">
            <div className="w-full h-full bg-[#080d17] rounded-[7px] flex items-center justify-center">
              <Cpu className="w-5 h-5 text-cyan-400 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white font-sans">
                Gemini Yapay Zeka Fiyat Tahminleme & Sinyal Motoru
              </h2>
              <span className="text-[10px] font-mono bg-cyan-950/60 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/30">
                Gemini 3.8 Flash Kantitatif Model
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              {selectedSymbol} emir defteri, RSI, Bollinger bandı ve hacim sapmalarını analiz ederek en yüksek kârlılığa sahip pozisyonu belirler.
            </p>
          </div>
        </div>

        <button
          onClick={onRefreshPrediction}
          disabled={isLoadingPrediction}
          className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400 text-white font-bold rounded-md text-xs flex items-center gap-2 transition-all shadow-md shadow-cyan-500/10 disabled:opacity-60 font-sans"
        >
          <RefreshCw className={`w-4 h-4 ${isLoadingPrediction ? 'animate-spin' : ''}`} />
          {isLoadingPrediction ? 'Yapay Zeka Analiz Ediyor...' : 'Canlı AI Analizi Başlat'}
        </button>
      </div>

      {/* Main Prediction Display Grid */}
      {prediction ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Column 1: Core Signal & Gauge */}
          <div className="bg-[#0b101d] rounded-lg border border-slate-800/80 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>Algoritmik Karar</span>
                <span className="font-mono">{selectedSymbol}</span>
              </div>

              {/* Signal Badge */}
              <div className={`p-3 rounded-lg border text-center my-2 text-sm uppercase tracking-wide transition-all shadow-sm ${getSignalBadgeColor(prediction.signal)}`}>
                {getSignalLabel(prediction.signal)}
              </div>

              {/* Confidence Score Bar */}
              <div className="mt-4 p-3 bg-slate-900/60 rounded border border-slate-800 space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Model Doğruluk Güveni:</span>
                  <span className="font-bold text-cyan-400 tabular-nums">%{prediction.confidenceScore}</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-teal-500 to-cyan-400 rounded-full transition-all duration-700"
                    style={{ width: `${prediction.confidenceScore}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>Piyasa Rejimi:</span>
                  <span className="text-slate-300 font-semibold">{prediction.marketRegime}</span>
                </div>
              </div>

              {/* Target & Risk/Reward */}
              <div className="grid grid-cols-2 gap-2 mt-3 font-mono text-xs">
                <div className="p-2.5 bg-slate-900/50 rounded border border-slate-800">
                  <span className="text-[10px] text-slate-500 block mb-0.5">Kısa Vade TP1</span>
                  <span className="font-bold text-emerald-400 tabular-nums">
                    {formatCryptoPrice(prediction.targetPriceShortTerm)}
                  </span>
                  <span className="text-[10px] text-emerald-500 block mt-0.5">
                    (+%{prediction.suggestedTakeProfitPercent})
                  </span>
                </div>

                <div className="p-2.5 bg-slate-900/50 rounded border border-slate-800">
                  <span className="text-[10px] text-slate-500 block mb-0.5">Önerilen Stop-Loss</span>
                  <span className="font-bold text-rose-400 tabular-nums">
                    {formatCryptoPrice(prediction.stopLossPrice)}
                  </span>
                  <span className="text-[10px] text-rose-500 block mt-0.5">
                    (-%{prediction.suggestedStopLossPercent})
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2 font-mono text-xs">
                <div className="p-2 bg-slate-900/40 rounded border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block">Risk / Kazanç Oranı</span>
                  <span className="font-semibold text-slate-200 tabular-nums">{prediction.riskRewardRatio}</span>
                </div>
                <div className="p-2 bg-slate-900/40 rounded border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block">Önerilen Kasa Payı</span>
                  <span className="font-semibold text-cyan-400 tabular-nums">%{prediction.recommendedPositionSizePercent}</span>
                </div>
              </div>
            </div>

            {/* Launch Bot with Signal Button */}
            <button
              onClick={() => onApplyAIToBot(prediction)}
              className="w-full mt-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-500/10 font-sans"
            >
              <Zap className="w-4 h-4" />
              Tek Tıkla Bu Sinyalle Bot Başlat
            </button>
          </div>

          {/* Column 2: Reasoning & Key Levels */}
          <div className="bg-[#0b101d] rounded-lg border border-slate-800/80 p-4 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wide font-sans mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                Yapay Zeka Analiz Özeti
              </h3>

              <div className="p-3 bg-slate-900/60 rounded border border-slate-800 text-xs text-slate-300 leading-relaxed font-sans mb-3">
                {prediction.summaryAnalysis}
              </div>

              {/* Support & Resistance Table */}
              <div className="space-y-2 font-mono text-xs mb-3">
                <div className="flex items-center justify-between p-2 bg-slate-900/40 rounded border border-slate-800">
                  <span className="text-slate-400">Kritik Direnç (Resistance):</span>
                  <span className="font-bold text-rose-400 tabular-nums">{formatCryptoPrice(prediction.keyResistance)}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-slate-900/40 rounded border border-slate-800">
                  <span className="text-slate-400">Mevcut Fiyat Seviyesi:</span>
                  <span className="font-bold text-slate-100 tabular-nums">{formatCryptoPrice(lastPrice)}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-slate-900/40 rounded border border-slate-800">
                  <span className="text-slate-400">Kritik Destek (Support):</span>
                  <span className="font-bold text-emerald-400 tabular-nums">{formatCryptoPrice(prediction.keySupport)}</span>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 font-sans p-2 bg-slate-900/30 rounded border border-slate-800/60">
              ⚡ Bot motoru bu seviyeleri sürekli gözlemler; direnç kırılımında otomatik kar realizasyonu yapar.
            </div>
          </div>

          {/* Column 3: Recommended Action Plan */}
          <div className="bg-[#0b101d] rounded-lg border border-slate-800/80 p-4 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wide font-sans mb-3 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-emerald-400" />
                Botun İzleyeceği Somut Adımlar
              </h3>

              <div className="space-y-2.5">
                {prediction.actionSteps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 p-2.5 bg-slate-900/50 rounded border border-slate-800/80 text-xs">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="text-slate-300 font-sans leading-snug">{step}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/70 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>Risk Protokolü:</span>
              <span className="text-emerald-400 font-semibold">Aktif Koruma Devrede</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#0b101d] rounded-lg border border-slate-800/80 p-12 text-center">
          <Cpu className="w-10 h-10 text-cyan-400 mx-auto mb-3 animate-bounce" />
          <h3 className="text-sm font-semibold text-slate-200 mb-1 font-sans">
            Yapay Zeka Analizini Başlatın
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-4 font-sans">
            Seçili sembol ({selectedSymbol}) için en güncel teknik göstergeler ve emir defteri derinliği taranarak yüksek doğruluklu sinyal üretilir.
          </p>
          <button
            onClick={onRefreshPrediction}
            className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400 text-white font-bold rounded-md text-xs inline-flex items-center gap-2 font-sans"
          >
            <RefreshCw className="w-4 h-4" />
            Şimdi Analiz Et
          </button>
        </div>
      )}

      {/* Strategy Auto-Optimizer Section */}
      <div className="bg-[#0b101d] rounded-lg border border-slate-800/80 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80 mb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white font-sans">
              Yapay Zeka Destekli Strateji Optimizasyon Motoru
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={riskProfile}
              onChange={(e) => setRiskProfile(e.target.value as any)}
              className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-300 font-sans focus:outline-none"
            >
              <option value="Düşük Risk / Koruma">Düşük Risk / Sermaye Koruma</option>
              <option value="Dengeli / Büyüme">Dengeli / Kâr Odaklı Büyüme</option>
              <option value="Agresif Scalping">Agresif Altcoin Scalping</option>
            </select>

            <button
              onClick={handleRunOptimizer}
              disabled={isLoadingOptimizer}
              className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded text-xs transition-colors disabled:opacity-60 font-sans"
            >
              {isLoadingOptimizer ? 'Optimize Ediliyor...' : 'Stratejimi Optimize Et'}
            </button>
          </div>
        </div>

        {optimizerResult ? (
          <div className="space-y-3 font-mono text-xs">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="p-2.5 bg-slate-900/60 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Önerilen Trailing Stop</span>
                <span className="font-bold text-emerald-400 text-sm">%{optimizerResult.recommendedTrailingStop}</span>
              </div>
              <div className="p-2.5 bg-slate-900/60 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Önerilen Take-Profit</span>
                <span className="font-bold text-emerald-400 text-sm">%{optimizerResult.recommendedTakeProfit}</span>
              </div>
              <div className="p-2.5 bg-slate-900/60 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 block">DCA Katlayıcısı</span>
                <span className="font-bold text-cyan-400 text-sm">{optimizerResult.dcaMultiplier}x</span>
              </div>
              <div className="p-2.5 bg-slate-900/60 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Beklenen Kâr Artışı</span>
                <span className="font-bold text-amber-400 text-sm">{optimizerResult.expectedProfitIncreasePercent}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-900/40 rounded border border-slate-800 text-slate-300 font-sans text-xs">
              <strong className="text-white block mb-1">Risk & Volatilite Değerlendirmesi:</strong>
              {optimizerResult.riskAssessment}
            </div>

            <div className="space-y-1 text-slate-400 font-sans text-xs">
              <strong className="text-slate-300 block mb-1">Önerilen Otomatik Kurallar:</strong>
              {optimizerResult.rules.map((r, i) => (
                <div key={i} className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{r}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400 font-sans">
            Mevcut piyasa dalgalanmasına göre botunuzun trailing stop, TP ve emir bekleme sürelerini saniyeler içinde otomatik olarak optimize etmek için yukarıdaki butona tıklayın.
          </p>
        )}
      </div>
    </div>
  );
};
