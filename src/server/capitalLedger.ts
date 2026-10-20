import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { decimal, units } from './exactDecimal';
import { accountDiscrepancies, validateAccountSnapshot, type AccountSnapshot } from './accountSnapshot';
import type { Intent, Record as OrderRecord } from './orderExecution';
export type Debit = {asset:string; amount:string};
type Hold = {intent:Intent; debits:Debit[]; settled:boolean};
function identity(i:Intent) { return JSON.stringify([i.requestId,i.accountId,i.symbol,i.side,i.quantity,...(i.limitPrice===undefined?[]:[i.limitPrice]),...(i.stopPrice===undefined?[]:['STOP_LOSS_LIMIT',i.stopPrice])]); }
function normalizeDebits(debits: Debit[]): Debit[] {
  if (!Array.isArray(debits) || !debits.length || debits.length > 10) throw Error('INVALID_FUNDING_REQUIREMENT');
  const result = new Map<string,bigint>();
  for (const d of debits) {
    if (!d || typeof d.asset !== 'string' || !/^[A-Z0-9]{1,24}$/.test(d.asset) || units(d.amount) <= 0n) throw Error('INVALID_FUNDING_REQUIREMENT');
    result.set(d.asset,(result.get(d.asset) ?? 0n) + units(d.amount));
  }
  return [...result].sort(([a],[b]) => a.localeCompare(b)).map(([asset,value]) => ({asset,amount:decimal(value)}));
}
/** Local holds are authoritative only for one locked journal. Persisted balances NEVER authorize after restart. */
export class CapitalLedger {
  private holds: Hold[] = [];
  private snapshot?: AccountSnapshot;
  private closed = false;
  private released = false;
  private fd:number;
  constructor(private file:string, private accountId:string, private now:()=>number=Date.now, private allowProtectiveStops=false) {
    if(typeof accountId!=='string'||!/^[\w-]{1,80}$/.test(accountId))throw Error('INVALID_CAPITAL_ACCOUNT');
    fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});
    this.fd=fs.openSync(file+'.lock','wx',0o600);
    try {
      if (fs.existsSync(file)) {
        const data = JSON.parse(fs.readFileSync(file,'utf8'));
        if (data.version !== 1 || data.accountId !== accountId || !Array.isArray(data.holds)) throw Error('INVALID_CAPITAL_JOURNAL');
        const seen = new Set<string>();
        this.holds = data.holds.map((h:Hold) => {
          if (!h?.intent || h.intent.accountId !== accountId || typeof h.settled !== 'boolean' || seen.has(h.intent.requestId)) throw Error('INVALID_CAPITAL_JOURNAL');
          validateFundingIntent(h.intent,this.allowProtectiveStops); seen.add(h.intent.requestId);
          return {intent:h.intent,debits:normalizeDebits(h.debits),settled:h.settled};
        });
      }
    } catch(e) {fs.closeSync(this.fd);fs.unlinkSync(file+'.lock');throw e;}
  }
  private open() {if(this.closed)throw Error('CAPITAL_JOURNAL_CLOSED');}
  private persist() {
    const tmp=this.file+'.'+randomUUID()+'.tmp';let fd:number|undefined;
    try {
      fd=fs.openSync(tmp,'wx',0o600);fs.writeFileSync(fd,JSON.stringify({version:1,accountId:this.accountId,holds:this.holds}));fs.fsyncSync(fd);fs.closeSync(fd);fd=undefined;
      fs.renameSync(tmp,this.file);const dir=fs.openSync(path.dirname(this.file),'r');try{fs.fsyncSync(dir);}finally{fs.closeSync(dir);}
    }catch(e){this.closed=true;this.snapshot=undefined;throw e;}finally{if(fd!==undefined)fs.closeSync(fd);if(fs.existsSync(tmp))fs.unlinkSync(tmp);}
  }
  invalidate() {this.snapshot=undefined;}
  existing(requestId:string) {this.open();return structuredClone(this.holds.find(h=>h.intent.requestId===requestId));}
  reconcile(snapshot:AccountSnapshot, rows:OrderRecord[]) {
    this.open();this.invalidate();
    validateAccountSnapshot(snapshot,this.accountId,this.now());
    const problems=accountDiscrepancies(snapshot,rows);
    for(const h of this.holds) {
      const row=rows.find(r=>r.requestId===h.intent.requestId);
      if(!row || identity(row)!==identity(h.intent)) problems.push('RESERVATION_ORDER_MISSING_OR_CHANGED:'+h.intent.requestId);
    }
    if(problems.length)return {ready:false,problems};
    // Fresh exchange free already excludes locked orders and spent cash. Do not debit them twice.
    for(const h of this.holds)h.settled=true;
    // An empty ledger has no reservation state to commit during a read-only refresh.
    // Do not perform an unnecessary durable write (including directory fsync).
    // Nonempty reservation state still requires the existing persistence checks.
    if(this.holds.length)this.persist();this.snapshot=structuredClone(snapshot);
    return {ready:true,problems:[] as string[]};
  }
  available(asset:string) {
    this.open();if(!this.snapshot)throw Error('FRESH_ACCOUNT_REQUIRED');
    validateAccountSnapshot(this.snapshot,this.accountId,this.now());
    const balance=this.snapshot.balances.find(b=>b.asset===asset);
    // Missing asset is unknown, not a manufactured zero or fallback balance.
    if(!balance)throw Error('ASSET_BALANCE_UNAVAILABLE');
    let available=units(balance.free);
    for(const h of this.holds.filter(h=>!h.settled))for(const d of h.debits)if(d.asset===asset)available-=units(d.amount);
    if(available<0n)throw Error('CAPITAL_OVERCOMMITTED');
    return decimal(available);
  }
  reserve(intent:Intent,debits:Debit[]) {
    this.open();validateFundingIntent(intent,this.allowProtectiveStops);
    if(intent.accountId!==this.accountId)throw Error('CAPITAL_ACCOUNT_MISMATCH');
    const normalized=normalizeDebits(debits), prev=this.holds.find(h=>h.intent.requestId===intent.requestId);
    if(prev){if(identity(prev.intent)!==identity(intent)||JSON.stringify(prev.debits)!==JSON.stringify(normalized))throw Error('RESERVATION_CONFLICT');return structuredClone(prev);}
    for(const debit of normalized)if(units(debit.amount)>units(this.available(debit.asset)))throw Error('INSUFFICIENT_AVAILABLE_CAPITAL');
    const hold:Hold={intent:{requestId:intent.requestId,accountId:intent.accountId,symbol:intent.symbol,side:intent.side,quantity:intent.quantity,...(intent.limitPrice===undefined?{}:{limitPrice:intent.limitPrice}),...(intent.stopPrice===undefined?{}:{stopPrice:intent.stopPrice})},debits:normalized,settled:false};
    this.holds.push(hold);this.persist();return structuredClone(hold);
  }
  close() {if(this.released)return;this.closed=true;this.snapshot=undefined;fs.closeSync(this.fd);fs.unlinkSync(this.file+'.lock');this.released=true;}
}
export function validateFundingIntent(i:Intent,allowProtectiveStops=false) {
  if(i?.stopPrice!==undefined){if(!allowProtectiveStops)throw Error('PROTECTIVE_STOP_REQUIRES_SEPARATE_RISK_GATE');if(i.side!=='SELL'||units(i.stopPrice)<=0n||!i.limitPrice||units(i.limitPrice)>units(i.stopPrice))throw Error('INVALID_PROTECTIVE_STOP');}
  if(i?.limitPrice!==undefined&&units(i.limitPrice)<=0n)throw Error('INVALID_LIMIT_PRICE');
  if (!i || typeof i.requestId!=='string' || !/^[\w-]{8,80}$/.test(i.requestId) || typeof i.accountId!=='string' || !/^[\w-]{1,80}$/.test(i.accountId) || !/^[A-Z0-9]{5,24}$/.test(i.symbol) || !['BUY','SELL'].includes(i.side) || units(i.quantity)<=0n) throw Error('INVALID_FUNDING_INTENT');
}
