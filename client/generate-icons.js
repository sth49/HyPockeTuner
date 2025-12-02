import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const iconSizes = [
  { size: 192, name: 'icon-192.png' },
  { size: 512, name: 'icon-512.png' },
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 32, name: 'favicon-32x32.png' },
  { size: 16, name: 'favicon-16x16.png' }
];

const svgContent = fs.readFileSync(path.join(__dirname, 'public', 'app-icon.svg'), 'utf8');

iconSizes.forEach(({ size, name }) => {
  const modifiedSvg = svgContent
    .replace(/width="512"/, `width="${size}"`)
    .replace(/height="512"/, `height="${size}"`);

  const svgName = name.replace('.png', '.svg');
  fs.writeFileSync(path.join(__dirname, 'public', svgName), modifiedSvg);
});

console.log('Icons generated successfully!');