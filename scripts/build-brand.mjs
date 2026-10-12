/**
 * Generates the Lode mark and every asset derived from it.
 *
 * The curve is generated from the damped-sine function below rather than
 * drawn, so the asymmetry between the two footfall impulses is real and
 * identical in every asset. That asymmetry is the whole meaning of the
 * mark: human gait repeats approximately, never exactly. If the two
 * impulses ever look the same, the mark has lost its point.
 */
import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import opentype from 'opentype.js';
import sharp from 'sharp';

const SIGNAL = '#D6442A';
const INK = '#1C1A17';
const PAPER = '#F2EEE4';

const VIEW_W = 240;
const VIEW_H = 100;
const SAMPLES = 48;

/** Two impulses, the second at 82% of the first. */
const AMPS = [1.0, 0.82];

function v(t) {
  let out = 0;
  for (let k = 0; k < AMPS.length; k++) {
    const dt = t - (k * 1.0 + 0.12);
    if (dt >= 0 && dt < 0.85) out += AMPS[k] * Math.exp(-4.2 * dt) * Math.sin(7.4 * dt);
  }
  return out;
}

/** Peak of v over its domain, so the curve can be normalised to the canvas. */
const PEAK = (() => {
  let m = 0;
  for (let i = 0; i < 20000; i++) m = Math.max(m, v((i / 19999) * 2.0));
  return m;
})();

/**
 * Sample the function across the viewBox. Baseline sits at 55% from the top.
 *
 * The amplitude is normalised so the taller impulse reaches 45% of the
 * height. Taking "scaled by 50 percent of the height" literally multiplies
 * the raw v instead, and since v peaks at 0.478 the mark then occupies only
 * a quarter of its own canvas — with a 9px stroke that reads as a thick
 * wavy line in a mostly empty box rather than as two footfall impulses.
 */
function samplePoints(w = VIEW_W, h = VIEW_H, n = SAMPLES) {
  const baseline = h * 0.55;
  const scale = (h * 0.45) / PEAK;
  return Array.from({ length: n }, (_, i) => {
    const t = (i / (n - 1)) * 2.0;
    return { x: (i / (n - 1)) * w, y: baseline - v(t) * scale };
  });
}

/**
 * Catmull-Rom through the samples, converted to cubic beziers, so the file
 * carries clean curves rather than a dense polyline.
 */
function toPath(pts) {
  if (pts.length < 2) return '';
  let d = `M${pts[0].x.toFixed(2)},${pts[0].y.toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }
  return d;
}

const markPath = toPath(samplePoints());

/**
 * Vertical extent of the mark's actual ink, stroke included.
 *
 * The viewBox is 100 tall but the curve only occupies part of it, so
 * spacing a lockup from the viewBox edge leaves a band of empty space that
 * reads as a mistake. Lockups space from these bounds instead.
 */
const MARK_INK = (() => {
  const ys = samplePoints().map((pt) => pt.y);
  const half = 9 / 2;
  return { top: Math.min(...ys) - half, bottom: Math.max(...ys) + half };
})();

const strokeAttrs = (color, width) =>
  `fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"`;

const markSvg = (color, width) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEW_W} ${VIEW_H}" width="${VIEW_W}" height="${VIEW_H}">
  <path d="${markPath}" ${strokeAttrs(color, width)}/>
</svg>
`;

mkdirSync('brand', { recursive: true });
writeFileSync('brand/mark.svg', markSvg(SIGNAL, 9));
writeFileSync('brand/mark-compact.svg', markSvg(SIGNAL, 13));
writeFileSync('brand/mark-current.svg', markSvg('currentColor', 9));

// ---- Wordmark, outlined so the file carries no font dependency ----------
// opentype.js 2.x nests its API one `default` deeper under ESM, and its
// loadSync is deprecated to the point of silently returning undefined.
const ot = opentype.default ?? opentype;
const font = ot.parse(
  readFileSync(
    'node_modules/@expo-google-fonts/newsreader/600SemiBold/Newsreader_600SemiBold.ttf',
  ).buffer,
);

/** Outline "LODE" at a size whose cap height matches the taller impulse. */
function wordmark(capTarget) {
  const probe = 100;
  const capHeight = -font.getPath('L', 0, 0, probe).getBoundingBox().y1;
  const size = probe * (capTarget / capHeight);
  const path = font.getPath('LODE', 0, 0, size);
  const bb = path.getBoundingBox();
  return {
    d: path.toPathData(2),
    width: bb.x2 - bb.x1,
    height: bb.y2 - bb.y1,
    x1: bb.x1,
    x2: bb.x2,
    y1: bb.y1,
  };
}

const pts = samplePoints();
const peakY = Math.min(...pts.map((p) => p.y));
const baseline = VIEW_H * 0.55;
const capTarget = baseline - peakY;

const wm = wordmark(capTarget);
const gap = capTarget;

// Horizontal lockup: mark at 150 wide, wordmark beside it.
{
  const markW = 150;
  const scale = markW / VIEW_W;
  const markH = VIEW_H * scale;

  // The trace is a stroke centred on the path, so half of it sits outside
  // the nominal box at every edge. Without this padding the left of the
  // mark and the right of the final E are sliced off by the viewBox.
  const pad = (9 * scale) / 2 + 2;

  // Measured from the mark's ink rather than its nominal width: the curve
  // flattens towards the right, so a gap measured from x=150 reads far
  // wider than it is.
  const gap = capTarget * 0.55;

  const textX = pad + markW + gap - wm.x1;
  const totalW = textX + wm.x2 + pad;
  const inkTop = MARK_INK.top * scale;
  const inkH = (MARK_INK.bottom - MARK_INK.top) * scale;
  const totalH = Math.max(inkH, wm.height) + pad * 2;
  const markY = pad + (totalH - pad * 2 - inkH) / 2 - inkTop;
  const textY = pad + (totalH - pad * 2 - wm.height) / 2 - wm.y1;

  writeFileSync(
    'brand/lockup-horizontal.svg',
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalW.toFixed(2)} ${totalH.toFixed(2)}" width="${totalW.toFixed(0)}" height="${totalH.toFixed(0)}">
  <g transform="translate(${pad.toFixed(2)} ${markY.toFixed(2)}) scale(${scale.toFixed(4)})">
    <path d="${markPath}" ${strokeAttrs(SIGNAL, 9)}/>
  </g>
  <g transform="translate(${textX.toFixed(2)} ${textY.toFixed(2)})">
    <path d="${wm.d}" fill="${INK}"/>
  </g>
</svg>
`,
  );
}

// Stacked lockup, for square spaces.
{
  const markW = 150;
  const scale = markW / VIEW_W;
  const pad = (9 * scale) / 2 + 2;

  // Spaced from the ink, not the viewBox.
  const inkTop = MARK_INK.top * scale;
  const inkH = (MARK_INK.bottom - MARK_INK.top) * scale;
  const vgap = capTarget * 0.45;

  const textW = wm.x2 - wm.x1;
  const contentW = Math.max(markW, textW);
  const totalW = contentW + pad * 2;
  const totalH = inkH + vgap + wm.height + pad * 2;

  writeFileSync(
    'brand/lockup-stacked.svg',
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalW.toFixed(2)} ${totalH.toFixed(2)}" width="${totalW.toFixed(0)}" height="${totalH.toFixed(0)}">
  <g transform="translate(${(pad + (contentW - markW) / 2).toFixed(2)} ${(pad - inkTop).toFixed(2)}) scale(${scale.toFixed(4)})">
    <path d="${markPath}" ${strokeAttrs(SIGNAL, 9)}/>
  </g>
  <g transform="translate(${(pad + (contentW - textW) / 2 - wm.x1).toFixed(2)} ${(pad + inkH + vgap - wm.y1).toFixed(2)})">
    <path d="${wm.d}" fill="${INK}"/>
  </g>
</svg>
`,
  );
}

/**
 * Icon stroke weight, in viewBox units. The compact weight of 13 is correct
 * for the mark standing alone, but inside the icon the mark is scaled down
 * to 72% of the tile, and at a 48px launcher size that lands under two
 * pixels and turns to a faint squiggle. 21 holds the two impulses apart at
 * every size that ships.
 */
const ICON_STROKE = 21;

/**
 * The app icon is the one place the system inverts. In the dApp Store grid
 * every neighbouring icon is dark, so a cream tile reads as a rendering
 * failure rather than a decision.
 */
function iconSvg(tile, { radiusPct = 0.22, markPct = 0.72, strokeW = ICON_STROKE, bg = INK } = {}) {
  const markW = tile * markPct;
  const scale = markW / VIEW_W;
  const markH = VIEW_H * scale;
  const x = (tile - markW) / 2;
  const y = (tile - markH) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${tile} ${tile}" width="${tile}" height="${tile}">
  ${bg ? `<rect width="${tile}" height="${tile}" rx="${(tile * radiusPct).toFixed(2)}" fill="${bg}"/>` : ''}
  <g transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${scale.toFixed(4)})">
    <path d="${markPath}" ${strokeAttrs(PAPER, strokeW)}/>
  </g>
</svg>
`;
}

writeFileSync('brand/icon.svg', iconSvg(512));

// ---- Raster exports -----------------------------------------------------
const png = (svg, out, w, h = w) =>
  sharp(Buffer.from(svg)).resize(w, h, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(out);

await png(iconSvg(1024), 'assets/icon.png', 1024);

/**
 * Android crops adaptive icons to arbitrary shapes, so all artwork must sit
 * inside the central 66 percent of the canvas. At 1024 that is the middle
 * 676 pixels, and nothing may extend past it.
 */
{
  const tile = 1024;
  const safe = 0.66;
  const markPct = 0.72 * safe * 0.92;
  const svg = iconSvg(tile, { markPct, bg: null });
  await png(svg, 'assets/adaptive-icon.png', tile);
}

// Splash: the mark in signal red on paper.
{
  const W = 1284;
  const H = 2778;
  const markW = W * 0.4;
  const scale = markW / VIEW_W;
  const markH = VIEW_H * scale;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="${PAPER}"/>
  <g transform="translate(${((W - markW) / 2).toFixed(2)} ${((H - markH) / 2).toFixed(2)}) scale(${scale.toFixed(4)})">
    <path d="${markPath}" ${strokeAttrs(SIGNAL, 9)}/>
  </g>
</svg>
`;
  await png(svg, 'assets/splash.png', W, H);
}

// The splash *plugin* wants a centred image on a flat colour, not a
// full-bleed canvas, so the mark ships separately from splash.png.
{
  const W = 900;
  const H = Math.round((W / VIEW_W) * VIEW_H);
  await png(markSvg(SIGNAL, 11), 'assets/splash-icon.png', W, H);
}

console.log('brand assets written');
console.log('  cap target (taller impulse height):', capTarget.toFixed(2));
console.log('  wordmark size:', wm.width.toFixed(1), 'x', wm.height.toFixed(1));
