import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEVICES,
  DEVICE_SERIES,
  devicesForSeries,
  deviceInSeries,
  seriesForDevice,
  DEFAULTS,
  HOME_GUIDES,
  autoPlacement,
  geometry,
  PATTERNS,
  patternColor,
  renderWallpaper,
  validateSettings,
} from '../lib/wallpaper.ts';

test('two-stage selection retains exactly the 26 baseline models and resolutions', () => {
  const expected = {
    17: [1206, 2622],
    '17-pro': [1206, 2622],
    '17-pro-max': [1320, 2868],
    '17e': [1170, 2532],
    16: [1179, 2556],
    '16-plus': [1290, 2796],
    '16-pro': [1206, 2622],
    '16-pro-max': [1320, 2868],
    '16e': [1170, 2532],
    15: [1179, 2556],
    '15-pro': [1179, 2556],
    '15-plus': [1290, 2796],
    '15-pro-max': [1290, 2796],
    14: [1170, 2532],
    '14-plus': [1284, 2778],
    '14-pro': [1179, 2556],
    '14-pro-max': [1290, 2796],
    '13-mini': [1080, 2340],
    13: [1170, 2532],
    '13-pro': [1170, 2532],
    '13-pro-max': [1284, 2778],
    '12-mini': [1080, 2340],
    12: [1170, 2532],
    '12-pro': [1170, 2532],
    '12-pro-max': [1284, 2778],
    air: [1260, 2736],
  };
  assert.deepEqual(DEVICE_SERIES, ['17', '16', '15', '14', '13', '12', 'Air']);
  const groups = DEVICE_SERIES.map(devicesForSeries);
  assert.deepEqual(
    groups.map((g) => g.length),
    [4, 5, 4, 4, 4, 4, 1],
  );
  assert.deepEqual(
    Object.fromEntries(groups.flat().map((d) => [d.id, [d.width, d.height]])),
    expected,
  );
  for (const series of DEVICE_SERIES) {
    for (const current of DEVICES) {
      const chosen = deviceInSeries(series, current.id);
      assert.equal(seriesForDevice(chosen.id), series);
      assert.ok(DEVICES.includes(chosen));
    }
  }
  for (const [series, current, expectedId] of [
    ['17', '16e', '17e'],
    ['16', '17-pro-max', '16-pro-max'],
    ['12', '13-mini', '12-mini'],
    ['17', '16-plus', '17'],
    ['15', '16e', '15'],
    ['Air', '13-mini', 'air'],
    ['13', 'air', '13'],
  ])
    assert.equal(deviceInSeries(series, current).id, expectedId);
});

test('default and automatic placement leave space above Search on every model', () => {
  assert.equal(HOME_GUIDES.search.top, 80);
  assert.equal(HOME_GUIDES.search.height, 4);
  assert.equal(HOME_GUIDES.dock.top, 86);
  for (const d of DEVICES) {
    for (const [width, height] of [
      [1179, 2556],
      [500, 15000],
      [3000, 1000],
      [1000, 1000],
    ]) {
      for (const placement of [
        DEFAULTS,
        autoPlacement('home'),
        autoPlacement('lock'),
      ]) {
        const g = geometry(width, height, {
          ...DEFAULTS,
          ...placement,
          deviceId: d.id,
          position: 100,
        });
        // Independent bounds from the observed example, with at least 3% breathing room.
        assert.ok(g.y + g.height <= d.height * 0.77 + 1e-7, d.id);
      }
    }
  }
  assert.equal(autoPlacement('home').top, 8);
  assert.equal(autoPlacement('home').bottom, 24);
  assert.equal(autoPlacement('lock').top, 32);
  // A user can still reduce the margin when their actual home screen differs.
  assert.deepEqual(validateSettings({ bottom: 8 }), { bottom: 8 });
});

test('only five fixed presets are accepted; ink is one deterministic background-dependent color', () => {
  assert.deepEqual(
    PATTERNS.map((p) => p.id),
    ['solid', 'stripes', 'diagonal', 'stars', 'dots'],
  );
  for (const { id } of PATTERNS)
    assert.deepEqual(validateSettings({ pattern: id }), { pattern: id });
  for (const patch of [
    { pattern: 'grid' },
    { pattern: null },
    { patternColor: '#fff' },
    { density: 10 },
    { angle: 45 },
  ]) {
    assert.throws(() => validateSettings(patch));
  }
  assert.equal(patternColor('#ffffff'), '#dbdbdb');
  assert.equal(patternColor('#000000'), '#242424');
  assert.equal(patternColor('#e4eaf5'), patternColor('#E4EAF5'));
});

test('all presets paint the image last and do not draw Search, Dock, or clock text', () => {
  for (const { id } of PATTERNS) {
    const operations = [];
    const ctx = Object.fromEntries(
      [
        'fillRect',
        'save',
        'restore',
        'beginPath',
        'moveTo',
        'lineTo',
        'stroke',
        'arc',
        'closePath',
        'fill',
        'drawImage',
      ].map((name) => [name, (...args) => operations.push([name, ...args])]),
    );
    const source = {};
    renderWallpaper({ getContext: () => ctx }, source, 400, 900, {
      ...DEFAULTS,
      pattern: id,
    });
    assert.equal(operations[0][0], 'fillRect');
    assert.equal(operations.at(-1)[0], 'drawImage');
    assert.equal(operations.at(-1)[1], source);
  }
});
