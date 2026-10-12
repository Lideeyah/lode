/**
 * Social images for X, generated from the same mark as everything else.
 *
 * Two surfaces, two inversions. The avatar is cropped to a circle by X,
 * so its artwork sits well inside the inscribed square. The header has
 * the avatar overlapping its lower left, so nothing important goes there.
 */
import { readFileSync, mkdirSync } from 'fs';
import sharp from 'sharp';
import opentype from 'opentype.js';

const SIGNAL = '#D6442A';
const INK = '#1C1A17';
const PAPER = '#F2EEE4';
const MUTED = '#8A8378';

const OUT = 'brand/social';
mkdirSync(OUT, { recursive: true });

/** The generated mark path, lifted from the committed SVG. */
const markSvg = readFileSync('brand/mark.svg', 'utf8');
const markPath = markSvg.match(/ d="([^"]+)"/)[1];
const VIEW_W = 240, VIEW_H = 100;

/**
 * The wordmark, outlined, so it needs no font on the rendering machine
 * and can be recoloured for a dark background.
 */
const ot = opentype.default ?? opentype;
const font = ot.parse(
  readFileSync(
    'node_modules/@expo-google-fonts/newsreader/600SemiBold/Newsreader_600SemiBold.ttf',
  ).buffer,
);
function wordmark(capTarget) {
  const probe = 100;
  const capHeight = -font.getPath('L', 0, 0, probe).getBoundingBox().y1;
  const size = probe * (capTarget / capHeight);
  const path = font.getPath('LODE', 0, 0, size);
  const bb = path.getBoundingBox();
  return { d: path.toPathData(2), w: bb.x2 - bb.x1, h: bb.y2 - bb.y1, x1: bb.x1, y1: bb.y1 };
}

const stroke = (color, width) =>
  `fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"`;

// ---- Avatar: red mark on paper, safe inside a circular crop -----------
{
  const S = 1000;
  // X crops to a circle and renders this at about 48px in a timeline,
  // so the mark is large and heavily stroked. A 760x316 box centred in a
  // 1000 circle has its corners 412 from the centre against a radius of
  // 500, so nothing clips.
  const markW = S * 0.76;
  const sc = markW / VIEW_W;
  const markH = VIEW_H * sc;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  <rect width="${S}" height="${S}" fill="${PAPER}"/>
  <g transform="translate(${(S - markW) / 2} ${(S - markH) / 2}) scale(${sc.toFixed(4)})">
    <path d="${markPath}" ${stroke(SIGNAL, 18)}/>
  </g>
</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(`${OUT}/x-avatar.png`);
  console.log('x-avatar.png        1000x1000  paper, red mark, circle-safe');
}

// ---- Header: ink, light wordmark, tagline -----------------------------
{
  const W = 1500, H = 500;

  // X overlaps the avatar on the lower left, so everything sits in the
  // upper two thirds and stays centred, clear of it at any breakpoint.
  const markW = 196;
  const sc = markW / VIEW_W;
  const markH = VIEW_H * sc;

  const cap = markH * 0.44;
  const wm = wordmark(cap);
  const gap = cap * 0.85;
  const lockW = markW + gap + wm.w;
  const lockX = (W - lockW) / 2;
  const lockY = 92;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${INK}"/>
  <g transform="translate(${lockX.toFixed(1)} ${lockY}) scale(${sc.toFixed(4)})">
    <path d="${markPath}" ${stroke(SIGNAL, 9)}/>
  </g>
  <g transform="translate(${(lockX + markW + gap - wm.x1).toFixed(1)} ${(lockY + markH * 0.62 - wm.y1 - wm.h / 2).toFixed(1)})">
    <path d="${wm.d}" fill="${PAPER}"/>
  </g>
  <text x="${W / 2}" y="${lockY + markH + 86}" fill="${PAPER}" text-anchor="middle"
        font-family="Georgia, 'Times New Roman', serif" font-size="42" font-weight="600">
    Proof of work where the scarce input is you.
  </text>
  <text x="${W / 2}" y="${lockY + markH + 132}" fill="${MUTED}" text-anchor="middle"
        font-family="ui-monospace, 'SF Mono', Menlo, monospace"
        font-size="19" letter-spacing="3.4">
    YOUR PHONE MINES ONLY WHILE IT CAN VERIFY YOU ARE WALKING
  </text>
</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(`${OUT}/x-header.png`);
  console.log('x-header.png        1500x500   ink, lockup, tagline');
}

// ---- Square card for the post ----------------------------------------
{
  const W = 1200, H = 675;
  const markW = 520;
  const sc = markW / VIEW_W;
  const markH = VIEW_H * sc;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${PAPER}"/>
  <g transform="translate(${(W - markW) / 2} ${H / 2 - markH / 2 - 42}) scale(${sc.toFixed(4)})">
    <path d="${markPath}" ${stroke(SIGNAL, 9)}/>
  </g>
  <text x="${W / 2}" y="${H / 2 + 92}" fill="${INK}" text-anchor="middle"
        font-family="Georgia, 'Times New Roman', serif" font-size="46" font-weight="600">
    Proof of work where the scarce input is you.
  </text>
  <text x="${W / 2}" y="${H / 2 + 146}" fill="${MUTED}" text-anchor="middle"
        font-family="ui-monospace, 'SF Mono', Menlo, monospace"
        font-size="21" letter-spacing="3">
    LODE · SOLANA MOBILE
  </text>
</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(`${OUT}/x-post-card.png`);
  console.log('x-post-card.png     1200x675   paper, for attaching to a post');
}
