import React from 'react';
import { TradeOrder, SpotWalletBalance } from '../types/crypto';
import { formatCryptoPrice, formatUSDT } from '../utils/cryptoMath';
import { CheckCircle2, Clock, XCircle, ArrowUpRight, ArrowDownRight, Zap, TrendingUp, Sparkles } from 'lucide-react';

interface OrdersTableProps {
  orders: TradeOrder[];
  currentPrices: Record<string, number>;
  onClosePosition: (orderId: string) => void;
  onCancelOrder: (orderId: string) => void;
  spotBalances?: SpotWalletBalance[];
  onCloseSpotHolding?: (asset: string) => void;
  isClosingSpotHolding?: boolean;
  onCreateBnbBudget?: (amount?: number) => void;
  isCreatingBnbBudget?: boolean;
}

export const OrdersTable: React.FC<OrdersTableProps> = ({
  orders,
  currentPrices,
  onClosePosition,
  onCancelOrder,
  spotBalances = [],
  onCloseSpotHolding,
  isClosingSpotHolding = false,
  onCreateBnbBudget,
  isCreatingBnbBudget = false
}) => {
  const [filter, setFilter] = React.useState<'all' | 'open' | 'closed'>('all');

  const activeSpotHoldings = React.useMemo(() => {
    return spotBalances.filter(b => {
      if (b.asset === 'USDT' || b.asset === 'TRY') return false;
      const liveP = currentPrices[b.symbol || `${b.asset}USDT`] || b.currentPrice || (b.asset === 'OGN' ? 0.03884 : 0);
      const est = (b.estimatedUsd && b.estimatedUsd > 0) ? b.estimatedUsd : (b.free * liveP);
      return est >= 1.0;
    });
  }, [spotBalances, currentPrices]);

  const filteredOrders = React.useMemo(() => {
    const seen = new Set<string>();
    return orders.filter((o) => {
      if (!o || !o.id || seen.has(o.id)) return false;
      seen.add(o.id);
      if (filter === 'open') return o.status === 'PENDING';
      if (filter === 'closed') return o.status === 'FILLED' || o.status === 'CANCELLED';
      return true;
    });
  }, [orders, filter]);

  return (
    <div className="bg-[#0b101d] rounded-lg border border-slate-800/80 p-3 flex flex-col h-full text-xs font-mono select-none space-y-3">
      <p role="status" className="text-xs text-amber-300 p-2">Yerel işlem kayıtları • Borsa mutabakatı yapılmadı; bu liste gerçekleşmiş borsa işleminin kanıtı değildir.</p>
      {/* Live Binance Spot Holdings Tracker (Direct Real Wallet Positions) */}
      {activeSpotHoldings.length > 0 && (
        <div className="p-3 bg-gradient-to-r from-emerald-950/40 via-slate-900/90 to-cyan-950/40 border border-emerald-500/40 rounded-lg shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-emerald-500/20">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold text-slate-100 font-sans text-xs">Canlı Binance Spot Varlıkları (Açık Pozisyonlar & Komisyon Kalkanı)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                {activeSpotHoldings.length} Aktif Varlık
              </span>
            </div>
            <div className="text-[10px] text-emerald-300 font-sans flex items-center gap-2">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>Kâr Kilitleyici: %0.35+ kârda piyasa fiyatından satılır, kâr sermayeye eklenir.</span>
              {onCreateBnbBudget && (
                <button
                  type="button"
                  disabled={isCreatingBnbBudget}
                  onClick={() => onCreateBnbBudget(5)}
                  className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 font-bold transition-colors"
                >
                  {isCreatingBnbBudget ? 'Alınıyor...' : '🛡️ BNB Komisyon Bütçesi Al (5$)'}
                </button>
              )}
            </div>
          </div>

          {/* Real-time Binance Wallet Equivalence Reconciliation Bar */}
          {(() => {
            const usdtHolding = spotBalances.find(b => b.asset === 'USDT');
            const freeCash = usdtHolding ? usdtHolding.free : 0;
            const bnbHolding = spotBalances.find(b => b.asset === 'BNB');
            const bnbVal = bnbHolding ? (bnbHolding.estimatedUsd || (bnbHolding.free * (currentPrices['BNBUSDT'] || bnbHolding.currentPrice || 717))) : 0;
            const totalSpotEquity = spotBalances.reduce((sum, b) => {
              const liveP = currentPrices[b.symbol || `${b.asset}USDT`] || b.currentPrice || 0;
              const est = (b.estimatedUsd && b.estimatedUsd > 0) ? b.estimatedUsd : (b.free * (b.asset === 'USDT' ? 1 : liveP));
              return sum + est;
            }, 0);
            const openCoinsVal = Math.max(0, totalSpotEquity - freeCash - bnbVal);

            return (
              <div className="mb-3 p-2.5 rounded-lg bg-slate-950/80 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-sans">Binance Toplam Varlık Değeri:</span>
                  <span className="text-emerald-400 font-bold text-sm tabular-nums">${totalSpotEquity.toFixed(2)} USDT</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                    <span className="text-slate-500 mr-1">Serbest Nakit:</span>
                    <strong className="text-emerald-300 tabular-nums">${freeCash.toFixed(2)}</strong>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-900 border border-cyan-800/40 text-cyan-300">
                    <span className="text-slate-500 mr-1">Pozisyondaki Coin'ler:</span>
                    <strong className="tabular-nums">${openCoinsVal.toFixed(2)}</strong>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-900 border border-amber-800/40 text-amber-300">
                    <span className="text-slate-500 mr-1">BNB Komisyon Kalkanı:</span>
                    <strong className="tabular-nums">${bnbVal.toFixed(2)}</strong>
                  </span>
                </div>
              </div>
            );
          })()}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {activeSpotHoldings.map((h) => {
              const liveP = currentPrices[h.symbol || `${h.asset}USDT`] || h.currentPrice || (h.asset === 'OGN' ? 0.03884 : 0);
              const estValue = (h.estimatedUsd && h.estimatedUsd > 0) ? h.estimatedUsd : (h.free * liveP);
              const hasPnl = h.netPnl !== undefined;
              const isProfit = (h.netPnl || 0) >= 0;
              const isBnbShield = h.asset === 'BNB';

              return (
                <div 
                  key={`spot-card-${h.asset}`}
                  className={`bg-slate-950/80 border p-2.5 rounded-lg flex flex-col justify-between transition-all ${
                    isBnbShield ? 'border-amber-500/40 hover:border-amber-400' : 'border-slate-800 hover:border-emerald-500/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`px-1.5 py-0.5 rounded font-bold text-xs border ${
                        isBnbShield 
                          ? 'bg-amber-950 text-amber-300 border-amber-700/50' 
                          : 'bg-cyan-950 text-cyan-300 border-cyan-800/40'
                      }`}>
                        {h.asset}/USDT
                      </span>
                      {isBnbShield && (
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded font-bold border border-amber-500/30">
                          KOMİSYON KALKANI (%25)
                        </span>
                      )}
                      <span className="text-slate-400 text-[11px] tabular-nums">
                        {h.free.toLocaleString()} {h.asset}
                      </span>
                    </div>
                    <span className="font-bold text-slate-200 tabular-nums">
                      ≈ ${estValue.toFixed(2)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1 text-[11px] bg-slate-900/60 p-1.5 rounded border border-slate-800/60 mb-2 font-mono">
                    <div>
                      <span className="text-slate-500 block text-[9px]">Giriş Fiyatı:</span>
                      <span className="text-slate-300 tabular-nums font-semibold">
                        {h.entryPrice ? `$${h.entryPrice}` : (h.asset === 'OGN' ? '$0.03716' : 'Borsada')}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px]">Anlık Fiyat:</span>
                      <span className="text-emerald-400 tabular-nums font-semibold">
                        {liveP > 0 ? `$${liveP}` : '-'}
                      </span>
                    </div>
                    <div className="col-span-2 pt-1 border-t border-slate-800/50 flex items-center justify-between">
                      <span className="text-slate-500 text-[9px]">
                        {isBnbShield ? 'Komisyon İndirim Oranı:' : 'Net Kâr (Komisyon Sonrası):'}
                      </span>
                      <span className={`font-bold tabular-nums text-xs ${
                        isBnbShield ? 'text-amber-400' : (isProfit ? 'text-emerald-400' : 'text-rose-400')
                      }`}>
                        {isBnbShield 
                          ? '%0.075 (%25 İndirim Aktif)' 
                          : (hasPnl ? `${isProfit ? '+' : ''}$${h.netPnl?.toFixed(2)} USDT (${h.netPnlPercent?.toFixed(2)}%)` : 'Hesaplanıyor...')}
                      </span>
                    </div>
                  </div>

                  {isBnbShield ? (
                    <div className="text-[10px] text-amber-200/80 bg-amber-950/30 border border-amber-500/20 p-1.5 rounded flex items-center justify-between font-sans">
                      <span>🛡️ Komisyonlar BNB ile ödenir (0.075%)</span>
                      {onCreateBnbBudget && (
                        <button
                          type="button"
                          disabled={isCreatingBnbBudget}
                          onClick={() => onCreateBnbBudget(5)}
                          className="text-[10px] text-amber-300 hover:underline font-bold"
                        >
                          +5$ Ekle
                        </button>
                      )}
                    </div>
                  ) : onCloseSpotHolding && (
                    <button
                      type="button"
                      disabled={isClosingSpotHolding}
                      onClick={() => onCloseSpotHolding(h.asset)}
                      className="w-full py-1.5 px-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-50 text-slate-950 font-bold rounded text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm font-sans"
                      title={`${h.asset} tokenini hemen piyasa fiyatından sat, kârı al ve serbest USDT sermayesine ekle`}
                    >
                      <Zap className="w-3.5 h-3.5 fill-current" />
                      <span>Kârı Al & Sermayeye Ekle ({h.asset} Sat)</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Table Header & Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/70">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-200 font-sans text-sm">İşlem & Pozisyon Geçmişi</span>
          <span className="text-slate-500">·</span>
          <span className="text-slate-400 text-xs">{orders.length} Kayıt</span>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center bg-slate-900/80 p-0.5 rounded border border-slate-800">
          <button
            onClick={() => setFilter('all')}
            className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
              filter === 'all' ? 'bg-slate-700 text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Tümü
          </button>
          <button
            onClick={() => setFilter('open')}
            className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
              filter === 'open' ? 'bg-slate-700 text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Açık Pozisyonlar
          </button>
          <button
            onClick={() => setFilter('closed')}
            className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
              filter === 'closed' ? 'bg-slate-700 text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Tamamlananlar
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto flex-1">
        {filteredOrders.length === 0 ? (
          <div className="py-8 text-center text-slate-500 font-sans">
            Henüz işlem kaydı bulunmuyor. Terminal veya bot üzerinden işlem başlatabilirsiniz.
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-slate-500 text-[10px] border-b border-slate-800/60 pb-1">
                <th className="py-1.5 px-2">Zaman</th>
                <th className="py-1.5 px-2">Sembol</th>
                <th className="py-1.5 px-2">Yön</th>
                <th className="py-1.5 px-2">Giriş Fiyatı</th>
                <th className="py-1.5 px-2">Güncel Fiyat</th>
                <th className="py-1.5 px-2">Miktar</th>
                <th className="py-1.5 px-2">Tutar (USDT)</th>
                <th className="py-1.5 px-2">Kâr / Zarar (PnL)</th>
                <th className="py-1.5 px-2">Kaynak</th>
                <th className="py-1.5 px-2 text-right">Eylem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {filteredOrders.map((order, idx) => {
                const livePrice = currentPrices[order.symbol] || order.price;
                const isBuy = order.side === 'BUY';
                const pnlPercent = order.status === 'PENDING'
                  ? (isBuy ? ((livePrice - order.price) / order.price) * 100 : ((order.price - livePrice) / order.price) * 100)
                  : (order.pnlPercent || 0);
                const roundTripFee = order.binanceFeeUsdt !== undefined 
                  ? order.binanceFeeUsdt 
                  : (order.totalUsdt * 0.0020);
                const rawPnlUsdt = (order.totalUsdt * pnlPercent) / 100;
                const netPnlUsdt = order.netPnl !== undefined 
                  ? order.netPnl 
                  : (order.status === 'PENDING' ? (rawPnlUsdt - roundTripFee) : rawPnlUsdt);
                const netPnlPercent = order.netPnlPercent !== undefined
                  ? order.netPnlPercent
                  : (order.status === 'PENDING' ? (pnlPercent - 0.20) : pnlPercent);
                const isNetProfitable = netPnlUsdt >= 0;

                return (
                  <tr key={`order-${order.id}-${idx}`} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-1.5 px-2 text-slate-400 text-[10px] whitespace-nowrap">
                      {new Date(order.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="py-1.5 px-2 font-bold text-slate-200">
                      {order.symbol}
                    </td>
                    <td className="py-1.5 px-2">
                      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        isBuy ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {isBuy ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {order.side}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 text-slate-300 tabular-nums">
                      {formatCryptoPrice(order.price)}
                    </td>
                    <td className="py-1.5 px-2 text-slate-300 tabular-nums">
                      {formatCryptoPrice(livePrice)}
                    </td>
                    <td className="py-1.5 px-2 text-slate-400 tabular-nums">
                      {order.amount.toFixed(4)}
                    </td>
                    <td className="py-1.5 px-2 text-slate-300 tabular-nums">
                      {formatUSDT(order.totalUsdt)}
                    </td>
                    <td className="py-1.5 px-2 tabular-nums">
                      <div className="flex flex-col">
                        <span className={`font-semibold ${isNetProfitable ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isNetProfitable ? '+' : ''}{netPnlPercent.toFixed(2)}% (Net: {formatUSDT(netPnlUsdt)})
                        </span>
                        <span className="text-[9px] text-slate-500 font-normal">
                          Brüt: {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}% · Komisyon: -${roundTripFee.toFixed(3)}
                        </span>
                      </div>
                    </td>
                    <td className="py-1.5 px-2 text-slate-400 text-[10px]">
                      {order.botName ? (
                        <span className="text-cyan-400">{order.botName}</span>
                      ) : order.executionSource === 'AI_TRIGGER' ? (
                        <span className="text-emerald-400">AI Tetikleyici</span>
                      ) : (
                        <span>Manuel</span>
                      )}
                    </td>
                    <td className="py-1.5 px-2 text-right">
                      {order.status === 'PENDING' ? (
                        <button
                          onClick={() => onClosePosition(order.id)}
                          className="px-2 py-0.5 bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white rounded text-[10px] transition-colors"
                        >
                          Pozisyonu Kapat
                        </button>
                      ) : (
                        <span className="text-slate-500 text-[10px]">Tamamlandı</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

