import fs from "fs";
import path from "path";
import sharp from "sharp";

const root = path.join(process.cwd());
const svgPath = path.join(root, "public/icon.svg");
const iconsDir = path.join(root, "public/icons");

const svg = fs.readFileSync(svgPath);

async function generateIcons() {
  fs.mkdirSync(iconsDir, { recursive: true });

  const sizes = [192, 512];

  for (const size of sizes) {
    await sharp(svg, { density: 300 })
      .resize(size, size)
      .png()
      .toFile(path.join(iconsDir, `icon-${size}.png`));

    await sharp(svg, { density: 300 })
      .resize(size, size)
      .png()
      .toFile(path.join(iconsDir, `maskable-icon-${size}.png`));
  }

  console.log("Generated PWA icons in public/icons/");
}

void generateIcons();
