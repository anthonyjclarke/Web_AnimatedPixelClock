import { createMarioEncounters } from './mario-encounters.ts';
import {
  normalizeMario,
  normalizePacman,
  type MarioSettings,
  type PacmanSettings,
} from './character-settings.ts';
import { createPainter as characterPainter } from './drawing.ts';
import { FixedStepClock } from './frame-time.ts';
// Ports of AnimatedPixelClock Mario/Pac-Man defaults (MIT).
// Classic 5x7 GFX font is public domain (Adafruit glcdfont.c).
export const gfxFont: Record<string, number[]> = {
  '0': [62, 81, 73, 69, 62],
  '1': [0, 66, 127, 64, 0],
  '2': [114, 73, 73, 73, 70],
  '3': [33, 65, 73, 77, 51],
  '4': [24, 20, 18, 127, 16],
  '5': [39, 69, 69, 69, 57],
  '6': [60, 74, 73, 73, 49],
  '7': [65, 33, 17, 9, 7],
  '8': [54, 73, 73, 73, 54],
  '9': [70, 73, 73, 41, 30],
  ':': [0, 0, 20, 0, 0],
  x: [68, 40, 16, 40, 68],
  '/': [32, 16, 8, 4, 2],
};
export const eatingPaths: number[][][] = [
  [
    [1, 6],
    [2, 6],
    [3, 6],
    [4, 5],
    [4, 4],
    [4, 3],
    [4, 2],
    [4, 1],
    [3, 0],
    [2, 0],
    [1, 0],
    [0, 1],
    [0, 2],
    [0, 3],
    [0, 4],
    [0, 5],
  ],
  [
    [1, 6],
    [2, 6],
    [3, 6],
    [2, 5],
    [2, 4],
    [2, 3],
    [2, 2],
    [1, 1],
    [2, 1],
    [2, 0],
  ],
  [
    [0, 6],
    [1, 6],
    [2, 6],
    [3, 6],
    [4, 6],
    [1, 5],
    [2, 4],
    [3, 3],
    [4, 2],
    [4, 1],
    [3, 0],
    [2, 0],
    [1, 0],
    [0, 1],
  ],
  [
    [1, 6],
    [2, 6],
    [3, 6],
    [4, 5],
    [4, 4],
    [3, 3],
    [2, 3],
    [4, 2],
    [4, 1],
    [3, 0],
    [2, 0],
    [1, 0],
    [0, 1],
    [0, 5],
  ],
  [
    [3, 6],
    [3, 5],
    [3, 4],
    [3, 3],
    [3, 2],
    [3, 1],
    [3, 0],
    [2, 1],
    [1, 2],
    [0, 3],
    [0, 4],
    [1, 4],
    [2, 4],
    [4, 4],
  ],
  [
    [0, 5],
    [1, 6],
    [2, 6],
    [3, 6],
    [4, 5],
    [4, 4],
    [4, 3],
    [3, 2],
    [2, 2],
    [1, 2],
    [0, 2],
    [0, 1],
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],
  ],
  [
    [1, 6],
    [2, 6],
    [3, 6],
    [4, 5],
    [4, 4],
    [3, 3],
    [2, 3],
    [0, 3],
    [0, 4],
    [0, 5],
    [0, 2],
    [1, 1],
    [2, 0],
    [3, 0],
  ],
  [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],
    [4, 1],
    [3, 2],
    [2, 3],
    [1, 4],
    [1, 5],
    [1, 6],
  ],
  [
    [1, 6],
    [2, 6],
    [3, 6],
    [4, 5],
    [4, 4],
    [3, 3],
    [2, 3],
    [1, 3],
    [0, 4],
    [0, 5],
    [0, 2],
    [0, 1],
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 1],
    [4, 2],
  ],
  [
    [1, 6],
    [2, 6],
    [3, 5],
    [4, 4],
    [4, 3],
    [3, 3],
    [2, 3],
    [1, 3],
    [0, 2],
    [0, 1],
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 1],
    [4, 2],
  ],
];
export const marioX = [19, 37, 55, 73, 91],
  pacmanX = [1, 30, 56, 74, 103];
type Target = { index: number; value: string };
class DigitTransition {
  displayed = '';
  queue: Target[] = [];
  offsets = [0, 0, 0, 0, 0];
  velocities = [0, 0, 0, 0, 0];
  triggered = -1;
  targetMinute = -1;
  lastMinute = -1;
  sync(
    live: string,
    next: string,
    minute: number,
    seconds: number,
    busy: boolean,
    replay = false,
  ) {
    // Timezone/format changes reset the enclosing clock. A wall-clock jump must
    // also discard a stale transition rather than animate an obsolete minute.
    if (
      this.lastMinute >= 0 &&
      (minute < this.lastMinute || minute > this.lastMinute + 1)
    ) {
      this.queue = [];
      this.displayed = live;
      this.targetMinute = minute;
      this.triggered = -1;
    }
    this.lastMinute = minute;
    if (!this.displayed) this.displayed = live;
    if (replay) {
      this.queue = [0, 1, 3, 4].map((index) => ({ index, value: live[index] }));
      this.targetMinute = minute;
      return true;
    }
    if (!busy && seconds >= 56 && this.triggered !== minute) {
      this.triggered = minute;
      this.targetMinute = minute + 1;
      this.queue = [0, 1, 3, 4]
        .filter((i) => this.displayed[i] !== next[i])
        .map((index) => ({ index, value: next[index] }));
      return this.queue.length > 0;
    }
    if (!busy && minute >= this.targetMinute) this.displayed = live;
    return false;
  }
  bounceHeight = 35;
  bounceSpeed = 6;
  bounceEnabled = true;
  triggerBounce(index: number) {
    if (this.bounceEnabled) this.velocities[index] = -this.bounceHeight / 10;
  }
  replace() {
    const target = this.queue[0];
    if (!target) return;
    this.displayed =
      this.displayed.slice(0, target.index) +
      target.value +
      this.displayed.slice(target.index + 1);
    this.triggerBounce(target.index);
  }
  bounce() {
    for (let i = 0; i < 5; i++)
      if (this.offsets[i] || this.velocities[i]) {
        this.velocities[i] += (this.bounceSpeed / 10) * 0.32;
        this.offsets[i] += this.velocities[i] * 0.32;
        if (this.offsets[i] >= 0) {
          this.offsets[i] = 0;
          this.velocities[i] = 0;
        }
      }
  }
}
export class MarioClock extends DigitTransition {
  phase: string = 'idle';
  settings = normalizeMario(null);
  elapsed = 0;
  seconds = 0;
  minute = -1;
  encounters: ReturnType<typeof createMarioEncounters>;
  constructor(random: () => number = Math.random) {
    super();
    this.encounters = createMarioEncounters(this, random);
  }
  configure(value: unknown) {
    const next = normalizeMario(value);
    if (
      this.settings.marioIdleEncounters &&
      !next.marioIdleEncounters &&
      this.phase.startsWith('encounter')
    )
      this.encounters.abort();
    if (next.marioEncounterFreq !== this.settings.marioEncounterFreq) {
      this.settings = next;
      this.encounters.reschedule();
    }
    this.settings = next;
    this.bounceHeight = next.marioBounceHeight;
    this.bounceSpeed = next.marioBounceSpeed;
    this.frame %= next.marioSmoothAnimation ? 4 : 2;
  }
  x = -15;
  jump = 0;
  velocity = 0;
  hit = false;
  facingRight = true;
  frame = 0;
  ticks = 0;
  updateTime(
    live: string,
    next: string,
    minute: number,
    seconds: number,
    replay = false,
  ) {
    this.seconds = seconds;
    this.minute = minute;
    if ((seconds >= 56 || replay) && this.phase.startsWith('encounter'))
      this.encounters.abort();
    if (this.sync(live, next, minute, seconds, this.phase !== 'idle', replay)) {
      this.phase = 'walking';
      this.x = -15;
      this.jump = 0;
      this.facingRight = true;
    }
  }
  tick() {
    this.bounce();
    this.elapsed += 16;
    if (this.phase.startsWith('encounter')) {
      this.encounters.step(this.elapsed, this.seconds, false);
      return;
    }
    const scale = Math.fround(16 / 35),
      speed = Math.fround((this.settings.marioWalkSpeed / 10) * scale);
    if (this.phase === 'idle') {
      this.x = -15;
      this.frame = 0;
      this.encounters.step(
        this.elapsed,
        this.seconds,
        this.settings.marioIdleEncounters && this.triggered !== this.minute,
      );
      return;
    }
    if (this.phase === 'walking') {
      const target = this.queue[0];
      if (!target) {
        this.phase = 'leaving';
        return;
      }
      const x = marioX[target.index] + 7;
      if (Math.abs(this.x - x) > 3) {
        this.facingRight = x > this.x;
        this.x = Math.fround(this.x + Math.sign(x - this.x) * speed);
        if (++this.ticks % 2 === 0)
          this.frame =
            (this.frame + 1) % (this.settings.marioSmoothAnimation ? 4 : 2);
      } else {
        this.x = x;
        this.phase = 'jumping';
        this.velocity = Math.fround(-4.5 * scale);
        this.jump = 0;
        this.hit = false;
      }
    } else if (this.phase === 'jumping') {
      this.velocity = Math.fround(this.velocity + 0.6 * scale * scale);
      this.jump = Math.fround(this.jump + this.velocity);
      if (!this.hit && 62 + Math.trunc(this.jump) - 10 <= 47) {
        this.hit = true;
        this.replace();
        this.velocity = Math.fround(2 * scale);
      }
      if (this.jump >= 0) {
        this.jump = 0;
        this.velocity = 0;
        this.queue.shift();
        this.phase = this.queue.length ? 'walking' : 'leaving';
        this.facingRight = true;
      }
    } else {
      this.x = Math.fround(this.x + speed);
      if (++this.ticks % 2 === 0)
        this.frame =
          (this.frame + 1) % (this.settings.marioSmoothAnimation ? 4 : 2);
      if (this.x > 143) {
        this.phase = 'idle';
        this.x = -15;
      }
    }
  }
}
export class PacmanClock extends DigitTransition {
  phase: 'patrol' | 'targeting' | 'eating' | 'returning' = 'patrol';
  x = 30;
  y = 56;
  direction = 1;
  mouth = 0;
  mouthTimer = 0;
  pathStep = 0;
  eaten = new Set<number>();
  pellets: { x: number; active: boolean }[] = [];
  // Optional web-only scene; no RNG is consumed when disabled.
  chase: {direction:number;ghosts:number[];speed:number;frame:number} | null = null;
  chaseWait = 0;
  endChase() {
    if(this.chase){this.x=Math.max(10,Math.min(118,this.x));this.y=56;this.direction=this.x>=118?-1:1;this.chase=null;}
  }
  tickChase() {
    if(!this.settings.pacmanGhostChase||this.phase!=='patrol')return false;
    if(!this.chase){
      if(this.chaseWait<=0){this.chaseWait=10000+Math.floor(this.random()*14000);return false;}
      this.chaseWait-=16;if(this.chaseWait>0)return false;
      const direction=this.random()<.5?1:-1;
      const ghosts=[0,1,2,3];for(let i=3;i>0;i--){const j=Math.floor(this.random()*(i+1));[ghosts[i],ghosts[j]]=[ghosts[j],ghosts[i]];}
      this.chase={direction,ghosts,speed:Math.max(.9,this.settings.pacmanSpeed/18.75*1.5),frame:0};
      this.x=direction===1?-8:136;this.y=56;this.direction=direction;
    }
    const chase=this.chase;this.x+=chase.direction*chase.speed;chase.frame++;
    // Let the entire pursuing group leave the panel before returning to patrol.
    const last=this.x-chase.direction*56;
    if(chase.direction===1?last>136:last< -8){this.endChase();this.chaseWait=10000+Math.floor(this.random()*14000);}
    return true;
  }
  settings = normalizePacman(null);
  configure(value: unknown, mario?: MarioSettings) {
    const next = normalizePacman(value);
    const regenerate =
      next.pacmanPelletCount !== this.settings.pacmanPelletCount ||
      next.pacmanPelletRandomSpacing !==
        this.settings.pacmanPelletRandomSpacing;
    if(!next.pacmanGhostChase){this.endChase();this.chaseWait=0;}
    this.settings = next;
    this.bounceEnabled = next.pacmanBounceEnabled;
    this.bounceHeight = mario?.marioBounceHeight ?? 35;
    this.bounceSpeed = mario?.marioBounceSpeed ?? 6;
    if (!this.bounceEnabled) {
      this.offsets.fill(0);
      this.velocities.fill(0);
    }
    if (regenerate) this.generatePellets();
  }
  random: () => number;
  constructor(random: () => number = Math.random) {
    super();
    this.random = random;
    this.generatePellets();
  }
  generatePellets() {
    this.pellets = [];
    for (let i = 0; i < this.settings.pacmanPelletCount; i++) {
      if (!this.settings.pacmanPelletRandomSpacing) {
        this.pellets.push({
          x:
            15 +
            Math.trunc(98 / (this.settings.pacmanPelletCount + 1)) * (i + 1),
          active: true,
        });
        continue;
      }
      let x = 0;
      for (let attempt = 0; attempt < 10; attempt++) {
        x = 15 + Math.floor(this.random() * 98);
        if (this.pellets.every((p) => Math.abs(p.x - x) >= 8)) break;
      }
      this.pellets.push({ x, active: true });
    }
  }
  updateTime(
    live: string,
    next: string,
    minute: number,
    seconds: number,
    replay = false,
  ) {
    if(replay||seconds>=56)this.endChase();
    if (
      this.sync(live, next, minute, seconds, this.phase !== 'patrol', replay)
    ) {
      this.phase = 'targeting';
      this.eaten.clear();
    }
  }
  face(dx: number, dy: number) {
    const ax = Math.abs(dx),
      ay = Math.abs(dy);
    if (Math.max(ax, ay) < 0.1) return;
    if (Math.min(ax, ay) / Math.max(ax, ay) > 0.6)
      this.direction = dx > 0 ? (dy > 0 ? 3 : -4) : dy > 0 ? 4 : -3;
    else this.direction = ax > ay ? (dx > 0 ? 1 : -1) : dy > 0 ? 2 : -2;
  }
  tick() {
    this.bounce();
    this.mouthTimer += 16;
    if (this.mouthTimer >= this.settings.pacmanMouthSpeed * 10) {
      this.mouthTimer = 0;
      this.mouth = (this.mouth + 1) % 4;
    }
    const speed = Math.fround(this.settings.pacmanEatingSpeed / 18.75),
      target = this.queue[0];
    if (this.phase === 'patrol' && this.tickChase()) {
      // The optional chase owns movement for this tick.
    } else if (this.phase === 'patrol') {
      this.x = Math.fround(
        this.x +
          Math.fround(this.settings.pacmanSpeed / 18.75) * this.direction,
      );
      if (this.x <= 10) {
        this.x = 10;
        this.direction = 1;
      } else if (this.x >= 118) {
        this.x = 118;
        this.direction = -1;
      }
    } else if (!target) {
      this.phase = 'patrol';
      this.y = 56;
      this.direction = 1;
      this.eaten.clear();
    } else if (this.phase === 'returning') {
      this.direction = 2;
      const dy = 56 - this.y;
      if (Math.abs(dy) <= speed * 1.5) {
        this.y = 56;
        this.replace();
        this.queue.shift();
        this.eaten.clear();
        this.phase = this.queue.length ? 'targeting' : 'patrol';
        if (this.phase === 'patrol')
          this.direction = this.random() < 0.5 ? 1 : -1;
        else {
          const next = this.queue[0];
          const start = eatingPaths[Number(this.displayed[next.index])][0];
          this.direction = pacmanX[next.index] + start[0] * 5 > this.x ? 1 : -1;
        }
      } else this.y = Math.fround(this.y + Math.sign(dy) * speed);
    } else {
      const path = eatingPaths[Number(this.displayed[target.index])];
      const [col, row] = path[this.phase === 'targeting' ? 0 : this.pathStep];
      const tx = pacmanX[target.index] + col * 5,
        ty = 16 + row * 5,
        dx = tx - this.x,
        dy = ty - this.y;
      if (this.phase === 'targeting') {
        if (Math.abs(dx) > speed) {
          this.x = Math.fround(this.x + Math.sign(dx) * speed);
          this.direction = dx > 0 ? 1 : -1;
        } else if (Math.abs(dy) > speed) {
          this.x = tx;
          this.y = Math.fround(this.y + Math.sign(dy) * speed);
          this.direction = dy > 0 ? 2 : -2;
        } else {
          this.x = tx;
          this.y = ty;
          this.phase = 'eating';
          this.pathStep = 0;
          this.eaten.clear();
          this.eaten.add(row * 5 + col);
          this.face(path[1][0] - col, path[1][1] - row);
        }
      } else {
        const dist = Math.fround(
          Math.sqrt(Math.fround(Math.fround(dx * dx) + Math.fround(dy * dy))),
        );
        this.face(dx, dy);
        if (dist <= speed) {
          this.x = tx;
          this.y = ty;
          if (++this.pathStep >= path.length) {
            this.phase = 'returning';
            return;
          }
        } else {
          this.x = Math.fround(
            this.x + Math.fround(Math.fround(dx / dist) * speed),
          );
          this.y = Math.fround(
            this.y + Math.fround(Math.fround(dy / dist) * speed),
          );
        }
        for (let r = 0; r < 7; r++)
          for (let c = 0; c < 5; c++)
            if (
              Math.hypot(
                pacmanX[target.index] + c * 5 - this.x,
                16 + r * 5 - this.y,
              ) <= 7
            )
              this.eaten.add(r * 5 + c);
      }
    }
    for (const p of this.pellets)
      if (Math.abs(Math.trunc(this.x) - p.x) < 5) p.active = false;
    if (this.pellets.length && this.pellets.every((p) => !p.active))
      this.generatePellets();
  }
}
type Paint = (
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
) => void;
type CharacterState = {
  clock: MarioClock | PacmanClock;
  last: number;
  timing: FixedStepClock;
  key: string;
};
const states = new WeakMap<object, CharacterState>();
const replays = new WeakSet<object>();
export function resetCharacters(canvas: object, replay = false) {
  states.delete(canvas);
  if (replay) replays.add(canvas);
  else replays.delete(canvas);
}
export function drawCharacterClock(
  canvas: object,
  style: string,
  t: number,
  live: string,
  next: string,
  date: Date,
  options: {
    zone: string;
    hour24: boolean;
    motion: boolean;
    color: string;
    date: boolean;
    blink: boolean;
    mario?: MarioSettings;
    pacman?: PacmanSettings;
  },
  glyphs: number[][],
  paint: Paint,
) {
  const key = style + options.zone + options.hour24;
  let state = states.get(canvas);
  if (!state || state.key !== key || t < state.last) {
    state = {
      clock: style === 'Mario' ? new MarioClock() : new PacmanClock(),
      last: t,
      timing: new FixedStepClock(),
      key,
    };
    states.set(canvas, state);
  }
  const clock = state.clock;
  if (clock instanceof MarioClock) clock.configure(options.mario);
  else clock.configure(options.pacman, options.mario);
  const replay = replays.delete(canvas);
  if (options.motion || !clock.displayed || replay)
    clock.updateTime(
      live,
      next,
      Math.floor(date.getTime() / 60000),
      date.getSeconds(),
      replay,
    );
  state.last = t;
  state.timing.advance(t, options.motion, () => clock.tick());
  const { circle } = characterPainter(paint);
  const gfx = (
    str: string,
    x: number,
    y: number,
    size: number,
    col: string,
  ) => {
    str.split('').forEach((ch, i) => {
      gfxFont[ch]?.forEach((bits, c) => {
        for (let r = 0; r < 8; r++)
          if (bits & (1 << r))
            paint(x + i * 6 * size + c * size, y + r * size, size, size, col);
      });
    });
  };
  if (options.date) {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: options.zone === 'local' ? undefined : options.zone,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
    gfx(parts, 34, 4, 1, '#ffffff');
  }
  const colon = !options.blink || date.getMilliseconds() < 500;
  if (clock instanceof MarioClock) {
    clock.displayed.split('').forEach((ch, i) => {
      if (i !== 2 || colon)
        gfx(ch, marioX[i], 26 + Math.trunc(clock.offsets[i]), 3, options.color);
    });
    if (clock.settings.marioIdleEncounters) {
      paint(1, 5, 4, 4, '#ffff00');
      paint(2, 4, 2, 6, '#ffff00');
      paint(2, 6, 2, 2, '#000000');
      gfx(
        'x' + String(clock.encounters.count).padStart(2, '0'),
        6,
        4,
        1,
        '#ffffff',
      );
    }
    if (clock.encounters.big) clock.encounters.drawBig(paint);
    else drawMarioSprite(clock, paint);
    clock.encounters.draw(paint);
  } else {
    drawPacmanDigits(clock, colon, options.color, glyphs, paint);
    for (const p of clock.pellets) if (p.active) circle(p.x, 56, 1, '#ffff00');
    drawPacmanSprite(clock, paint);
    drawPacmanGhosts(clock, paint);
  }
}

export function drawMarioSprite(
  clock: Pick<MarioClock, 'x' | 'jump' | 'phase' | 'facingRight' | 'frame'> & {
    settings?: MarioSettings;
  },
  paint: Paint,
) {
  const { pixel } = characterPainter(paint);
  if (clock.x >= -10 && clock.x <= 138) {
    const sx = Math.trunc(clock.x) - 4,
      sy = 62 + Math.trunc(clock.jump) - 10;
    const hat = '#ff0000',
      overalls = '#0000ff',
      skin = '#ffb6c5',
      shoes = '#a42829';
    paint(sx + 2, sy, 4, 3, hat);
    paint(sx + 2, sy + 3, 4, 3, overalls);
    if (clock.phase === 'jumping' || clock.phase === 'encounterJumping') {
      pixel(sx + 1, sy + 2, skin);
      pixel(sx + 6, sy + 2, skin);
      pixel(sx, sy + 1, skin);
      pixel(sx + 7, sy + 1, skin);
      paint(sx + 2, sy + 6, 2, 3, shoes);
      paint(sx + 4, sy + 6, 2, 3, shoes);
    } else {
      pixel(sx + (clock.facingRight ? 6 : 1), sy + 1, hat);
      pixel(
        sx + (clock.facingRight ? 1 : 6),
        sy + 4 - (clock.settings?.marioSmoothAnimation ? clock.frame % 2 : 0),
        skin,
      );
      pixel(sx + (clock.facingRight ? 6 : 1), sy + 3 + (clock.frame % 2), skin);
      paint(
        sx +
          (clock.settings?.marioSmoothAnimation
            ? [2, 1, 1, 2][clock.frame % 4]
            : clock.frame === 0
              ? 2
              : 1),
        sy + 6,
        2,
        3,
        shoes,
      );
      paint(
        sx +
          (clock.settings?.marioSmoothAnimation
            ? [4, 4, 5, 5][clock.frame % 4]
            : clock.frame === 0
              ? 4
              : 5),
        sy + 6,
        2,
        3,
        shoes,
      );
    }
  }
}

export function drawPacmanSprite(
  clock: Pick<PacmanClock, 'x' | 'y' | 'direction' | 'mouth'>,
  paint: Paint,
) {
  const { pixel, circle, triangle } = characterPainter(paint);
  const black = '#030608';
  const x = Math.trunc(clock.x),
    y = Math.trunc(clock.y),
    d = clock.direction,
    m = clock.mouth + 2;
  circle(x, y, 4, '#ffff00');
  if (clock.mouth > 0) {
    const points: Record<number, number[][]> = {
      1: [
        [x + 1, y],
        [x + 5, y - m],
        [x + 5, y + m],
      ],
      '-1': [
        [x - 1, y],
        [x - 5, y - m],
        [x - 5, y + m],
      ],
      2: [
        [x, y + 1],
        [x - m, y + 5],
        [x + m, y + 5],
      ],
      '-2': [
        [x, y - 1],
        [x - m, y - 5],
        [x + m, y - 5],
      ],
      3: [
        [x, y],
        [x + 4, y + 4],
        [x + m, y + m],
      ],
      '-3': [
        [x, y],
        [x - 4, y - 4],
        [x - m, y - m],
      ],
      4: [
        [x, y],
        [x - 4, y + 4],
        [x - m, y + m],
      ],
      '-4': [
        [x, y],
        [x + 4, y - 4],
        [x + m, y - m],
      ],
    };
    const p = points[d];
    triangle(p[0], p[1], p[2], black);
  }
  const eyes: Record<number, number[]> = {
    1: [-1, -2],
    '-1': [1, -2],
    2: [0, -3],
    '-2': [0, 1],
    3: [-2, -2],
    '-3': [2, 2],
    4: [2, -2],
    '-4': [-2, 2],
  };
  pixel(x + eyes[d][0], y + eyes[d][1], black);
}

export function drawPacmanDigits(
  clock: PacmanClock,
  colon: boolean,
  color: string,
  glyphs: number[][],
  paint: Paint,
) {
  const { circle } = characterPainter(paint);
  clock.displayed.split('').forEach((ch, i) => {
    if (i === 2) {
      if (colon) {
        circle(62, 24, 1, color);
        circle(62, 34, 1, color);
      }
      return;
    }
    glyphs[Number(ch)].forEach((bits, r) => {
      for (let c = 0; c < 5; c++)
        if (bits & (1 << (4 - c))) {
          const masked =
            (clock.phase === 'eating' || clock.phase === 'returning') &&
            clock.queue[0]?.index === i &&
            clock.eaten.has(r * 5 + c);
          if (!masked)
            circle(
              pacmanX[i] + c * 5,
              16 + r * 5 + Math.trunc(clock.offsets[i]),
              1,
              color,
            );
        }
    });
  });
}

// Compact classic ghost silhouettes, directional eyes and alternating feet.
// Browser extension, not an ESP32 sprite or original maze AI implementation.
export function drawPacmanGhosts(clock: PacmanClock, paint: Paint) {
 const chase=clock.chase;if(!chase)return;
 const colors=['#ff0000','#ffb8ff','#00ffff','#ffb852'];
 const rows=['0011100','0111110','1111111','1111111','1111111','1111111',Math.floor(chase.frame/8)%2?'1010101':'1101011'];
 chase.ghosts.forEach((id,i)=>{const x=Math.trunc(clock.x-chase.direction*(14+i*14))-3,y=52;
 rows.forEach((row,yy)=>{for(let xx=0;xx<7;xx++)if(row[xx]==='1')paint(x+xx,y+yy,1,1,colors[id]);});
 for(const eye of [1,4]){paint(x+eye,y+2,2,2,'#ffffff');paint(x+eye+(chase.direction===1?1:0),y+3,1,1,'#0000ff');}
 });
}
