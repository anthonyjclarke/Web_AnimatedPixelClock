// Port of AnimatedPixelClock/src/clocks/clock_tron.cpp (MIT).
import { drawGfxText } from './classic-clocks';
import { gfxLine } from './oscilloscope';
import type { Framebuffer } from './framebuffer';
export const tronDefaults = { tronBikeStyle: 0 };
export type TronSettings = typeof tronDefaults;
export function normalizeTron(value: unknown): TronSettings {
  return {
    tronBikeStyle:
      value &&
      typeof value === 'object' &&
      (value as TronSettings).tronBikeStyle === 1
        ? 1
        : 0,
  };
}
const dx = [1, 0, -1, 0],
  dy = [0, 1, 0, -1],
  xs = [14, 38, 74, 98],
  vx = [0, 12, 0, 12, 0, 12],
  vy = [0, 0, 12, 12, 24, 24];
const masks = [0x3f, 6, 0x5b, 0x4f, 0x66, 0x6d, 0x7d, 7, 0x7f, 0x6f],
  ends = [
    [0, 1],
    [1, 3],
    [3, 5],
    [4, 5],
    [2, 4],
    [0, 2],
    [2, 3],
  ],
  colors = [0x05ff, 0xfc60],
  f = Math.fround;
type Point = { x: number; y: number };
const bike = () => ({
  x: 0,
  y: 0,
  px: 0,
  py: 0,
  dir: 0,
  trail: [] as Point[],
  stepped: 0,
  crashed: 0,
  dead: false,
});
export function tronColor(c: number) {
  const r = (c >> 11) & 31,
    g = (c >> 5) & 63,
    b = c & 31;
  return (
    '#' +
    [(r << 3) | (r >> 2), (g << 2) | (g >> 4), (b << 3) | (b >> 2)]
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
  );
}
function dim(c: number, level: number) {
  return (
    (Math.trunc((((c >> 11) & 31) * level) / 255) << 11) |
    (Math.trunc((((c >> 5) & 63) * level) / 255) << 5) |
    Math.trunc(((c & 31) * level) / 255)
  );
}
function color565(c: string) {
  const n = parseInt(c.slice(1), 16);
  return (
    (((n >> 16) >> 3) << 11) | ((((n >> 8) & 255) >> 2) << 5) | ((n & 255) >> 3)
  );
}
export class Tron {
  settings: TronSettings;
  now = 0;
  initialized = false;
  bikes = [bike(), bike()];
  occupied = new Uint8Array(64 * 32);
  phase: 'duel' | 'erase' | 'approach' | 'trace' | 'return' = 'duel';
  shown = [0, 0, 0, 0];
  target = [0, 0, 0, 0];
  activeDigit = -1;
  builder = 0;
  nextBuilder = 0;
  traceValue = 0;
  nodes: number[] = [];
  traceIndex = 0;
  visited = 0;
  built = 0;
  buildX = 0;
  buildY = 0;
  buildDir = 0;
  approach: Point[] = [];
  approachIndex = 0;
  phaseStart = 0;
  constructor(
    public random: () => number = Math.random,
    settings?: TronSettings,
  ) {
    this.settings = normalizeTron(settings);
  }
  configure(settings?: TronSettings) {
    this.settings = normalizeTron(settings);
  }
  rand(n: number) {
    return Math.floor(this.random() * n);
  }
  blocked(x: number, y: number) {
    if (x < 0 || x >= 64 || y < 0 || y >= 32) return true;
    const px = x * 2,
      py = y * 2;
    return (
      xs.some((x) => px >= x - 2 && px <= x + 14 && py >= 18 && py <= 46) ||
      (px >= 62 && px <= 68 && py >= 26 && py <= 38)
    );
  }
  clearTrail(n: number) {
    for (const p of this.bikes[n].trail)
      if (this.occupied[p.y * 64 + p.x] === n + 1)
        this.occupied[p.y * 64 + p.x] = 0;
    this.bikes[n].trail = [];
  }
  addTrail(n: number) {
    const b = this.bikes[n];
    if (b.trail.length === 96) {
      const p = b.trail.shift()!;
      if (this.occupied[p.y * 64 + p.x] === n + 1)
        this.occupied[p.y * 64 + p.x] = 0;
    }
    b.trail.push({ x: b.x, y: b.y });
    this.occupied[b.y * 64 + b.x] = n + 1;
  }
  clearance(x: number, y: number, d: number) {
    let s = 0;
    for (let i = 1; i <= 8; i++) {
      const xx = x + dx[d] * i,
        yy = y + dy[d] * i;
      if (this.blocked(xx, yy) || this.occupied[yy * 64 + xx]) break;
      s++;
    }
    return s;
  }
  spawn(n: number) {
    const b = this.bikes[n];
    this.clearTrail(n);
    for (let i = 0; i < 128; i++) {
      const x = 2 + this.rand(60),
        y = this.rand(2) ? 6 : 26;
      if (this.blocked(x, y) || this.occupied[y * 64 + x]) continue;
      Object.assign(b, {
        x,
        px: x,
        y,
        py: y,
        dir: n === 0 ? 0 : 2,
        dead: false,
        stepped: this.now,
      });
      this.addTrail(n);
      return;
    }
    b.dead = true;
    b.crashed = this.now;
  }
  updateBike(n: number) {
    const b = this.bikes[n];
    if (this.phase !== 'duel' && this.builder === n) return;
    if (b.dead) {
      if (this.now - b.crashed >= 650) this.spawn(n);
      return;
    }
    if (this.now - b.stepped > 400)
      b.stepped = this.now - 80 - ((this.now - b.stepped) % 80);
    while (this.now - b.stepped >= 80) {
      b.stepped += 80;
      const choices = [b.dir, (b.dir + 1) % 4, (b.dir + 3) % 4],
        turn = this.rand(11) === 0;
      let selected = -1,
        best = -100;
      choices.forEach((d, j) => {
        const free = this.clearance(b.x, b.y, d);
        if (!free) return;
        const score =
          free * 3 + this.rand(5) + (j === 0 ? (turn ? 0 : 12) : turn ? 15 : 0);
        if (score > best) {
          best = score;
          selected = d;
        }
      });
      if (selected < 0) {
        b.dead = true;
        b.crashed = this.now;
        return;
      }
      b.px = b.x;
      b.py = b.y;
      b.dir = selected;
      b.x += dx[selected];
      b.y += dy[selected];
      this.addTrail(n);
    }
  }
  traceGraph(node: number) {
    for (let e = 0; e < 7; e++) {
      if (!(masks[this.traceValue] & (1 << e)) || this.visited & (1 << e))
        continue;
      const next =
        ends[e][0] === node
          ? ends[e][1]
          : ends[e][1] === node
            ? ends[e][0]
            : -1;
      if (next < 0) continue;
      this.visited |= 1 << e;
      this.nodes.push(next);
      this.traceGraph(next);
      this.nodes.push(node);
    }
  }
  beginChange() {
    this.activeDigit = this.shown.findIndex((v, i) => v !== this.target[i]);
    if (this.activeDigit < 0) return;
    this.builder = this.nextBuilder;
    this.nextBuilder = 1 - this.nextBuilder;
    if (this.bikes[this.builder].dead && !this.bikes[1 - this.builder].dead)
      this.builder = 1 - this.builder;
    const b = this.bikes[this.builder];
    if (b.dead) {
      this.activeDigit = -1;
      return;
    }
    this.buildX = b.x * 2;
    this.buildY = b.y * 2;
    this.buildDir = b.dir;
    this.traceValue = this.target[this.activeDigit];
    const start =
      ends[
        masks[this.traceValue].toString(2).split('').reverse().indexOf('1')
      ][0];
    this.visited = this.built = 0;
    this.nodes = [start];
    this.traceGraph(start);
    this.traceIndex = 1;
    this.approach = [];
    this.approachIndex = 0;
    if (this.buildY > 46) {
      const lanes = [6, 32, 56, 92, 122];
      let lane = lanes[0];
      for (const x of lanes.slice(1))
        if (Math.abs(x - this.buildX) < Math.abs(lane - this.buildX)) lane = x;
      this.approach.push({ x: lane, y: this.buildY }, { x: lane, y: 14 });
    } else if (this.buildY > 38 && this.buildX >= 62 && this.buildX <= 68)
      this.approach.push({ x: 56, y: this.buildY }, { x: 56, y: 14 });
    else this.approach.push({ x: this.buildX, y: 14 });
    this.approach.push(
      { x: xs[this.activeDigit] + vx[start], y: 14 },
      { x: xs[this.activeDigit] + vx[start], y: 20 + vy[start] },
    );
    this.phase = 'erase';
    this.phaseStart = this.now;
  }
  move(x: number, y: number, distance: { value: number }) {
    const xx = f(x - this.buildX),
      yy = f(y - this.buildY),
      total = f(Math.abs(xx) + Math.abs(yy));
    if (total > 0.01)
      this.buildDir = Math.abs(xx) > 0.01 ? (xx > 0 ? 0 : 2) : yy > 0 ? 1 : 3;
    if (total <= distance.value) {
      this.buildX = x;
      this.buildY = y;
      distance.value = f(distance.value - total);
      return true;
    }
    if (Math.abs(xx) > 0.01)
      this.buildX = f(
        this.buildX + (xx > 0 ? distance.value : -distance.value),
      );
    else
      this.buildY = f(
        this.buildY + (yy > 0 ? distance.value : -distance.value),
      );
    distance.value = 0;
    return false;
  }
  updateTrace(dt: number) {
    if (this.phase === 'duel') {
      this.beginChange();
      return;
    }
    if (this.phase === 'erase') {
      if (this.now - this.phaseStart >= 320) {
        this.clearTrail(0);
        this.clearTrail(1);
        if (!this.bikes[1 - this.builder].dead) this.addTrail(1 - this.builder);
        this.phase = 'approach';
        this.phaseStart = this.now;
      }
      return;
    }
    const distance = { value: f(dt * (this.phase === 'trace' ? 110 : 85)) };
    if (this.phase === 'approach') {
      while (
        this.approachIndex < this.approach.length &&
        this.move(
          this.approach[this.approachIndex].x,
          this.approach[this.approachIndex].y,
          distance,
        )
      )
        this.approachIndex++;
      if (this.approachIndex === this.approach.length) {
        this.phase = 'trace';
        this.phaseStart = this.now;
      }
    } else if (this.phase === 'trace') {
      while (this.traceIndex < this.nodes.length) {
        const a = this.nodes[this.traceIndex - 1],
          b = this.nodes[this.traceIndex];
        if (!this.move(xs[this.activeDigit] + vx[b], 20 + vy[b], distance))
          break;
        ends.forEach(([x, y], e) => {
          if ((x === a && y === b) || (x === b && y === a))
            this.built |= 1 << e;
        });
        this.traceIndex++;
      }
      if (this.traceIndex === this.nodes.length) {
        this.shown[this.activeDigit] = this.traceValue;
        this.phase = 'return';
        this.phaseStart = this.now;
      }
    } else if (
      this.phase === 'return' &&
      this.move(this.buildX, 14, distance)
    ) {
      const b = this.bikes[this.builder];
      b.x = b.px = Math.trunc(Math.trunc(this.buildX) / 2);
      b.y = b.py = 7;
      b.dir = this.builder === 0 ? 0 : 2;
      b.stepped = this.now;
      b.dead = this.occupied[b.y * 64 + b.x] !== 0;
      b.crashed = this.now;
      if (!b.dead) this.addTrail(this.builder);
      this.phase = 'duel';
      this.activeDigit = -1;
    }
  }
  tick(live: string, replay = false) {
    this.target = live.replace(':', '').split('').map(Number);
    this.now += 16;
    if (!this.initialized) {
      this.shown = [...this.target];
      this.spawn(0);
      this.spawn(1);
      this.initialized = true;
    }
    if (replay) this.shown = this.target.map((v) => (v + 1) % 10);
    this.updateBike(0);
    this.updateBike(1);
    this.updateTrace(f(0.016));
  }
  draw(
    frame: Framebuffer,
    date: Date,
    o: { color: string; blink: boolean; hour24: boolean },
    pm: boolean,
  ) {
    frame.clear('#000000');
    const line = (x: number, y: number, xx: number, yy: number, c: number) =>
      gfxLine(
        frame,
        Math.trunc(x),
        Math.trunc(y),
        Math.trunc(xx),
        Math.trunc(yy),
        tronColor(c),
      );
    const pixel = (x: number, y: number, c: number) =>
      frame.pixel(x, y, tronColor(c));
    const neon = (x: number, y: number, xx: number, yy: number, c: number) => {
      const g = dim(c, 45);
      if (y === yy) {
        line(x, y - 1, xx, yy - 1, g);
        line(x, y + 1, xx, yy + 1, g);
      } else {
        line(x - 1, y, xx - 1, yy, g);
        line(x + 1, y, xx + 1, yy, g);
      }
      line(x, y, xx, yy, c);
    };
    for (let x = 4; x < 128; x += 8)
      for (let y = 4; y < 62; y += 8) pixel(x, y, 0x0842);
    line(0, 0, 127, 0, 0x0945);
    line(0, 63, 127, 63, 0x0945);
    line(0, 0, 0, 63, 0x0945);
    line(127, 0, 127, 63, 0x0945);
    this.bikes.forEach((b, n) => {
      const c = colors[n];
      let fade = b.dead
        ? 255 - Math.trunc((Math.min(this.now - b.crashed, 650) * 255) / 650)
        : 255;
      if (this.phase === 'erase')
        fade =
          255 -
          Math.trunc((Math.min(this.now - this.phaseStart, 320) * 255) / 320);
      for (let i = 1; i < b.trail.length; i++) {
        const a = b.trail[i - 1],
          p = b.trail[i];
        line(
          a.x * 2,
          a.y * 2,
          p.x * 2,
          p.y * 2,
          dim(
            c,
            Math.trunc(
              ((35 + Math.trunc((180 * i) / b.trail.length)) * fade) / 255,
            ),
          ),
        );
      }
      if (this.phase !== 'duel' && this.builder === n) return;
      if (b.dead) {
        const r = 2 + Math.trunc((this.now - b.crashed) / 65);
        for (let d = 0; d < 4; d++)
          pixel(b.x * 2 + dx[d] * r, b.y * 2 + dy[d] * r, dim(c, fade));
      } else {
        const t = Math.min((this.now - b.stepped) / 80, 1);
        drawTronBike(
          frame,
          Math.round((b.px + (b.x - b.px) * t) * 2),
          Math.round((b.py + (b.y - b.py) * t) * 2),
          b.dir,
          c,
          this.settings.tronBikeStyle,
        );
      }
    });
    const digit = color565(o.color);
    this.shown.forEach((v, i) => {
      let mask = masks[v],
        c = digit;
      if (i === this.activeDigit) {
        if (this.phase === 'erase')
          c = dim(
            c,
            255 -
              Math.trunc(
                (Math.min(this.now - this.phaseStart, 320) * 255) / 320,
              ),
          );
        if (this.phase === 'approach') mask = 0;
        if (this.phase === 'trace') {
          mask = this.built;
          c = colors[this.builder];
        }
      }
      ends.forEach(([a, b], e) => {
        if (mask & (1 << e))
          neon(xs[i] + vx[a], 20 + vy[a], xs[i] + vx[b], 20 + vy[b], c);
      });
    });
    if (this.phase === 'trace' && this.traceIndex < this.nodes.length) {
      const a = this.nodes[this.traceIndex - 1];
      neon(
        xs[this.activeDigit] + vx[a],
        20 + vy[a],
        Math.trunc(this.buildX),
        Math.trunc(this.buildY),
        colors[this.builder],
      );
    }
    if (!o.blink || date.getMilliseconds() < 500) {
      frame.rect(64, 28, 2, 2, tronColor(digit));
      frame.rect(64, 36, 2, 2, tronColor(digit));
    }
    if (this.phase !== 'duel')
      drawTronBike(
        frame,
        Math.trunc(this.buildX),
        Math.trunc(this.buildY),
        this.buildDir,
        colors[this.builder],
        this.settings.tronBikeStyle,
      );
    if (!o.hour24) drawGfxText(frame, pm ? 'PM' : 'AM', 110, 1, 1, '#ffffff');
  }
}
export function drawTronBike(
  frame: Framebuffer,
  x: number,
  y: number,
  d: number,
  c: number,
  style: number,
) {
  const profile = [
      [0, 0, 0, 4, 0, 0, 0],
      [0, 0, 3, 3, 4, 2, 0],
      [0, 2, 3, 3, 3, 2, 0],
      [2, 1, 2, 3, 2, 1, 2],
      [0, 2, 0, 0, 0, 2, 0],
    ],
    overhead = [
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 2, 3, 2, 0, 0],
      [1, 2, 3, 4, 3, 2, 1],
      [0, 0, 2, 3, 2, 0, 0],
      [0, 0, 0, 0, 0, 0, 0],
    ],
    sprite = style === 1 ? overhead : profile,
    palette = [0, dim(c, 30), c, dim(c, 190), 0xffff],
    ax = dx[d],
    ay = dy[d],
    sx = -ay,
    sy = ax,
    half = style === 1 ? 1 : 2,
    rx = ax ? 3 : half,
    ry = ay ? 3 : half;
  x = Math.max(rx, Math.min(127 - rx, x));
  y = Math.max(ry, Math.min(63 - ry, y));
  for (let along = -3; along <= 3; along++)
    for (let across = -2; across <= 2; across++) {
      const ink = sprite[across + 2][along + 3];
      if (ink)
        frame.pixel(
          x + ax * along + sx * across,
          y + ay * along + sy * across,
          tronColor(palette[ink]),
        );
    }
}
