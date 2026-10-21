import { decimal, units } from './exactDecimal';
import type { Confirmation } from './orderExecution';
export type ExecutionTrade = {
  tradeId: string; orderId: string; symbol: string; side: 'BUY'|'SELL';
  quantity: string; quoteQuantity: string; commission: string; commissionAsset: string;
};
export type Settlement = { trades: ExecutionTrade[]; fees: { asset: string; amount: string }[] };
/** Complete cumulative executions only. Fee assets remain separate; no guessed USDT conversion. */
export function settleTrades(order: Confirmation, trades: ExecutionTrade[]): Settlement {
  const seen = new Map<string, ExecutionTrade>();
  const fees = new Map<string, bigint>();
  let quantity = 0n, quote = 0n;
  for (const t of trades) {
    if (!t || typeof t.tradeId !== 'string' || !/^\d{1,30}$/.test(t.tradeId) || t.orderId !== order.orderId || t.symbol !== order.symbol || t.side !== order.side || !/^[A-Z0-9]{1,24}$/.test(t.commissionAsset)) throw Error('TRADE_IDENTITY_MISMATCH');
    const normalized: ExecutionTrade = { tradeId:t.tradeId, orderId:t.orderId, symbol:t.symbol, side:t.side, quantity:t.quantity, quoteQuantity:t.quoteQuantity, commission:t.commission, commissionAsset:t.commissionAsset };
    const previous = seen.get(t.tradeId);
    if (previous) {
      if (JSON.stringify(previous) !== JSON.stringify(normalized)) throw Error('CONFLICTING_TRADE');
      continue;
    }
    const q = units(t.quantity), v = units(t.quoteQuantity), fee = units(t.commission);
    if (q <= 0n || v <= 0n) throw Error('INVALID_TRADE_AMOUNT');
    seen.set(t.tradeId, normalized); quantity += q; quote += v;
    fees.set(t.commissionAsset, (fees.get(t.commissionAsset) ?? 0n) + fee);
  }
  if (quantity !== units(order.executedQty) || quote !== units(order.quoteQty)) throw Error('TRADE_TOTALS_MISMATCH');
  return {
    trades: [...seen.values()].sort((a,b) => BigInt(a.tradeId) < BigInt(b.tradeId) ? -1 : 1),
    fees: [...fees.entries()].sort(([a],[b]) => a.localeCompare(b)).map(([asset, value]) => ({ asset, amount: decimal(value) })),
  };
}
export function validateSettlement(order: Confirmation, settlement: Settlement) {
  if (!settlement || !Array.isArray(settlement.trades) || !Array.isArray(settlement.fees)) throw Error('INVALID_SETTLEMENT');
  const verified = settleTrades(order, settlement.trades);
  if (JSON.stringify(verified) !== JSON.stringify(settlement)) throw Error('INVALID_SETTLEMENT');
}
