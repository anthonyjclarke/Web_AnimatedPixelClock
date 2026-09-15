// Port of Keralots/AnimatedPixelClock clock_doom.cpp, upstream style 17 (MIT).
import { classicDate, drawGfxText } from './classic-clocks';
import { tronColor } from './tron';
import type { Framebuffer } from './framebuffer';
export const doomDefaults = {
  doomFlameHeight: 20,
  doomGroundHeight: 13,
  doomWind: 0,
  doomShowDate: false,
  doomBurningDigits: true,
  doomSmoothFire: false,
  ember: '#180400',
  flame: '#ce6d08',
  core: '#ffffff',
};
export type DoomSettings = typeof doomDefaults;
export function normalizeDoom(value: unknown): DoomSettings {
  const out = { ...doomDefaults },
    v =
      value && typeof value === 'object'
        ? (value as Record<string, unknown>)
        : {};
  for (const [key, lo, hi] of [
    ['doomFlameHeight', 8, 40],
    ['doomGroundHeight', 5, 40],
    ['doomWind', 0, 2],
  ] as const) {
    const n = v[key];
    if (typeof n === 'number' && Number.isFinite(n))
      out[key] = Math.max(lo, Math.min(hi, Math.round(n)));
  }
  if (v.doomGroundHeight === undefined)
    out.doomGroundHeight = Math.trunc((out.doomFlameHeight * 2) / 3);
  for (const k of [
    'doomShowDate',
    'doomBurningDigits',
    'doomSmoothFire',
  ] as const)
    if (typeof v[k] === 'boolean') out[k] = v[k];
  for (const k of ['ember', 'flame', 'core'] as const)
    if (typeof v[k] === 'string' && /^#[0-9a-f]{6}$/i.test(v[k])) out[k] = v[k];
  return out;
}
const xs = [19, 37, 55, 73, 91],
  f = Math.fround;
const glyphs = [
  [14, 17, 17, 17, 17, 17, 14],
  [4, 12, 4, 4, 4, 4, 14],
  [14, 17, 1, 2, 4, 8, 31],
  [14, 17, 1, 6, 1, 17, 14],
  [2, 6, 10, 18, 31, 2, 2],
  [31, 16, 30, 1, 1, 17, 14],
  [6, 8, 16, 22, 17, 17, 14],
  [31, 1, 2, 4, 8, 8, 8],
  [14, 17, 17, 14, 17, 17, 14],
  [14, 17, 17, 15, 1, 2, 12],
];
const lit = (rows: number[], x: number, y: number) =>
  x >= 0 && x < 5 && y >= 0 && y < 7 && !!(rows[y] & (16 >> x));
const rgb565 = (s: string) => {
  const n = parseInt(s.slice(1), 16);
  return ((n >> 19) << 11) | (((n >> 10) & 63) << 5) | ((n >> 3) & 31);
};
function blend(a: number, b: number, n: number, d: number) {
  return (
    (((a >> 11) + Math.trunc((((b >> 11) - (a >> 11)) * n) / d)) << 11) |
    ((((a >> 5) & 63) +
      Math.trunc(((((b >> 5) & 63) - ((a >> 5) & 63)) * n) / d)) <<
      5) |
    ((a & 31) + Math.trunc((((b & 31) - (a & 31)) * n) / d))
  );
}
export class Doom {
  settings: DoomSettings;
  heat = new Uint8Array(8192);
  top = 63;
  rng: number;
  displayed = '00:00';
  states = [0, 0, 0, 0, 0];
  timers = [0, 0, 0, 0, 0];
  values = ['0', '0', ':', '0', '0'];
  triggered = -1;
  targetMinute = -1;
  constructor(seed = 0x2545f491, settings?: DoomSettings) {
    this.rng = seed >>> 0 || 0x2545f491;
    this.settings = normalizeDoom(settings);
  }
  configure(settings?: DoomSettings) {
    this.settings = normalizeDoom(settings);
  }
  get timeY() {
    return this.settings.doomShowDate ? 16 : 21;
  }
  rand() {
    let r = this.rng;
    r ^= r << 13;
    r ^= r >>> 17;
    r ^= r << 5;
    return (this.rng = r >>> 0);
  }
  spread() {
    const gy = this.timeY,
      dq = Math.trunc((63 * 256) / this.settings.doomFlameHeight),
      gq = Math.trunc((42 * 256) / this.settings.doomGroundHeight),
      sq = Math.trunc((dq * 3) / 4),
      limit = Math.min(gy + 24, 63 - this.settings.doomGroundHeight - 2);
    let newTop = 63,
      found = false;
    const copy = new Uint8Array(128);
    for (let y = Math.max(1, this.top); y < 64; y++) {
      const src = y * 128,
        dst = src - 128,
        soft = this.settings.doomSmoothFire && y - 1 <= limit,
        q = soft ? sq : y - 1 < gy ? dq : gq;
      if (soft) copy.set(this.heat.subarray(dst, dst + 128));
      for (let x = 0; x < 128; x++) {
        const r = this.rand(),
          j =
            (r & 1) +
            ((r >>> 1) & 1) +
            ((r >>> 2) & 1) -
            ((r >>> 3) & 1) -
            ((r >>> 4) & 1) -
            ((r >>> 5) & 1),
          drift = (r >>> 16) & 1,
          shift =
            j +
            (this.settings.doomWind === 1
              ? 0
              : this.settings.doomWind === 2
                ? drift
                : -drift),
          sx = Math.max(0, Math.min(127, x - shift));
        let decay = (q >> 8) + (((r >>> 8) & 255) < (q & 255) ? 1 : 0);
        const spread = (r >>> 24) & 3;
        if (spread === 0) decay--;
        else if (spread === 3) decay++;
        decay = Math.max(0, decay);
        const cooled = Math.max(0, this.heat[src + sx] - decay);
        this.heat[dst + x] = soft ? (cooled + copy[x] + 1) >> 1 : cooled;
      }
      if (soft) {
        copy.set(this.heat.subarray(dst, dst + 128));
        for (let x = 0; x < 128; x++) {
          const v =
            (copy[Math.max(0, x - 1)] +
              2 * copy[x] +
              copy[Math.min(127, x + 1)]) >>
            2;
          this.heat[dst + x] = v < 3 ? 0 : v;
        }
      }
      if (!found && this.heat.subarray(dst, dst + 128).some(Boolean)) {
        newTop = y - 1;
        found = true;
      }
    }
    this.top = newTop;
  }
  fill(x: number, y: number, w: number, h: number, value: number) {
    for (let yy = Math.max(0, y); yy < Math.min(64, y + h); yy++)
      for (let xx = Math.max(0, x); xx < Math.min(128, x + w); xx++)
        this.heat[yy * 128 + xx] = value;
  }
  stamp(colon: boolean) {
    const gy = this.timeY;
    for (let x = 0; x < 128; x++) this.heat[8064 + x] = 42 - (this.rand() & 7);
    if (!this.settings.doomBurningDigits) return;
    for (let i = 0; i < 5; i++) {
      if (this.states[i] === 1) continue;
      if (i === 2) {
        if (colon)
          for (let b = 0; b < 2; b++) {
            this.fill(xs[i] + 5, gy + 5 + b * 6, 5, 5, 0);
            this.fill(xs[i] + 6, gy + 6 + b * 6, 3, 3, 63);
          }
        continue;
      }
      const rows = glyphs[Number(this.displayed[i])];
      for (let y = 0; y < 7; y++)
        for (let x = -1; x <= 5; x++) {
          if (lit(rows, x, y)) this.fill(xs[i] + x * 3, gy + y * 3, 3, 3, 63);
          else if (lit(rows, x - 1, y) || lit(rows, x + 1, y))
            this.fill(xs[i] + x * 3, gy + y * 3, 3, 3, 0);
        }
    }
    this.top = Math.max(0, Math.min(this.top, gy));
  }
  tick(
    live: string,
    next: string,
    minute: number,
    seconds: number,
    colon: boolean,
    replay = false,
  ) {
    if (
      !this.states.some(Boolean) &&
      ((seconds >= 56 && this.triggered !== minute) || replay)
    ) {
      this.triggered = minute;
      this.targetMinute = replay ? minute : minute + 1;
      const target = replay ? live : next;
      for (const i of [0, 1, 3, 4])
        if (replay || this.displayed[i] !== target[i]) {
          this.states[i] = 1;
          this.timers[i] = f(0.55);
          this.values[i] = target[i];
        }
    }
    for (let i = 0; i < 5; i++)
      if (this.states[i]) {
        this.timers[i] = f(this.timers[i] - f(0.016));
        if (this.timers[i] <= 0) {
          if (this.states[i] === 1) {
            this.displayed =
              this.displayed.slice(0, i) +
              this.values[i] +
              this.displayed.slice(i + 1);
            this.states[i] = 2;
            this.timers[i] = f(0.55);
          } else {
            this.states[i] = 0;
            this.timers[i] = 0;
          }
        }
      }
    if (!this.states.some(Boolean) && minute >= this.targetMinute)
      this.displayed = live;
    this.spread();
    this.stamp(colon);
  }
  draw(
    frame: Framebuffer,
    date: Date,
    o: {
      color: string;
      zone: string;
      hour24: boolean;
      blink: boolean;
      dateFormat?: number;
    },
    pm: boolean,
  ) {
    const a = rgb565(this.settings.ember),
      b = rgb565(this.settings.flame),
      c = rgb565(this.settings.core),
      palette = Array.from({ length: 64 }, (_, i) =>
        i === 0
          ? 0
          : parseInt(
              tronColor(
                i < 49 ? blend(a, b, i - 1, 47) : blend(b, c, i - 48, 15),
              ).slice(1),
              16,
            ),
      );
    for (let i = 0; i < 8192; i++) frame.pixels[i] = palette[this.heat[i]];
    const colon = !o.blink || date.getMilliseconds() < 500;
    for (let i = 0; i < 5; i++) {
      if (this.states[i] === 1 || (i === 2 && !colon)) continue;
      const color = tronColor(
        this.states[i] === 2
          ? blend(
              rgb565(o.color),
              0xffff,
              Math.max(0, Math.min(550, Math.trunc(f(this.timers[i] * 1000)))),
              550,
            )
          : rgb565(o.color),
      );
      if (i === 2) {
        frame.rect(xs[i] + 6, this.timeY + 6, 3, 3, color);
        frame.rect(xs[i] + 6, this.timeY + 12, 3, 3, color);
      } else {
        const rows = glyphs[Number(this.displayed[i])];
        for (let y = 0; y < 7; y++)
          for (let x = 0; x < 5; x++)
            if (lit(rows, x, y))
              frame.rect(xs[i] + x * 3, this.timeY + y * 3, 3, 3, color);
      }
    }
    const outline = (s: string, x: number, y: number) => {
      for (let yy = -1; yy <= 1; yy++)
        for (let xx = -1; xx <= 1; xx++)
          if (xx || yy) drawGfxText(frame, s, x + xx, y + yy, 1, '#000000');
      drawGfxText(frame, s, x, y, 1, '#ffffff');
    };
    if (this.settings.doomShowDate)
      outline(classicDate(date, o.zone, o.dateFormat ?? 0), 34, 4);
    if (!o.hour24) outline(pm ? 'PM' : 'AM', 110, 4);
  }
}
