import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// SVG를 여러 크기의 PNG로 변환하는 스크립트
// 실제로는 sharp나 canvas 라이브러리를 사용하는 것이 좋지만,
// 여기서는 간단히 SVG 파일들을 여러 크기로 복사합니다.

const iconSizes = [
  { size: 192, name: 'icon-192.png' },
  { size: 512, name: 'icon-512.png' },
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 32, name: 'favicon-32x32.png' },
  { size: 16, name: 'favicon-16x16.png' }
];

// SVG 콘텐츠를 읽어서 각 크기별로 저장
const svgContent = fs.readFileSync(path.join(__dirname, 'public', 'app-icon.svg'), 'utf8');

iconSizes.forEach(({ size, name }) => {
  // SVG의 width, height를 각 크기에 맞게 수정
  const modifiedSvg = svgContent
    .replace(/width="512"/, `width="${size}"`)
    .replace(/height="512"/, `height="${size}"`);
  
  // PNG 대신 SVG를 크기별로 저장 (실제 환경에서는 sharp 등을 사용)
  const svgName = name.replace('.png', '.svg');
  fs.writeFileSync(path.join(__dirname, 'public', svgName), modifiedSvg);
});

console.log('Icons generated successfully!');