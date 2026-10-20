import { balanceDigest, type DailyRiskEvidence } from '../../src/server/dailyRiskGate';
import type { AccountSnapshot } from '../../src/server/accountSnapshot';
import type { TradeContext, RiskPolicy } from '../../src/server/tradingRules';
export const rulesFixture = ():TradeContext => ({
  environment:'BINANCE_TESTNET',symbol:'BTCUSDT',baseAsset:'BTC',quoteAsset:'USDT',status:'TRADING',spotAllowed:true,orderTypes:['LIMIT'],
  startedAt:1000,quote:{bid:'100',ask:'100',bidQty:'100',askQty:'100',observedAt:1001},exchangeFilters:[],
  filters:[{filterType:'PRICE_FILTER',minPrice:'0.01',maxPrice:'1000000',tickSize:'0.01'},{filterType:'LOT_SIZE',minQty:'0.001',maxQty:'100',stepSize:'0.001'},{filterType:'MIN_NOTIONAL',minNotional:'10'}],
});
export const policyFixture = ():RiskPolicy => ({halted:false,dailyLossLimitQuote:'20',maxSpreadBps:100,maxSlippageBps:100,maxOpenOrders:10,symbols:{BTCUSDT:{maxOrderNotional:'10000',maxBasePosition:'100'}}});

// Trusted evidence fixtures only: no production historian/valuator is implemented yet.
export function dailyEvidenceFixture(snapshot:AccountSnapshot):DailyRiskEvidence {return {environment:'BINANCE_TESTNET',accountId:snapshot.accountId,quoteAsset:'USDT',source:'RECONCILED_ACCOUNT_HISTORY',scope:'REALIZED_AND_UNREALIZED',day:'1970-01-01',coverageFrom:0,coverageTo:1002,observedAt:1002,balanceDigest:balanceDigest(snapshot),openingEquity:'1000',currentEquity:'1000',externalInflows:'0',externalOutflows:'0',pricedAssets:snapshot.balances.filter(b=>Number(b.free)+Number(b.locked)>0).map(b=>b.asset),unpricedAssets:[]};}
