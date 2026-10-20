import type { TradeContext, RiskPolicy } from '../../src/server/tradingRules';
export const rulesFixture = ():TradeContext => ({
  environment:'BINANCE_TESTNET',symbol:'BTCUSDT',baseAsset:'BTC',quoteAsset:'USDT',status:'TRADING',spotAllowed:true,orderTypes:['LIMIT'],
  startedAt:1000,quote:{bid:'100',ask:'100',bidQty:'100',askQty:'100',observedAt:1001},exchangeFilters:[],
  filters:[{filterType:'PRICE_FILTER',minPrice:'0.01',maxPrice:'1000000',tickSize:'0.01'},{filterType:'LOT_SIZE',minQty:'0.001',maxQty:'100',stepSize:'0.001'},{filterType:'MIN_NOTIONAL',minNotional:'10'}],
});
export const policyFixture = ():RiskPolicy => ({halted:false,maxSpreadBps:100,maxSlippageBps:100,maxOpenOrders:10,symbols:{BTCUSDT:{maxOrderNotional:'10000',maxBasePosition:'100'}}});
