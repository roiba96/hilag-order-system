// Renders src/app/icon.svg into the PNG icons the PWA needs.
// Run after changing the SVG: npm run icons
// Uses sharp, which Next.js already installs for image optimization.
import { mkdirSync, readFileSync } from "node:fs";
import sharp from "sharp";

const svg = readFileSync("src/app/icon.svg");

const outputs = [
  // iPhone "Add to Home Screen" (Next.js links it automatically from src/app).
  { file: "src/app/apple-icon.png", size: 180 },
  // Web manifest icons (Android and desktop install).
  { file: "public/icons/icon-192.png", size: 192 },
  { file: "public/icons/icon-512.png", size: 512 },
];

mkdirSync("public/icons", { recursive: true });
for (const { file, size } of outputs) {
  await sharp(svg, { density: 300 }).resize(size, size).png().toFile(file);
  console.log(`${file} (${size}x${size})`);
}
