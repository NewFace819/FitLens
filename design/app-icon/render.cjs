/**
 * Renders the FitLens Android launcher icons and launch logo from the team's mascot.
 * Run from the repo root:  node design/app-icon/render.cjs
 * Needs Playwright with Chromium (require('playwright')); not a project dependency.
 *
 * Artwork: the "happy" face from prototype/assets/mascot/happy.svg (team-made), cream on
 * the forest green of prototype/assets/branding. Eyes are drawn bolder so they survive 48 px.
 */
const { chromium } = require('playwright');
const { mkdirSync, writeFileSync } = require('node:fs');
const { join, resolve } = require('node:path');

const RES = resolve(__dirname, '../../mobile/android/app/src/main/res');
const GREEN = '#294638';
const CREAM = '#fff1d6';
const TONGUE = '#ee9884';
const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

// 108 x 108 adaptive-icon canvas. The face fits inside the 66 dp safe circle.
const MOUTH = 'M65 76 C76 64 89 76 108 77 C129 79 145 65 155 75 C165 91 144 114 113 113 C85 113 61 94 65 76Z';
function face(scale = 0.38) {
  const cx = 109.5; // centre of the visible face in the mascot's 220 x 145 box
  const cy = 75.25;
  const eye = d => `<path d="${d}" fill="none" stroke="${CREAM}" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>`;
  return `<g transform="translate(${54 - cx * scale} ${54 - cy * scale}) scale(${scale})">
  <defs><clipPath id="mouth"><path d="${MOUTH}"/></clipPath></defs>
  ${eye('M46 43 Q47 44 48 43 Q47 44 46 43')}
  ${eye('M171 47 Q172 48 173 47 Q172 48 171 47')}
  <path fill="${CREAM}" d="${MOUTH}"/>
  <g clip-path="url(#mouth)"><ellipse cx="133" cy="116" rx="28" ry="19" transform="rotate(-16 133 116)" fill="${TONGUE}"/></g>
</g>`;
}

/** The visible 72 x 72 centre of the adaptive icon, masked like a legacy icon. */
const legacy = mask => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="18 18 72 72">
<defs><clipPath id="shape">${mask}</clipPath></defs>
<g clip-path="url(#shape)"><rect width="108" height="108" fill="${GREEN}"/>${face()}</g></svg>`;

const ICONS = {
  foreground: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108">${face()}</svg>`,
  square: legacy('<rect x="18" y="18" width="72" height="72" rx="16"/>'),
  round: legacy('<circle cx="54" cy="54" r="36"/>'),
};

const targets = [];
for (const [name, k] of Object.entries(DENSITIES)) {
  targets.push([ICONS.square, 48 * k, `mipmap-${name}/ic_launcher.png`]);
  targets.push([ICONS.round, 48 * k, `mipmap-${name}/ic_launcher_round.png`]);
  targets.push([ICONS.foreground, 108 * k, `mipmap-${name}/ic_launcher_foreground.png`]);
  targets.push([ICONS.square, 96 * k, `drawable-${name}/launch_logo.png`]);
}

(async () => {
  writeFileSync(join(__dirname, 'fitlens-icon.svg'), ICONS.square + '\n');
  writeFileSync(join(__dirname, 'fitlens-icon-foreground.svg'), ICONS.foreground + '\n');
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  for (const [svg, size, out] of targets) {
    await page.setViewportSize({ width: size, height: size });
    const sized = svg.replace('<svg ', `<svg width="${size}" height="${size}" `);
    await page.setContent(`<html><body style="margin:0;background:transparent">${sized}</body></html>`);
    mkdirSync(join(RES, out, '..'), { recursive: true });
    await page.screenshot({ path: join(RES, out), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
    console.log(`${out} ${size}px`);
  }
  await browser.close();
})();
