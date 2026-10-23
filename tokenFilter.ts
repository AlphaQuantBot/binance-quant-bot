import { Ticker } from '../types/crypto';

export interface StrictFilterConfig {
  minQuoteVolumeUsdt: number; // En az $2.5M USDT 24s hacim
  minPriceChangePercent: number; // En az +%1.5 sağlıklı pozitif ivme (düşen bıçaklar elenir)
  maxPriceChangePercent: number; // En fazla +%18.0 (tepe FOMO ve aşırı alım tuzağı engellenir)
  maxDropFromHighPercent: number; // 24s zirvesinden max %10 çekilme (dağıtım/dump aşamasındakiler elenir)
  minRangePosition: number; // Günlük aralıkta en az %40 seviyesi (alıcı kontrolü)
  maxRangePosition: number; // Günlük aralıkta en fazla %96 (tepe iğnesi engellenir)
  minProfitPotentialScore: number; // Alım için gereken minimum kâr potansiyeli skoru (min 70 / 100)
}

export const DEFAULT_STRICT_FILTER_CONFIG: StrictFilterConfig = {
  minQuoteVolumeUsdt: 2_500_000,
  minPriceChangePercent: 1.5,
  maxPriceChangePercent: 18.0,
  maxDropFromHighPercent: 10.0,
  minRangePosition: 0.40,
  maxRangePosition: 0.96,
  minProfitPotentialScore: 70,
};

export const STABLECOINS_AND_FIAT = new Set([
  'USDCUSDT', 'FDUSDUSDT', 'BUSDUSDT', 'TUSDUSDT', 'USDPUSDT', 
  'EURUSDT', 'AEURUSDT', 'DAIUSDT', 'TRYUSDT', 'USTDUSDT', 
  'WBTCUSDT', 'WBETHUSDT', 'PAXGUSDT'
]);

export interface TokenProfitEvaluation {
  symbol: string;
  price: number;
  change24h: number;
  volumeUsdt: number;
  dropFromHighPercent: number;
  rangePositionPercent: number;
  profitScore: number; // 0 - 100
  scoreBreakdown: {
    volumeScore: number; // max 25
    momentumScore: number; // max 30
    upsideRoomScore: number; // max 25
    volatilityScore: number; // max 20
  };
  passedStrictFilter: boolean;
  rejectionReason?: string;
  recommendedTakeProfitPercent: number;
  recommendedTrailingStopPercent: number;
  summaryExplanation: string;
}

/**
 * Tek bir tokeni sert alım kriterlerinden geçirir ve kâr alma şartlarını puanlar.
 */
export function evaluateTokenStrict(
  ticker: Ticker,
  config: StrictFilterConfig = DEFAULT_STRICT_FILTER_CONFIG,
  busySymbols?: Set<string>
): TokenProfitEvaluation {
  const symbol = ticker.symbol;
  const price = parseFloat(ticker.lastPrice || '0');
  const change24h = parseFloat(ticker.priceChangePercent || '0');
  const volumeUsdt = parseFloat(ticker.quoteVolume || '0');
  const high = parseFloat(ticker.highPrice || '0');
  const low = parseFloat(ticker.lowPrice || '0');

  const defaultFail = (reason: string): TokenProfitEvaluation => ({
    symbol,
    price,
    change24h,
    volumeUsdt,
    dropFromHighPercent: 0,
    rangePositionPercent: 0,
    profitScore: 0,
    scoreBreakdown: { volumeScore: 0, momentumScore: 0, upsideRoomScore: 0, volatilityScore: 0 },
    passedStrictFilter: false,
    rejectionReason: reason,
    recommendedTakeProfitPercent: 3.5,
    recommendedTrailingStopPercent: 1.5,
    summaryExplanation: reason,
  });

  // 1. Temel Sembol Uygunluk Filtresi
  if (!symbol || !symbol.endsWith('USDT') || symbol.includes('UP') || symbol.includes('DOWN')) {
    return defaultFail('Geçersiz parite veya kaldıraçlı token');
  }
  if (STABLECOINS_AND_FIAT.has(symbol)) {
    return defaultFail('Sabit coin veya fiat parite');
  }
  if (busySymbols && busySymbols.has(symbol)) {
    return defaultFail('Zaten açık pozisyonda veya cüzdanda mevcut');
  }
  if (price <= 0 || high <= 0 || low <= 0 || isNaN(price)) {
    return defaultFail('Geçersiz fiyat veya tahta verisi');
  }

  // 2. Sert Likidite ve Hacim Filtresi (Min $2.5M)
  if (volumeUsdt < config.minQuoteVolumeUsdt) {
    return defaultFail(`Yetersiz 24s hacim ($${(volumeUsdt / 1e6).toFixed(2)}M < $${(config.minQuoteVolumeUsdt / 1e6).toFixed(1)}M)`);
  }

  // 3. Sağlıklı Momentum Penceresi (Anti-FOMO ve Anti-Düşüş Kalkanı)
  if (change24h < config.minPriceChangePercent) {
    return defaultFail(`Düşük/negatif ivme (+%${change24h.toFixed(2)} < +%${config.minPriceChangePercent})`);
  }
  if (change24h > config.maxPriceChangePercent) {
    return defaultFail(`Aşırı alım tepe riski (+%${change24h.toFixed(2)} > +%${config.maxPriceChangePercent} FOMO tavanı)`);
  }

  // 4. Zirve Korunumu ve Çekilme Geometrisi
  const dropFromHigh = Math.max(0, ((high - price) / high) * 100);
  if (dropFromHigh > config.maxDropFromHighPercent) {
    return defaultFail(`Zirveden sert düşüş (Günün en yükseğinden -%${dropFromHigh.toFixed(2)} çekilmiş, dağıtım riski)`);
  }

  const range = high - low;
  const rangePosition = range > 0 ? (price - low) / range : 0.5;
  if (rangePosition < config.minRangePosition) {
    return defaultFail(`Kanalın alt yarısında (%${(rangePosition * 100).toFixed(0)} < %${(config.minRangePosition * 100).toFixed(0)} taban baskısı)`);
  }
  if (rangePosition > config.maxRangePosition) {
    return defaultFail(`Tepe iğnesinde sıkışma (%${(rangePosition * 100).toFixed(0)} > %${(config.maxRangePosition * 100).toFixed(0)} tepe direnci)`);
  }

  // 5. Çok Boyutlu Kâr Potansiyeli Puanlaması (0 - 100)
  // Parametre A: Derin Likidite & Kurumsal İlgi (Maks 25 Puan)
  let volumeScore = 14;
  if (volumeUsdt >= 50_000_000) volumeScore = 25;
  else if (volumeUsdt >= 20_000_000) volumeScore = 22;
  else if (volumeUsdt >= 10_000_000) volumeScore = 19;

  // Parametre B: Sağlıklı Kırılım Momenti (Maks 30 Puan)
  // +%3.0 ile +%8.0 arası trend devamı ve patlama için altın orandır
  let momentumScore = 15;
  if (change24h >= 3.0 && change24h <= 8.0) momentumScore = 30;
  else if (change24h > 8.0 && change24h <= 13.0) momentumScore = 25;
  else if (change24h >= 1.5 && change24h < 3.0) momentumScore = 20;

  // Parametre C: Zirveye Uzaklık & Direnç Boşluğu (Maks 25 Puan)
  // Zirvenin %1.5 - %4.5 altında konsolide olan tokenler yeni ATH patlamasına en hazırdır
  let upsideRoomScore = 10;
  if (dropFromHigh >= 1.5 && dropFromHigh <= 4.5) upsideRoomScore = 25;
  else if (dropFromHigh < 1.5) upsideRoomScore = 20;
  else if (dropFromHigh > 4.5 && dropFromHigh <= 7.5) upsideRoomScore = 16;

  // Parametre D: Volatilite Scalp Verimliliği (Maks 20 Puan)
  const rangePct = (range / low) * 100;
  let volatilityScore = 12;
  if (rangePct >= 5.0 && rangePct <= 16.0) volatilityScore = 20;
  else if (rangePct >= 3.0 && rangePct < 5.0) volatilityScore = 15;

  const totalProfitScore = volumeScore + momentumScore + upsideRoomScore + volatilityScore;

  if (totalProfitScore < config.minProfitPotentialScore) {
    return defaultFail(`Kâr potansiyeli skoru yetersiz (${totalProfitScore} / 100 < ${config.minProfitPotentialScore})`);
  }

  // Dinamik ve Optimize Kâr Alma (Take Profit) & Takip Eden Zarar Durdurma Oranı
  // Volatilite ve kırılım derinliğine göre hedef kâr oranını dinamik belirle (min %2.8 - max %6.5)
  const recommendedTakeProfit = parseFloat(Math.min(6.5, Math.max(2.8, (rangePct * 0.35) + 0.5)).toFixed(2));
  const recommendedTrailingStop = parseFloat(Math.min(2.0, Math.max(1.0, recommendedTakeProfit * 0.38)).toFixed(2));

  const summary = `🎯 En Uygun Kâr Şartı: Skor ${totalProfitScore}/100, Hacim: $${(volumeUsdt / 1e6).toFixed(1)}M, İvme: +%${change24h.toFixed(1)}, Tepe Çekilmesi: %${dropFromHigh.toFixed(1)}, Hedef TP: +%${recommendedTakeProfit}`;

  return {
    symbol,
    price,
    change24h,
    volumeUsdt,
    dropFromHighPercent: parseFloat(dropFromHigh.toFixed(2)),
    rangePositionPercent: parseFloat((rangePosition * 100).toFixed(1)),
    profitScore: totalProfitScore,
    scoreBreakdown: {
      volumeScore,
      momentumScore,
      upsideRoomScore,
      volatilityScore
    },
    passedStrictFilter: true,
    recommendedTakeProfitPercent: recommendedTakeProfit,
    recommendedTrailingStopPercent: recommendedTrailingStop,
    summaryExplanation: summary
  };
}

/**
 * 470+ Binance paritesini tarar, tüm sert parametreleri geçenleri kâr alma potansiyeline göre sıralar.
 */
export function getBestBuyCandidates(
  tickers: Ticker[],
  busySymbols?: Set<string>,
  limit: number = 10,
  config: StrictFilterConfig = DEFAULT_STRICT_FILTER_CONFIG
): TokenProfitEvaluation[] {
  if (!Array.isArray(tickers) || tickers.length === 0) return [];

  const candidates: TokenProfitEvaluation[] = [];

  for (const t of tickers) {
    const evaluation = evaluateTokenStrict(t, config, busySymbols);
    if (evaluation.passedStrictFilter) {
      candidates.push(evaluation);
    }
  }

  // En yüksek kâr potansiyeli skoru ve en yüksek hacme göre sırala
  candidates.sort((a, b) => b.profitScore - a.profitScore || b.volumeUsdt - a.volumeUsdt);

  return candidates.slice(0, limit);
}
