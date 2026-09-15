// Port of AnimatedPixelClock/src/clocks/clock_space.cpp (MIT).
import { classicDate, drawGfxText } from './classic-clocks';
import type { Framebuffer } from './framebuffer';
export const spaceDefaults = {
  spaceCharacterType: 1,
  spacePatrolSpeed: 5,
  spaceAttackSpeed: 25,
  spaceLaserSpeed: 40,
  spaceExplosionGravity: 5,
};
export type SpaceSettings = typeof spaceDefaults;
export const spaceRanges: Record<
  keyof SpaceSettings,
  [number, number, number]
> = {
  spaceCharacterType: [0, 1, 1],
  spacePatrolSpeed: [2, 15, 1],
  spaceAttackSpeed: [10, 40, 5],
  spaceLaserSpeed: [20, 80, 5],
  spaceExplosionGravity: [3, 10, 1],
};
export function normalizeSpace(value: unknown): SpaceSettings {
  const result = { ...spaceDefaults },
    v =
      value && typeof value === 'object'
        ? (value as Record<string, unknown>)
        : {};
  for (const key of Object.keys(result) as (keyof SpaceSettings)[]) {
    const n = v[key];
    if (typeof n === 'number' && Number.isFinite(n)) {
      const [min, max, step] = spaceRanges[key];
      result[key] = Math.max(
        min,
        Math.min(max, min + Math.round((n - min) / step) * step),
      );
    }
  }
  return result;
}
const xs = [19, 37, 55, 73, 91],
  slots = [0, 1, 3, 4],
  f = Math.fround;
export const spacePhases = [
  'patrol',
  'sliding',
  'shooting',
  'exploding',
  'next',
  'returning',
] as const;
export class Space {
  settings: SpaceSettings;
  x = 64;
  y = 56;
  frame = 0;
  direction = 1;
  phase: (typeof spacePhases)[number] = 'patrol';
  now = 0;
  lastToggle = 0;
  triggered = -1;
  targetMinute = -1;
  transitionStart = 0;
  displayed = '';
  queue: { index: number; value: string }[] = [];
  current = 0;
  explosionTimer = 0;
  laser = { x: 0, y: 0, length: 0, active: false, index: -1 };
  fragments = Array.from({ length: 20 }, () => ({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    active: false,
  }));
  constructor(
    public random: () => number = Math.random,
    value?: Partial<SpaceSettings>,
  ) {
    this.settings = normalizeSpace(value);
  }
  configure(value: unknown) {
    this.settings = normalizeSpace(value);
  }
  rand(a: number, b: number) {
    return a + Math.floor(this.random() * (b - a));
  }
  resync(live: string, minute: number) {
    this.displayed = live;
    this.queue = [];
    this.current = 0;
    this.phase = 'patrol';
    this.laser.active = false;
    for (const p of this.fragments) p.active = false;
    this.targetMinute = minute;
    this.triggered = -1;
  }
  fire(index: number) {
    this.laser = { x: this.x, y: 52, length: 0, active: true, index };
  }
  explode(index: number) {
    const step = f((2 * Math.PI) / 10);
    for (let i = 0; i < 10; i++) {
      const p = this.fragments.find((p) => !p.active);
      if (!p) break;
      const angle = f(f(i * step) + this.rand(-30, 30) / 100),
        speed = f(0.96 + this.rand(-25, 25) / 156);
      p.x = xs[index] + 9 + this.rand(-4, 4);
      p.y = 28 + this.rand(-6, 6);
      p.vx = f(Math.cos(angle) * speed);
      p.vy = f(Math.sin(angle) * speed - 0.32);
      p.active = true;
    }
  }
  moveTo(target: number, speed: number) {
    if (Math.abs(this.x - target) <= 1) {
      this.x = target;
      return true;
    }
    this.x =
      this.x < target
        ? Math.min(target, f(this.x + speed / 31.25))
        : Math.max(target, f(this.x - speed / 31.25));
    return false;
  }
  tick(
    live: string,
    next: string,
    minute: number,
    seconds: number,
    replay = false,
  ) {
    this.now += 16;
    if (!this.displayed) this.displayed = live;
    if (this.phase !== 'patrol' && this.now - this.transitionStart > 60000)
      this.resync(live, minute);
    if (this.now - this.lastToggle >= 200) {
      this.frame = 1 - this.frame;
      this.lastToggle = this.now;
    }
    if (
      replay ||
      (seconds >= 56 && this.triggered !== minute && this.phase === 'patrol')
    ) {
      this.triggered = minute;
      this.targetMinute = replay ? minute : minute + 1;
      this.transitionStart = this.now;
      this.queue = slots
        .filter((i) => replay || this.displayed[i] !== next[i])
        .map((index) => ({ index, value: (replay ? live : next)[index] }));
      this.current = 0;
      if (replay) {
        this.laser.active = false;
        for (const p of this.fragments) p.active = false;
      }
      if (this.queue.length) this.phase = 'sliding';
    }
    for (const p of this.fragments)
      if (p.active) {
        p.vy = f(p.vy + this.settings.spaceExplosionGravity / 97.7);
        p.x = f(p.x + p.vx);
        p.y = f(p.y + p.vy);
        if (p.y > 70 || p.x < -5 || p.x > 133) p.active = false;
      }
    if (this.laser.active) {
      this.laser.length = f(
        this.laser.length + this.settings.spaceLaserSpeed / 31.25,
      );
      if (Math.trunc(f(this.laser.y - this.laser.length)) <= 40) {
        this.laser.active = false;
        this.explode(this.laser.index);
        const a = this.queue[this.current];
        this.displayed =
          this.displayed.slice(0, a.index) +
          a.value +
          this.displayed.slice(a.index + 1);
        this.explosionTimer = 0;
        this.phase = 'exploding';
      }
      this.laser.length = Math.min(50, this.laser.length);
    }
    switch (this.phase) {
      case 'patrol':
        this.x = f(
          this.x + (this.settings.spacePatrolSpeed / 31.25) * this.direction,
        );
        if (this.x <= 20) {
          this.x = 20;
          this.direction = 1;
        } else if (this.x >= 108) {
          this.x = 108;
          this.direction = -1;
        }
        if (minute >= this.targetMinute) this.displayed = live;
        break;
      case 'sliding':
      case 'next':
        if (
          this.moveTo(
            xs[this.queue[this.current].index] + 7,
            this.settings.spaceAttackSpeed,
          )
        ) {
          this.phase = 'shooting';
          this.fire(this.queue[this.current].index);
        }
        break;
      case 'exploding':
        if (++this.explosionTimer >= 16) {
          this.current++;
          this.phase = this.current < this.queue.length ? 'next' : 'returning';
        }
        break;
      case 'returning':
        if (this.moveTo(64, this.settings.spacePatrolSpeed))
          this.phase = 'patrol';
        break;
    }
  }
  draw(
    frame: Framebuffer,
    date: Date,
    o: {
      zone: string;
      hour24: boolean;
      date: boolean;
      blink: boolean;
      color: string;
      dateFormat?: number;
    },
    pm: boolean,
  ) {
    frame.clear('#000000');
    if (o.date)
      drawGfxText(
        frame,
        classicDate(date, o.zone, o.dateFormat ?? 0),
        34,
        4,
        1,
        '#ffffff',
      );
    if (!o.hour24) drawGfxText(frame, pm ? 'PM' : 'AM', 110, 4, 1, '#ffffff');
    [...this.displayed].forEach((ch, i) =>
      drawGfxText(
        frame,
        i === 2 && o.blink && date.getMilliseconds() >= 500 ? ' ' : ch,
        xs[i],
        16,
        3,
        o.color,
      ),
    );
    drawSpaceSprite(
      frame,
      Math.trunc(this.x),
      this.y,
      this.frame,
      this.settings.spaceCharacterType,
    );
    if (this.laser.active) {
      const { x, y, length } = this.laser;
      for (let i = 0; i < Math.trunc(length); i += 2) {
        const ly = Math.trunc(y) - i;
        if (ly >= 0 && ly < 64) frame.rect(Math.trunc(x), ly, 2, 1, '#ff0000');
      }
      const end = Math.trunc(f(y - length));
      if (end >= 0 && end < 64) {
        frame.pixel(Math.trunc(x) - 1, end, '#ff0000');
        frame.pixel(Math.trunc(x) + 2, end, '#ff0000');
      }
    }
    for (const p of this.fragments)
      if (p.active) frame.rect(Math.trunc(p.x), Math.trunc(p.y), 2, 2, o.color);
  }
}
export function drawSpaceSprite(
  frame: Framebuffer,
  x: number,
  y: number,
  phase: number,
  type: number,
) {
  if (x < -12 || x > 140 || y < -10 || y > 74) return;
  const sx = x - 5,
    sy = y - (type === 0 ? 4 : 3),
    color = '#00ff00';
  const rect = (dx: number, dy: number, w: number) =>
      frame.rect(sx + dx, sy + dy, w, 1, color),
    pixel = (dx: number, dy: number) => rect(dx, dy, 1);
  if (type === 0) {
    pixel(2, 0);
    pixel(8, 0);
    rect(3, 1, 5);
    rect(2, 2, 7);
    rect(1, 3, 9);
    rect(0, 4, 3);
    pixel(5, 4);
    rect(8, 4, 3);
    rect(0, 5, 11);
    if (phase === 0) {
      pixel(1, 6);
      rect(4, 6, 3);
      pixel(9, 6);
      rect(0, 7, 2);
      pixel(5, 7);
      rect(9, 7, 2);
    } else {
      rect(2, 6, 7);
      pixel(1, 7);
      pixel(9, 7);
      rect(0, 8, 2);
      rect(9, 8, 2);
    }
  } else {
    pixel(5, 0);
    rect(4, 1, 3);
    rect(3, 2, 5);
    rect(1, 3, 9);
    rect(0, 4, 11);
    if (phase === 0) {
      rect(0, 5, 3);
      rect(8, 5, 3);
      pixel(0, 6);
      pixel(10, 6);
    } else {
      rect(1, 5, 2);
      rect(8, 5, 2);
      pixel(1, 6);
      pixel(9, 6);
    }
  }
}
