import { CapitalLedger, validateFundingIntent, type Debit } from './capitalLedger';
import { OrderExecution, type Adapter, type Intent } from './orderExecution';
import type { AccountSnapshot } from './accountSnapshot';
import { units } from './exactDecimal';
export type FundingPlan = {baseAsset:string; quoteAsset:string; buyQuoteBudget?:string; feeDebits:Debit[]};
export type AccountAdapter = Adapter & {accountSnapshot():Promise<AccountSnapshot>};
function debitsFor(i:Intent, p:FundingPlan): Debit[] {
  validateFundingIntent(i);
  if (!p || !/^[A-Z0-9]{1,24}$/.test(p.baseAsset) || !/^[A-Z0-9]{1,24}$/.test(p.quoteAsset) || p.baseAsset===p.quoteAsset || i.symbol!==p.baseAsset+p.quoteAsset || !Array.isArray(p.feeDebits) || !p.feeDebits.length) throw Error('INVALID_FUNDING_PLAN');
  if (i.side==='BUY' && (!p.buyQuoteBudget || units(p.buyQuoteBudget)<=0n)) throw Error('BUY_QUOTE_BUDGET_REQUIRED');
  // Server-owned funding inputs; fee conversion and MARKET slippage bounds are not inferred here.
  return [{asset:i.side==='BUY'?p.quoteAsset:p.baseAsset,amount:i.side==='BUY'?p.buyQuoteBudget!:i.quantity},...p.feeDebits];
}
/** Future server-worker entry point; currently used only by fixture tests and read-only account audit. */
export class FundedExecution {
  private orders:OrderExecution;
  private capital:CapitalLedger;
  private busy=false;
  constructor(orderFile:string,capitalFile:string,private accountId:string,private adapter:AccountAdapter,now:()=>number=Date.now) {
    this.orders=new OrderExecution(orderFile,{
      submit:adapter.submit.bind(adapter),
      query:async(i,id)=>{const result=await adapter.query(i,id);if(!result)throw Error('ORDER_NOT_FOUND_ON_EXCHANGE');return result;},
    });
    try{this.capital=new CapitalLedger(capitalFile,accountId,now);}catch(e){this.orders.close();throw e;}
  }
  async refresh() {
    if(this.busy)throw Error('FUNDED_EXECUTION_BUSY');
    this.busy=true;this.capital.invalidate();
    try {
      // Reconcile all locally known orders first, including canceled partial fills and their fees.
      for(const row of this.orders.list())await this.orders.reconcile(row.requestId);
      const snapshot=await this.adapter.accountSnapshot();
      return {...this.capital.reconcile(snapshot,this.orders.list()),snapshot};
    } finally {this.busy=false;}
  }
  async submit(intent:Intent,plan:FundingPlan) {
    if(this.busy)throw Error('FUNDED_EXECUTION_BUSY');
    if(intent.accountId!==this.accountId)throw Error('CAPITAL_ACCOUNT_MISMATCH');
    const debits=debitsFor(intent,plan);
    const oldHold=this.capital.existing(intent.requestId), oldOrder=this.orders.list().find(r=>r.requestId===intent.requestId);
    if(!!oldHold!==!!oldOrder)throw Error('RESERVATION_ORDER_REVIEW_REQUIRED');
    // Persist first, in a separately locked journal. A crash between journals leaves a blocking hold.
    this.capital.reserve(intent,debits);
    this.busy=true;this.capital.invalidate();
    try{return await this.orders.submit(intent);}finally{this.busy=false;}
  }
  available(asset:string){return this.capital.available(asset);}
  list(){return this.orders.list();}
  close(){if(this.busy)throw Error('FUNDED_EXECUTION_BUSY');this.orders.close();this.capital.close();}
}
