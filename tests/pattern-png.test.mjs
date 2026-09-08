import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import {
  DEVICES,
  DEFAULTS,
  PATTERNS,
  renderWallpaper,
  renderBackground,
  patternColor,
  autoPlacement,
} from '../lib/wallpaper.ts';
const require = createRequire(import.meta.url);
const { createCanvas, loadImage } = require(
  process.env.QA_CANVAS_MODULE ?? '@napi-rs/canvas',
);
const source = createCanvas(400, 900);
source.getContext('2d').fillStyle = '#18aa5c';
source.getContext('2d').fillRect(0, 0, 400, 900);
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
await mkdir('work/qa', { recursive: true });

// 26 models × 5 patterns × light/custom-dark backgrounds = 260 real PNG round trips.
for (const color of ['#e4eaf5', '#123456']) {
  for (const { id: pattern } of PATTERNS) {
    test(`native PNG round trip on all 26 devices: ${color} / ${pattern}`, async () => {
      for (const d of DEVICES) {
        const settings = {
          ...DEFAULTS,
          ...autoPlacement('home'),
          deviceId: d.id,
          color,
          pattern,
          scale: 60,
          position: 100,
        };
        const canvas = createCanvas(1, 1);
        const g = renderWallpaper(canvas, source, 400, 900, settings);
        const encoded = await canvas.encode('png');
        assert.equal(encoded.readUInt32BE(16), d.width);
        assert.equal(encoded.readUInt32BE(20), d.height);
        const decoded = await loadImage(encoded);
        const check = createCanvas(d.width, d.height),
          ctx = check.getContext('2d');
        ctx.drawImage(decoded, 0, 0);
        assert.deepEqual(
          ctx.getImageData(0, 0, d.width, d.height).data,
          canvas.getContext('2d').getImageData(0, 0, d.width, d.height).data,
        );
        const margin = ctx.getImageData(
          0,
          0,
          d.width,
          Math.floor(d.height * 0.07),
        ).data;
        const bg = rgb(color),
          ink = rgb(patternColor(color));
        let changed = 0;
        for (let i = 0; i < margin.length; i += 4) {
          assert.equal(margin[i + 3], 255);
          if (margin[i] !== bg[0]) changed++;
          for (let c = 0; c < 3; c++)
            assert.ok(
              margin[i + c] >= Math.min(bg[c], ink[c]) &&
                margin[i + c] <= Math.max(bg[c], ink[c]),
            );
        }
        assert.ok(pattern === 'solid' ? changed === 0 : changed > 100);
        const interior = ctx.getImageData(
          Math.ceil(g.x) + 2,
          Math.ceil(g.y) + 2,
          Math.floor(g.width) - 4,
          Math.floor(g.height) - 4,
        ).data;
        const expected = Buffer.alloc(
          interior.length,
          Buffer.from([24, 170, 92, 255]),
        );
        assert.ok(
          Buffer.from(interior).equals(expected),
          'Pattern must stay behind opaque source pixels',
        );
        // Search and Dock guides belong only to the DOM, so the entire lower margin matches the background alone.
        const background = createCanvas(d.width, d.height),
          bctx = background.getContext('2d');
        renderBackground(bctx, d.width, d.height, color, pattern);
        const lowerY = Math.ceil(d.height * 0.78),
          lowerH = d.height - lowerY;
        assert.deepEqual(
          ctx.getImageData(0, lowerY, d.width, lowerH).data,
          bctx.getImageData(0, lowerY, d.width, lowerH).data,
        );
        if (d.id === '16')
          await writeFile(
            `work/qa/pattern-${color.slice(1)}-${pattern}.png`,
            encoded,
          );
      }
    });
  }
}

test('stripes are vertical, diagonal lines differ, and both repeat predictably', () => {
  const outputs = new Map();
  for (const pattern of ['stripes', 'diagonal', 'stars', 'dots']) {
    const c = createCanvas(1179, 500),
      ctx = c.getContext('2d');
    renderBackground(ctx, c.width, c.height, '#ffffff', pattern);
    outputs.set(pattern, ctx.getImageData(0, 0, c.width, c.height).data);
    const again = createCanvas(1179, 500),
      next = again.getContext('2d');
    renderBackground(next, again.width, again.height, '#ffffff', pattern);
    assert.deepEqual(
      outputs.get(pattern),
      next.getImageData(0, 0, again.width, again.height).data,
    );
    if (pattern === 'stripes') {
      assert.deepEqual(
        ctx.getImageData(0, 20, 1179, 1).data,
        ctx.getImageData(0, 250, 1179, 1).data,
      );
      assert.deepEqual(
        ctx.getImageData(1, 20, 71, 1).data,
        ctx.getImageData(73, 20, 71, 1).data,
      );
    }
  }
  for (const [a, b] of [
    ['stripes', 'diagonal'],
    ['stars', 'dots'],
  ])
    assert.notDeepEqual(outputs.get(a), outputs.get(b));
});
