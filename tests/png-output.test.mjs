import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { DEVICES, DEFAULTS, renderWallpaper } from '../lib/wallpaper.ts';
const require = createRequire(import.meta.url);
// Real PNG encoder/decoder. Set QA_CANVAS_MODULE to a compatible installed canvas package.
const { createCanvas, loadImage } = require(
  process.env.QA_CANVAS_MODULE ?? '@napi-rs/canvas',
);
const bg = [18, 52, 86, 255],
  green = [24, 170, 92, 255];
const close = (actual, expected, tolerance = 0) =>
  expected.forEach((v, i) =>
    assert.ok(Math.abs(actual[i] - v) <= tolerance, `${actual} != ${expected}`),
  );
const pixel = (ctx, x, y) =>
  Array.from(ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data);
function fixture(w, h, transparent = false) {
  const c = createCanvas(w, h),
    g = c.getContext('2d');
  if (!transparent) {
    g.fillStyle = '#18aa5c';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#ff0000';
    g.fillRect(0, 0, w, h * 0.2);
    g.fillStyle = '#0000ff';
    g.fillRect(0, h * 0.8, w, h * 0.2);
  } else {
    g.fillStyle = '#18aa5c';
    g.fillRect(w * 0.25, h * 0.25, w * 0.5, h * 0.5);
  }
  return c;
}
const variants = [
  {
    name: 'portrait-png',
    source: fixture(600, 1200),
    format: 'png',
    patch: {},
  },
  {
    name: 'cropped-jpeg',
    source: fixture(900, 600),
    format: 'jpeg',
    patch: { cropTop: 20, cropBottom: 20 },
  },
  {
    name: 'transparent-webp',
    source: fixture(1000, 1000, true),
    format: 'webp',
    patch: { scale: 65, position: -100 },
  },
  {
    name: 'long-cropped-png',
    source: fixture(720, 8000),
    format: 'png',
    patch: { cropTop: 40, cropBottom: 40, scale: 40, position: 100 },
  },
];
await mkdir('work/qa', { recursive: true });
for (const variant of variants) {
  test(`real PNG output for all 26 models: ${variant.name}`, async () => {
    const input = await loadImage(await variant.source.encode(variant.format));
    for (const device of DEVICES) {
      const settings = {
        ...DEFAULTS,
        ...variant.patch,
        deviceId: device.id,
        color: '#123456',
      };
      const output = createCanvas(1, 1);
      const box = renderWallpaper(
        output,
        input,
        input.width,
        input.height,
        settings,
      );
      const encoded = await output.encode('png');
      assert.deepEqual(
        Array.from(encoded.subarray(0, 8)),
        [137, 80, 78, 71, 13, 10, 26, 10],
      );
      assert.equal(encoded.readUInt32BE(16), device.width);
      assert.equal(encoded.readUInt32BE(20), device.height);
      const decoded = await loadImage(encoded);
      const check = createCanvas(device.width, device.height),
        ctx = check.getContext('2d');
      ctx.drawImage(decoded, 0, 0);
      // The clock and Dock occupy these margins in preview; every sampled pixel must be plain background.
      for (let x = 0; x < device.width; x += 47) {
        for (const y of [
          0,
          10,
          device.height * 0.12,
          device.height - 11,
          device.height - 1,
        ])
          close(pixel(ctx, x, y), bg);
      }
      for (let y = 0; y < device.height; y += 47) {
        for (const x of [0, 10, device.width - 11, device.width - 1])
          close(pixel(ctx, x, y), bg);
      }
      close(
        pixel(ctx, box.x + box.width / 2, box.y + box.height / 2),
        green,
        variant.format === 'png' ? 0 : 5,
      );
      if (
        variant.name === 'cropped-jpeg' ||
        variant.name === 'long-cropped-png'
      ) {
        close(
          pixel(ctx, box.x + box.width / 2, box.y + box.height * 0.05),
          green,
          5,
        );
        close(
          pixel(ctx, box.x + box.width / 2, box.y + box.height * 0.95),
          green,
          5,
        );
      }
      if (variant.name === 'transparent-webp')
        close(
          pixel(ctx, box.x + box.width * 0.1, box.y + box.height * 0.1),
          bg,
        );
      if (device.id === '16' || device.id === '17-pro-max')
        await writeFile(`work/qa/${device.id}-${variant.name}.png`, encoded);
    }
  });
}
