// Port of AnimatedPixelClock/src/clocks/clock_bomberman.cpp (MIT).
import { drawGfxText } from './classic-clocks';
import { gfxLine } from './oscilloscope';
import { tronColor } from './tron';
import type { Framebuffer } from './framebuffer';
const glyph = [
    [14, 17, 19, 21, 25, 17, 14],
    [4, 12, 4, 4, 4, 4, 14],
    [14, 17, 1, 2, 4, 8, 31],
    [30, 1, 1, 14, 1, 1, 30],
    [2, 6, 10, 18, 31, 2, 2],
    [31, 16, 16, 30, 1, 1, 30],
    [14, 16, 16, 30, 17, 17, 14],
    [31, 1, 2, 4, 8, 8, 8],
    [14, 17, 17, 14, 17, 17, 14],
    [14, 17, 17, 15, 1, 1, 14],
  ],
  xs = [12, 40, 72, 100],
  lanes = [6, 34, 64, 94, 122],
  ys = [8, 22, 34, 52],
  dx = [1, 0, -1, 0],
  dy = [0, 1, 0, -1],
  f = Math.fround;
const nx = (n: number) => lanes[n % 5],
  ny = (n: number) => ys[Math.trunc(n / 5)];
export class Bomberman {
  now = 0;
  initialized = false;
  phase: 'patrol' | 'approach' | 'fuse' | 'blast' | 'build' | 'collect' =
    'patrol';
  phaseStart = 0;
  fuseDuration = 0;
  heroX = 6;
  heroY = 52;
  heroNode = 15;
  bombNode = 0;
  activeDigit = -1;
  shown = [0, 0, 0, 0];
  target = [0, 0, 0, 0];
  facing = 0;
  route: number[] = [];
  routeIndex = 0;
  crates = [6, 13];
  bonus = -1;
  flames = {
    lengths: [0, 0, 0, 0],
    digits: [0, 0, 0, 0],
    boxes: [0, 0, 0, 0],
  };
  constructor(public random: () => number = Math.random) {}
  occupied(n: number) {
    return this.crates.includes(n);
  }
  neighbors(a: number, b: number) {
    return (
      (a % 5 === b % 5 &&
        Math.abs(Math.trunc(a / 5) - Math.trunc(b / 5)) === 1) ||
      (Math.trunc(a / 5) === Math.trunc(b / 5) &&
        [0, 3].includes(Math.trunc(a / 5)) &&
        Math.abs((a % 5) - (b % 5)) === 1)
    );
  }
  findRoute(from: number, to: number): number[] | null {
    const queue = [from],
      parent = Array(20).fill(-1);
    parent[from] = from;
    for (let head = 0; head < queue.length && parent[to] < 0; head++) {
      const n = queue[head];
      for (let j = 0; j < 20; j++)
        if (parent[j] < 0 && !this.occupied(j) && this.neighbors(n, j)) {
          parent[j] = n;
          queue.push(j);
        }
    }
    if (parent[to] < 0) return null;
    const path = [];
    for (let n = to; n !== from; n = parent[n]) path.push(n);
    return path.reverse();
  }
  goTo(n: number) {
    this.routeIndex = 0;
    const path = this.findRoute(this.heroNode, n);
    this.route = path ?? [];
    return path !== null;
  }
  move(dt: number, speed: number) {
    let remaining = f(dt * speed);
    while (this.routeIndex < this.route.length) {
      const next = this.route[this.routeIndex],
        x = f(nx(next) - this.heroX),
        y = f(ny(next) - this.heroY),
        distance = f(Math.abs(x) + Math.abs(y));
      if (distance > 0.01)
        this.facing = Math.abs(x) > 0.01 ? (x > 0 ? 0 : 2) : y > 0 ? 1 : 3;
      if (distance <= remaining) {
        this.heroX = nx(next);
        this.heroY = ny(next);
        this.heroNode = next;
        remaining = f(remaining - distance);
        this.routeIndex++;
      } else {
        if (Math.abs(x) > 0.01)
          this.heroX = f(this.heroX + (x > 0 ? remaining : -remaining));
        else this.heroY = f(this.heroY + (y > 0 ? remaining : -remaining));
        return false;
      }
    }
    return true;
  }
  digitAt(x: number, y: number) {
    if (y < 16 || y >= 43 || (y - 16) % 4 === 3) return -1;
    const r = Math.trunc((y - 16) / 4);
    for (let i = 0; i < 4; i++) {
      const local = x - xs[i];
      if (
        local >= 0 &&
        local < 19 &&
        local % 4 !== 3 &&
        glyph[this.shown[i]][r] & (16 >> Math.trunc(local / 4))
      )
        return i;
    }
    return -1;
  }
  traceFlames(node: number) {
    const lengths = [0, 0, 0, 0],
      digits = [-1, -1, -1, -1],
      boxes = [-1, -1, -1, -1];
    for (let d = 0; d < 4; d++)
      for (let s = 1; s <= 34; s++) {
        const x = nx(node) + dx[d] * s,
          y = ny(node) + dy[d] * s;
        if (x < 2 || x > 125 || y < 3 || y > 59) break;
        lengths[d] = s;
        digits[d] = this.digitAt(x, y);
        for (let c = 0; c < 2; c++)
          if (
            this.crates[c] >= 0 &&
            Math.abs(x - nx(this.crates[c])) <= 3 &&
            Math.abs(y - ny(this.crates[c])) <= 3
          )
            boxes[d] = c;
        if (digits[d] >= 0 || boxes[d] >= 0) break;
      }
    return { lengths, digits, boxes };
  }
  inFlames(node: number, origin: number, lengths: number[]) {
    const x = nx(node) - nx(origin),
      y = ny(node) - ny(origin);
    return lengths.some((len, d) => {
      const along = x * dx[d] + y * dy[d],
        across = x * dy[d] - y * dx[d];
      return along >= -4 && along <= len + 4 && Math.abs(across) <= 5;
    });
  }
  distance(origin: number, path: number[]) {
    let total = 0,
      prev = origin;
    for (const n of path) {
      total += Math.abs(nx(n) - nx(prev)) + Math.abs(ny(n) - ny(prev));
      prev = n;
    }
    return total;
  }
  escape(origin: number, lengths: number[]) {
    let best = -1,
      distance = 10000;
    for (let n = 0; n < 20; n++) {
      if (this.occupied(n) || this.inFlames(n, origin, lengths)) continue;
      const path = this.findRoute(origin, n);
      if (!path) continue;
      const d = this.distance(origin, path);
      if (d < distance) {
        best = n;
        distance = d;
      }
    }
    return best;
  }
  choose() {
    this.activeDigit = this.shown.findIndex((v, i) => v !== this.target[i]);
    for (let c = 0; c < 2; c++)
      if (this.crates[c] < 0) {
        const options = [];
        for (let n = 5; n < 15; n++)
          if (n !== this.heroNode && n !== this.bonus && !this.occupied(n))
            options.push(n);
        if (options.length)
          this.crates[c] = options[Math.floor(this.random() * options.length)];
      }
    const options = [],
      patrol = this.activeDigit < 0 && Math.floor(this.random() * 4) === 0;
    for (let n = 0; n < 20; n++) {
      if (
        this.occupied(n) ||
        n === this.heroNode ||
        !this.findRoute(this.heroNode, n)
      )
        continue;
      const flames = this.traceFlames(n);
      if (
        (patrol ||
          flames.digits.some((d, i) =>
            this.activeDigit >= 0
              ? d === this.activeDigit
              : flames.boxes[i] >= 0,
          )) &&
        this.escape(n, flames.lengths) >= 0
      )
        options.push(n);
    }
    if (!options.length) {
      this.phase = 'patrol';
      this.route = [];
      this.routeIndex = 0;
    } else {
      this.bombNode = options[Math.floor(this.random() * options.length)];
      this.goTo(this.bombNode);
      this.phase = patrol ? 'patrol' : 'approach';
    }
    this.phaseStart = this.now;
  }
  plant() {
    this.flames = this.traceFlames(this.bombNode);
    const safe = this.escape(this.bombNode, this.flames.lengths);
    if (safe < 0 || !this.goTo(safe)) {
      this.choose();
      return;
    }
    this.fuseDuration = Math.max(
      1400,
      Math.trunc((this.distance(this.heroNode, this.route) * 1000) / 48) + 350,
    );
    this.phase = 'fuse';
    this.phaseStart = this.now;
  }
  tick(live: string, replay = false) {
    this.now += 16;
    this.target = live.replace(':', '').split('').map(Number);
    let dt = f(0.016);
    if (!this.initialized) {
      this.shown = [...this.target];
      this.initialized = true;
      this.choose();
      dt = 0;
    }
    if (replay) {
      this.shown = this.target.map((v) => (v + 1) % 10);
      this.choose();
    }
    const age = this.now - this.phaseStart;
    if (this.phase === 'patrol' || this.phase === 'approach') {
      if (this.move(dt, 30)) {
        if (
          this.phase === 'patrol' ||
          (this.activeDigit < 0 &&
            this.shown.some((v, i) => v !== this.target[i]))
        )
          this.choose();
        else this.plant();
      }
    } else if (this.phase === 'fuse') {
      if (this.move(dt, 48) && age >= this.fuseDuration) {
        this.phase = 'blast';
        this.phaseStart = this.now;
        for (const c of this.flames.boxes)
          if (c >= 0 && this.crates[c] >= 0) {
            this.bonus = this.crates[c];
            this.crates[c] = -1;
          }
      }
    } else if (this.phase === 'blast' && age >= 650) {
      if (this.activeDigit >= 0) {
        this.phase = 'build';
        this.phaseStart = this.now;
      } else if (this.bonus >= 0 && this.goTo(this.bonus)) {
        this.phase = 'collect';
        this.phaseStart = this.now;
      } else this.choose();
    } else if (this.phase === 'build' && age >= 850) {
      this.shown[this.activeDigit] = this.target[this.activeDigit];
      this.choose();
    } else if (this.phase === 'collect' && this.move(dt, 34)) {
      this.bonus = -1;
      this.choose();
    }
  }
  draw(
    frame: Framebuffer,
    date: Date,
    o: { color: string; blink: boolean; hour24: boolean },
    pm: boolean,
  ) {
    frame.clear('#000000');
    const rect = (
        x: number,
        y: number,
        w: number,
        h: number,
        c: number | string,
      ) =>
        frame.rect(
          Math.trunc(x),
          Math.trunc(y),
          w,
          h,
          typeof c === 'number' ? tronColor(c) : c,
        ),
      pixel = (x: number, y: number, c: number) => rect(x, y, 1, 1, c),
      line = (x: number, y: number, xx: number, yy: number, c: number) =>
        gfxLine(frame, x, y, xx, yy, tronColor(c)),
      outline = (x: number, y: number, w: number, h: number, c: number) => {
        line(x, y, x + w - 1, y, c);
        line(x, y + h - 1, x + w - 1, y + h - 1, c);
        line(x, y, x, y + h - 1, c);
        line(x + w - 1, y, x + w - 1, y + h - 1, c);
      };
    const age = this.now - this.phaseStart;
    rect(0, 1, 128, 1, 0x2204);
    rect(0, 61, 128, 1, 0x2204);
    for (let x = 6; x < 128; x += 8) {
      pixel(x, 8, 0x1082);
      pixel(x, 52, 0x1082);
    }
    for (const x of lanes) for (let y = 12; y < 50; y += 6) pixel(x, y, 0x1082);
    for (let i = 0; i < 4; i++) {
      const changing = i === this.activeDigit,
        value =
          changing && this.phase === 'build' ? this.target[i] : this.shown[i];
      for (let r = 0; r < 7; r++)
        for (let c = 0; c < 5; c++) {
          if (!(glyph[value][r] & (16 >> c))) continue;
          if (changing && this.phase === 'blast') {
            const s = age / 650;
            if (age < 480)
              rect(
                xs[i] + c * 4 + Math.trunc((c - 2) * s * 13),
                16 + r * 4 + Math.trunc(-18 * s + 42 * s * s + (r - 3) * s * 5),
                2,
                2,
                o.color,
              );
            continue;
          }
          if (changing && this.phase === 'build' && age < (6 - r) * 95 + c * 18)
            continue;
          rect(xs[i] + c * 4, 16 + r * 4, 3, 3, o.color);
          pixel(xs[i] + c * 4 + 2, 16 + r * 4 + 2, 0x4208);
        }
    }
    if (!o.blink || date.getMilliseconds() < 500) {
      rect(63, 25, 2, 2, o.color);
      rect(63, 37, 2, 2, o.color);
    }
    for (const n of this.crates)
      if (n >= 0) {
        const x = nx(n) - 3,
          y = ny(n) - 3;
        rect(x, y, 7, 7, 0xa285);
        outline(x, y, 7, 7, 0xfccc);
        line(x + 1, y + 1, x + 5, y + 5, 0xfccc);
      }
    if (this.bonus >= 0 && this.phase !== 'blast') {
      const x = nx(this.bonus),
        y = ny(this.bonus);
      outline(
        x - 2,
        y - 2,
        5,
        5,
        Math.floor(this.now / 180) % 2 ? 0xffe0 : 0x07ff,
      );
      pixel(x, y, 0xffff);
    }
    if (this.phase === 'fuse') {
      const x = nx(this.bombNode),
        y = ny(this.bombNode);
      rect(x - 1, y - 2, 3, 5, 0x528a);
      rect(x - 2, y - 1, 5, 3, 0x528a);
      pixel(x - 1, y - 1, 0xffff);
      pixel(x + 1, y - 3, Math.floor(this.now / 70) % 2 ? 0xffe0 : 0xfc40);
    }
    if (this.phase === 'blast')
      for (let d = 0; d < 4; d++) {
        const reach =
          age < 110
            ? Math.trunc((this.flames.lengths[d] * age) / 110)
            : this.flames.lengths[d];
        for (let s = 0; s <= reach; s++) {
          const x = nx(this.bombNode) + dx[d] * s,
            y = ny(this.bombNode) + dy[d] * s;
          rect(
            x - 1,
            y - 1,
            3,
            3,
            Math.floor(this.now / 70) % 2 ? 0xfc40 : 0xfbe0,
          );
          pixel(x, y, 0xffe0);
        }
      }
    const x = Math.trunc(this.heroX),
      y = Math.trunc(this.heroY),
      step =
        this.routeIndex < this.route.length
          ? Math.floor(this.now / 100) % 2
          : 0;
    pixel(x, y - 4, 0xf81f);
    rect(x - 2, y - 3, 5, 3, 0xffff);
    if (this.facing !== 3) {
      rect(x - 1, y - 2, 3, 2, 0xfe75);
      if (this.facing === 0) pixel(x + 1, y - 1, 0);
      else if (this.facing === 2) pixel(x - 1, y - 1, 0);
      else {
        pixel(x - 1, y - 1, 0);
        pixel(x + 1, y - 1, 0);
      }
    }
    rect(x - 1, y, 3, 2, 0x329f);
    pixel(x - 2, y + step, 0xf81f);
    pixel(x + 2, y + 1 - step, 0xf81f);
    rect(x - 1, y + 2, 1, 1 + step, 0xf81f);
    rect(x + 1, y + 2, 1, 2 - step, 0xf81f);
    if (!o.hour24) drawGfxText(frame, pm ? 'PM' : 'AM', 108, 3, 1, '#ffffff');
  }
}
