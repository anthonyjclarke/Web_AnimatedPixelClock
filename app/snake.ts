// Port of AnimatedPixelClock/src/clocks/clock_snake.cpp (MIT).
import { classicDate, drawGfxText } from './classic-clocks';
import type { Framebuffer } from './framebuffer';
export const snakeDefaults = {
  snakeSpeed: 12,
  snakeLength: 8,
  snakeWallBorder: false,
  snakeShowDate: false,
};
export type SnakeSettings = typeof snakeDefaults;
export function normalizeSnake(value: unknown): SnakeSettings {
  const v =
    value && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : {};
  return {
    snakeSpeed:
      typeof v.snakeSpeed === 'number' && Number.isFinite(v.snakeSpeed)
        ? Math.max(5, Math.min(30, Math.round(v.snakeSpeed)))
        : 12,
    snakeLength:
      typeof v.snakeLength === 'number' && Number.isFinite(v.snakeLength)
        ? Math.max(4, Math.min(12, Math.round(v.snakeLength)))
        : 8,
    snakeWallBorder:
      typeof v.snakeWallBorder === 'boolean' ? v.snakeWallBorder : false,
    snakeShowDate:
      typeof v.snakeShowDate === 'boolean' ? v.snakeShowDate : false,
  };
}
const xs = [19, 37, 55, 73, 91],
  slots = [0, 1, 3, 4],
  dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
type Cell = { x: number; y: number };
export class Snake {
  settings: SnakeSettings;
  body: Cell[] = [];
  dx = 1;
  dy = 0;
  targetLength = 8;
  food = { x: 0, y: 0, active: false };
  phase: 'roam' | 'eat' | 'leave' = 'roam';
  pellets: { x: number; y: number; active: boolean }[] = [];
  queue: { index: number; value: string }[] = [];
  active = -1;
  steps = 0;
  displayed = '';
  triggered = -1;
  targetMinute = -1;
  now = 0;
  lastStep = 0;
  transitionStart = 0;
  offsets = [0, 0, 0, 0, 0];
  velocities = [0, 0, 0, 0, 0];
  constructor(
    public random: () => number = Math.random,
    value?: Partial<SnakeSettings>,
  ) {
    this.settings = normalizeSnake(value);
    this.reset();
  }
  get timeY() {
    return this.settings.snakeShowDate ? 16 : 21;
  }
  get interval() {
    return Math.max(
      45,
      Math.min(
        320,
        Math.trunc(
          Math.fround(150 / Math.fround(this.settings.snakeSpeed / 10)),
        ),
      ),
    );
  }
  get bounds() {
    const n = this.settings.snakeWallBorder ? 1 : 0;
    return [n, 31 - n, (this.settings.snakeShowDate ? 3 : 0) + n, 15 - n];
  }
  rand(a: number, b: number) {
    return a + Math.floor(this.random() * (b - a));
  }
  reset() {
    this.phase = 'roam';
    this.dx = 1;
    this.dy = 0;
    this.targetLength = this.settings.snakeLength;
    const [minx, maxx, , maxy] = this.bounds;
    const hx = Math.min(minx + 4, maxx);
    this.body = Array.from({ length: this.targetLength }, (_, i) => ({
      x: Math.max(minx, hx - i),
      y: maxy,
    }));
    this.queue = [];
    this.pellets = [];
    this.active = -1;
    this.steps = 0;
    this.triggered = -1;
    this.offsets.fill(0);
    this.velocities.fill(0);
    this.food.active = false;
    this.spawnFood();
  }
  configure(value: unknown) {
    const next = normalizeSnake(value),
      reset =
        next.snakeLength !== this.settings.snakeLength ||
        next.snakeWallBorder !== this.settings.snakeWallBorder ||
        next.snakeShowDate !== this.settings.snakeShowDate;
    this.settings = next;
    if (reset) {
      for (const a of this.queue)
        this.displayed =
          this.displayed.slice(0, a.index) +
          a.value +
          this.displayed.slice(a.index + 1);
      this.reset();
      this.lastStep = this.now;
    }
  }
  inDigit(x: number, y: number, index: number) {
    return (
      x >= xs[index] - 1 &&
      x < xs[index] + 16 &&
      y >= this.timeY - 1 &&
      y < this.timeY + 22
    );
  }
  onDigit(x: number, y: number) {
    return slots.some(
      (i) => i !== this.active && this.inDigit(x * 4 + 1, y * 4 + 1, i),
    );
  }
  onBody(x: number, y: number) {
    return this.body.slice(0, -1).some((c) => c.x === x && c.y === y);
  }
  free(x: number, y: number) {
    const [a, b, c, d] = this.bounds;
    return (
      x >= a &&
      x <= b &&
      y >= c &&
      y <= d &&
      !this.onDigit(x, y) &&
      !this.onBody(x, y)
    );
  }
  spawnFood() {
    const [a, b, c, d] = this.bounds;
    for (let i = 0; i < 80; i++) {
      const x = this.rand(a, b + 1),
        y = this.rand(c, d + 1);
      if (this.onDigit(x, y) || this.body.some((p) => p.x === x && p.y === y))
        continue;
      this.food = { x, y, active: true };
      return;
    }
    this.food.active = false;
  }
  steer(tx: number, ty: number) {
    const head = this.body[0];
    let chosen: number[] | undefined;
    if (tx >= 0 && tx < 32 && ty >= 0 && ty < 16) {
      const dist = new Uint8Array(512).fill(255),
        queue = [ty * 32 + tx];
      dist[queue[0]] = 0;
      const [a, b, c, d] = this.bounds;
      for (let i = 0; i < queue.length; i++) {
        const cur = queue[i],
          x = cur % 32,
          y = Math.trunc(cur / 32);
        for (const [dx, dy] of dirs) {
          const nx = x + dx,
            ny = y + dy,
            n = ny * 32 + nx;
          if (
            nx < a ||
            nx > b ||
            ny < c ||
            ny > d ||
            dist[n] !== 255 ||
            this.onDigit(nx, ny) ||
            this.onBody(nx, ny)
          )
            continue;
          dist[n] = dist[cur] + 1;
          queue.push(n);
        }
      }
      let best = 256;
      for (const dir of dirs) {
        const [dx, dy] = dir,
          nx = head.x + dx,
          ny = head.y + dy;
        if ((dx === -this.dx && dy === -this.dy) || !this.free(nx, ny))
          continue;
        const n = dist[ny * 32 + nx];
        if (n === 255) continue;
        if (n < best || (n === best && dx === this.dx && dy === this.dy)) {
          chosen = dir;
          best = n;
        }
      }
    }
    if (!chosen) {
      let best = Infinity;
      for (const dir of dirs) {
        const [dx, dy] = dir,
          nx = head.x + dx,
          ny = head.y + dy;
        if ((dx === -this.dx && dy === -this.dy) || !this.free(nx, ny))
          continue;
        const n = Math.abs(nx - tx) + Math.abs(ny - ty);
        if (n < best || (n === best && this.rand(0, 2))) {
          chosen = dir;
          best = n;
        }
      }
    }
    if (!chosen)
      chosen = dirs.find(([dx, dy]) => this.free(head.x + dx, head.y + dy));
    [this.dx, this.dy] = chosen ?? [-this.dx, -this.dy];
  }
  advance() {
    const length =
      this.body.length < this.targetLength && this.body.length < 24
        ? this.body.length + 1
        : this.body.length;
    this.body = [
      { x: this.body[0].x + this.dx, y: this.body[0].y + this.dy },
      ...this.body.map((c) => ({ ...c })),
    ].slice(0, length);
  }
  startDigit(glyphs: number[][]) {
    this.active = this.queue[0].index;
    this.phase = 'eat';
    this.steps = 0;
    const lit: Cell[] = [];
    glyphs[Number(this.displayed[this.active])].forEach((bits, row) => {
      for (let col = 0; col < 5; col++)
        if (bits & (1 << (4 - col)))
          lit.push({ x: xs[this.active] + col * 3, y: this.timeY + row * 3 });
    });
    const n = Math.min(5, lit.length);
    this.pellets = Array.from({ length: n }, (_, i) => ({
      ...lit[Math.trunc((i * lit.length) / n)],
      active: true,
    }));
  }
  resync(live: string, minute: number) {
    this.displayed = live;
    this.queue = [];
    this.pellets = [];
    this.active = -1;
    this.phase = 'roam';
    this.targetMinute = minute;
    this.triggered = -1;
    this.offsets.fill(0);
    this.velocities.fill(0);
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
    this.now += 16;
    for (let i = 0; i < 5; i++)
      if (this.offsets[i] || this.velocities[i]) {
        this.velocities[i] += (bounceSpeed / 10) * 0.32;
        this.offsets[i] += this.velocities[i] * 0.32;
        if (this.offsets[i] >= 0) {
          this.offsets[i] = 0;
          this.velocities[i] = 0;
        }
      }
    if (!this.displayed) this.displayed = live;
    if (this.now - this.transitionStart > 60000 && this.phase !== 'roam')
      this.resync(live, minute);
    if (replay) {
      this.queue = slots.map((index) => ({ index, value: live[index] }));
      this.targetMinute = minute;
      this.food.active = false;
      this.transitionStart = this.now;
      this.startDigit(glyphs);
    }
    if (this.now - this.lastStep < this.interval) return;
    this.lastStep = this.now;
    if (
      seconds >= 56 &&
      this.triggered !== minute &&
      this.phase === 'roam' &&
      !replay
    ) {
      this.triggered = minute;
      this.targetMinute = minute + 1;
      this.queue = slots
        .filter((i) => this.displayed[i] !== next[i])
        .map((index) => ({ index, value: next[index] }));
      if (this.queue.length) {
        this.food.active = false;
        this.transitionStart = this.now;
        this.startDigit(glyphs);
      }
    }
    if (this.phase === 'eat') {
      const head = this.body[0];
      let best = Infinity,
        target: Cell | undefined;
      for (const p of this.pellets) {
        if (!p.active) continue;
        const x = Math.trunc(p.x / 4),
          y = Math.trunc(p.y / 4),
          d = Math.abs(x - head.x) + Math.abs(y - head.y);
        if (d < best) {
          best = d;
          target = { x, y };
        }
      }
      if (!target || this.steps >= 80) {
        this.phase = 'leave';
        this.steps = 0;
        this.pellets = [];
        return;
      }
      this.steer(target.x, target.y);
      this.advance();
      this.steps++;
      for (const p of this.pellets)
        if (
          Math.trunc(p.x / 4) === this.body[0].x &&
          Math.trunc(p.y / 4) === this.body[0].y
        )
          p.active = false;
      return;
    }
    if (this.phase === 'leave') {
      let tx: number, ty: number;
      if (this.queue.length > 1) {
        tx = Math.trunc((xs[this.queue[1].index] + 8) / 4);
        ty = Math.trunc((this.timeY + 23) / 4);
      } else {
        if (!this.food.active) this.spawnFood();
        tx = this.food.x;
        ty = this.food.y;
      }
      this.steer(tx, ty);
      this.advance();
      this.steps++;
      if (
        this.body.every(
          (c) => !this.inDigit(c.x * 4 + 1, c.y * 4 + 1, this.active),
        ) ||
        this.steps > 40
      ) {
        const a = this.queue.shift()!;
        this.displayed =
          this.displayed.slice(0, a.index) +
          a.value +
          this.displayed.slice(a.index + 1);
        this.velocities[a.index] = -bounceHeight / 10;
        this.active = -1;
        if (this.queue.length) this.startDigit(glyphs);
        else {
          this.phase = 'roam';
          this.spawnFood();
        }
      }
      return;
    }
    if (minute >= this.targetMinute) this.displayed = live;
    if (!this.food.active) this.spawnFood();
    this.steer(this.food.x, this.food.y);
    this.advance();
    const head = this.body[0];
    if (this.food.active && head.x === this.food.x && head.y === this.food.y) {
      this.targetLength =
        this.targetLength < Math.min(24, this.settings.snakeLength + 8)
          ? this.targetLength + 1
          : this.settings.snakeLength;
      this.spawnFood();
    }
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
    if (this.settings.snakeShowDate)
      drawGfxText(
        frame,
        classicDate(date, o.zone, o.dateFormat ?? 0),
        34,
        4,
        1,
        '#ffffff',
      );
    if (!o.hour24) drawGfxText(frame, pm ? 'PM' : 'AM', 110, 4, 1, '#ffffff');
    if (this.settings.snakeWallBorder) {
      const top = this.settings.snakeShowDate ? 12 : 0;
      frame.rect(0, top, 128, 1, '#ffffff');
      frame.rect(0, 63, 128, 1, '#ffffff');
      frame.rect(0, top, 1, 64 - top, '#ffffff');
      frame.rect(127, top, 1, 64 - top, '#ffffff');
    }
    [...this.displayed].forEach((ch, i) => {
      if (i === this.active) return;
      drawGfxText(
        frame,
        i === 2 && o.blink && date.getMilliseconds() >= 500 ? ' ' : ch,
        xs[i],
        this.timeY + (i === 2 ? 0 : Math.trunc(this.offsets[i])),
        3,
        o.color,
      );
    });
    if (Math.trunc(this.now / 300) % 2 === 0) {
      if (this.phase === 'eat')
        for (const p of this.pellets)
          if (p.active) frame.rect(p.x, p.y, 3, 3, o.color);
      if (this.phase === 'roam' && this.food.active)
        frame.rect(this.food.x * 4, this.food.y * 4, 3, 3, '#ff0000');
    }
    for (let i = this.body.length - 1; i >= 0; i--)
      frame.rect(this.body[i].x * 4, this.body[i].y * 4, 3, 3, '#00ff00');
    const h = this.body[0];
    frame.pixel(h.x * 4 + 1 + this.dx, h.y * 4 + 1 + this.dy, '#000000');
  }
}
