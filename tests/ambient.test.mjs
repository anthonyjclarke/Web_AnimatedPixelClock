import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { importTS } from './load-module.mjs';
const { AmbientRenderer, parsePca, drawPca } = await importTS(
  new URL('../app/ambient.ts', import.meta.url),
);
const {
  ambientDefaults,
  normalizeAmbient,
  normalizeCycleSeconds,
  scheduledAmbient,
  ambientHour,
} = await importTS(new URL('../app/ambient-settings.ts', import.meta.url));
const { Framebuffer } = await importTS(
  new URL('../app/framebuffer.ts', import.meta.url),
);
const seed = () => {
  let s = 12345;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
};
const bytes = readFileSync(
  new URL('../public/ambient/this-is-fine.pca', import.meta.url),
);
const buffer = () =>
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
test('ambient schedule includes start, excludes end, wraps midnight and ignores matching hours', () => {
  const s = { ...ambientDefaults, enabled: true };
  for (let h = 0; h < 24; h++)
    assert.equal(scheduledAmbient(s, h), h >= 20 && h < 23);
  for (let h = 0; h < 24; h++)
    assert.equal(
      scheduledAmbient({ ...s, startHour: 23, endHour: 6 }, h),
      h >= 23 || h < 6,
    );
  assert.equal(scheduledAmbient({ ...s, startHour: 6, endHour: 6 }, 6), false);
  assert.equal(scheduledAmbient(ambientDefaults, 21), false);
  assert.equal(ambientHour(new Date('2026-09-15T00:00:00Z'), 'UTC'), 0);
  assert.equal(
    ambientHour(new Date('2026-09-15T00:00:00Z'), 'Australia/Sydney'),
    10,
  );
});
test('saved ambient and rotation controls normalize safely', () => {
  assert.deepEqual(
    normalizeAmbient(JSON.parse(JSON.stringify(ambientDefaults))),
    ambientDefaults,
  );
  assert.equal(normalizeAmbient({ style: 2 }).style, 0);
  assert.equal(normalizeAmbient({ style: '1' }).style, 0);
  assert.equal(
    normalizeAmbient({ startHour: 99, endHour: -5, enabled: 'true' }).enabled,
    false,
  );
  for (const [v, expected] of [
    [undefined, 30],
    [NaN, 30],
    [Infinity, 30],
    [0, 30],
    [20, 30],
    [4500, 30],
    [35.6, 30],
    [90, 30],
    [30, 30],
    [60, 60],
    [300, 300],
    [900, 900],
  ])
    assert.equal(normalizeCycleSeconds(v), expected);
});
for (const [style, name] of [
  [0, 'Invaders'],
  [1, 'Pac-Man maze'],
  [3, 'Stars'],
  [4, 'Aquarium'],
])
  test(`${name} animates for ten minutes without invalid drawing; pause and restart are stable`, () => {
    const g = new AmbientRenderer(seed());
    g.render(0, style);
    const initial = g.frame.pixels.slice();
    for (let i = 1; i <= 18000; i++) g.render(i / 30, style);
    assert.notDeepEqual(g.frame.pixels, initial);
    const paused = g.frame.pixels.slice();
    g.render(600, style);
    assert.deepEqual(g.frame.pixels, paused);
    g.reset();
    g.render(0, style);
    assert.ok(g.frame.pixels.some((v) => v !== 0));
  });
test('PCA preserves 33 original frames and exact packed palette order', () => {
  const p = parsePca(buffer());
  assert.equal(p.delays.length, 33);
  assert.equal(p.duration, 2970);
  assert.equal(p.frames.length, 33 * 4096);
  const f = new Framebuffer();
  drawPca(f, p, 0);
  const first = f.pixels.slice();
  assert.equal(f.pixels[0], p.palette[p.frames[0] >> 4]);
  assert.equal(f.pixels[1], p.palette[p.frames[0] & 15]);
  drawPca(f, p, 89);
  assert.deepEqual(f.pixels, first);
  drawPca(f, p, 90);
  assert.notDeepEqual(f.pixels, first);
  drawPca(f, p, 2970);
  assert.deepEqual(f.pixels, first);
});
test('PCA rejects malformed headers, truncation and invalid palette indices; clamps delays', () => {
  assert.throws(() => parsePca(new ArrayBuffer(3)));
  assert.throws(() => parsePca(buffer().slice(0, -1)));
  for (const [offset, value] of [
    [0, 0],
    [4, 0],
    [5, 255],
    [6, 0],
    [7, 0],
    [8, 1],
  ]) {
    const b = buffer();
    new Uint8Array(b)[offset] = value;
    if (offset === 7) continue;
    assert.throws(() => parsePca(b));
  }
  const b = buffer();
  new DataView(b).setUint16(44, 0, true);
  assert.equal(parsePca(b).delays[0], 34);
  const invalid = new Uint8Array(12 + 4 + 2 + 4096);
  invalid.set([80, 67, 65, 49, 1, 0, 90, 0, 2, 0, 0, 0]);
  invalid[18] = 0xf0;
  assert.throws(() => parsePca(invalid.buffer), /palette/);
});
test('custom and built-in playback freeze with motion; unloaded custom falls back', () => {
  const g = new AmbientRenderer(seed()),
    p = parsePca(buffer());
  g.render(0, 6, p);
  const first = g.frame.pixels.slice();
  g.render(0.1, 6, p);
  assert.notDeepEqual(g.frame.pixels, first);
  const frozen = g.frame.pixels.slice();
  g.render(0.1, 6, p);
  assert.deepEqual(g.frame.pixels, frozen);
  g.render(0.2, 0);
  assert.notDeepEqual(g.frame.pixels, frozen);
  g.render(0.3, 6);
  assert.ok(g.frame.pixels.some((v) => v !== 0));
});
