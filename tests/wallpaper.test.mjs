import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEVICES,
  DEFAULTS,
  geometry,
  renderWallpaper,
  validateSettings,
} from '../lib/wallpaper.ts';

test('all supported devices have unique IDs and native portrait resolutions', () => {
  assert.equal(DEVICES.length, 26);
  assert.equal(new Set(DEVICES.map((d) => d.id)).size, DEVICES.length);
  assert.deepEqual(
    DEVICES.find((d) => d.id === '17-pro-max'),
    {
      id: '17-pro-max',
      name: 'iPhone 17 Pro Max',
      width: 1320,
      height: 2868,
      notch: false,
    },
  );
  for (const d of DEVICES) {
    assert.ok(d.width >= 1080 && d.width <= 1320);
    assert.ok(d.height > d.width * 2);
  }
});
test('portrait, landscape, square, and long screenshots stay inside every allowed margin', () => {
  let cases = 0;
  for (const d of DEVICES)
    for (const [w, h] of [
      [1179, 2556],
      [4000, 3000],
      [3000, 4000],
      [1024, 1024],
      [1000, 30000],
      [30000, 1000],
    ])
      for (const top of [8, 32, 50])
        for (const bottom of [8, 18, 30])
          for (const scale of [40, 75, 100])
            for (const position of [-100, 0, 100])
              for (const [cropTop, cropBottom] of [
                [0, 0],
                [40, 0],
                [0, 40],
                [40, 40],
              ]) {
                const g = geometry(w, h, {
                  ...DEFAULTS,
                  deviceId: d.id,
                  top,
                  bottom,
                  scale,
                  position,
                  cropTop,
                  cropBottom,
                });
                const eps = 1e-7;
                assert.ok(g.x >= g.safe.x - eps);
                assert.ok(g.y >= g.safe.y - eps);
                assert.ok(g.x + g.width <= g.safe.x + g.safe.width + eps);
                assert.ok(g.y + g.height <= g.safe.y + g.safe.height + eps);
                assert.ok(g.width > 0 && g.height > 0 && g.sh > 0);
                assert.ok(g.sy + g.sh <= h + eps);
                assert.ok(Math.abs(g.width / g.height - w / g.sh) < eps);
                cases++;
              }
  assert.equal(cases, 50544);
});
test('renderer uses native pixels, paints an opaque background, and never paints UI guides', () => {
  const operations = [];
  const ctx = {
    fillRect: (...args) => operations.push(['fill', ...args]),
    drawImage: (...args) => operations.push(['image', ...args]),
  };
  const canvas = { width: 0, height: 0, getContext: () => ctx };
  const source = {};
  renderWallpaper(canvas, source, 1170, 2532, {
    ...DEFAULTS,
    deviceId: '17-pro-max',
    color: '#252b38',
  });
  assert.equal(canvas.width, 1320);
  assert.equal(canvas.height, 2868);
  assert.equal(ctx.fillStyle, '#252b38');
  assert.equal(operations.length, 2);
  assert.deepEqual(operations[0], ['fill', 0, 0, 1320, 2868]);
  assert.equal(operations[1][1], source);
  assert.throws(() =>
    renderWallpaper({ getContext: () => null }, source, 100, 100, DEFAULTS),
  );
});
test('invalid settings fail without changing the original settings', () => {
  for (const value of [
    null,
    [],
    { top: NaN },
    { bottom: 31 },
    { top: 0 },
    { scale: 101 },
    { position: -101 },
    { cropTop: 41 },
    { deviceId: '18' },
    { color: 'red' },
    { anything: 1 },
  ])
    assert.throws(() => validateSettings(value));
  const input = { deviceId: 'air', top: 40, color: '#123abc' };
  assert.deepEqual(validateSettings(input), input);
  assert.equal(DEFAULTS.top, 32);
});
