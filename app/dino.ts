// Port of AnimatedPixelClock/src/clocks/clock_dino.cpp (MIT).
import { classicDate, drawGfxText } from './classic-clocks';
import { gfxLine } from './oscilloscope';
import type { Framebuffer } from './framebuffer';
export const dinoDefaults = {
  dinoSpeed: 12,
  dinoCactusFreq: 1,
  dinoShowClouds: true,
  dinoShowDate: false,
};
export type DinoSettings = typeof dinoDefaults;
export function normalizeDino(value: unknown): DinoSettings {
  const result = { ...dinoDefaults },
    v =
      value && typeof value === 'object'
        ? (value as Record<string, unknown>)
        : {};
  for (const key of ['dinoSpeed', 'dinoCactusFreq'] as const) {
    const n = v[key];
    if (typeof n === 'number' && Number.isFinite(n))
      result[key] = Math.max(
        key === 'dinoSpeed' ? 5 : 0,
        Math.min(key === 'dinoSpeed' ? 30 : 2, Math.round(n)),
      );
  }
  for (const key of ['dinoShowClouds', 'dinoShowDate'] as const)
    if (typeof v[key] === 'boolean') result[key] = v[key];
  return result;
}
const f = Math.fround,
  xs = [19, 37, 55, 73, 91];
export class Dino {
  settings: DinoSettings;
  now = 0;
  displayed = '00:00';
  phase: 'idle' | 'enter' | 'carry' | 'drop' = 'idle';
  jumpY = 0;
  jumpVY = 0;
  airborne = false;
  legFrame = 0;
  lastLeg = 0;
  lastWing = 0;
  ground = 0;
  cacti = Array.from({ length: 3 }, () => ({
    active: false,
    x: 0,
    tall: false,
  }));
  clouds = [
    { x: 30, y: 6 },
    { x: 95, y: 11 },
  ];
  dust = Array.from({ length: 6 }, () => ({
    active: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    life: 0,
  }));
  ptero = { active: false, x: 0, y: 0, wing: 0 };
  cactusTimer: number;
  idleTimer: number;
  queue: { index: number; value: string }[] = [];
  current = 0;
  phaseTimer = 0;
  triggered = -1;
  targetMinute = -1;
  offsets = [0, 0, 0, 0, 0];
  velocities = [0, 0, 0, 0, 0];
  constructor(
    public random: () => number = Math.random,
    settings?: DinoSettings,
  ) {
    this.settings = normalizeDino(settings);
    this.cactusTimer = this.rand(2, 5);
    this.idleTimer = this.rand(8, 18);
  }
  configure(settings?: DinoSettings) {
    this.settings = normalizeDino(settings);
  }
  get timeY() {
    return this.settings.dinoShowDate ? 16 : 21;
  }
  rand(lo: number, hi: number) {
    return f(
      f(lo) + f(f(f(hi) - f(lo)) * f(Math.floor(this.random() * 1001) / 1000)),
    );
  }
  spawnDust(x: number, y: number) {
    let count = 0;
    for (const d of this.dust) {
      if (count === 4) break;
      if (d.active) continue;
      Object.assign(d, {
        active: true,
        x: f(x + this.rand(-2, 2)),
        y,
        vx: this.rand(-18, 18),
        vy: this.rand(-22, -8),
        life: this.rand(0.25, 0.45),
      });
      count++;
    }
  }
  enter() {
    this.phase = 'enter';
    this.phaseTimer = 0;
    this.ptero.active = true;
    this.ptero.x = 142;
    this.ptero.y = this.timeY + 4;
  }
  tick(
    live: string,
    next: string,
    minute: number,
    seconds: number,
    replay = false,
    bounceSpeed = 6,
  ) {
    const dt = f(this.now === 0 ? 0.025 : 0.016),
      scroll = f(30 * f(this.settings.dinoSpeed / 10));
    this.now += 16;
    for (let i = 0; i < 5; i++)
      if (this.offsets[i] || this.velocities[i]) {
        this.velocities[i] = f(
          this.velocities[i] + (bounceSpeed / 10) * f(dt / 0.05),
        );
        this.offsets[i] = f(
          this.offsets[i] + f(this.velocities[i] * f(dt / 0.05)),
        );
        if (this.offsets[i] >= 0) {
          this.offsets[i] = 0;
          this.velocities[i] = 0;
        }
      }
    if (
      this.phase === 'idle' &&
      ((seconds >= 56 && this.triggered !== minute) || replay)
    ) {
      this.triggered = minute;
      this.targetMinute = replay ? minute : minute + 1;
      const target = replay ? live : next;
      this.queue = [0, 1, 3, 4]
        .filter((i) => replay || this.displayed[i] !== target[i])
        .map((index) => ({ index, value: target[index] }));
      this.current = 0;
      if (this.queue.length) this.enter();
    }
    const p = this.ptero;
    if (this.phase !== 'idle') {
      this.phaseTimer = f(this.phaseTimer + dt);
      const a = this.queue[this.current];
      if (this.phase === 'enter') {
        p.x = f(p.x - f(60 * dt));
        p.y = this.timeY + 4;
        if (p.x <= xs[a.index] + 8 || this.phaseTimer > 6) {
          this.phase = 'carry';
          this.phaseTimer = 0;
        }
      } else if (this.phase === 'carry') {
        p.x = f(p.x - f(60 * dt));
        if (p.x < -24 || this.phaseTimer > 6) {
          p.active = false;
          this.displayed =
            this.displayed.slice(0, a.index) +
            a.value +
            this.displayed.slice(a.index + 1);
          this.offsets[a.index] = -30;
          this.velocities[a.index] = 0;
          this.phase = 'drop';
          this.phaseTimer = 0;
        }
      } else if (this.offsets[a.index] >= 0 || this.phaseTimer > 6) {
        this.offsets[a.index] = 0;
        this.velocities[a.index] = 0;
        this.spawnDust(xs[a.index] + 8, this.timeY + 21);
        this.current++;
        if (this.current < this.queue.length) this.enter();
        else {
          this.phase = 'idle';
          this.idleTimer = this.rand(8, 18);
        }
      }
    } else if (p.active) {
      p.x = f(p.x - f(35 * dt));
      if (p.x < -16) p.active = false;
    } else {
      this.idleTimer = f(this.idleTimer - dt);
      if (this.idleTimer <= 0) {
        this.idleTimer = this.rand(12, 28);
        p.active = true;
        p.x = 142;
        p.y = this.rand(42, 48);
      }
    }
    this.ground = f(this.ground + f(scroll * dt));
    while (this.ground >= 16) this.ground = f(this.ground - 16);
    for (const c of this.cacti)
      if (c.active) {
        c.x = f(c.x - f(scroll * dt));
        if (c.x < -8) c.active = false;
      }
    this.cactusTimer = f(this.cactusTimer - dt);
    if (this.cactusTimer <= 0) {
      const [lo, hi] = [
        [8, 16],
        [5, 10],
        [3, 6],
      ][this.settings.dinoCactusFreq];
      this.cactusTimer = this.rand(lo, hi);
      const c = this.cacti.find((c) => !c.active);
      if (c) {
        c.active = true;
        c.x = 134;
        c.tall = Math.floor(this.random() * 3) === 0;
      }
    }
    for (const c of this.clouds) {
      c.x = f(c.x - f(f(scroll * f(0.18)) * dt));
      if (c.x < -16) {
        c.x = f(128 + this.rand(4, 30));
        c.y = Math.trunc(this.rand(3, 13));
      }
    }
    if (!this.airborne) {
      for (const c of this.cacti)
        if (c.active && f(c.x - 12) > 0 && f(c.x - 12) < f(scroll * f(0.45))) {
          this.airborne = true;
          this.jumpVY = -52;
          this.spawnDust(14, 57);
          break;
        }
    } else {
      this.jumpVY = f(this.jumpVY + f(160 * dt));
      this.jumpY = f(this.jumpY + f(this.jumpVY * dt));
      if (this.jumpY >= 0) {
        this.jumpY = 0;
        this.jumpVY = 0;
        this.airborne = false;
        this.spawnDust(14, 57);
      }
    }
    if (
      this.now - this.lastLeg >
      Math.trunc(f(140 / f(this.settings.dinoSpeed / 10)))
    ) {
      this.lastLeg = this.now;
      this.legFrame ^= 1;
    }
    if (this.now - this.lastWing > 160) {
      this.lastWing = this.now;
      p.wing ^= 1;
    }
    for (const d of this.dust)
      if (d.active) {
        d.x = f(d.x + f(d.vx * dt));
        d.y = f(d.y + f(d.vy * dt));
        d.vy = f(d.vy + f(90 * dt));
        d.life = f(d.life - dt);
        if (d.life <= 0) d.active = false;
      }
    if (this.phase === 'idle' && minute >= this.targetMinute)
      this.displayed = live;
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
    const white = '#ffffff',
      green = '#00ff00';
    const rect = (x: number, y: number, w: number, h: number, c = white) =>
        frame.rect(Math.trunc(x), Math.trunc(y), w, h, c),
      pixel = (x: number, y: number, c = white) =>
        frame.pixel(Math.trunc(x), Math.trunc(y), c),
      line = (x: number, y: number, xx: number, yy: number) =>
        gfxLine(frame, x, y, xx, yy, white);
    if (this.settings.dinoShowClouds)
      for (const c of this.clouds) {
        const x = Math.trunc(c.x);
        rect(x + 3, c.y, 7, 1);
        rect(x + 1, c.y + 1, 12, 1);
        rect(x + 4, c.y + 2, 6, 1);
      }
    rect(0, 57, 128, 1);
    for (let x = -Math.trunc(this.ground); x < 128; x += 16) {
      rect(x + 4, 60, 4, 1);
      rect(x + 11, 59, 2, 1);
    }
    for (const c of this.cacti)
      if (c.active) {
        const x = Math.trunc(c.x);
        if (c.tall) {
          rect(x + 2, 45, 2, 12, green);
          rect(x, 48, 2, 4, green);
          pixel(x + 1, 47, green);
          rect(x + 4, 50, 2, 3, green);
        } else {
          rect(x + 1, 49, 2, 8, green);
          pixel(x, 51, green);
          pixel(x + 3, 52, green);
        }
      }
    const top = 45 + Math.trunc(this.jumpY),
      x = 12;
    rect(x + 6, top, 6, 4);
    pixel(x + 8, top + 1, '#000000');
    rect(x + 6, top + 3, 4, 1);
    rect(x + 4, top + 2, 4, 6);
    rect(x + 1, top + 4, 6, 5);
    rect(x - 1, top + 3, 2, 3);
    pixel(x + 7, top + 5);
    rect(x + 2, top + 9, 2, !this.airborne && this.legFrame === 0 ? 3 : 2);
    rect(x + 5, top + 9, 2, !this.airborne && this.legFrame === 1 ? 3 : 2);
    for (const d of this.dust) if (d.active) pixel(d.x, d.y);
    const carry = this.phase === 'carry' ? this.queue[this.current].index : -1;
    [...this.displayed].forEach((ch, i) => {
      if (i !== carry)
        drawGfxText(
          frame,
          i === 2 && o.blink && date.getMilliseconds() >= 500 ? ' ' : ch,
          xs[i],
          this.timeY + (i === 2 ? 0 : Math.trunc(this.offsets[i])),
          3,
          o.color,
        );
    });
    if (this.ptero.active) {
      const x = Math.trunc(this.ptero.x),
        y = Math.trunc(this.ptero.y);
      line(x - 4, y, x + 5, y);
      pixel(x + 6, y - 1);
      line(x, y, x - 3, y + (this.ptero.wing === 0 ? -4 : 3));
      line(x, y, x + 2, y + (this.ptero.wing === 0 ? -3 : 2));
      if (carry >= 0)
        drawGfxText(frame, this.displayed[carry], x - 6, y + 4, 3, o.color);
    }
    if (this.settings.dinoShowDate)
      drawGfxText(
        frame,
        classicDate(date, o.zone, o.dateFormat ?? 0),
        34,
        4,
        1,
        white,
      );
    if (!o.hour24) drawGfxText(frame, pm ? 'PM' : 'AM', 110, 4, 1, white);
  }
}
