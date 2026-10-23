const fs = require('fs');
const path = require('path');

function embedShowcase() {
  console.log('Embedding showcase image as base64 in website.html...');

  const imageBuffer = fs.readFileSync('public/quant_token_showcase.jpg');
  const base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;

  const logoBuffer = fs.readFileSync('public/quant_logo.png');
  const base64Logo = `data:image/png;base64,${logoBuffer.toString('base64')}`;

  let html = fs.readFileSync('public/website.html', 'utf8');

  // Replace showcase image src with base64
  html = html.replace(
    /src="\/quant_token_showcase\.jpg"/g,
    `src="${base64Image}"`
  );

  // Replace header logo with base64 real logo
  html = html.replace(
    /src="\/quant_logo\.jpg"/g,
    `src="${base64Logo}"`
  );

  fs.writeFileSync('public/website.html', html, 'utf8');
  try {
    fs.writeFileSync('dist/website.html', html, 'utf8');
  } catch (e) {}

  console.log('Successfully embedded base64 showcase into public/website.html and dist/website.html!');
  console.log(`New website.html size: ${(Buffer.byteLength(html) / 1024).toFixed(1)} KB`);
}

embedShowcase();
