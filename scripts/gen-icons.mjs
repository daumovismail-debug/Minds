import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const sizes = [
  { src: 'apple-touch-icon.svg', out: 'apple-touch-icon.png', size: 180 },
  { src: 'icon-192.svg', out: 'icon-192.png', size: 192 },
  { src: 'icon-512.svg', out: 'icon-512.png', size: 512 },
];

const publicDir = path.resolve('public');

for (const { src, out, size } of sizes) {
  const buf = fs.readFileSync(path.join(publicDir, src));
  await sharp(buf, { density: 400 }).resize(size, size).png().toFile(path.join(publicDir, out));
  console.log(`generated public/${out}`);
}
