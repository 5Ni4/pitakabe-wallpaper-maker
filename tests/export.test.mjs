import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeCurrentPng } from '../lib/export.ts';
import { needsLightGuides } from '../lib/wallpaper.ts';

test('unchanged export returns a PNG after encoding completes', async () => {
  const expected = new Blob(['PNG'], { type: 'image/png' });
  const actual = await encodeCurrentPng(
    { toBlob: (callback) => callback(expected) },
    () => true,
  );
  assert.equal(actual, expected);
});
test('editing or loading another image before encoding finishes discards the old PNG', async () => {
  let finish,
    current = true;
  const pending = encodeCurrentPng(
    {
      toBlob: (callback) => {
        finish = callback;
      },
    },
    () => current,
  );
  current = false;
  finish(new Blob(['old image']));
  assert.equal(await pending, null);
});
test('encoding failure surfaces a useful error; obsolete failures are ignored', async () => {
  await assert.rejects(
    encodeCurrentPng({ toBlob: (callback) => callback(null) }, () => true),
    /書き出しに失敗/,
  );
  assert.equal(
    await encodeCurrentPng(
      { toBlob: (callback) => callback(null) },
      () => false,
    ),
    null,
  );
});
test('custom dark backgrounds use light preview guides', () => {
  for (const c of ['#000000', '#252b38', '#000066', '#262626'])
    assert.equal(needsLightGuides(c), true, c);
  for (const c of ['#ffffff', '#e4eaf5', '#e0e9dd', '#e9ddef'])
    assert.equal(needsLightGuides(c), false, c);
});
