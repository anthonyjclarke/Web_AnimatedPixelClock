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
  private random: () => number;
  constructor(random: () => number = Math.random) {
    this.random = random;
  }
  private rand(n: number) {
    return Math.floor(this.random() * n);
  }
  drop(rot: number, col: number) {
    const shape = rotations[rot];
    if (col < 0 || col + shape.w > 32) return -100;
    let row = 5;
    for (const [x, y] of shape.cells) {
      const top = this.board.findIndex((r) => r[col + x] >= 0);
      row = Math.min(row, (top < 0 ? 5 : top) - 1 - y);
    }
    return row < 0 ? -100 : row;
  }
  spawn() {
    this.piece = this.rand(7);
    const [start, count] = ranges[this.piece];
    let best = -Infinity,
      ties = 0,
      chosen = -1;
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
          maxHeight = 0;
        for (let x = 0; x < 32; x++) {
          const top = board.findIndex((r) => r[x] >= 0);
          const h = top < 0 ? 0 : 5 - top;
          height += h;
          maxHeight = Math.max(maxHeight, h);
          if (top >= 0)
            for (let y = top + 1; y < 5; y++) if (board[y][x] < 0) holes++;
        }
        const score = lines * 1000 - height * 2 - holes * 16 - maxHeight * 4;
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
    if (this.phase === 'delay') {
      if (this.now >= this.timer) this.spawn();
    } else if (this.phase === 'clearing') {
      if (--this.flash <= 0) {
        this.board = this.board.filter((_, i) => !this.clearRows.includes(i));
        while (this.board.length < 5)
          this.board.unshift(Array<number>(32).fill(-1));
        this.clearRows = [];
        this.phase = 'delay';
        this.timer = this.now + 450;
      }
    } else {
      this.column +=
        Math.sign(this.destination - this.column) *
        Math.min(0.4, Math.abs(this.destination - this.column));
      this.y += 0.72;
      const landing = 44 + this.row * 4;
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
    for (let row = 6; row >= 0; row--)
      for (let col = 0; col < 5; col++)
        if (glyph[row] & (1 << (4 - col)))
          this.dots.push({
            x: digitX[active.index] + col * 3,
            y: 0,
            target: 22 + row * 3,
            delay: this.dots.length * 18,
          });
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
    if (!this.queue.length) return;
    this.frame++;
    let done = true;
    for (const d of this.dots) {
      if (this.frame < d.delay) {
        done = false;
        continue;
      }
      d.y = Math.min(d.target, d.y + 0.96);
      if (d.y < d.target) done = false;
    }
    if (done) {
      const active = this.queue.shift()!;
      this.velocities[active.index] = -3.5;
      this.displayed =
        this.displayed.slice(0, active.index) +
        active.value +
        this.displayed.slice(active.index + 1);
      this.startDigit(glyphs);
    }
  }
}
