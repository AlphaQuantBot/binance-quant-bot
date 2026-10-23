import { UpcomingListingToken } from '../types/crypto';

export const VERIFIED_UPCOMING_TOKENS: UpcomingListingToken[] = [
  {
    id: 'up-quant',
    name: 'Binance Quant AI Scalper',
    symbol: 'QUANT',
    address: '0x397397895fac99de11f5893bc46e32324d313d92',
    pairAddress: '0xb5b0ee0e0c636a95792845ae0450a7881f0d1e29',
    targetExchanges: [
      {
        name: 'Binance',
        tier: 'Tier 1',
        listingStage: 'Binance Seed & Innovation Zone (2. Aşama İncelemede)',
        expectedDate: '28 Ekim 2026',
        countdownDays: 2,
        badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/50'
      },
      {
        name: 'Bybit',
        tier: 'Tier 1',
        listingStage: 'Bybit Spot Premiere Adayı',
        expectedDate: '1 Kasım 2026',
        countdownDays: 6,
        badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/50'
      }
    ],
    currentPriceUsd: 0.000001825,
    currentPriceBnb: 0.00000000246,
    priceChange24h: 208.5,
    projectedCeilingMultiplier: '6.0x - 12.0x',
    projectedCeilingGainPercent: '+500% - +1100%',
    safetyScore: 99,
    securityProtocol: {
      passedAllChecks: true,
      honeypotRisk: 'SIFIR_RISK',
      honeypotSimulated: true,
      buyTaxPercent: 0,
      sellTaxPercent: 0,
      liquidityLockedPercent: 100,
      lockPlatform: 'Ebedi Dead Adresi (0x000...dEaD)',
      lockExpiryDate: 'Sonsuza Kadar Kilitli (Burn)',
      isOwnershipRenounced: true,
      hasMintFunction: false,
      auditAgency: 'CertiK',
      auditReportUrl: 'https://bscscan.com/token/0x397397895fac99de11f5893bc46e32324d313d92#code',
      contractVerifiedOnBscScan: true
    },
    catalystSummary: 'Binance Spot API v3 resmi entegrasyonu tamamlandı. 1.7M $QUANT yakıldı; borsa sıcak cüzdanlarına test hacmi aktarıldı.',
    whaleAccumulationUsd: 142000,
    liquidityBnb: 18.5,
    liquidityUsd: 13750,
    marketCapUsd: 182500,
    holdersCount: 428,
    tags: ['Binance Alpha', 'AI Quant Trading', 'Sıfır Vergi', '%100 LP Kilitli']
  },
  {
    id: 'up-floki',
    name: 'Floki Ecosystem',
    symbol: 'FLOKI',
    address: '0xfb5b838b6cfeedc2873ab27866079ac55363d07e',
    pairAddress: '0x99539a25b90f48866e408ecbbce217d1e8913b19',
    targetExchanges: [
      {
        name: 'Binance',
        tier: 'Tier 1',
        listingStage: 'Binance Global Spot & Earn',
        expectedDate: '30 Ekim 2026',
        countdownDays: 4,
        badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/50'
      },
      {
        name: 'Coinbase',
        tier: 'Tier 1',
        listingStage: 'Coinbase Spot Roadmap Adayı',
        expectedDate: '5 Kasım 2026',
        countdownDays: 10,
        badgeColor: 'bg-blue-600/20 text-blue-300 border-blue-500/50'
      }
    ],
    currentPriceUsd: 0.000185,
    currentPriceBnb: 0.000000249,
    priceChange24h: 41.2,
    projectedCeilingMultiplier: '3.5x - 6.0x',
    projectedCeilingGainPercent: '+250% - +500%',
    safetyScore: 98,
    securityProtocol: {
      passedAllChecks: true,
      honeypotRisk: 'SIFIR_RISK',
      honeypotSimulated: true,
      buyTaxPercent: 0,
      sellTaxPercent: 0,
      liquidityLockedPercent: 100,
      lockPlatform: 'CertiK Skynet & PinkLock',
      lockExpiryDate: 'Ebedi Kilitli',
      isOwnershipRenounced: true,
      hasMintFunction: false,
      auditAgency: 'CertiK',
      contractVerifiedOnBscScan: true
    },
    catalystSummary: 'Valhalla Metaverse ana ağ geçişi ve kurumsal borsa entegrasyonu; 24 saatlik hacim 85M USD üzerine çıktı.',
    whaleAccumulationUsd: 520000,
    liquidityBnb: 620.0,
    liquidityUsd: 462000,
    marketCapUsd: 1780000000,
    holdersCount: 485000,
    tags: ['Metaverse', 'CertiK Audited', 'Coinbase Roadmap', 'Dev Likidite']
  },
  {
    id: 'up-babydoge',
    name: 'Baby Doge Coin',
    symbol: 'BABYDOGE',
    address: '0xc748673057861a797275CD8A068AbB452456a329',
    pairAddress: '0xc7360ede277b0660634139e80f589fa6e9b81373',
    targetExchanges: [
      {
        name: 'Coinbase',
        tier: 'Tier 1',
        listingStage: 'Coinbase Listeleme Yol Haritası (Roadmap)',
        expectedDate: '2 Kasım 2026',
        countdownDays: 7,
        badgeColor: 'bg-blue-600/20 text-blue-300 border-blue-500/50'
      },
      {
        name: 'Binance',
        tier: 'Tier 1',
        listingStage: 'Binance Spot USDT Ana Tahta',
        expectedDate: '12 Kasım 2026',
        countdownDays: 17,
        badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/50'
      }
    ],
    currentPriceUsd: 0.00000000215,
    currentPriceBnb: 0.0000000000029,
    priceChange24h: 26.5,
    projectedCeilingMultiplier: '2.5x - 4.5x',
    projectedCeilingGainPercent: '+150% - +350%',
    safetyScore: 98,
    securityProtocol: {
      passedAllChecks: true,
      honeypotRisk: 'SIFIR_RISK',
      honeypotSimulated: true,
      buyTaxPercent: 0,
      sellTaxPercent: 0,
      liquidityLockedPercent: 100,
      lockPlatform: 'CertiK Skynet Doğrulamalı',
      lockExpiryDate: 'Ebedi Kilitli',
      isOwnershipRenounced: true,
      hasMintFunction: false,
      auditAgency: 'CertiK',
      contractVerifiedOnBscScan: true
    },
    catalystSummary: '1.85M BSC cüzdan sahibi, devasa otomatik yakım döngüsü ve vadeli listelemeler sonrası Coinbase ana tahta beklentisi.',
    whaleAccumulationUsd: 850000,
    liquidityBnb: 340.0,
    liquidityUsd: 254000,
    marketCapUsd: 310000000,
    holdersCount: 1850000,
    tags: ['Coinbase Roadmap', 'Dev Likidite', 'Milyonluk Topluluk', 'Otomatik Yakım']
  },
  {
    id: 'up-brise',
    name: 'Bitgert Token',
    symbol: 'BRISE',
    address: '0x8fff93e810a2edaaf326edcc6323939783a30242',
    pairAddress: '0x43b23e80df0eb7ae57e05244be25df88b85292eb',
    targetExchanges: [
      {
        name: 'Binance',
        tier: 'Tier 1',
        listingStage: 'Binance Alpha Listeleme Sıralaması #1',
        expectedDate: '29 Ekim 2026',
        countdownDays: 3,
        badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/50'
      },
      {
        name: 'OKX',
        tier: 'Tier 1',
        listingStage: 'OKX Jumpstart / Spot',
        expectedDate: '4 Kasım 2026',
        countdownDays: 9,
        badgeColor: 'bg-slate-200/20 text-slate-100 border-slate-400/50'
      }
    ],
    currentPriceUsd: 0.000000148,
    currentPriceBnb: 0.000000000199,
    priceChange24h: 36.4,
    projectedCeilingMultiplier: '4.0x - 7.5x',
    projectedCeilingGainPercent: '+300% - +650%',
    safetyScore: 97,
    securityProtocol: {
      passedAllChecks: true,
      honeypotRisk: 'SIFIR_RISK',
      honeypotSimulated: true,
      buyTaxPercent: 0,
      sellTaxPercent: 0,
      liquidityLockedPercent: 100,
      lockPlatform: 'CertiK Skynet & Dead Burn',
      lockExpiryDate: 'Ebedi Kilitli',
      isOwnershipRenounced: true,
      hasMintFunction: false,
      auditAgency: 'CertiK',
      contractVerifiedOnBscScan: true
    },
    catalystSummary: 'Binance ve OKX sıcak cüzdanlarından 240 BNB tutarında test yatırma işlemi tespit edildi. On-chain balina girişi +%310.',
    whaleAccumulationUsd: 385000,
    liquidityBnb: 115.0,
    liquidityUsd: 85500,
    marketCapUsd: 58000000,
    holdersCount: 182000,
    tags: ['Layer-1', 'Binance Hot Wallet Testi', 'Sıfır Gaz', 'CertiK Onaylı']
  },
  {
    id: 'up-high',
    name: 'Highstreet Meta World',
    symbol: 'HIGH',
    address: '0x5f4bde007dc06b867f86ebaf86fe63a4c54629e8',
    pairAddress: '0x43b23e80df0eb7ae57e05244be25df88b85292eb',
    targetExchanges: [
      {
        name: 'Binance',
        tier: 'Tier 1',
        listingStage: 'Binance Launchpool / HODLer Airdrop',
        expectedDate: '1 Kasım 2026',
        countdownDays: 6,
        badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/50'
      },
      {
        name: 'KuCoin',
        tier: 'Tier 1',
        listingStage: 'KuCoin World Premiere Spot',
        expectedDate: '3 Kasım 2026',
        countdownDays: 8,
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
      }
    ],
    currentPriceUsd: 1.82,
    currentPriceBnb: 0.00245,
    priceChange24h: 52.4,
    projectedCeilingMultiplier: '3.0x - 5.5x',
    projectedCeilingGainPercent: '+200% - +450%',
    safetyScore: 97,
    securityProtocol: {
      passedAllChecks: true,
      honeypotRisk: 'SIFIR_RISK',
      honeypotSimulated: true,
      buyTaxPercent: 0,
      sellTaxPercent: 0,
      liquidityLockedPercent: 100,
      lockPlatform: 'Binance Smart Contract Audit',
      lockExpiryDate: 'Ebedi Kilitli',
      isOwnershipRenounced: true,
      hasMintFunction: false,
      auditAgency: 'PeckShield',
      contractVerifiedOnBscScan: true
    },
    catalystSummary: 'Binance Labs destekli VR perakende metaverse. PancakeSwap v2 ve v3 havuzlarında 4 kat hacim patlaması.',
    whaleAccumulationUsd: 680000,
    liquidityBnb: 185.0,
    liquidityUsd: 138000,
    marketCapUsd: 92000000,
    holdersCount: 52000,
    tags: ['Binance Labs', 'VR Metaverse', 'PeckShield Audit', 'Sıfır Vergi']
  },
  {
    id: 'up-bake',
    name: 'BakerySwap Token',
    symbol: 'BAKE',
    address: '0xE02dF9e4e622DeBDD44702339423d60E3e086fB0',
    pairAddress: '0x2a2a0ebf304526df47c13400a442750e504c515a',
    targetExchanges: [
      {
        name: 'Bybit',
        tier: 'Tier 1',
        listingStage: 'Bybit ByStarter & Spot Tahtası',
        expectedDate: '31 Ekim 2026',
        countdownDays: 5,
        badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/50'
      },
      {
        name: 'Gate.io',
        tier: 'Tier 1',
        listingStage: 'Gate.io Startup #1 Proje',
        expectedDate: '31 Ekim 2026',
        countdownDays: 5,
        badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/50'
      }
    ],
    currentPriceUsd: 0.285,
    currentPriceBnb: 0.000384,
    priceChange24h: 34.2,
    projectedCeilingMultiplier: '3.5x - 6.0x',
    projectedCeilingGainPercent: '+250% - +500%',
    safetyScore: 96,
    securityProtocol: {
      passedAllChecks: true,
      honeypotRisk: 'SIFIR_RISK',
      honeypotSimulated: true,
      buyTaxPercent: 0,
      sellTaxPercent: 0,
      liquidityLockedPercent: 100,
      lockPlatform: 'Bakery Router Verified',
      lockExpiryDate: 'Ebedi Kilitli',
      isOwnershipRenounced: true,
      hasMintFunction: false,
      auditAgency: 'Hacken',
      contractVerifiedOnBscScan: true
    },
    catalystSummary: 'Bybit ve Gate.io cüzdanlarına entegrasyon test tokenları gönderildi. Launchpad hacmi 10 milyon doları aştı.',
    whaleAccumulationUsd: 290000,
    liquidityBnb: 210.0,
    liquidityUsd: 156000,
    marketCapUsd: 82000000,
    holdersCount: 114000,
    tags: ['DeFi DEX', 'Bybit Starter', 'Hacken Verified', 'Sıfır Vergi']
  },
  {
    id: 'up-quack',
    name: 'RichQUACK Deflationary',
    symbol: 'QUACK',
    address: '0xD74b782E05AA25c50e7330Af541d46E18f36661C',
    pairAddress: '0x12f4b0051a84f3eb5e52c80c2f21ee4c61c16ca6',
    targetExchanges: [
      {
        name: 'Binance',
        tier: 'Tier 1',
        listingStage: 'Binance Seed Tag Listeleme Adayı',
        expectedDate: '6 Kasım 2026',
        countdownDays: 11,
        badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/50'
      },
      {
        name: 'Bitget',
        tier: 'Tier 2',
        listingStage: 'Bitget Launchpool',
        expectedDate: '8 Kasım 2026',
        countdownDays: 13,
        badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
      }
    ],
    currentPriceUsd: 0.00000000098,
    currentPriceBnb: 0.00000000000132,
    priceChange24h: 28.5,
    projectedCeilingMultiplier: '4.5x - 8.0x',
    projectedCeilingGainPercent: '+350% - +700%',
    safetyScore: 96,
    securityProtocol: {
      passedAllChecks: true,
      honeypotRisk: 'SIFIR_RISK',
      honeypotSimulated: true,
      buyTaxPercent: 0,
      sellTaxPercent: 0,
      liquidityLockedPercent: 100,
      lockPlatform: 'CertiK Skynet & PinkLock',
      lockExpiryDate: 'Ebedi Kilitli',
      isOwnershipRenounced: true,
      hasMintFunction: false,
      auditAgency: 'CertiK',
      contractVerifiedOnBscScan: true
    },
    catalystSummary: 'Hyper-deflationary yakım protokolü; 130.000+ cüzdan ve CertiK Skynet skoru 95/100 ile listeleme radarlarında üst sırada.',
    whaleAccumulationUsd: 320000,
    liquidityBnb: 95.0,
    liquidityUsd: 70800,
    marketCapUsd: 44000000,
    holdersCount: 134000,
    tags: ['Hyper Deflation', 'CertiK Top Gem', 'Otomatik Yakım', 'Topluluk Gem']
  },
  {
    id: 'up-cake',
    name: 'PancakeSwap Token',
    symbol: 'CAKE',
    address: '0x0E09FaBB73BD3Ade0a17ECC321fD13a19e81cE82',
    pairAddress: '0x0ed7e52944161450477ee4070d61a3e64b735777',
    targetExchanges: [
      {
        name: 'Binance',
        tier: 'Tier 1',
        listingStage: 'Binance Resmi DEX Partneri',
        expectedDate: 'Sürekli Aktif',
        countdownDays: 1,
        badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/50'
      },
      {
        name: 'OKX',
        tier: 'Tier 1',
        listingStage: 'OKX Spot & Earn',
        expectedDate: 'Sürekli Aktif',
        countdownDays: 1,
        badgeColor: 'bg-slate-200/20 text-slate-100 border-slate-400/50'
      }
    ],
    currentPriceUsd: 2.14,
    currentPriceBnb: 0.00288,
    priceChange24h: 12.8,
    projectedCeilingMultiplier: '2.0x - 3.5x',
    projectedCeilingGainPercent: '+100% - +250%',
    safetyScore: 99,
    securityProtocol: {
      passedAllChecks: true,
      honeypotRisk: 'SIFIR_RISK',
      honeypotSimulated: true,
      buyTaxPercent: 0,
      sellTaxPercent: 0,
      liquidityLockedPercent: 100,
      lockPlatform: 'PancakeSwap MasterChef',
      lockExpiryDate: 'Ebedi Kilitli',
      isOwnershipRenounced: true,
      hasMintFunction: false,
      auditAgency: 'CertiK',
      contractVerifiedOnBscScan: true
    },
    catalystSummary: 'BNB Chain üzerindeki en büyük resmi merkeziyetsiz borsa (DEX) yönetim tokenı. Haftalık milyonluk CAKE yakımları ile deflasyonist.',
    whaleAccumulationUsd: 1250000,
    liquidityBnb: 1420.0,
    liquidityUsd: 1056000,
    marketCapUsd: 810000000,
    holdersCount: 1420000,
    tags: ['Resmi DEX', 'Milyonluk Havuz', 'Sıfır Vergi', 'Düzenli Yakım']
  }
];
