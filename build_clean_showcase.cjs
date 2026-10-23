const sharp = require('sharp');
const fs = require('fs');

async function buildCleanCenteredShowcase() {
  console.log('Rendering user-approved clean centered 3D crypto showcase...');

  const stageW = 1376;
  const stageH = 768;

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
      }
    ])
    .jpeg({ quality: 96 })
    .toFile('public/quant_token_showcase.jpg');

  console.log('Clean showcase generated and saved to public/quant_token_showcase.jpg!');

  // Sync to dist
  try {
    fs.copyFileSync('public/quant_token_showcase.jpg', 'dist/quant_token_showcase.jpg');
    console.log('Synced to dist/quant_token_showcase.jpg');
  } catch (e) {}
}

buildCleanCenteredShowcase().catch(console.error);
