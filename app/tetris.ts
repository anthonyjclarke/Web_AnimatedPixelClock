import { normalizeTetris, type TetrisSettings } from './tetris-settings.ts';
// Port of AnimatedPixelClock/src/clocks/clock_tetris.cpp (MIT).
// Firmware defaults: 16 ms ticks, normal well, falling dots, speed 12.
export const rotations = [
  {
    w: 4,
    h: 1,
    cells: [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
    ],
  },
  {
    w: 1,
    h: 4,
    cells: [
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
    ],
  },
  {
    w: 2,
    h: 2,
    cells: [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ],
  },
  {
    w: 3,
    h: 2,
    cells: [
      [0, 0],
      [1, 0],
      [2, 0],
      [1, 1],
    ],
  },
  {
    w: 2,
    h: 3,
    cells: [
      [1, 0],
      [0, 1],
      [1, 1],
      [1, 2],
    ],
  },
  {
    w: 3,
    h: 2,
    cells: [
      [1, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
  },
  {
    w: 2,
    h: 3,
    cells: [
      [0, 0],
      [0, 1],
      [1, 1],
      [0, 2],
    ],
  },
  {
    w: 3,
    h: 2,
    cells: [
      [1, 0],
      [2, 0],
      [0, 1],
      [1, 1],
    ],
  },
  {
    w: 2,
    h: 3,
    cells: [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 2],
    ],
  },
  {
    w: 3,
    h: 2,
    cells: [
      [0, 0],
      [1, 0],
      [1, 1],
      [2, 1],
    ],
  },
  {
    w: 2,
    h: 3,
    cells: [
      [1, 0],
      [0, 1],
      [1, 1],
      [0, 2],
    ],
  },
  {
    w: 3,
    h: 2,
    cells: [
      [0, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
  },
  {
    w: 2,
    h: 3,
    cells: [
      [0, 0],
      [1, 0],
      [0, 1],
      [0, 2],
    ],
  },
  {
    w: 3,
    h: 2,
    cells: [
      [0, 0],
      [1, 0],
      [2, 0],
      [2, 1],
    ],
  },
  {
    w: 2,
    h: 3,
    cells: [
      [1, 0],
      [1, 1],
      [0, 2],
      [1, 2],
    ],
  },
  {
    w: 3,
    h: 2,
    cells: [
      [2, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
  },
  {
    w: 2,
    h: 3,
    cells: [
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 2],
    ],
  },
  {
    w: 3,
    h: 2,
    cells: [
      [0, 0],
      [1, 0],
      [2, 0],
      [0, 1],
    ],
  },
  {
    w: 2,
    h: 3,
    cells: [
      [0, 0],
      [1, 0],
      [1, 1],
      [1, 2],
    ],
  },
];
const ranges = [
  [0, 2],
  [2, 1],
  [3, 4],
  [7, 2],
  [9, 2],
  [11, 4],
  [15, 4],
];
export const digitX = [19, 37, 55, 73, 91];
export const pieceColors = [
  '#00ffff',
  '#ffff00',
  '#840084',
  '#00ff00',
  '#ff0000',
  '#0000ff',
  '#ff8200',
];
type Dot = { x: number; y: number; target: number; delay: number };
export class Tetris {
  board = Array.from({ length: 5 }, () => Array<number>(32).fill(-1));
  phase: 'delay' | 'moving' | 'clearing' = 'delay';
  timer = 400;
  now = 0;
  flash = 0;
  clearRows: number[] = [];
  piece = 0;
  rotation = 0;
  drawRotation = 0;
  column = 0;
  destination = 0;
  row = 0;
  y = 0;
  spins = 0;
  spinTimer = 0;
  displayed = '';
  queue: { index: number; value: string }[] = [];
  dots: Dot[] = [];
  frame = 0;
  offsets = [0, 0, 0, 0, 0];
  velocities = [0, 0, 0, 0, 0];
  triggeredMinute = -1;
  targetMinute = -1;
  settings: TetrisSettings;
  slab = 0;
  slabOffset = -26;
  slabVelocity = 0;
  fragments: { x: number; y: number; vx: number; vy: number }[] = [];
  get rows() {
    return this.settings.tetrisSmallClock ? 13 : 5;
  }
  get wellTop() {
    return this.settings.tetrisSmallClock ? 12 : 44;
  }
  get gameOn() {
    return this.settings.tetrisIdleTumble || this.settings.tetrisSmallClock;
  }
  get dateShown() {
    return this.settings.tetrisShowDate && !this.gameOn;
  }
  get timeY() {
    return this.dateShown && this.settings.tetrisDatePosition === 0 ? 28 : 22;
  }
  configure(value: unknown) {
    const next = normalizeTetris(value),
      geometry = next.tetrisSmallClock !== this.settings.tetrisSmallClock;
    const rebuild =
      geometry ||
      next.tetrisAnimStyle !== this.settings.tetrisAnimStyle ||
      next.tetrisDatePosition !== this.settings.tetrisDatePosition ||
      next.tetrisShowDate !== this.settings.tetrisShowDate ||
      next.tetrisIdleTumble !== this.settings.tetrisIdleTumble ||
      next.tetrisDotOrder !== this.settings.tetrisDotOrder ||
      next.tetrisDotSpeed !== this.settings.tetrisDotSpeed;
    this.settings = next;
    if (geometry) {
      this.board = Array.from({ length: this.rows }, () =>
        Array<number>(32).fill(-1),
      );
      this.phase = 'delay';
      this.timer = this.now + 400;
      this.clearRows = [];
    }
    if (rebuild) {
      for (const active of this.queue)
        this.displayed =
          this.displayed.slice(0, active.index) +
          active.value +
          this.displayed.slice(active.index + 1);
      this.queue = [];
      this.dots = [];
      this.fragments = [];
    }
    if (rebuild || !next.tetrisDigitBounce) {
      this.offsets.fill(0);
      this.velocities.fill(0);
    }
  }
  private random: () => number;
  constructor(
    random: () => number = Math.random,
    settings?: Partial<TetrisSettings>,
  ) {
    this.random = random;
    this.settings = normalizeTetris(settings);
    this.board = Array.from({ length: this.rows }, () =>
      Array<number>(32).fill(-1),
    );
  }
  private rand(n: number) {
    return Math.floor(this.random() * n);
  }
  drop(rot: number, col: number) {
    const shape = rotations[rot];
    if (col < 0 || col + shape.w > 32) return -100;
    let row = this.rows;
    for (const [x, y] of shape.cells) {
      const top = this.board.findIndex((r) => r[col + x] >= 0);
      row = Math.min(row, (top < 0 ? this.rows : top) - 1 - y);
    }
    return row < 0 ? -100 : row;
  }
  spawn() {
    const smart = this.settings.tetrisSmoothGame,
      avoidHoles = smart && this.rand(100) >= 8;
    const countHoles = (board: number[][]) => {
      let n = 0;
      for (let x = 0; x < 32; x++) {
        const top = board.findIndex((r) => r[x] >= 0);
        if (top >= 0)
          for (let y = top + 1; y < board.length; y++) if (board[y][x] < 0) n++;
      }
      return n;
    };
    const currentHoles = countHoles(this.board);
    this.piece = this.rand(7);
    const [start, count] = ranges[this.piece];
    let best = -Infinity,
      ties = 0,
      chosen = -1;
    for (let pass = avoidHoles ? 0 : 1; pass < 2 && chosen < 0; pass++)
      for (let rot = start; rot < start + count; rot++)
        for (let col = 0; col + rotations[rot].w <= 32; col++) {
          const row = this.drop(rot, col);
          if (row < 0) continue;
          const board = this.board.map((r) => r.slice());
          for (const [x, y] of rotations[rot].cells)
            board[row + y][col + x] = this.piece;
          const lines = board.filter((r) => r.every((v) => v >= 0)).length;
          let height = 0,
            holes = 0,
            maxHeight = 0,
            bumps = 0,
            previous = -1;
          for (let x = 0; x < 32; x++) {
            const top = board.findIndex((r) => r[x] >= 0);
            const h = top < 0 ? 0 : this.rows - top;
            height += h;
            if (previous >= 0) bumps += Math.abs(h - previous);
            previous = h;
            maxHeight = Math.max(maxHeight, h);
            if (top >= 0)
              for (let y = top + 1; y < this.rows; y++)
                if (board[y][x] < 0) holes++;
          }
          if (pass === 0 && holes > currentHoles) continue;
          const depth =
            row + Math.max(...rotations[rot].cells.map((c) => c[1]));
          const score = smart
            ? lines * 1000 + depth * 24 - holes * 60 - maxHeight * 6 - bumps * 4
            : lines * 1000 - height * 2 - holes * 16 - maxHeight * 4;
          if (score > best) {
            best = score;
            ties = 1;
            chosen = rot;
            this.destination = col;
            this.row = row;
          } else if (score === best && this.rand(++ties) === 0) {
            chosen = rot;
            this.destination = col;
            this.row = row;
          }
        }
    if (chosen < 0) {
      this.board.forEach((r) => r.fill(-1));
      this.timer = this.now + 600;
      return;
    }
    this.rotation = chosen;
    this.drawRotation = start + this.rand(count);
    this.spins = 1 + this.rand(4);
    this.spinTimer = 0;
    this.column = (32 - rotations[chosen].w) / 2;
    this.y = -rotations[chosen].h * 4;
    this.phase = 'moving';
  }
  tick() {
    this.now += 16;
    if (!this.gameOn) return;
    if (this.phase === 'delay') {
      if (this.now >= this.timer) this.spawn();
    } else if (this.phase === 'clearing') {
      if (--this.flash <= 0) {
        this.board = this.board.filter((_, i) => !this.clearRows.includes(i));
        while (this.board.length < this.rows)
          this.board.unshift(Array<number>(32).fill(-1));
        this.clearRows = [];
        this.phase = 'delay';
        this.timer = this.now + 450;
      }
    } else {
      if (this.column < this.destination)
        this.column = Math.min(
          Math.fround(this.column + Math.fround(0.4)),
          this.destination,
        );
      else if (this.column > this.destination)
        this.column = Math.max(
          Math.fround(this.column - Math.fround(0.4)),
          this.destination,
        );
      this.y = Math.fround(
        this.y +
          Math.max(
            Math.fround(0.24),
            Math.fround(
              Math.fround(this.settings.tetrisFallSpeed / 10) *
                Math.fround(0.6),
            ),
          ),
      );
      const landing = this.wellTop + this.row * 4;
      if (this.spins > 0 && this.y < landing - 8) {
        if (++this.spinTimer >= 12) {
          this.spinTimer = 0;
          if (--this.spins <= 0) this.drawRotation = this.rotation;
          else {
            const [start, count] = ranges[this.piece];
            this.drawRotation =
              start + ((this.drawRotation - start + 1) % count);
          }
        }
      } else this.drawRotation = this.rotation;
      if (this.y >= landing) {
        this.y = landing;
        if (this.column === this.destination) {
          for (const [x, y] of rotations[this.rotation].cells)
            this.board[this.row + y][this.destination + x] = this.piece;
          this.clearRows = this.board.flatMap((r, i) =>
            r.every((v) => v >= 0) ? [i] : [],
          );
          this.phase = this.clearRows.length ? 'clearing' : 'delay';
          this.flash = 15;
          this.timer = this.now + 450;
        }
      }
    }
  }
  private startDigit(glyphs: number[][]) {
    this.frame = 0;
    this.dots = [];
    const active = this.queue[0];
    if (!active) return;
    const glyph = glyphs[Number(active.value)];
    if (this.settings.tetrisAnimStyle === 0) {
      this.slab = 0;
      this.slabOffset = -26;
      this.slabVelocity = 0;
      const old = glyphs[Number(this.displayed[active.index])];
      let spawned = 0;
      for (let row = 0; row < 7 && spawned < 8; row++)
        for (let col = 0; col < 5 && spawned < 8; col++)
          if (
            old?.[row] & (1 << (4 - col)) &&
            this.rand(100) < 40 &&
            this.fragments.length < 36
          ) {
            this.fragments.push({
              x: digitX[active.index] + col * 3,
              y: this.timeY + row * 3,
              vx: (this.rand(21) - 10) / 25,
              vy: -(this.rand(15) + 5) / 25,
            });
            spawned++;
          }
      return;
    }
    const gap = Math.max(
      10,
      Math.min(45, Math.trunc(225 / this.settings.tetrisDotSpeed)),
    );
    for (let row = 6; row >= 0; row--)
      for (let col = 0; col < 5; col++)
        if (glyph[row] & (1 << (4 - col)))
          this.dots.push({
            x: digitX[active.index] + col * 3,
            y:
              this.dateShown && this.settings.tetrisDatePosition === 0 ? 14 : 0,
            target: this.timeY + row * 3,
            delay: this.dots.length * gap,
          });
    if (this.settings.tetrisDotOrder === 1) {
      const order = this.dots.map((_, i) => i);
      for (let k = order.length - 1; k > 0; k--) {
        const j = this.rand(k + 1);
        [order[k], order[j]] = [order[j], order[k]];
      }
      order.forEach((index, k) => (this.dots[index].delay = k * gap));
    }
  }
  resyncTime(live: string, minute: number) {
    this.displayed = live;
    this.fragments = [];
    this.queue = [];
    this.dots = [];
    this.offsets.fill(0);
    this.velocities.fill(0);
    this.targetMinute = minute;
    this.triggeredMinute = -1;
  }
  sync(
    live: string,
    next: string,
    minute: number,
    seconds: number,
    glyphs: number[][],
    replay = false,
  ) {
    if (!this.displayed) this.displayed = live;
    if (this.settings.tetrisSmallClock) {
      this.displayed = live;
      return;
    }
    if (replay) {
      this.queue = [0, 1, 3, 4].map((index) => ({ index, value: live[index] }));
      this.targetMinute = minute;
      this.startDigit(glyphs);
      return;
    }
    if (
      seconds >= 56 &&
      this.triggeredMinute !== minute &&
      !this.queue.length
    ) {
      this.triggeredMinute = minute;
      this.targetMinute = minute + 1;
      this.queue = [0, 1, 3, 4]
        .filter((i) => this.displayed[i] !== next[i])
        .map((index) => ({ index, value: next[index] }));
      this.startDigit(glyphs);
    } else if (!this.queue.length && minute >= this.targetMinute)
      this.displayed = live;
  }
  tickDigits(glyphs: number[][]) {
    for (let i = 0; i < 5; i++) {
      if (this.offsets[i] !== 0 || this.velocities[i] !== 0) {
        this.velocities[i] += 0.6 * 0.32;
        this.offsets[i] += this.velocities[i] * 0.32;
        if (this.offsets[i] >= 0) {
          this.offsets[i] = 0;
          this.velocities[i] = 0;
        }
      }
    }
    for (const f of this.fragments) {
      f.vy += 0.048;
      f.x += f.vx;
      f.y += f.vy;
    }
    this.fragments = this.fragments.filter(
      (f) => f.y <= 68 && f.x >= -4 && f.x <= 132,
    );
    if (!this.queue.length) return;
    if (this.settings.tetrisAnimStyle === 0) {
      this.slabVelocity += Math.max(
        0.016,
        (this.settings.tetrisFallSpeed / 10) * 0.067,
      );
      this.slabOffset += this.slabVelocity;
      if (this.slabOffset >= 0) {
        if (++this.slab >= 3) this.finishDigit(glyphs);
        else {
          this.slabOffset = -26;
          this.slabVelocity = 0;
        }
      }
      return;
    }
    this.frame++;
    let done = true;
    for (const d of this.dots) {
      if (this.frame < d.delay) {
        done = false;
        continue;
      }
      d.y = Math.min(
        d.target,
        d.y + Math.max(0.24, (this.settings.tetrisDotSpeed / 10) * 0.8),
      );
      if (d.y < d.target) done = false;
    }
    if (done) this.finishDigit(glyphs);
  }
  private finishDigit(glyphs: number[][]) {
    const active = this.queue.shift()!;
    this.velocities[active.index] = this.settings.tetrisDigitBounce ? -3.5 : 0;
    this.displayed =
      this.displayed.slice(0, active.index) +
      active.value +
      this.displayed.slice(active.index + 1);
    this.startDigit(glyphs);
  }
}
