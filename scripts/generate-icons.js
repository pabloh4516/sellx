/**
 * Script para gerar ícones PWA do Sellx
 * Execute com: node scripts/generate-icons.js
 */

const fs = require('fs');
const path = require('path');

// Tamanhos de ícones necessários
const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

// Diretório de saída
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'icons');

// SVG do ícone (versão simplificada para melhor renderização)
function generateSVG(size) {
  const borderRadius = Math.round(size * 0.1875); // 18.75% do tamanho

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e3a5f"/>
      <stop offset="100%" stop-color="#2d5a87"/>
    </linearGradient>
  </defs>

  <!-- Background com cantos arredondados -->
  <rect width="512" height="512" rx="96" fill="url(#bg)"/>

  <!-- Carrinho de compras -->
  <g transform="translate(256, 240)" fill="none" stroke="white" stroke-width="28" stroke-linecap="round" stroke-linejoin="round">
    <!-- Corpo do carrinho -->
    <path d="M-130 -50 L-105 -50 L-55 70 L105 70 L130 -10 L-35 -10"/>
    <!-- Rodas -->
    <circle cx="-35" cy="110" r="28" fill="white" stroke="none"/>
    <circle cx="75" cy="110" r="28" fill="white" stroke="none"/>
  </g>

  <!-- Círculo verde com $ -->
  <circle cx="340" cy="160" r="55" fill="#22c55e"/>
  <text x="340" y="178" font-family="Arial,sans-serif" font-size="56" font-weight="bold" fill="white" text-anchor="middle">$</text>
</svg>`;
}

// Garante que o diretório existe
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Criado diretório: ${dir}`);
  }
}

// Gera os ícones SVG
function generateIcons() {
  console.log('🎨 Gerando ícones PWA do Sellx...\n');

  ensureDir(OUTPUT_DIR);

  // Gerar SVG em cada tamanho
  SIZES.forEach(size => {
    const svg = generateSVG(size);
    const filename = `icon-${size}x${size}.svg`;
    const filepath = path.join(OUTPUT_DIR, filename);

    fs.writeFileSync(filepath, svg);
    console.log(`  ✅ ${filename}`);
  });

  // Gerar ícone principal (512x512)
  const mainSvg = generateSVG(512);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'icon.svg'), mainSvg);
  console.log(`  ✅ icon.svg (principal)`);

  // Gerar favicon.svg
  fs.writeFileSync(path.join(__dirname, '..', 'public', 'favicon.svg'), mainSvg);
  console.log(`  ✅ favicon.svg`);

  console.log('\n✨ Ícones gerados com sucesso!');
  console.log('\n📋 Próximos passos:');
  console.log('   1. Para converter SVG para PNG, abra public/generate-icons.html no navegador');
  console.log('   2. Ou use uma ferramenta online como realfavicongenerator.net');
  console.log('   3. Rode npm run build para atualizar o PWA\n');
}

// Executar
generateIcons();
