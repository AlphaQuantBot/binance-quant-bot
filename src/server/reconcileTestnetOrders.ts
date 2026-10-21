import fs from 'node:fs';
import { OrderExecution, type Adapter } from './orderExecution';
/** Local journal write + exchange reads only. The adapter's submit method is never reachable. */
export async function reconcileTestnetOrders(file: string, accountId: string, adapter: Adapter) {
  if (!fs.existsSync(file)) throw Error('TESTNET_JOURNAL_NOT_FOUND');
  const preflight = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(preflight.orders) || preflight.orders.some((row: any) => row.accountId !== accountId)) throw Error('TESTNET_ACCOUNT_MISMATCH');
  let found = false;
  const readonly: Adapter = {
    submit: async () => { throw Error('READ_ONLY_RECONCILIATION'); },
    query: async (intent, id) => { const result = await adapter.query(intent, id); found = result !== null; return result; },
  };
  const engine = new OrderExecution(file, readonly);
  try {
    const rows = engine.list();
    if (rows.some(row => row.accountId !== accountId)) throw Error('TESTNET_ACCOUNT_MISMATCH');
    const summaries: {requestId:string; symbol:string; status:string; verified:boolean; executedQty?:string; fees?:{asset:string;amount:string}[]; error?:string}[] = [];
    for (const row of rows) {
      try {
        found = false;
        const result = await engine.reconcile(row.requestId);
        summaries.push({requestId:result.requestId, symbol:result.symbol, status:result.status, verified:found && !!result.confirmation?.settlement && result.status !== 'UNKNOWN', executedQty:result.confirmation?.executedQty, fees:result.confirmation?.settlement?.fees});
      } catch {
        summaries.push({requestId:row.requestId, symbol:row.symbol, status:row.status, verified:false, error:'RECONCILIATION_UNCONFIRMED'});
      }
    }
    return summaries;
  } finally { engine.close(); }
}
