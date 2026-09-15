// Port of AnimatedPixelClock/src/clocks/clock_asteroids.cpp (MIT).
import { classicDate, drawGfxText } from './classic-clocks';
import { gfxLine } from './oscilloscope';
import type { Framebuffer } from './framebuffer';
export const asteroidsDefaults = {
  asteroidsShipSpeed: 12,
  asteroidsRockCount: 2,
  asteroidsRockSpeed: 8,
  asteroidsShowDate: false,
  asteroidsTransparent: true,
};
export type AsteroidsSettings = typeof asteroidsDefaults;
export const asteroidsRanges = {
  asteroidsShipSpeed: [5, 25],
  asteroidsRockCount: [1, 4],
  asteroidsRockSpeed: [3, 20],
} as const;
export function normalizeAsteroids(value: unknown): AsteroidsSettings {
  const result = { ...asteroidsDefaults },
    v =
      value && typeof value === 'object'
        ? (value as Record<string, unknown>)
        : {};
  for (const key of Object.keys(
    asteroidsRanges,
  ) as (keyof typeof asteroidsRanges)[]) {
    const n = v[key];
    if (typeof n === 'number' && Number.isFinite(n)) {
      const [min, max] = asteroidsRanges[key];
      result[key] = Math.max(min, Math.min(max, Math.round(n)));
    }
  }
  for (const key of ['asteroidsShowDate', 'asteroidsTransparent'] as const)
    if (typeof v[key] === 'boolean') result[key] = v[key];
  return result;
}
type Body = {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  spin: number;
};
type Rock = Body & { big: boolean; radii: number[] };
type Shard = Body & { fromDigit: boolean; life: number };
const body = (): Body => ({
  active: false,
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  angle: 0,
  spin: 0,
});
const xs = [19, 37, 55, 73, 91],
  tau = Math.PI * 2,
  f = Math.fround;
function wrap(b: { x: number; y: number }, margin: number) {
  if (b.x < -margin) b.x += 128 + 2 * margin;
  if (b.x > 128 + margin) b.x -= 128 + 2 * margin;
  if (b.y < -margin) b.y += 64 + 2 * margin;
  if (b.y > 64 + margin) b.y -= 64 + 2 * margin;
}
function angleDiff(a: number, b: number) {
  let d = b - a;
  while (d > Math.PI) d -= tau;
  while (d < -Math.PI) d += tau;
  return d;
}
export class Asteroids {
  settings: AsteroidsSettings;
  ship = { x: 30, y: 50, vx: 8, vy: -3, heading: -0.4 };
  rocks: Rock[] = Array.from({ length: 8 }, () => ({
    ...body(),
    big: false,
    radii: Array(7).fill(0),
  }));
  shards: Shard[] = Array.from({ length: 14 }, () => ({
    ...body(),
    fromDigit: false,
    life: 0,
  }));
  bullet = { active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, rock: -1 };
  phase: 'idle' | 'aim' | 'fire' | 'shatter' = 'idle';
  thrusting = false;
  idleTimer = 1;
  turnTarget = 0;
  turning = false;
  thrustTimer = 0;
  shotTimer: number;
  respawnTimer = 0;
  now = 0;
  displayed = '00:00';
  queue: { index: number; value: string }[] = [];
  current = 0;
  aimTimer = 0;
  refires = 0;
  triggered = -1;
  targetMinute = -1;
  offsets = [0, 0, 0, 0, 0];
  velocities = [0, 0, 0, 0, 0];
  constructor(
    public random: () => number = Math.random,
    settings?: AsteroidsSettings,
  ) {
    this.settings = normalizeAsteroids(settings);
    this.shotTimer = this.rand(4, 8);
    for (let i = 0; i < this.settings.asteroidsRockCount; i++) this.spawnRock();
  }
  configure(settings?: AsteroidsSettings) {
    this.settings = normalizeAsteroids(settings);
  }
  get timeY() {
    return this.settings.asteroidsShowDate ? 16 : 21;
  }
  rand(lo: number, hi: number) {
    return f(
      f(lo) + f(f(f(hi) - f(lo)) * f(Math.floor(this.random() * 1001) / 1000)),
    );
  }
  shape(r: Rock, base: number) {
    r.radii = Array.from({ length: 7 }, () =>
      Math.max(2, Math.trunc(base * this.rand(0.7, 1.3) + 0.5)),
    );
  }
  spawnRock() {
    const r = this.rocks.find((r) => !r.active);
    if (!r) return;
    r.active = true;
    r.big = true;
    switch (Math.floor(this.random() * 4)) {
      case 0:
        r.x = -8;
        r.y = this.rand(8, 56);
        break;
      case 1:
        r.x = 136;
        r.y = this.rand(8, 56);
        break;
      case 2:
        r.x = this.rand(8, 120);
        r.y = -8;
        break;
      default:
        r.x = this.rand(8, 120);
        r.y = 72;
    }
    const a = Math.atan2(32 - r.y, 64 - r.x) + this.rand(-0.6, 0.6),
      speed = this.settings.asteroidsRockSpeed;
    r.vx = Math.cos(a) * speed;
    r.vy = Math.sin(a) * speed;
    r.angle = this.rand(0, tau);
    r.spin = this.rand(0.5, 1.5) * (Math.floor(this.random() * 2) ? 1 : -1);
    this.shape(r, 7);
  }
  burst(x: number, y: number, count: number, scale: number) {
    for (const sh of this.shards) {
      if (count <= 0) break;
      if (sh.active) continue;
      sh.active = true;
      sh.fromDigit = false;
      sh.x = x;
      sh.y = y;
      const a = this.rand(0, tau),
        speed = this.rand(15, 45) * scale;
      sh.vx = Math.cos(a) * speed;
      sh.vy = Math.sin(a) * speed;
      sh.angle = this.rand(0, tau);
      sh.spin = this.rand(-4, 4);
      sh.life = f(0.9) * this.rand(0.6, 1);
      count--;
    }
  }
  hitRock(index: number) {
    const r = this.rocks[index];
    if (r.big) {
      r.big = false;
      this.shape(r, 4);
      const a = Math.atan2(r.vy, r.vx) + Math.PI / 2,
        kx = Math.cos(a) * 8,
        ky = Math.sin(a) * 8,
        c = this.rocks.find((r) => !r.active);
      if (c) {
        Object.assign(c, {
          ...r,
          radii: [...r.radii],
          vx: r.vx - kx,
          vy: r.vy - ky,
          spin: -r.spin,
        });
        this.shape(c, 4);
      }
      r.vx += kx;
      r.vy += ky;
      this.burst(r.x, r.y, 3, 0.6);
    } else {
      r.active = false;
      this.burst(r.x, r.y, 5, 1);
    }
  }
  shatter(glyphs: number[][]) {
    const index = this.queue[this.current].index,
      lit: { x: number; y: number }[] = [];
    glyphs[Number(this.displayed[index])].forEach((bits, row) => {
      for (let col = 0; col < 5; col++)
        if (bits & (1 << (4 - col)))
          lit.push({ x: xs[index] + col * 3, y: this.timeY + row * 3 });
    });
    const target = Math.min(10, lit.length);
    let spawned = 0;
    for (const sh of this.shards) {
      if (spawned >= target) break;
      if (sh.active) continue;
      const p = lit[Math.floor((spawned * lit.length) / target)];
      sh.active = true;
      sh.fromDigit = true;
      sh.x = p.x;
      sh.y = p.y;
      const a =
          Math.atan2(sh.y - this.timeY - 10.5, sh.x - xs[index] - 8) +
          this.rand(-0.5, 0.5),
        speed = this.rand(20, 50);
      sh.vx = Math.cos(a) * speed;
      sh.vy = Math.sin(a) * speed;
      sh.angle = this.rand(0, tau);
      sh.spin = this.rand(-4, 4);
      sh.life = f(0.9) * this.rand(0.7, 1);
      spawned++;
    }
    this.phase = 'shatter';
  }
  fire(x: number, y: number, rock: number) {
    const s = this.ship,
      a = Math.atan2(y - s.y, x - s.x);
    Object.assign(this.bullet, {
      active: true,
      x: s.x + Math.cos(s.heading) * 6,
      y: s.y + Math.sin(s.heading) * 6,
      vx: Math.cos(a) * 140,
      vy: Math.sin(a) * 140,
      life: 1.5,
      rock,
    });
  }
  tick(
    live: string,
    next: string,
    minute: number,
    seconds: number,
    glyphs: number[][],
    replay = false,
    bounceHeight = 35,
    bounceSpeed = 6,
  ) {
    const dt = f(this.now === 0 ? 0.025 : 0.016);
    this.now += 16;
    const s = this.ship,
      b = this.bullet,
      scale = this.settings.asteroidsShipSpeed / 10;
    for (let i = 0; i < 5; i++)
      if (this.offsets[i] !== 0 || this.velocities[i] !== 0) {
        this.velocities[i] += (bounceSpeed / 10) * (dt / 0.05);
        this.offsets[i] += this.velocities[i] * (dt / 0.05);
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
      if (this.queue.length) {
        b.active = false;
        this.phase = 'aim';
        this.aimTimer = 0;
        this.refires = 0;
      }
    }
    if (this.phase === 'idle') {
      this.idleTimer = f(this.idleTimer - dt);
      this.shotTimer = f(this.shotTimer - dt);
      if (this.turning) {
        const d = angleDiff(s.heading, this.turnTarget),
          step = 2.5 * dt;
        if (Math.abs(d) <= step) {
          s.heading = this.turnTarget;
          this.turning = false;
        } else s.heading += d > 0 ? step : -step;
      }
      if (this.thrustTimer > 0) {
        this.thrustTimer = f(this.thrustTimer - dt);
        this.thrusting = this.thrustTimer > 0;
      }
      if (this.idleTimer <= 0) {
        this.idleTimer = this.rand(1.2, 3);
        const action = Math.floor(this.random() * 100);
        if (action < 40) {
          this.turnTarget = this.rand(0, tau);
          this.turning = true;
        } else if (action < 75) {
          this.thrustTimer = this.rand(0.3, 0.7);
          this.thrusting = true;
        }
      }
      if (this.shotTimer <= 0 && !b.active) {
        this.shotTimer = this.rand(6, 14);
        let best = -1;
        this.rocks.forEach((r, i) => {
          if (
            r.active &&
            r.x >= 4 &&
            r.x <= 124 &&
            r.y >= 4 &&
            r.y <= 60 &&
            (best < 0 || (r.big && !this.rocks[best].big))
          )
            best = i;
        });
        if (best >= 0) {
          const r = this.rocks[best];
          s.heading = Math.atan2(r.y - s.y, r.x - s.x);
          this.turning = false;
          this.fire(r.x, r.y, best);
        }
      }
    } else if (this.phase === 'aim') {
      this.thrusting = false;
      s.vx *= 1 - 1.5 * dt;
      s.vy *= 1 - 1.5 * dt;
      const tx = xs[this.queue[this.current].index] + 8,
        ty = this.timeY + 10.5,
        want = Math.atan2(ty - s.y, tx - s.x),
        d = angleDiff(s.heading, want),
        step = 4.5 * dt;
      this.aimTimer = f(this.aimTimer + dt);
      if (Math.abs(d) <= step || this.aimTimer > 2) {
        s.heading = want;
        this.fire(tx, ty, -1);
        this.phase = 'fire';
      } else s.heading += d > 0 ? step : -step;
    } else if (this.phase === 'fire') {
      if (!b.active) {
        if (this.refires < 2) {
          this.refires++;
          this.phase = 'aim';
          this.aimTimer = 0;
        } else this.shatter(glyphs);
      }
    } else if (!this.shards.some((sh) => sh.active)) {
      const a = this.queue[this.current];
      this.displayed =
        this.displayed.slice(0, a.index) +
        a.value +
        this.displayed.slice(a.index + 1);
      this.velocities[a.index] = -bounceHeight / 10;
      this.current++;
      if (this.current < this.queue.length) {
        this.phase = 'aim';
        this.aimTimer = 0;
        this.refires = 0;
      } else {
        this.phase = 'idle';
        this.idleTimer = 0.5;
      }
    }
    if (this.thrusting && this.phase === 'idle') {
      s.vx += Math.cos(s.heading) * 40 * scale * dt;
      s.vy += Math.sin(s.heading) * 40 * scale * dt;
    }
    if (!this.settings.asteroidsTransparent) {
      if (
        s.x > 13 &&
        s.x < 113 &&
        s.y > this.timeY - 6 &&
        s.y < this.timeY + 27
      ) {
        s.vy += (s.y < this.timeY + 10.5 ? -90 : 90) * dt;
        s.vx += (s.x < 63 ? -25 : 25) * dt;
      }
      if (this.settings.asteroidsShowDate && s.y < 16 && s.x > 28 && s.x < 100)
        s.vy += 90 * dt;
    }
    const max = 35 * scale,
      speed = Math.hypot(s.vx, s.vy);
    if (speed > max) {
      s.vx *= max / speed;
      s.vy *= max / speed;
    }
    s.vx *= 1 - 0.15 * dt;
    s.vy *= 1 - 0.15 * dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    wrap(s, 6);
    for (const r of this.rocks)
      if (r.active) {
        r.x += r.vx * dt;
        r.y += r.vy * dt;
        r.angle += r.spin * dt;
        wrap(r, 10);
      }
    if (
      this.rocks.filter((r) => r.active).length <
      this.settings.asteroidsRockCount
    ) {
      this.respawnTimer = f(this.respawnTimer - dt);
      if (this.respawnTimer <= 0) {
        this.spawnRock();
        this.respawnTimer = this.rand(2, 5);
      }
    }
    if (b.active) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life = f(b.life - dt);
      if (b.life <= 0) b.active = false;
      else if (b.rock >= 0) {
        const r = this.rocks[b.rock];
        if (!r.active) b.active = false;
        else if ((b.x - r.x) ** 2 + (b.y - r.y) ** 2 < (r.big ? 8 : 5) ** 2) {
          this.hitRock(b.rock);
          b.active = false;
        }
      } else if (this.phase === 'fire') {
        const x = xs[this.queue[this.current].index];
        if (
          b.x >= x - 1 &&
          b.x <= x + 17 &&
          b.y >= this.timeY - 1 &&
          b.y <= this.timeY + 22
        ) {
          b.active = false;
          this.shatter(glyphs);
        }
      }
    }
    for (const sh of this.shards)
      if (sh.active) {
        sh.x += sh.vx * dt;
        sh.y += sh.vy * dt;
        sh.angle += sh.spin * dt;
        sh.life = f(sh.life - dt);
        if (sh.life <= 0 || sh.x < -8 || sh.x > 136 || sh.y < -8 || sh.y > 72)
          sh.active = false;
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
    const line = (
        x: number,
        y: number,
        xx: number,
        yy: number,
        color: string,
      ) =>
        gfxLine(
          frame,
          Math.trunc(x),
          Math.trunc(y),
          Math.trunc(xx),
          Math.trunc(yy),
          color,
        ),
      rockColor = '#a42829',
      shipColor = '#00ffff';
    for (const r of this.rocks)
      if (r.active) {
        let px = 0,
          py = 0;
        for (let v = 0; v <= 7; v++) {
          const i = v % 7,
            a = r.angle + (tau * i) / 7,
            x = r.x + Math.cos(a) * r.radii[i],
            y = r.y + Math.sin(a) * r.radii[i];
          if (v) line(px, py, x, y, rockColor);
          px = x;
          py = y;
        }
      }
    for (const sh of this.shards)
      if (sh.active) {
        const len = Math.max(0.5, (3 * sh.life) / 0.9),
          c = Math.cos(sh.angle) * len,
          s = Math.sin(sh.angle) * len;
        line(
          sh.x - c,
          sh.y - s,
          sh.x + c,
          sh.y + s,
          sh.fromDigit ? o.color : rockColor,
        );
      }
    const s = this.ship,
      c = Math.cos(s.heading),
      sn = Math.sin(s.heading),
      nx = s.x + c * 5,
      ny = s.y + sn * 5,
      lx = s.x - c * 4 - sn * 3.5,
      ly = s.y - sn * 4 + c * 3.5,
      rx = s.x - c * 4 + sn * 3.5,
      ry = s.y - sn * 4 - c * 3.5;
    line(nx, ny, lx, ly, shipColor);
    line(nx, ny, rx, ry, shipColor);
    line(lx, ly, rx, ry, shipColor);
    if (this.thrusting && Math.floor(this.now / 60) % 2 === 0)
      line(s.x - c * 4, s.y - sn * 4, s.x - c * 8, s.y - sn * 8, shipColor);
    [...this.displayed].forEach((ch, i) => {
      if (this.phase === 'shatter' && this.queue[this.current].index === i)
        return;
      const y = this.timeY + (i === 2 ? 0 : Math.trunc(this.offsets[i]));
      if (!this.settings.asteroidsTransparent)
        frame.rect(xs[i] - 1, y - 1, 18, 23, '#000000');
      drawGfxText(
        frame,
        i === 2 && o.blink && date.getMilliseconds() >= 500 ? ' ' : ch,
        xs[i],
        y,
        3,
        o.color,
      );
    });
    const b = this.bullet;
    if (b.active) {
      frame.pixel(Math.trunc(b.x), Math.trunc(b.y), shipColor);
      frame.pixel(
        Math.trunc(b.x - b.vx * 0.01),
        Math.trunc(b.y - b.vy * 0.01),
        shipColor,
      );
    }
    if (this.settings.asteroidsShowDate) {
      if (!this.settings.asteroidsTransparent)
        frame.rect(33, 3, 62, 9, '#000000');
      drawGfxText(
        frame,
        classicDate(date, o.zone, o.dateFormat ?? 0),
        34,
        4,
        1,
        '#ffffff',
      );
    }
    if (!o.hour24) drawGfxText(frame, pm ? 'PM' : 'AM', 110, 4, 1, '#ffffff');
  }
}
