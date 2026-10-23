const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function createPerfectShowcase() {
  console.log('Building exact BscScan showcase banner...');

  // 1. Base stage: 1376 x 768
  const baseImg = sharp('src/assets/images/quant_token_showcase_1792498320222.jpg');
  const metadata = await baseImg.metadata();
  const width = metadata.width;
  const height = metadata.height;

  // 2. Prepare the exact BscScan logo
  // Diameter in the center coin is around 410px
  const coinDiameter = 405;

  // Create a circular mask for the logo
  const circleMask = Buffer.from(`
    <svg width="${coinDiameter}" height="${coinDiameter}" viewBox="0 0 ${coinDiameter} ${coinDiameter}">
      <circle cx="${coinDiameter/2}" cy="${coinDiameter/2}" r="${coinDiameter/2}" fill="#ffffff"/>
    </svg>
  `);

  // Create an outer golden/cyan 3D bevel ring and ambient glow overlay
  const outerRingOverlay = Buffer.from(`
    <svg width="${coinDiameter}" height="${coinDiameter}" viewBox="0 0 ${coinDiameter} ${coinDiameter}">
      <defs>
        <radialGradient id="ringGlow" cx="50%" cy="50%" r="50%">
          <stop offset="85%" stop-color="#000000" stop-opacity="0"/>
          <stop offset="96%" stop-color="#00F0FF" stop-opacity="0.6"/>
          <stop offset="100%" stop-color="#FFD700" stop-opacity="0.9"/>
        </radialGradient>
        <linearGradient id="specular" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.35"/>
          <stop offset="35%" stop-color="#ffffff" stop-opacity="0.05"/>
          <stop offset="70%" stop-color="#000000" stop-opacity="0"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0.4"/>
        </linearGradient>
      </defs>
      <!-- Circular border stroke -->
      <circle cx="${coinDiameter/2}" cy="${coinDiameter/2}" r="${coinDiameter/2 - 3}" fill="none" stroke="url(#ringGlow)" stroke-width="6"/>
      <!-- 3D Specular glass highlight -->
      <circle cx="${coinDiameter/2}" cy="${coinDiameter/2}" r="${coinDiameter/2}" fill="url(#specular)"/>
    </svg>
  `);

  // Process exact logo: resize and apply circular mask
  const maskedLogo = await sharp('public/quant_logo.png')
    .resize(coinDiameter, coinDiameter, { fit: 'cover' })
    .composite([
      {
        input: circleMask,
        blend: 'dest-in'
      },
      {
        input: outerRingOverlay,
        blend: 'over'
      }
    ])
    .png()
    .toBuffer();

  // Position of coin center in the 1376x768 image:
  // Center is approximately x = 688, y = 398
  const left = Math.round((width - coinDiameter) / 2) + 2;
  const top = Math.round((height - coinDiameter) / 2) + 12;

  // Composite exact logo onto the base stage
  await sharp('src/assets/images/quant_token_showcase_1792498320222.jpg')
    .composite([
      {
        input: maskedLogo,
        top: top,
        left: left,
        blend: 'over'
      }
    ])
    .jpeg({ quality: 96 })
    .toFile('public/quant_token_showcase.jpg');

  console.log('Composite complete: public/quant_token_showcase.jpg updated!');

  // Sync to dist
  try {
    fs.copyFileSync('public/quant_token_showcase.jpg', 'dist/quant_token_showcase.jpg');
    console.log('Synced to dist/quant_token_showcase.jpg');
  } catch (e) {}
}

createPerfectShowcase().catch(console.error);
