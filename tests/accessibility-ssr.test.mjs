import test from 'node:test';
import assert from 'node:assert/strict';
import Module, { createRequire } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
const require = createRequire(import.meta.url);
const ts = require('typescript'),
  React = require('react'),
  { renderToString } = require('react-dom/server');
const root = resolve(import.meta.dirname, '..'),
  cache = new Map();
// Render actual TSX with React's server renderer, without a browser or any website access.
function loadTs(file) {
  if (cache.has(file)) return cache.get(file).exports;
  const mod = new Module(file);
  mod.filename = file;
  mod.paths = Module._nodeModulePaths(dirname(file));
  cache.set(file, mod);
  const nativeRequire = createRequire(file);
  mod.require = (specifier) => {
    if (specifier.startsWith('@/')) {
      const base = resolve(root, specifier.slice(2));
      const candidate = [base + '.tsx', base + '.ts', base].find((p) =>
        existsSync(p),
      );
      return loadTs(candidate);
    }
    return nativeRequire(specifier);
  };
  const result = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  });
  mod._compile(result.outputText, file);
  return mod.exports;
}
test('all six native sliders reference their visible Japanese labels', () => {
  const Home = loadTs(resolve(root, 'app/page.tsx')).default;
  const html = renderToString(React.createElement(Home));
  const inputs = (html.match(/<input\b[^>]*>/g) ?? []).filter((t) =>
    t.includes('type="range"'),
  );
  assert.equal(inputs.length, 6);
  for (const input of inputs) {
    const id = input.match(/aria-labelledby="([^"]+)"/)?.[1];
    assert.ok(id, 'Native slider lacks accessible name');
    assert.ok(
      html.includes(`<label id="${id}">`),
      `Missing visible label ${id}`,
    );
  }
  for (const label of [
    '上の余白',
    '下の余白',
    '画像の大きさ',
    '画像の上下位置',
    'スクショの上を切り取る',
    'スクショの下を切り取る',
  ])
    assert.ok(html.includes(label));
});
