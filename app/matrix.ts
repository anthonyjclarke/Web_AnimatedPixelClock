// Port of AnimatedPixelClock/src/clocks/clock_matrix.cpp (MIT).
import { classicDate, drawGfxText } from './classic-clocks';
import type { Framebuffer } from './framebuffer';
export const matrixDefaults = {
  matrixRainFontSize: 5,
  matrixRainSpeed: 12,
  matrixRainDensity: 1,
  matrixShowDate: false,
  matrixTransparent: false,
};
export type MatrixSettings = typeof matrixDefaults;
export function normalizeMatrix(value: unknown): MatrixSettings {
  const result = { ...matrixDefaults },
    v =
      value && typeof value === 'object'
        ? (value as Record<string, unknown>)
        : {};
  for (const key of ['matrixRainSpeed', 'matrixRainDensity'] as const) {
    const n = v[key];
    if (typeof n === 'number' && Number.isFinite(n))
      result[key] = Math.max(
        key === 'matrixRainSpeed' ? 5 : 0,
        Math.min(key === 'matrixRainSpeed' ? 30 : 2, Math.round(n)),
      );
  }
  for (const key of ['matrixShowDate', 'matrixTransparent'] as const)
    if (typeof v[key] === 'boolean') result[key] = v[key];
  if (v.matrixRainFontSize === 3 || v.matrixRainFontSize === 5)
    result.matrixRainFontSize = v.matrixRainFontSize;
  return result;
}
const f = Math.fround,
  xs = [19, 37, 55, 73, 91];
export const matrixCharset = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ$+-*/=%#&<>@';
export function matrixColor(value: number) {
  const r = (value >> 11) & 31,
    g = (value >> 5) & 63,
    b = value & 31;
  return (
    '#' +
    [(r << 3) | (r >> 2), (g << 2) | (g >> 4), (b << 3) | (b >> 2)]
      .map((n) => n.toString(16).padStart(2, '0'))
      .join('')
  );
}
export const matrixFade = Array.from({ length: 32 }, (_, i) =>
  matrixColor(
    (Math.floor((63 * (i + 1)) / 32) << 5) | Math.floor((8 * (i + 1)) / 32),
  ),
);
export const matrixHead = matrixColor(0xdffb);
// Browser-only compact 3×5 glyphs. Keep the native rain grid and timing intact.
const smallRows = [
  '75557',
  '26227',
  '71247',
  '71217',
  '55711',
  '74717',
  '74757',
  '71111',
  '75757',
  '75717',
  '25755',
  '65656',
  '74447',
  '65556',
  '74647',
  '74644',
  '74557',
  '55755',
  '72227',
  '11157',
  '55655',
  '44447',
  '57755',
  '57555',
  '75557',
  '75644',
  '75573',
  '75655',
  '74217',
  '72222',
  '55557',
  '55552',
  '55775',
  '55255',
  '55222',
  '71247',
  '37636',
  '02720',
  '00700',
  '54215',
  '12421',
  '07070',
  '51245',
  '57575',
  '25753',
  '12421',
  '42124',
  '75747',
];
export function drawMatrixGlyph(
  frame: Framebuffer,
  ch: string,
  x: number,
  y: number,
  color: string,
  size: number,
) {
  if (size !== 3) {
    drawGfxText(frame, ch, x, y, 1, color);
    return;
  }
  const rows = smallRows[matrixCharset.indexOf(ch)];
  if (!rows) return;
  for (let row = 0; row < 5; row++)
    for (let col = 0; col < 3; col++)
      if (Number(rows[row]) & (1 << (2 - col)))
        frame.pixel(x + 1 + col, y + 1 + row, color);
}
export class Matrix {
  settings: MatrixSettings;
  now = 0;
  displayed = '00:00';
  triggered = -1;
  targetMinute = -1;
  columns: {
    active: boolean;
    headRow: number;
    speed: number;
    trailLen: number;
    respawn: number;
  }[] = [];
  chars: string[][] = [];
  decode = Array(5).fill(false) as boolean[];
  timers = Array(5).fill(0) as number[];
  swaps = Array(5).fill(0) as number[];
  decodeChars = Array(5).fill('0') as string[];
  values = Array(5).fill('0') as string[];
  constructor(
    public random: () => number = Math.random,
    settings?: MatrixSettings,
  ) {
    this.settings = normalizeMatrix(settings);
    for (let c = 0; c < 21; c++) {
      this.columns.push({
        active: false,
        headRow: 0,
        speed: 0,
        trailLen: 0,
        respawn: this.rand(0, 1.5),
      });
      this.chars.push(Array.from({ length: 8 }, () => this.randChar()));
    }
  }
  configure(settings?: MatrixSettings) {
    this.settings = normalizeMatrix(settings);
  }
  get active() {
    return this.decode.some(Boolean);
  }
  get timeY() {
    return this.settings.matrixShowDate ? 16 : 21;
  }
  rand(lo: number, hi: number) {
    return f(
      f(lo) + f(f(f(hi) - f(lo)) * f(Math.floor(this.random() * 1001) / 1000)),
    );
  }
  randChar() {
    return matrixCharset[Math.floor(this.random() * matrixCharset.length)];
  }
  tick(
    live: string,
    next: string,
    minute: number,
    seconds: number,
    replay = false,
  ) {
    const dt = f(0.016);
    this.now += 16;
    if (
      !this.active &&
      ((seconds >= 56 && this.triggered !== minute) || replay)
    ) {
      this.triggered = minute;
      this.targetMinute = replay ? minute : minute + 1;
      const target = replay ? live : next;
      for (const i of [0, 1, 3, 4])
        if (replay || this.displayed[i] !== target[i]) {
          this.decode[i] = true;
          this.timers[i] = f(1.2);
          this.swaps[i] = 0;
          this.decodeChars[i] = this.randChar();
          this.values[i] = target[i];
        }
    }
    for (let i = 0; i < 5; i++)
      if (this.decode[i]) {
        this.timers[i] = f(this.timers[i] - dt);
        this.swaps[i] = f(this.swaps[i] - dt);
        if (this.swaps[i] <= 0) {
          this.decodeChars[i] = this.randChar();
          this.swaps[i] = f(0.08);
        }
        if (this.timers[i] <= 0) {
          this.decode[i] = false;
          this.displayed =
            this.displayed.slice(0, i) +
            this.values[i] +
            this.displayed.slice(i + 1);
        }
      }
    const mutate = Math.trunc(f(f(f(1.2) * dt) * 1000));
    for (let c = 0; c < 21; c++) {
      const col = this.columns[c];
      if (!col.active) {
        col.respawn = f(col.respawn - dt);
        if (col.respawn <= 0) {
          col.active = true;
          col.headRow = 0;
          col.speed = f(
            f(4.5 * f(this.settings.matrixRainSpeed / 10)) *
              this.rand(0.6, 1.6),
          );
          col.trailLen = 3 + Math.floor(this.random() * 5);
          col.respawn = 0;
        }
        continue;
      }
      let speed = col.speed;
      const x = 4 + c * 6;
      if (this.decode.some((on, i) => on && x >= xs[i] - 1 && x <= xs[i] + 17))
        speed = f(speed * 2);
      const prev = Math.trunc(col.headRow);
      col.headRow = f(col.headRow + f(speed * dt));
      const head = Math.trunc(col.headRow);
      for (let r = prev + 1; r <= head && r < 8; r++)
        if (r >= 0) this.chars[c][r] = this.randChar();
      if (head - col.trailLen >= 8) {
        col.active = false;
        const [lo, hi] = [
          [1.5, 4],
          [0.5, 2],
          [0, 0.8],
        ][this.settings.matrixRainDensity];
        col.respawn = this.rand(lo, hi);
        continue;
      }
      for (let k = 1; k <= col.trailLen; k++) {
        const r = head - k;
        if (r < 0 || r >= 8) continue;
        if (Math.floor(this.random() * 1000) < mutate)
          this.chars[c][r] = this.randChar();
      }
    }
    if (!this.active && minute >= this.targetMinute) this.displayed = live;
  }
  draw(
    frame: Framebuffer,
    date: Date,
    o: {
      zone: string;
      color: string;
      hour24: boolean;
      blink: boolean;
      dateFormat?: number;
    },
    pm: boolean,
  ) {
    frame.clear('#000000');
    this.columns.forEach((col, c) => {
      if (!col.active) return;
      const head = Math.trunc(col.headRow);
      for (let k = 0; k <= col.trailLen; k++) {
        const r = head - k;
        if (r < 0 || r >= 8) continue;
        const t = Math.max(
          0,
          f(1 - f(f(col.headRow - r) / (col.trailLen + 1))),
        );
        drawMatrixGlyph(
          frame,
          this.chars[c][r],
          1 + c * 6,
          r * 8,
          k === 0 ? matrixHead : matrixFade[Math.trunc(f(t * 31))],
          this.settings.matrixRainFontSize,
        );
      }
    });
    [...this.displayed].forEach((ch, i) => {
      if (!this.settings.matrixTransparent)
        frame.rect(xs[i] - 1, this.timeY - 1, 18, 23, '#000000');
      drawGfxText(
        frame,
        this.decode[i]
          ? this.decodeChars[i]
          : i === 2 && o.blink && date.getMilliseconds() >= 500
            ? ' '
            : ch,
        xs[i],
        this.timeY,
        3,
        this.decode[i] ? matrixHead : o.color,
      );
    });
    if (this.settings.matrixShowDate) {
      if (!this.settings.matrixTransparent) frame.rect(33, 3, 62, 9, '#000000');
      drawGfxText(
        frame,
        classicDate(date, o.zone, o.dateFormat ?? 0),
        34,
        4,
        1,
        '#ffffff',
      );
    }
    if (!o.hour24) {
      if (!this.settings.matrixTransparent)
        frame.rect(109, 3, 14, 10, '#000000');
      drawGfxText(frame, pm ? 'PM' : 'AM', 110, 4, 1, '#ffffff');
    }
  }
}
