import sharp from "sharp";
import fs from "node:fs/promises";
import { renderGarment, type Shape } from "../prisma/seed/garments";

/** Dev helper: renders a contact sheet of the generated demo product visuals. */
async function main() {
  const shapes: [Shape, string][] = [
    ["tshirt", "#1f2a44"],
    ["shirt", "#ffffff"],
    ["hoodie", "#8a8d91"],
    ["coat", "#b08559"],
    ["jeans", "#3b5b8c"],
    ["dress", "#7b1e2b"],
    ["sneaker", "#ffffff"],
    ["bag", "#8b5a2b"],
    ["jacket", "#111111"],
    ["skirt", "#9caf88"],
    ["boots", "#5b3a29"],
    ["onesie", "#f2d16b"],
  ];
  const tiles = await Promise.all(
    shapes.map(([s, c], i) => sharp(Buffer.from(renderGarment(s, c, i % 3 === 2 ? "DETAIL" : i % 3 === 1 ? "BACK" : "FRONT", i))).resize(300, 375).png().toBuffer()),
  );
  await fs.mkdir("storage", { recursive: true });
  await sharp({ create: { width: 1200, height: 1125, channels: 3, background: "#ffffff" } })
    .composite(tiles.map((input, i) => ({ input, left: (i % 4) * 300, top: Math.floor(i / 4) * 375 })))
    .png()
    .toFile("storage/garments-preview.png");
  console.log("written storage/garments-preview.png");
}
main();
