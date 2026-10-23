const sharp = require('sharp');
const fs = require('fs');

async function buildCenteredShowcase() {
  console.log('Rendering mathematically centered 3D crypto showcase with prominent PancakeSwap & BNB Chain panels...');

  const stageImg = sharp('src/assets/images/quant_front_stage_1792510487230.jpg');
  const stageMeta = await stageImg.metadata();
  const stageW = stageMeta.width;   // 1376
  const stageH = stageMeta.height;  // 768

  // 1. Center coin medallion
  const coinSize = 430;
  const innerLogoSize = 340;

  const frameSvg = Buffer.from(`
    <svg width="${coinSize}" height="${coinSize}" viewBox="0 0 ${coinSize} ${coinSize}">
      <defs>
        <linearGradient id="goldRim" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FFE885"/>
          <stop offset="25%" stop-color="#C69214"/>
          <stop offset="50%" stop-color="#FFF3A8"/>
          <stop offset="75%" stop-color="#9A6B0A"/>
          <stop offset="100%" stop-color="#FFE070"/>
        </linearGradient>

        <linearGradient id="darkInner" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#121b2d"/>
          <stop offset="100%" stop-color="#060913"/>
        </linearGradient>
      </defs>

      <circle cx="${coinSize/2}" cy="${coinSize/2 + 8}" r="${coinSize/2 - 10}" fill="#000000" opacity="0.6" filter="blur(14px)"/>
      <circle cx="${coinSize/2}" cy="${coinSize/2}" r="${coinSize/2 - 6}" fill="url(#goldRim)" stroke="#FFA500" stroke-width="2"/>
      <circle cx="${coinSize/2}" cy="${coinSize/2}" r="${coinSize/2 - 24}" fill="url(#darkInner)" stroke="#00F0FF" stroke-width="2.5" opacity="0.95"/>
      <circle cx="${coinSize/2}" cy="${coinSize/2}" r="${coinSize/2 - 28}" fill="#050811"/>
      <circle cx="${coinSize/2}" cy="${coinSize/2}" r="${coinSize/2 - 16}" fill="none" stroke="#FFE57F" stroke-width="1" stroke-dasharray="4,6" opacity="0.6"/>
    </svg>
  `);

  const innerMaskSvg = Buffer.from(`
    <svg width="${innerLogoSize}" height="${innerLogoSize}" viewBox="0 0 ${innerLogoSize} ${innerLogoSize}">
      <circle cx="${innerLogoSize/2}" cy="${innerLogoSize/2}" r="${innerLogoSize/2}" fill="#ffffff"/>
    </svg>
  `);

  const glassSheenSvg = Buffer.from(`
    <svg width="${coinSize}" height="${coinSize}" viewBox="0 0 ${coinSize} ${coinSize}">
      <defs>
        <linearGradient id="sheen" x1="15%" y1="0%" x2="85%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.25"/>
          <stop offset="35%" stop-color="#ffffff" stop-opacity="0.05"/>
          <stop offset="50%" stop-color="#000000" stop-opacity="0"/>
          <stop offset="100%" stop-color="#00F0FF" stop-opacity="0.15"/>
        </linearGradient>
      </defs>
      <circle cx="${coinSize/2}" cy="${coinSize/2}" r="${coinSize/2 - 28}" fill="url(#sheen)"/>
      <circle cx="${coinSize/2}" cy="${coinSize/2}" r="${coinSize/2 - 28}" fill="none" stroke="#00F0FF" stroke-width="1.5" opacity="0.5"/>
    </svg>
  `);

  const maskedLogoBuffer = await sharp('public/quant_logo.png')
    .resize(innerLogoSize, innerLogoSize, { fit: 'cover' })
    .composite([{ input: innerMaskSvg, blend: 'dest-in' }])
    .png()
    .toBuffer();

  const innerOffset = Math.round((coinSize - innerLogoSize) / 2);
  const completeCoinBuffer = await sharp(frameSvg)
    .composite([
      { input: maskedLogoBuffer, top: innerOffset, left: innerOffset, blend: 'over' },
      { input: glassSheenSvg, top: 0, left: 0, blend: 'over' }
    ])
    .png()
    .toBuffer();

  const coinLeft = Math.round((stageW - coinSize) / 2); // 473
  const coinTop = 138;

  const pedestalReflectionSvg = Buffer.from(`
    <svg width="460" height="90" viewBox="0 0 460 90">
      <defs>
        <radialGradient id="pedestalGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#00F0FF" stop-opacity="0.5"/>
          <stop offset="40%" stop-color="#FFD700" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <ellipse cx="230" cy="45" rx="220" ry="40" fill="url(#pedestalGlow)"/>
    </svg>
  `);

  // 2. High-Impact, Prominent PancakeSwap Panel (Left Side) - Perfectly covers stand: 242 x 365 px
  const panelW = 242;
  const panelH = 365;

  const pancakePanelSvg = Buffer.from(`
    <svg width="${panelW}" height="${panelH}" viewBox="0 0 ${panelW} ${panelH}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="pancakeBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#071324" stop-opacity="0.96"/>
          <stop offset="100%" stop-color="#030812" stop-opacity="0.99"/>
        </linearGradient>
        <linearGradient id="pancakeGlowBorder" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#00F0FF"/>
          <stop offset="50%" stop-color="#38BDF8"/>
          <stop offset="100%" stop-color="#0284C7"/>
        </linearGradient>
        <filter id="pancakeShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="14" flood-color="#00F0FF" flood-opacity="0.35"/>
        </filter>
      </defs>

      <!-- Glass Panel Card -->
      <rect x="3" y="3" width="${panelW - 6}" height="${panelH - 6}" rx="22" fill="url(#pancakeBg)" stroke="url(#pancakeGlowBorder)" stroke-width="2.5" filter="url(#pancakeShadow)"/>
      <rect x="5" y="5" width="${panelW - 10}" height="${panelH - 10}" rx="20" fill="none" stroke="#ffffff" stroke-width="1" stroke-opacity="0.12"/>

      <!-- Status Pill -->
      <g transform="translate(18, 22)">
        <rect x="0" y="0" width="112" height="24" rx="12" fill="#00F0FF" fill-opacity="0.15" stroke="#00F0FF" stroke-width="1.2"/>
        <circle cx="12" cy="12" r="4.5" fill="#10B981"/>
        <text x="23" y="16.5" fill="#38BDF8" font-family="system-ui, -apple-system, sans-serif" font-size="10.5" font-weight="900" letter-spacing="1">LIVE TRADING</text>
      </g>

      <!-- Pancake Bunny Mascot Silhouette -->
      <g transform="translate(78, 64)">
        <circle cx="43" cy="43" r="40" fill="#D1884F" fill-opacity="0.15" stroke="#D1884F" stroke-width="2.2"/>
        <ellipse cx="43" cy="50" rx="28" ry="24" fill="#D1884F"/>
        <ellipse cx="30" cy="24" rx="8" ry="19" fill="#D1884F"/>
        <ellipse cx="56" cy="24" rx="8" ry="19" fill="#D1884F"/>
        <ellipse cx="30" cy="24" rx="4" ry="12" fill="#FFE5C4"/>
        <ellipse cx="56" cy="24" rx="4" ry="12" fill="#FFE5C4"/>
        <ellipse cx="34" cy="46" rx="4" ry="6" fill="#2E1B0E"/>
        <ellipse cx="52" cy="46" rx="4" ry="6" fill="#2E1B0E"/>
        <circle cx="35" cy="44" r="1.5" fill="#FFFFFF"/>
        <circle cx="53" cy="44" r="1.5" fill="#FFFFFF"/>
        <ellipse cx="27" cy="52" rx="4.5" ry="3" fill="#EFA572"/>
        <ellipse cx="59" cy="52" rx="4.5" ry="3" fill="#EFA572"/>
        <rect x="37" cy="30" width="12" height="8" rx="2" fill="#FDE047"/>
      </g>

      <!-- Subtitle: LIVE ON -->
      <text x="121" y="190" text-anchor="middle" fill="#94A3B8" font-family="system-ui, sans-serif" font-size="13" font-weight="800" letter-spacing="3">LIVE ON</text>

      <!-- Main Expression: PANCAKESWAP (ULTRA PROMINENT & GLOWING) -->
      <text x="121" y="226" text-anchor="middle" fill="#00F0FF" font-family="system-ui, -apple-system, sans-serif" font-size="25" font-weight="900" letter-spacing="1">PANCAKESWAP</text>
      
      <!-- Sub-label -->
      <text x="121" y="254" text-anchor="middle" fill="#E2E8F0" font-family="system-ui, sans-serif" font-size="13" font-weight="800" letter-spacing="2">DECENTRALIZED DEX</text>

      <!-- Action Button Pill -->
      <g transform="translate(23, 285)">
        <rect x="0" y="0" width="196" height="42" rx="12" fill="url(#pancakeGlowBorder)"/>
        <text x="98" y="27" text-anchor="middle" fill="#040914" font-family="system-ui, -apple-system, sans-serif" font-size="13.5" font-weight="900" letter-spacing="0.5">BUY $QUANT ON DEX ➔</text>
      </g>
    </svg>
  `);

  // 3. High-Impact, Prominent BNB Smart Chain Panel (Right Side) - 242 x 365 px
  const bnbPanelSvg = Buffer.from(`
    <svg width="${panelW}" height="${panelH}" viewBox="0 0 ${panelW} ${panelH}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bnbBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1c1605" stop-opacity="0.96"/>
          <stop offset="100%" stop-color="#080602" stop-opacity="0.99"/>
        </linearGradient>
        <linearGradient id="bnbGoldBorder" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FCD34D"/>
          <stop offset="50%" stop-color="#F0B90B"/>
          <stop offset="100%" stop-color="#D97706"/>
        </linearGradient>
        <filter id="bnbShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="14" flood-color="#F0B90B" flood-opacity="0.4"/>
        </filter>
      </defs>

      <!-- Glass Panel Card -->
      <rect x="3" y="3" width="${panelW - 6}" height="${panelH - 6}" rx="22" fill="url(#bnbBg)" stroke="url(#bnbGoldBorder)" stroke-width="2.5" filter="url(#bnbShadow)"/>
      <rect x="5" y="5" width="${panelW - 10}" height="${panelH - 10}" rx="20" fill="none" stroke="#ffffff" stroke-width="1" stroke-opacity="0.12"/>

      <!-- Status Pill -->
      <g transform="translate(18, 22)">
        <rect x="0" y="0" width="136" height="24" rx="12" fill="#F0B90B" fill-opacity="0.15" stroke="#F0B90B" stroke-width="1.2"/>
        <circle cx="12" cy="12" r="4.5" fill="#F0B90B"/>
        <text x="23" y="16.5" fill="#FCD34D" font-family="system-ui, -apple-system, sans-serif" font-size="10.5" font-weight="900" letter-spacing="1">BNB ECOSYSTEM</text>
      </g>

      <!-- Official BNB Cube Logo Icon -->
      <g transform="translate(78, 64)">
        <circle cx="43" cy="43" r="40" fill="#F0B90B" fill-opacity="0.15" stroke="#F0B90B" stroke-width="2.2"/>
        
        <!-- Center Rhombus -->
        <polygon points="43,32 51,40 43,48 35,40" fill="#F0B90B"/>
        <!-- Top Rhombus -->
        <polygon points="43,18 49,24 43,30 37,24" fill="#F0B90B"/>
        <!-- Bottom Rhombus -->
        <polygon points="43,50 49,56 43,62 37,56" fill="#F0B90B"/>
        <!-- Left Rhombus -->
        <polygon points="27,34 33,40 27,46 21,40" fill="#F0B90B"/>
        <!-- Right Rhombus -->
        <polygon points="59,34 65,40 59,46 53,40" fill="#F0B90B"/>

        <!-- Outer Corner Brackets -->
        <polygon points="43,12 52,21 48,25 43,20 38,25 34,21" fill="#F0B90B"/>
        <polygon points="43,68 52,59 48,55 43,60 38,55 34,59" fill="#F0B90B"/>
        <polygon points="15,40 24,31 28,35 23,40 28,45 24,49" fill="#F0B90B"/>
        <polygon points="71,40 62,31 58,35 63,40 58,45 62,49" fill="#F0B90B"/>
      </g>

      <!-- Subtitle: NETWORK -->
      <text x="121" y="190" text-anchor="middle" fill="#94A3B8" font-family="system-ui, sans-serif" font-size="13" font-weight="800" letter-spacing="3">OFFICIAL NETWORK</text>

      <!-- Main Expression: BNB SMART CHAIN (ULTRA PROMINENT & GLOWING) -->
      <text x="121" y="224" text-anchor="middle" fill="#F0B90B" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="900" letter-spacing="0.5">BNB SMART CHAIN</text>
      
      <!-- Sub-label: BEP-20 -->
      <text x="121" y="254" text-anchor="middle" fill="#FFFFFF" font-family="system-ui, sans-serif" font-size="14" font-weight="900" letter-spacing="2">BEP-20 VERIFIED</text>

      <!-- Action Button Pill -->
      <g transform="translate(23, 285)">
        <rect x="0" y="0" width="196" height="42" rx="12" fill="url(#bnbGoldBorder)"/>
        <text x="98" y="27" text-anchor="middle" fill="#080602" font-family="system-ui, -apple-system, sans-serif" font-size="13.5" font-weight="900" letter-spacing="0.5">TRADE $QUANT NOW ➔</text>
      </g>
    </svg>
  `);

  // Left panel placement: nicely over the stand at left = 82, top = 310
  const leftPanelX = 82;
  const leftPanelY = 310;

  // Right panel placement: nicely over the stand at left = 1052, top = 310
  const rightPanelX = 1052;
  const rightPanelY = 310;

  await sharp('src/assets/images/quant_front_stage_1792510487230.jpg')
    .composite([
      {
        input: pedestalReflectionSvg,
        left: Math.round((stageW - 460) / 2),
        top: 535,
        blend: 'screen'
      },
      {
        input: completeCoinBuffer,
        left: coinLeft,
        top: coinTop,
        blend: 'over'
      },
      {
        input: pancakePanelSvg,
        left: leftPanelX,
        top: leftPanelY,
        blend: 'over'
      },
      {
        input: bnbPanelSvg,
        left: rightPanelX,
        top: rightPanelY,
        blend: 'over'
      }
    ])
    .jpeg({ quality: 96 })
    .toFile('public/quant_token_showcase.jpg');

  console.log('Showcase banner generated with crystal-clear, bold PancakeSwap and BNB Smart Chain panels!');

  // Sync to dist
  try {
    fs.copyFileSync('public/quant_token_showcase.jpg', 'dist/quant_token_showcase.jpg');
    console.log('Synced to dist/quant_token_showcase.jpg');
  } catch (e) {}
}

buildCenteredShowcase().catch(console.error);
