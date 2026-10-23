export type Language = 'en' | 'tr';

export interface Translations {
  // Navigation
  navTerminal: string;
  navBots: string;
  navAlphaRadar: string;
  navAiPredict: string;
  navGemRadar: string;
  navBacktest: string;
  navQuantToken: string;
  navPancakeSwap: string;
  navSecurity: string;

  // Header badges & indicators
  exchangeLabel: string;
  liveEngine: string;
  liveConnected: string;
  autonomousInitiative: string;
  autonomousMaxProfit: string;
  liveBinanceMode: string;
  paperSimulationMode: string;
  totalPortfolio: string;
  paperVault: string;
  cashLabel: string;
  inPositions: string;
  bnbShield: string;
  bnbShieldTooltip: string;
  downloadCode: string;
  joinTelegram: string;
  notificationsTooltip: string;
  syncBinanceVault: string;

  // Track record & utility
  liveTrackRecordTitle: string;
  liveTrackRecordSubtitle: string;
  cumulativeRoi: string;
  winRate: string;
  avgDuration: string;
  zeroLiquidation: string;
  filterAll: string;
  filterBinance: string;
  filterPancake: string;
  tableSymbol: string;
  tableStrategy: string;
  tableSide: string;
  tableEntry: string;
  tableExit: string;
  tablePnl: string;
  tableDuration: string;
  tableTime: string;
  tableVerify: string;

  // Token utility
  tokenUtilityTitle: string;
  tokenUtilitySubtitle: string;
  realUtilityBadge: string;
  buyOnPancakeSwap: string;
  copyContract: string;
  copied: string;
  calculatorTitle: string;
  calculatorSubtitle: string;
  yourHoldings: string;
  unlockedTier: string;
  tier1: string;
  tier2: string;
  tier3: string;
  tier4: string;
  pillar1Title: string;
  pillar1Desc: string;
  pillar2Title: string;
  pillar2Desc: string;
  pillar3Title: string;
  pillar3Desc: string;
  pillar4Title: string;
  pillar4Desc: string;
  securityProofTitle: string;
  liquidityLockedDesc: string;
  ownershipRenouncedDesc: string;

  // General UI terms
  active: string;
  offline: string;
  ago: string;
  seconds: string;
  minutes: string;
  hours: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    navTerminal: 'Terminal',
    navBots: 'Bot Engine',
    navAlphaRadar: 'Alpha Radar',
    navAiPredict: 'AI Forecast & Optimize',
    navGemRadar: 'Early Gem Radar',
    navBacktest: 'Strategy Backtest',
    navQuantToken: '$QUANT Token',
    navPancakeSwap: 'PancakeSwap DEX',
    navSecurity: 'Security & API',

    exchangeLabel: 'Exchange:',
    liveEngine: 'LIVE ENGINE',
    liveConnected: 'LIVE CONNECTED',
    autonomousInitiative: 'Autonomous Initiative:',
    autonomousMaxProfit: 'Autonomous Max-Profit:',
    liveBinanceMode: 'LIVE BINANCE',
    paperSimulationMode: 'PAPER SIMULATION',
    totalPortfolio: 'Total Portfolio:',
    paperVault: 'Paper Vault:',
    cashLabel: 'Cash:',
    inPositions: 'In Position',
    bnbShield: 'BNB Shield:',
    bnbShieldTooltip: 'Binance 25% BNB Fee Discount: 0.075% spot fee instead of 0.10%.',
    downloadCode: 'Download Code',
    joinTelegram: 'Telegram',
    notificationsTooltip: 'Notifications & Alerts',
    syncBinanceVault: 'Sync Binance Vault Now',

    liveTrackRecordTitle: 'Live Verified Bot Track Record & Execution Stream',
    liveTrackRecordSubtitle: 'Transparent, real-time algorithmic trades executed via Binance Spot API and PancakeSwap DEX. Real yield, strict zero-loss discipline.',
    cumulativeRoi: '30-Day Cumulative ROI',
    winRate: 'Win Rate (Profitable Trades)',
    avgDuration: 'Avg Holding Duration',
    zeroLiquidation: 'Zero Liquidation / Zero Loss',
    filterAll: 'All Trades',
    filterBinance: 'Binance Spot',
    filterPancake: 'Pancake DEX',
    tableSymbol: 'Pair / Asset',
    tableStrategy: 'Algorithm / Strategy',
    tableSide: 'Side',
    tableEntry: 'Entry Price',
    tableExit: 'Exit Price',
    tablePnl: 'Net PnL',
    tableDuration: 'Hold Time',
    tableTime: 'Execution Time',
    tableVerify: 'On-Chain Proof',

    tokenUtilityTitle: '$QUANT Token Utility & Value Architecture',
    tokenUtilitySubtitle: '$QUANT powers the institutional algorithmic trading engine. Token holders unlock bot tiers, profit-driven buyback & burn, and real yield distributions.',
    realUtilityBadge: 'REAL UTILITY & REVENUE SHARE',
    buyOnPancakeSwap: 'Buy on PancakeSwap',
    copyContract: 'Copy Contract',
    copied: 'Copied!',
    calculatorTitle: 'Interactive Holding Tier & Privileges Calculator',
    calculatorSubtitle: 'Select or input your $QUANT balance to preview unlocked algorithmic privileges and automated bot access:',
    yourHoldings: 'Your $QUANT Holdings',
    unlockedTier: 'Current Unlocked Tier',
    tier1: 'Basic Scalper Tier (1,000+ QUANT)',
    tier2: 'Pro Alpha Tier (2,500+ QUANT)',
    tier3: 'VIP High-Frequency Tier (10,000+ QUANT)',
    tier4: 'Whale Revenue Share Tier (50,000+ QUANT)',
    pillar1Title: 'Tier-Gated Bot Access & VIP Signals',
    pillar1Desc: 'Hold $QUANT to unlock high-frequency scalping algorithms, sub-second webhook triggers, and private Telegram Alpha calls with strict zero-loss risk limits.',
    pillar2Title: 'Automated PancakeSwap Buyback & Burn',
    pillar2Desc: 'A fixed percentage of trading profits generated across running bot instances is continuously used to market-buy $QUANT on PancakeSwap and permanently burn it to 0x00...dEaD.',
    pillar3Title: 'Real Yield & Staking Vault (USDT / BNB)',
    pillar3Desc: 'Stake $QUANT to receive continuous dividend distributions generated by real Binance API market making profits. No inflation, pure trading yield.',
    pillar4Title: 'DAO Strategy & Coin Voting Rights',
    pillar4Desc: 'Holders vote on which upcoming Binance altcoins and meme-radars will be added to the autonomous scalping matrix and market-maker liquidity pools.',
    securityProofTitle: 'On-Chain Security & Liquidity Proof',
    liquidityLockedDesc: '100% of PancakeSwap Cake-LP pool tokens have been permanently transferred to the 0x00...dEaD burn address. Rug-pull is mathematically impossible.',
    ownershipRenouncedDesc: 'Smart contract ownership is fully renounced. No minting function exists; total circulating supply is permanently capped with no administrative backdoor.',

    active: 'ACTIVE',
    offline: 'OFFLINE',
    ago: 'ago',
    seconds: 's',
    minutes: 'm',
    hours: 'h'
  },
  tr: {
    navTerminal: 'Terminal',
    navBots: 'Bot Motoru',
    navAlphaRadar: 'Hacker Alpha Radarı',
    navAiPredict: 'AI Tahmin & Optimize',
    navGemRadar: 'Erken Token Radarı',
    navBacktest: 'Strateji Testi',
    navQuantToken: '$QUANT Token',
    navPancakeSwap: 'PancakeSwap DEX',
    navSecurity: 'Güvenlik & API',

    exchangeLabel: 'Borsa:',
    liveEngine: 'CANLI MOTOR',
    liveConnected: 'CANLI BAĞLI',
    autonomousInitiative: 'Otonom İnisiyatif:',
    autonomousMaxProfit: 'Otonom Max-Kâr:',
    liveBinanceMode: 'CANLI BINANCE',
    paperSimulationMode: 'SİMÜLASYON (TEST)',
    totalPortfolio: 'Toplam Kasa:',
    paperVault: 'Sanal Kasa:',
    cashLabel: 'Nakit:',
    inPositions: 'Pozisyonda',
    bnbShield: 'BNB Kalkanı:',
    bnbShieldTooltip: 'Binance %25 BNB Komisyon İndirimi: Spot işlemlerde 0.10% yerine 0.075% kesilir.',
    downloadCode: 'Projeyi İndir',
    joinTelegram: 'Telegram',
    notificationsTooltip: 'Bildirimler & Alarmlar',
    syncBinanceVault: 'Binance Kasasını Şimdi Senkronize Et',

    liveTrackRecordTitle: 'Canlı Doğrulanmış Bot İcra Kaydı & İşlem Akışı',
    liveTrackRecordSubtitle: 'Binance Spot API ve PancakeSwap DEX üzerinden icra edilen gerçek zamanlı algoritmik al-sat kayıtları. Şeffaf getiri, katı sıfır zarar disiplini.',
    cumulativeRoi: '30 Günlük Kümülatif ROI',
    winRate: 'Kazanma Oranı (Kârlı İşlemler)',
    avgDuration: 'Ortalama Pozisyon Süresi',
    zeroLiquidation: 'Sıfır Likidasyon / Sıfır Kayıp',
    filterAll: 'Tüm İşlemler',
    filterBinance: 'Binance Spot',
    filterPancake: 'Pancake DEX',
    tableSymbol: 'Parite / Varlık',
    tableStrategy: 'Algoritma / Strateji',
    tableSide: 'İşlem',
    tableEntry: 'Giriş Fiyatı',
    tableExit: 'Çıkış Fiyatı',
    tablePnl: 'Net Kâr/Zarar',
    tableDuration: 'Süre',
    tableTime: 'İşlem Zamanı',
    tableVerify: 'Zincir Üstü Kanıt',

    tokenUtilityTitle: '$QUANT Token Utility & Değer Mimarisi',
    tokenUtilitySubtitle: '$QUANT, çalışan yüksek frekanslı ticaret botunun motor gücünü temsil eder. Token sahipleri bot erişimi, geri alım yakımları ve gerçek getiri paylaşımlarından yararlanır.',
    realUtilityBadge: 'GERÇEK FAYDA & NAKİT AKIŞI',
    buyOnPancakeSwap: "PancakeSwap'te Satın Al",
    copyContract: 'Sözleşmeyi Kopyala',
    copied: 'Kopyalandı!',
    calculatorTitle: 'İnteraktif Kademe & Ayrıcalık Simülatörü',
    calculatorSubtitle: 'Cüzdanınızda tuttuğunuz veya tutmayı planladığınız $QUANT miktarını seçin; kilidi açılan özellikleri görün:',
    yourHoldings: 'Cüzdandaki $QUANT Miktarı',
    unlockedTier: 'Açılan Bot Kademesi',
    tier1: 'Temel Scalper Kademesi (1.000+ QUANT)',
    tier2: 'Pro Alpha Kademesi (2.500+ QUANT)',
    tier3: 'VIP Yüksek Frekans Kademesi (10.000+ QUANT)',
    tier4: 'Balina Gelir Payı Kademesi (50.000+ QUANT)',
    pillar1Title: 'Kademeli Bot Erişimi & VIP Sinyaller',
    pillar1Desc: 'Belirli miktarda $QUANT tutan kullanıcılar yüksek frekanslı scalping stratejilerine, milisaniyelik sinyal kanallarına ve özel Telegram VIP grubuna erişim kazanır.',
    pillar2Title: 'Otomatik PancakeSwap Geri Alım & Yakım',
    pillar2Desc: 'Bot motorunun Binance üzerinde ürettiği net kârın belirli bir yüzdesiyle PancakeSwap üzerinden düzenli $QUANT satın alınıp kalıcı olarak 0x...dEaD adresine yakıma gönderilir.',
    pillar3Title: 'Gerçek Getiri & Staking Havuzu (USDT / BNB)',
    pillar3Desc: '$QUANT kilitleyen yatırımcılara borsadaki bot kârlarından elde edilen USDT ve BNB cinsinden düzenli nakit payı dağıtılır. Enflasyonsuz, gerçek ticari getiri.',
    pillar4Title: 'DAO Strateji & Parite Oylama Hakkı',
    pillar4Desc: 'Token sahipleri botun hangi yeni Binance paritelerini tarayacağına, risk çarpanlarına ve yeni eklenecek scalping algoritmalarına oy vererek karar verir.',
    securityProofTitle: 'Zincir Üstü Güvenlik & Likidite Kanıtı',
    liquidityLockedDesc: "PancakeSwap Cake-LP likidite havuzu token'larının %100'ü kalıcı olarak 0x...dEaD yakım adresine gönderilmiştir. Likidite asla çekilemez.",
    ownershipRenouncedDesc: 'Akıllı sözleşme sahipliği (ownership) tamamen devredilmiştir (renounced). Yeni token basılamaz, gizli komisyon veya kara liste fonksiyonu yoktur.',

    active: 'AKTİF',
    offline: 'KAPALI',
    ago: 'önce',
    seconds: 'sn',
    minutes: 'dk',
    hours: 'sa'
  }
};
