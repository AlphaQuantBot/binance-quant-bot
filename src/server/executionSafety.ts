import type { RequestHandler } from 'express';

/** Phase 1: live execution stays paused until authentication and reconciliation are implemented. */
export const liveExecutionGuard: RequestHandler = (_req, res) => {
  return res.status(503).json({
    success: false,
    code: 'LIVE_EXECUTION_PAUSED',
    error: 'Canlı emir yürütme geçici olarak durduruldu. Borsa onayı ve pozisyon mutabakatı tamamlanmadan emir gönderilmiyor.',
    executionState: 'NOT_SUBMITTED',
    retryable: false,
  });
};

export function exchangeCooldownResponse(until: number, now = Date.now()) {
  return {
    success: false,
    code: 'EXCHANGE_COOLDOWN',
    error: 'Borsa bağlantısı beklemede. Emir gönderilmedi; bakiye ve pozisyon değiştirilmedi.',
    executionState: 'NOT_SUBMITTED',
    retryAfterSeconds: Math.max(1, Math.ceil((until - now) / 1000)),
  };
}
