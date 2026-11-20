/**
 * Generates clean "flat-lay" product visuals for the demo catalog so every
 * product, colour and view has a real image (front / back / detail).
 * Real shops replace them by uploading photos in the admin.
 */

export type Shape =
  | "tshirt"
  | "polo"
  | "top"
  | "shirt"
  | "hoodie"
  | "sweater"
  | "jacket"
  | "coat"
  | "suit"
  | "tracksuit"
  | "trousers"
  | "jeans"
  | "leggings"
  | "shorts"
  | "skirt"
  | "dress"
  | "sneaker"
  | "boots"
  | "heels"
  | "bag"
  | "cap"
  | "beanie"
  | "belt"
  | "scarf"
  | "onesie";

type Def = {
  /** filled silhouette paths, drawn in order */
  body: string[];
  /** front details (stroke) */
  front?: string;
  /** back details (stroke) */
  back?: string;
  /** filled accents darker than the base colour (collars, etc.) */
  accents?: string[];
  /** light fills (soles, shirt) */
  light?: string[];
  /** focal point for the detail view */
  focus: [number, number];
  texture?: "lines" | "knit" | "denim" | "smooth" | "leather";
  stitch?: string;
};

const LONG_SLEEVE_BODY =
  "M140 80 L100 92 L66 140 L44 372 L82 378 L108 210 L110 440 Q200 452 290 440 L292 210 L318 378 L356 372 L334 140 L300 92 L260 80 Q200 100 140 80 Z";
const TSHIRT = "M150 70 Q200 105 250 70 L300 82 L352 128 L322 182 L288 162 L288 430 Q200 440 112 430 L112 162 L78 182 L48 128 L100 82 Z";
const JACKET = (bottom: number) =>
  `M150 64 L200 84 L250 64 L302 80 L336 132 L358 380 L322 386 L296 204 L296 ${bottom} L104 ${bottom} L104 204 L78 386 L42 380 L64 132 L98 80 Z`;
const TROUSERS = "M128 50 L272 50 L288 470 L216 470 L200 150 L184 470 L112 470 Z";

const DEFS: Record<Shape, Def> = {
  tshirt: {
    body: [TSHIRT],
    front: "M150 70 Q200 112 250 70 M114 418 Q200 428 286 418 M80 172 L112 150 M320 172 L288 150",
    back: "M150 70 Q200 88 250 70 M114 418 Q200 428 286 418",
    focus: [200, 110],
    texture: "lines",
  },
  polo: {
    body: [TSHIRT],
    accents: ["M158 72 L200 110 L188 130 L148 92 Z", "M242 72 L200 110 L212 130 L252 92 Z"],
    front: "M200 110 L200 178 M114 418 Q200 428 286 418 M80 172 L112 150 M320 172 L288 150",
    back: "M150 72 Q200 84 250 72 M114 418 Q200 428 286 418",
    focus: [200, 120],
    texture: "knit",
  },
  top: {
    body: ["M150 80 L168 58 L178 58 Q200 100 222 58 L232 58 L250 80 L264 420 Q200 432 136 420 Z"],
    front: "M165 120 L160 410 M185 125 L182 415 M200 128 L200 418 M215 125 L218 415 M235 120 L240 410",
    back: "M165 100 L160 410 M200 100 L200 418 M235 100 L240 410",
    focus: [200, 140],
    texture: "knit",
  },
  shirt: {
    body: ["M152 66 L200 92 L248 66 L298 80 L332 130 L356 360 L322 368 L292 196 L292 440 Q200 452 108 440 L108 196 L78 368 L44 360 L68 130 L102 80 Z"],
    accents: ["M152 66 L176 114 L200 92 Z", "M248 66 L224 114 L200 92 Z"],
    front: "M200 92 L200 445 M222 150 h40 v44 h-40 Z M48 345 L80 350 M352 345 L320 350",
    back: "M108 122 Q200 138 292 122 M48 345 L80 350 M352 345 L320 350",
    focus: [200, 120],
    texture: "lines",
  },
  hoodie: {
    body: ["M140 80 Q128 20 200 14 Q272 20 260 80 Q230 110 200 112 Q170 110 140 80 Z", LONG_SLEEVE_BODY],
    accents: ["M158 78 Q200 40 242 78 Q222 104 200 106 Q178 104 158 78 Z"],
    front: "M186 104 L182 170 M214 104 L218 170 M140 330 L260 330 L280 400 L120 400 Z M110 428 Q200 440 290 428 M46 356 L82 362 M354 356 L318 362",
    back: "M110 428 Q200 440 290 428 M46 356 L82 362 M354 356 L318 362",
    focus: [200, 110],
    texture: "knit",
  },
  sweater: {
    body: [LONG_SLEEVE_BODY],
    front: "M150 80 Q200 118 250 80 M154 86 Q200 126 246 86 M110 424 Q200 436 290 424 M110 430 Q200 442 290 430 M46 352 L82 358 M354 352 L318 358",
    back: "M150 80 Q200 96 250 80 M110 424 Q200 436 290 424 M46 352 L82 358 M354 352 L318 358",
    focus: [200, 150],
    texture: "knit",
  },
  jacket: {
    body: [JACKET(430)],
    accents: ["M150 64 L170 150 L196 226 L184 120 Z", "M250 64 L230 150 L204 226 L216 120 Z"],
    front: "M200 226 L200 430 M120 330 h52 M228 330 h52 M48 362 L80 368 M352 362 L320 368",
    back: "M200 84 L200 430 M48 362 L80 368 M352 362 L320 368",
    focus: [200, 160],
    texture: "smooth",
  },
  coat: {
    body: [JACKET(482)],
    accents: ["M150 64 L170 160 L196 236 L184 120 Z", "M250 64 L230 160 L204 236 L216 120 Z"],
    front: "M200 236 L200 482 M104 296 L296 296 M118 360 h48 M234 360 h48 M48 362 L80 368 M352 362 L320 368",
    back: "M200 84 L200 482 M104 296 L296 296 M48 362 L80 368 M352 362 L320 368",
    focus: [200, 180],
    texture: "smooth",
  },
  suit: {
    body: [JACKET(430)],
    light: ["M172 74 L200 84 L228 74 L200 206 Z"],
    accents: ["M150 64 L170 150 L196 226 L184 120 Z", "M250 64 L230 150 L204 226 L216 120 Z", "M195 90 L205 90 L210 176 L200 196 L190 176 Z"],
    front: "M200 226 L200 430 M120 330 h52 M228 330 h52 M226 170 h30",
    back: "M200 84 L200 430",
    focus: [200, 140],
    texture: "smooth",
  },
  tracksuit: {
    body: [LONG_SLEEVE_BODY],
    light: ["M70 140 L76 140 L54 372 L48 372 Z", "M330 140 L324 140 L346 372 L352 372 Z"],
    front: "M200 92 L200 446 M150 80 Q200 100 250 80 M130 300 L170 300 M230 300 L270 300 M110 428 Q200 440 290 428",
    back: "M150 80 Q200 92 250 80 M110 428 Q200 440 290 428",
    focus: [200, 200],
    texture: "smooth",
  },
  trousers: {
    body: [TROUSERS],
    front: "M128 72 L272 72 M200 72 L200 150 M136 76 Q152 110 132 132 M264 76 Q248 110 268 132 M156 160 L150 465 M244 160 L250 465",
    back: "M128 72 L272 72 M142 100 h42 v26 h-42 Z M216 100 h42 v26 h-42 Z",
    focus: [200, 110],
    texture: "lines",
  },
  jeans: {
    body: [TROUSERS],
    front: "M128 72 L272 72 M200 72 L200 150 M136 76 Q152 112 130 134 M264 76 Q248 112 270 134 M236 84 h18 v18 h-18 Z",
    back: "M128 72 L272 72 M140 98 L184 98 L180 136 L162 146 L144 136 Z M216 98 L260 98 L256 136 L238 146 L220 136 Z M128 92 Q200 112 272 92",
    stitch: "M118 470 L130 60 M282 470 L270 60 M190 465 L200 160 M210 465 L200 160",
    focus: [200, 110],
    texture: "denim",
  },
  leggings: {
    body: ["M140 50 L260 50 L264 470 L216 470 L200 160 L184 470 L136 470 Z"],
    front: "M140 76 L260 76",
    back: "M140 76 L260 76 M200 76 L200 160",
    focus: [200, 120],
    texture: "smooth",
  },
  shorts: {
    body: ["M124 80 L276 80 L294 300 L212 312 L200 190 L188 312 L106 300 Z"],
    front: "M124 102 L276 102 M200 102 L200 182 M132 106 Q148 140 128 160 M268 106 Q252 140 272 160 M110 282 L188 292 M290 282 L212 292",
    back: "M124 102 L276 102 M140 126 h40 v28 h-40 Z M220 126 h40 v28 h-40 Z M110 282 L188 292 M290 282 L212 292",
    focus: [200, 140],
    texture: "lines",
  },
  skirt: {
    body: ["M146 80 L254 80 L262 102 L312 400 Q200 424 88 400 L138 102 Z"],
    front: "M140 102 L260 102 M160 104 L130 405 M180 104 L170 410 M200 104 L200 412 M220 104 L230 410 M240 104 L270 405",
    back: "M140 102 L260 102 M200 80 L200 200",
    focus: [200, 150],
    texture: "smooth",
  },
  dress: {
    body: ["M162 50 L176 50 Q200 92 224 50 L238 50 L250 150 Q246 175 252 196 L318 452 Q200 478 82 452 L148 196 Q154 175 150 150 Z"],
    front: "M150 196 Q200 208 250 196 M176 50 Q200 96 224 50 M160 220 L120 450 M240 220 L280 450",
    back: "M150 196 Q200 208 250 196 M200 60 L200 196",
    focus: [200, 150],
    texture: "smooth",
  },
  sneaker: {
    body: ["M60 330 Q62 262 120 250 L196 240 Q214 196 262 196 L300 206 Q312 250 336 262 Q356 272 350 330 Z"],
    light: ["M52 330 L356 330 Q360 356 340 362 L70 362 Q48 360 52 330 Z"],
    front: "M214 214 L246 236 M206 228 L240 250 M198 242 L232 264 M150 300 Q220 270 300 296 M300 206 L306 250",
    back: "M150 300 Q220 270 300 296 M58 346 L352 346",
    focus: [220, 250],
    texture: "leather",
  },
  boots: {
    body: ["M150 70 L246 70 L250 300 Q330 300 344 344 L344 372 L136 372 L140 210 Z"],
    accents: ["M130 372 L352 372 L352 394 L130 394 Z"],
    front: "M232 110 L238 292 M150 70 L246 70 M196 70 L196 50 L214 50 L214 70",
    back: "M198 80 L198 360 M150 70 L246 70",
    focus: [230, 200],
    texture: "leather",
  },
  heels: {
    body: ["M80 300 Q130 270 200 278 Q260 284 300 230 L330 230 Q342 254 336 292 L300 294 Q240 302 180 332 L84 332 Z"],
    accents: ["M306 294 L324 294 L316 396 L308 396 Z", "M80 330 L182 330 L180 338 L84 338 Z"],
    front: "M120 300 Q170 286 220 292",
    back: "M300 236 L330 236",
    focus: [240, 280],
    texture: "leather",
  },
  bag: {
    body: ["M110 200 L290 200 L314 440 L86 440 Z"],
    accents: ["M184 226 h32 v24 h-32 Z"],
    front: "M110 226 L290 226 M150 200 Q150 104 200 104 Q250 104 250 200",
    back: "M150 200 Q150 104 200 104 Q250 104 250 200 M100 400 L300 400",
    focus: [200, 240],
    texture: "leather",
  },
  cap: {
    body: ["M110 262 Q110 150 200 145 Q290 150 290 262 Z", "M100 258 Q200 240 340 268 Q330 300 280 292 Q200 280 110 286 Z"],
    accents: ["M192 140 a8 6 0 1 0 16 0 a8 6 0 1 0 -16 0"],
    front: "M200 146 L200 254 M150 160 Q140 210 146 256 M250 160 Q260 210 254 256",
    back: "M200 146 L200 254 M170 230 Q200 214 230 230",
    focus: [200, 220],
    texture: "lines",
  },
  beanie: {
    body: ["M120 300 Q120 150 200 140 Q280 150 280 300 Z", "M112 280 L288 280 L288 336 L112 336 Z"],
    accents: ["M174 128 a26 26 0 1 0 52 0 a26 26 0 1 0 -52 0"],
    front: "M130 290 L130 330 M150 290 L150 330 M170 290 L170 330 M190 290 L190 330 M210 290 L210 330 M230 290 L230 330 M250 290 L250 330 M270 290 L270 330",
    back: "M150 290 L150 330 M200 290 L200 330 M250 290 L250 330",
    focus: [200, 280],
    texture: "knit",
  },
  belt: {
    body: ["M50 236 L330 236 Q342 236 342 248 L342 276 Q342 288 330 288 L50 288 Z"],
    front: "M270 262 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0 M296 262 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0 M244 262 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0",
    back: "M50 262 L342 262",
    light: ["M60 226 L104 226 L104 298 L60 298 Z M70 236 L94 236 L94 288 L70 288 Z"],
    focus: [90, 262],
    texture: "leather",
  },
  scarf: {
    body: ["M200 100 L320 240 L200 380 L80 240 Z"],
    front: "M200 130 L294 240 L200 350 L106 240 Z M200 160 L268 240 L200 320 L132 240 Z M200 380 L196 410 M210 372 L210 402 M190 372 L186 400",
    back: "M200 130 L294 240 L200 350 L106 240 Z",
    focus: [200, 240],
    texture: "smooth",
  },
  onesie: {
    body: ["M150 80 Q200 112 250 80 L282 92 L310 132 L286 170 L262 156 L262 330 Q246 372 222 378 L222 392 L178 392 L178 378 Q154 372 138 330 L138 156 L114 170 L90 132 L118 92 Z"],
    front: "M150 80 Q200 118 250 80 M186 386 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0 M208 386 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0 M96 142 L118 160 M304 142 L282 160",
    back: "M150 80 Q200 96 250 80",
    focus: [200, 140],
    texture: "knit",
  },
};

function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255,
    g = (n >> 8) & 255,
    b = n & 255;
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(amount < 0 ? c * (1 + amount) : c + (255 - c) * amount)));
  return `#${[f(r), f(g), f(b)].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}
function luminance(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}

const BACKGROUNDS = ["#efe9e1", "#ebe7e3", "#e8eaec", "#f0ebe4", "#e9e4dc"];

export function renderGarment(shape: Shape, hex: string, view: "FRONT" | "BACK" | "DETAIL", bgIndex = 0): string {
  const def = DEFS[shape];
  const bg = BACKGROUNDS[bgIndex % BACKGROUNDS.length];
  const light = luminance(hex) > 0.82;
  const stroke = light ? "#cfc9c1" : shade(hex, -0.35);
  const detail = light ? "#bdb6ad" : shade(hex, luminance(hex) < 0.2 ? 0.25 : -0.3);
  const accent = light ? shade(hex, -0.06) : shade(hex, -0.18);
  const isShoe = ["sneaker", "boots", "heels"].includes(shape);
  const details = view === "BACK" ? def.back : def.front;

  const tex =
    def.texture === "denim"
      ? `<pattern id="tex" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="4" stroke="#fff" stroke-opacity="0.10" stroke-width="1.2"/></pattern>`
      : def.texture === "knit"
        ? `<pattern id="tex" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="2.5" cy="2.5" r="0.9" fill="#000" fill-opacity="0.07"/></pattern>`
        : def.texture === "leather"
          ? `<pattern id="tex" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="0.6" fill="#000" fill-opacity="0.05"/></pattern>`
          : def.texture === "lines"
            ? `<pattern id="tex" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(90)"><line x1="0" y1="0" x2="0" y2="3" stroke="#000" stroke-opacity="0.04" stroke-width="1"/></pattern>`
            : `<pattern id="tex" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="none"/></pattern>`;

  const bodies = def.body
    .map(
      (d) =>
        `<path d="${d}" fill="${hex}" stroke="${stroke}" stroke-width="1.6" stroke-linejoin="round"/>` +
        `<path d="${d}" fill="url(#shadeGrad)"/>` +
        `<path d="${d}" fill="url(#tex)"/>`,
    )
    .join("");
  const accents = (def.accents ?? []).map((d) => `<path d="${d}" fill="${accent}" stroke="${stroke}" stroke-width="1.2"/>`).join("");
  const lights = (def.light ?? []).map((d) => `<path d="${d}" fill="#f6f4f0" stroke="#d6d0c8" stroke-width="1.4"/>`).join("");
  const stitch = def.stitch && view !== "BACK" ? `<path d="${def.stitch}" fill="none" stroke="#c98b3c" stroke-width="1.2" stroke-dasharray="3 3" opacity=".8"/>` : "";
  const strokes = details
    ? `<path d="${details}" fill="none" stroke="${detail}" stroke-width="${isShoe ? 2.2 : 1.8}" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/>`
    : "";
  const buttons =
    view !== "BACK" && (shape === "shirt" || shape === "polo" || shape === "jacket" || shape === "coat" || shape === "suit")
      ? (shape === "shirt" ? [130, 175, 220, 265, 310, 355, 400] : shape === "polo" ? [128, 150, 170] : [262, 322])
          .map((y) => `<circle cx="${shape === "jacket" || shape === "coat" || shape === "suit" ? 206 : 206}" cy="${y}" r="${shape === "shirt" || shape === "polo" ? 3 : 5}" fill="${light ? "#e7e2da" : shade(hex, 0.35)}" stroke="${stroke}" stroke-width=".8"/>`)
          .join("")
      : "";
  const zipper = view !== "BACK" && (shape === "tracksuit" || (shape === "jacket" && false)) ? `<path d="M200 92 L200 446" stroke="#bbb" stroke-width="2.5" stroke-dasharray="2 2"/>` : "";

  const garment = `${bodies}${lights}${accents}${stitch}${strokes}${buttons}${zipper}`;
  const [fx, fy] = def.focus;
  const transform =
    view === "DETAIL"
      ? `translate(200 250) scale(1.9) translate(${-fx} ${-fy})`
      : view === "BACK"
        ? `translate(400 0) scale(-1 1)`
        : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1250" viewBox="0 0 400 500">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(bg, 0.25)}"/><stop offset="1" stop-color="${bg}"/></linearGradient>
    <linearGradient id="shadeGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.16"/>
      <stop offset="0.5" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0.16"/>
    </linearGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="8"/></filter>
    ${tex}
  </defs>
  <rect width="400" height="500" fill="url(#bg)"/>
  ${view === "DETAIL" ? "" : `<ellipse cx="200" cy="${isShoe ? 372 : 470}" rx="${isShoe ? 150 : 120}" ry="12" fill="#000" opacity=".10" filter="url(#soft)"/>`}
  <g transform="${transform}">
    <g transform="translate(3 5)" opacity=".10" filter="url(#soft)">${def.body.map((d) => `<path d="${d}" fill="#000"/>`).join("")}</g>
    ${garment}
  </g>
</svg>`;
}
