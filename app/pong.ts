// Numerical helpers ported from AnimatedPixelClock clock_pong.cpp (MIT).
// Regenerate with scripts/port-pong.py; wrapper templates are in scripts/.
import { classicDate, drawGfxText } from './classic-clocks';
import type { Framebuffer } from './framebuffer';
export const pongDefaults = {
  pongBallSpeed: 18,
  pongBounceStrength: 3,
  pongBounceDamping: 85,
  pongPaddleWidth: 20,
  pongHorizontalBounce: true,
  pongDigitShatter: true,
};
export type PongSettings = typeof pongDefaults;
export const pongRanges = {
  pongBallSpeed: [16, 30, 1],
  pongBounceStrength: [1, 8, 1],
  pongBounceDamping: [50, 95, 5],
  pongPaddleWidth: [10, 40, 2],
} as const;
export function normalizePong(value: unknown): PongSettings {
  const out = { ...pongDefaults },
    v =
      value && typeof value === 'object'
        ? (value as Record<string, unknown>)
        : {};
  for (const key of Object.keys(pongRanges) as (keyof typeof pongRanges)[]) {
    const n = v[key];
    if (typeof n === 'number' && Number.isFinite(n)) {
      const [lo, hi, step] = pongRanges[key];
      out[key] = Math.max(
        lo,
        Math.min(hi, lo + Math.round((n - lo) / step) * step),
      );
    }
  }
  for (const key of ['pongHorizontalBounce', 'pongDigitShatter'] as const)
    if (typeof v[key] === 'boolean') out[key] = v[key];
  return out;
}
type Fragment = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  active: boolean;
};
export function createPong(
  rng: () => number = Math.random,
  initial?: PongSettings,
) {
  let settings = normalizePong(initial),
    now = 0,
    displayed = '00:00',
    initialized = false,
    lastPhysicsUpdate = 0;
  const millis = () => now,
    random = (a: number, b: number) => a + Math.floor(rng() * (b - a)),
    tickSpeed = () => Math.trunc((settings.pongBallSpeed * 4 + 2) / 5);
  const MAX_PONG_FRAGMENTS = 40,
    MAX_PONG_BALLS = 2,
    PONG_BALL_SIZE = 2,
    PONG_TIME_Y = 16,
    PONG_PLAY_AREA_TOP = 10,
    BREAKOUT_PADDLE_Y = 60,
    BALL_SPAWN_DELAY = 500,
    PONG_FRAG_GRAVITY = 0.19,
    PONG_FRAG_SPEED = 1.2,
    BALL_HIT_THRESHOLD = 3,
    DIGIT_TRANSITION_TIMEOUT = 3000,
    DIGIT_ASSEMBLY_DURATION = 800,
    PADDLE_WRONG_DIRECTION_CHANCE = 0,
    PADDLE_STICK_MIN_DELAY = 0,
    PADDLE_STICK_MAX_DELAY = 300,
    PADDLE_MOMENTUM_MULTIPLIER = 2,
    BALL_RELEASE_RANDOM_VARIATION = 2,
    BALL_COLLISION_ANGLE_VARIATION = 3,
    SCREEN_WIDTH = 128,
    SCREEN_HEIGHT = 64,
    PI = Math.PI;
  const PONG_BALL_NORMAL = 0,
    PONG_BALL_SPAWNING = 1,
    DIGIT_NORMAL = 0,
    DIGIT_BREAKING = 1,
    DIGIT_ASSEMBLING = 2;
  const DIGIT_X = [19, 37, 55, 73, 91],
    FRAGMENT_SPAWN_PERCENT = [0.25, 0.5, 0.25];
  const pongDigitGlyph = [
    [14, 17, 17, 17, 17, 17, 14],
    [4, 12, 4, 4, 4, 4, 14],
    [14, 17, 1, 2, 4, 8, 31],
    [14, 17, 1, 6, 1, 17, 14],
    [2, 6, 10, 18, 31, 2, 2],
    [31, 16, 30, 1, 1, 17, 14],
    [6, 8, 16, 22, 17, 17, 14],
    [31, 1, 2, 4, 8, 8, 8],
    [14, 17, 17, 14, 17, 17, 14],
    [14, 17, 17, 15, 1, 2, 12],
  ];
  const pong_balls = Array.from({ length: 2 }, () => ({
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      state: 0,
      spawn_timer: 0,
      active: false,
      inside_digit: -1,
    })),
    pong_fragments: Fragment[] = Array.from({ length: 40 }, () => ({
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      active: false,
    })),
    fragment_targets = Array.from({ length: 40 }, () => ({
      target_digit: -1,
      target_x: 0,
      target_y: 0,
    })),
    digit_transitions = Array.from({ length: 5 }, () => ({
      state: 0,
      old_char: 48,
      new_char: 48,
      state_timer: 0,
      hit_count: 0,
      fragments_spawned: 0,
      assembly_progress: 0,
    })),
    breakout_paddle = {
      x: 64,
      target_x: 64,
      width: settings.pongPaddleWidth,
      speed: 3,
    };
  const digit_offset_x = Array(5).fill(0) as number[],
    digit_offset_y = Array(5).fill(0) as number[],
    digit_velocity_x = Array(5).fill(0) as number[],
    digit_velocity = Array(5).fill(0) as number[],
    ball_stuck_to_paddle = [false, false],
    ball_stick_release_time = [0, 0],
    ball_stuck_x_offset = [0, 0];
  let paddle_last_x = 64;

  function pongDigitPixelLit(c: number, dx: number, dy: number): boolean {
    if (c < 48 || c > 57) return false;
    let gx = Math.trunc(dx / 3);
    let gy = Math.trunc(dy / 3);
    if (gx > 4 || gy > 6) return false;
    return Boolean((pongDigitGlyph[c - 48][gy] >> (4 - gx)) & 0x01);
  }
  function findFreePongFragment(): Fragment | null {
    for (let i = Math.trunc(0); i < MAX_PONG_FRAGMENTS; i++) {
      if (!pong_fragments[i].active) {
        fragment_targets[i].target_digit = -1;
        return pong_fragments[i];
      }
    }
    return null;
  }
  function allPongFragmentsInactive(): boolean {
    for (let i = Math.trunc(0); i < MAX_PONG_FRAGMENTS; i++) {
      if (pong_fragments[i].active) return false;
    }
    return true;
  }
  function spawnPongBall(ballIndex: number): void {
    pong_balls[ballIndex].x = breakout_paddle.x * 16;
    pong_balls[ballIndex].y = (BREAKOUT_PADDLE_Y - 4) * 16;
    if (random(0, 2) == 0) {
      pong_balls[ballIndex].vx = tickSpeed();
    } else {
      pong_balls[ballIndex].vx = -tickSpeed();
    }
    pong_balls[ballIndex].vy = -tickSpeed();
    pong_balls[ballIndex].state = PONG_BALL_NORMAL;
    pong_balls[ballIndex].active = true;
    pong_balls[ballIndex].inside_digit = -1;
  }
  function updateBreakoutPaddle(): void {
    let closest_ball = Math.trunc(-1);
    let closest_dist = Math.trunc(999);
    for (let i = Math.trunc(0); i < MAX_PONG_BALLS; i++) {
      if (pong_balls[i].active) {
        let ball_x = Math.trunc(pong_balls[i].x / 16);
        let dist = Math.trunc(Math.abs(ball_x - breakout_paddle.x));
        if (dist < closest_dist) {
          closest_dist = dist;
          closest_ball = i;
        }
      }
    }
    if (closest_ball >= 0) {
      let ball_x = Math.trunc(pong_balls[closest_ball].x / 16);
      breakout_paddle.target_x = ball_x;
    }
    let dx = Math.trunc(breakout_paddle.target_x - breakout_paddle.x);
    let move_speed = Math.trunc(breakout_paddle.speed);
    if (Math.abs(dx) > 20) {
      move_speed = 5;
    } else if (Math.abs(dx) > 10) {
      move_speed = 4;
    } else if (Math.abs(dx) > 3) {
      move_speed = 3;
    } else {
      move_speed = 2;
    }
    if (Math.abs(dx) > 1) {
      let move_wrong_way = random(0, 100) < PADDLE_WRONG_DIRECTION_CHANCE;
      if (move_wrong_way) {
        if (dx > 0) {
          breakout_paddle.x -= move_speed;
        } else {
          breakout_paddle.x += move_speed;
        }
      } else {
        if (dx > 0) {
          breakout_paddle.x += move_speed;
        } else {
          breakout_paddle.x -= move_speed;
        }
      }
    } else {
      breakout_paddle.x = breakout_paddle.target_x;
    }
    let paddle_half = Math.trunc(breakout_paddle.width / 2);
    if (breakout_paddle.x - paddle_half < 0) {
      breakout_paddle.x = paddle_half;
    }
    if (breakout_paddle.x + paddle_half > 127) {
      breakout_paddle.x = 127 - paddle_half;
    }
    paddle_last_x = breakout_paddle.x;
  }
  function updatePongFragments(): void {
    for (let i = Math.trunc(0); i < MAX_PONG_FRAGMENTS; i++) {
      if (!pong_fragments[i].active) continue;
      if (fragment_targets[i].target_digit >= 0) continue;
      pong_fragments[i].vy += PONG_FRAG_GRAVITY;
      pong_fragments[i].x += pong_fragments[i].vx;
      pong_fragments[i].y += pong_fragments[i].vy;
      if (
        pong_fragments[i].y > SCREEN_HEIGHT + 5 ||
        pong_fragments[i].x < -5 ||
        pong_fragments[i].x > SCREEN_WIDTH + 5
      ) {
        pong_fragments[i].active = false;
      }
    }
  }
  function spawnPongBallHitFragments(x: number, y: number): void {
    let frag_count = Math.trunc(2 + random(0, 3));
    for (let i = Math.trunc(0); i < frag_count; i++) {
      let f = findFreePongFragment();
      if (!f) break;
      f.x = x + random(-2, 3);
      f.y = y + random(-2, 3);
      let angle = (random(0, 360) * PI) / 180.0;
      let speed = PONG_FRAG_SPEED + random(-20, 20) / 100.0;
      f.vx = Math.cos(angle) * speed;
      f.vy = Math.sin(angle) * speed;
      f.active = true;
    }
  }
  function spawnProgressiveFragments(
    digitIndex: number,
    oldChar: number,
    hitNumber: number,
  ): void {
    let digit_x = Math.trunc(DIGIT_X[digitIndex]);
    let digit_y = Math.trunc(PONG_TIME_Y);
    let spawn_percent = FRAGMENT_SPAWN_PERCENT[hitNumber];
    let spawn_chance = Math.trunc(Math.trunc(spawn_percent * 8));
    for (let dy = Math.trunc(0); dy < 24; dy += 2) {
      for (let dx = Math.trunc(0); dx < 15; dx += 2) {
        let px = Math.trunc(digit_x + dx);
        let py = Math.trunc(digit_y + dy);
        let pixel_lit = pongDigitPixelLit(oldChar, dx, dy);
        if (pixel_lit && random(0, 8) < spawn_chance) {
          let f = findFreePongFragment();
          if (!f) break;
          f.x = px;
          f.y = py;
          let dx_center = px - (digit_x + 7);
          let dy_center = py - (digit_y + 12);
          let angle =
            Math.atan2(dy_center, dx_center) + random(-30, 30) / 100.0;
          let speed = PONG_FRAG_SPEED + random(-50, 50) / 100.0;
          f.vx = Math.cos(angle) * speed;
          f.vy = Math.sin(angle) * speed - 0.5;
          f.active = true;
        }
      }
    }
  }
  function spawnAssemblyFragments(digitIndex: number, newChar: number): void {
    let digit_x = Math.trunc(DIGIT_X[digitIndex]);
    let digit_y = Math.trunc(PONG_TIME_Y);
    for (let dy = Math.trunc(0); dy < 24; dy += 2) {
      for (let dx = Math.trunc(0); dx < 15; dx += 2) {
        let px = Math.trunc(digit_x + dx);
        let py = Math.trunc(digit_y + dy);
        let pixel_lit = pongDigitPixelLit(newChar, dx, dy);
        if (pixel_lit && random(0, 8) < 4) {
          let f = findFreePongFragment();
          if (!f) break;
          let start_side = Math.trunc(random(0, 4));
          switch (start_side) {
            case 0:
              f.x = random(0, 128);
              f.y = -5;
              break;
            case 1:
              f.x = 133;
              f.y = random(0, 64);
              break;
            case 2:
              f.x = random(0, 128);
              f.y = 69;
              break;
            case 3:
              f.x = -5;
              f.y = random(0, 64);
              break;
          }
          for (let i = Math.trunc(0); i < MAX_PONG_FRAGMENTS; i++) {
            if (pong_fragments[i] == f) {
              fragment_targets[i].target_digit = digitIndex;
              fragment_targets[i].target_x = px;
              fragment_targets[i].target_y = py;
              break;
            }
          }
          let dx_target = px - f.x;
          let dy_target = py - f.y;
          let dist = Math.sqrt(dx_target * dx_target + dy_target * dy_target);
          if (dist > 0) {
            f.vx = (dx_target / dist) * PONG_FRAG_SPEED * 2;
            f.vy = (dy_target / dist) * PONG_FRAG_SPEED * 2;
          }
          f.active = true;
        }
      }
    }
  }
  function updateAssemblyFragments(): void {
    for (let i = Math.trunc(0); i < MAX_PONG_FRAGMENTS; i++) {
      if (!pong_fragments[i].active) continue;
      if (fragment_targets[i].target_digit < 0) continue;
      let dx = fragment_targets[i].target_x - pong_fragments[i].x;
      let dy = fragment_targets[i].target_y - pong_fragments[i].y;
      let dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 2.0) {
        pong_fragments[i].x = fragment_targets[i].target_x;
        pong_fragments[i].y = fragment_targets[i].target_y;
        pong_fragments[i].vx = 0;
        pong_fragments[i].vy = 0;
      } else {
        let speed = PONG_FRAG_SPEED * 3;
        pong_fragments[i].vx = (dx / dist) * speed;
        pong_fragments[i].vy = (dy / dist) * speed;
        pong_fragments[i].x += pong_fragments[i].vx;
        pong_fragments[i].y += pong_fragments[i].vy;
      }
    }
  }
  function updatePongBall(ballIndex: number): void {
    if (pong_balls[ballIndex].state == PONG_BALL_SPAWNING) {
      if (millis() - pong_balls[ballIndex].spawn_timer >= BALL_SPAWN_DELAY) {
        pong_balls[ballIndex].state = PONG_BALL_NORMAL;
      }
      return;
    }
    if (ball_stuck_to_paddle[ballIndex]) {
      let ball_px = Math.trunc(
        breakout_paddle.x + ball_stuck_x_offset[ballIndex],
      );
      let ball_py = Math.trunc(BREAKOUT_PADDLE_Y - PONG_BALL_SIZE);
      pong_balls[ballIndex].x = ball_px * 16;
      pong_balls[ballIndex].y = ball_py * 16;
      if (millis() >= ball_stick_release_time[ballIndex]) {
        ball_stuck_to_paddle[ballIndex] = false;
        let paddle_velocity = Math.trunc(breakout_paddle.x - paddle_last_x);
        if (paddle_velocity > 0) {
          pong_balls[ballIndex].vx =
            tickSpeed() + paddle_velocity * PADDLE_MOMENTUM_MULTIPLIER;
        } else if (paddle_velocity < 0) {
          pong_balls[ballIndex].vx =
            -tickSpeed() + paddle_velocity * PADDLE_MOMENTUM_MULTIPLIER;
        } else {
          pong_balls[ballIndex].vx =
            random(0, 2) == 0 ? tickSpeed() : -tickSpeed();
        }
        pong_balls[ballIndex].vy = -tickSpeed();
        pong_balls[ballIndex].vx += random(
          -BALL_RELEASE_RANDOM_VARIATION,
          BALL_RELEASE_RANDOM_VARIATION + 1,
        );
        pong_balls[ballIndex].vy += random(
          -BALL_RELEASE_RANDOM_VARIATION,
          BALL_RELEASE_RANDOM_VARIATION + 1,
        );
      }
      return;
    }
    pong_balls[ballIndex].x += pong_balls[ballIndex].vx;
    pong_balls[ballIndex].y += pong_balls[ballIndex].vy;
    let ball_px = Math.trunc(pong_balls[ballIndex].x / 16);
    let ball_py = Math.trunc(pong_balls[ballIndex].y / 16);
    if (ball_py <= PONG_PLAY_AREA_TOP && pong_balls[ballIndex].vy < 0) {
      ball_py = PONG_PLAY_AREA_TOP;
      pong_balls[ballIndex].y = ball_py * 16;
      pong_balls[ballIndex].vy = Math.abs(pong_balls[ballIndex].vy);
    }
    if (ball_py + PONG_BALL_SIZE >= BREAKOUT_PADDLE_Y) {
      let paddle_left = Math.trunc(
        breakout_paddle.x - breakout_paddle.width / 2,
      );
      let paddle_right = Math.trunc(
        breakout_paddle.x + breakout_paddle.width / 2,
      );
      if (ball_px + PONG_BALL_SIZE >= paddle_left && ball_px <= paddle_right) {
        ball_py = BREAKOUT_PADDLE_Y - PONG_BALL_SIZE;
        pong_balls[ballIndex].y = ball_py * 16;
        ball_stuck_to_paddle[ballIndex] = true;
        let stick_delay = Math.trunc(
          random(PADDLE_STICK_MIN_DELAY, PADDLE_STICK_MAX_DELAY + 1),
        );
        ball_stick_release_time[ballIndex] = millis() + stick_delay;
        ball_stuck_x_offset[ballIndex] = ball_px - breakout_paddle.x;
      } else {
        if (ballIndex == 0) {
          spawnPongBall(ballIndex);
        } else {
          pong_balls[ballIndex].active = false;
        }
        return;
      }
    }
    if (ball_px < 0 && pong_balls[ballIndex].vx < 0) {
      ball_px = 0;
      pong_balls[ballIndex].x = ball_px * 16;
      pong_balls[ballIndex].vx = Math.abs(pong_balls[ballIndex].vx);
    }
    if (
      ball_px + PONG_BALL_SIZE > SCREEN_WIDTH &&
      pong_balls[ballIndex].vx > 0
    ) {
      ball_px = SCREEN_WIDTH - PONG_BALL_SIZE;
      pong_balls[ballIndex].x = ball_px * 16;
      pong_balls[ballIndex].vx = -Math.abs(pong_balls[ballIndex].vx);
    }
    if (Math.abs(pong_balls[ballIndex].vx) < 8) {
      pong_balls[ballIndex].vx = pong_balls[ballIndex].vx > 0 ? 8 : -8;
    }
    if (Math.abs(pong_balls[ballIndex].vy) < 8) {
      pong_balls[ballIndex].vy = pong_balls[ballIndex].vy > 0 ? 8 : -8;
    }
    let vx = Math.trunc(pong_balls[ballIndex].vx);
    let vy = Math.trunc(pong_balls[ballIndex].vy);
    let magSq = Math.trunc(Math.trunc(vx) * vx + Math.trunc(vy) * vy);
    let maxSpeed = Math.trunc(40);
    let maxMagSq = Math.trunc(maxSpeed * maxSpeed);
    if (magSq > maxMagSq) {
      while (
        Math.trunc(pong_balls[ballIndex].vx) * pong_balls[ballIndex].vx +
          Math.trunc(pong_balls[ballIndex].vy) * pong_balls[ballIndex].vy >
        maxMagSq
      ) {
        pong_balls[ballIndex].vx = Math.trunc(
          (pong_balls[ballIndex].vx * 3) / 4,
        );
        pong_balls[ballIndex].vy = Math.trunc(
          (pong_balls[ballIndex].vy * 3) / 4,
        );
      }
      if (Math.abs(pong_balls[ballIndex].vx) < 8) {
        pong_balls[ballIndex].vx = pong_balls[ballIndex].vx >= 0 ? 8 : -8;
      }
      if (Math.abs(pong_balls[ballIndex].vy) < 8) {
        pong_balls[ballIndex].vy = pong_balls[ballIndex].vy >= 0 ? 8 : -8;
      }
    }
  }
  function checkPongCollisions(ballIndex: number): void {
    let ball_px = Math.trunc(pong_balls[ballIndex].x / 16);
    let ball_py = Math.trunc(pong_balls[ballIndex].y / 16);
    for (let d = Math.trunc(0); d < 5; d++) {
      if (d == 2) continue;
      if (digit_transitions[d].state == DIGIT_ASSEMBLING) continue;
      let dx1 = Math.trunc(DIGIT_X[d] + 1);
      let dx2 = Math.trunc(DIGIT_X[d] + 14);
      let dy1 = Math.trunc(PONG_TIME_Y + 1);
      let dy2 = Math.trunc(PONG_TIME_Y + 23);
      if (
        ball_px + PONG_BALL_SIZE >= dx1 &&
        ball_px <= dx2 &&
        ball_py + PONG_BALL_SIZE >= dy1 &&
        ball_py <= dy2
      ) {
        let ball_cx = Math.trunc(ball_px + PONG_BALL_SIZE / 2);
        let ball_cy = Math.trunc(ball_py + PONG_BALL_SIZE / 2);
        let digit_cx = Math.trunc((dx1 + dx2) / 2);
        let digit_cy = Math.trunc((dy1 + dy2) / 2);
        let push_strength = 3.0;
        if (Math.abs(ball_cx - digit_cx) > 4 && settings.pongHorizontalBounce) {
          if (ball_cx < digit_cx) {
            digit_velocity_x[d] = push_strength;
          } else {
            digit_velocity_x[d] = -push_strength;
          }
        } else {
          if (ball_cy < digit_cy) {
            digit_velocity[d] = push_strength;
          } else {
            digit_velocity[d] = -push_strength;
          }
        }
        if (digit_transitions[d].state == DIGIT_BREAKING) {
          let hit_num = Math.trunc(digit_transitions[d].hit_count);
          if (hit_num < BALL_HIT_THRESHOLD) {
            digit_transitions[d].hit_count++;
            if (settings.pongDigitShatter) {
              spawnProgressiveFragments(
                d,
                digit_transitions[d].old_char,
                hit_num,
              );
            }
          }
        }
        if (Math.abs(ball_cx - digit_cx) > 4) {
          pong_balls[ballIndex].vx = -pong_balls[ballIndex].vx;
          pong_balls[ballIndex].vy += random(
            -BALL_COLLISION_ANGLE_VARIATION,
            BALL_COLLISION_ANGLE_VARIATION + 1,
          );
          if (ball_cx < digit_cx) {
            ball_px = dx1 - PONG_BALL_SIZE - 1;
          } else {
            ball_px = dx2 + 1;
          }
          pong_balls[ballIndex].x = ball_px * 16;
        } else {
          pong_balls[ballIndex].vy = -pong_balls[ballIndex].vy;
          pong_balls[ballIndex].vx += random(
            -BALL_COLLISION_ANGLE_VARIATION,
            BALL_COLLISION_ANGLE_VARIATION + 1,
          );
          if (ball_cy < digit_cy) {
            ball_py = dy1 - PONG_BALL_SIZE - 1;
          } else {
            ball_py = dy2 + 1;
          }
          pong_balls[ballIndex].y = ball_py * 16;
        }
        break;
      }
    }
    if (settings.pongHorizontalBounce) {
      let dy1 = Math.trunc(PONG_TIME_Y + 1);
      let dy2 = Math.trunc(PONG_TIME_Y + 23);
      if (ball_py + PONG_BALL_SIZE >= dy1 && ball_py <= dy2) {
        let gap1_left = Math.trunc(DIGIT_X[0] + 14);
        let gap1_right = Math.trunc(DIGIT_X[1] + 1);
        let ball_cx = Math.trunc(ball_px + PONG_BALL_SIZE / 2);
        if (ball_cx > gap1_left && ball_cx < gap1_right) {
          let push_strength = 3.0;
          digit_velocity_x[0] = -push_strength;
          digit_velocity_x[1] = push_strength;
          pong_balls[ballIndex].vx = -pong_balls[ballIndex].vx;
          if (pong_balls[ballIndex].vx > 0) {
            ball_px = gap1_right + 1;
          } else {
            ball_px = gap1_left - PONG_BALL_SIZE - 1;
          }
          pong_balls[ballIndex].x = ball_px * 16;
        }
        let gap2_left = Math.trunc(DIGIT_X[3] + 14);
        let gap2_right = Math.trunc(DIGIT_X[4] + 1);
        if (ball_cx > gap2_left && ball_cx < gap2_right) {
          let push_strength = 3.0;
          digit_velocity_x[3] = -push_strength;
          digit_velocity_x[4] = push_strength;
          pong_balls[ballIndex].vx = -pong_balls[ballIndex].vx;
          if (pong_balls[ballIndex].vx > 0) {
            ball_px = gap2_right + 1;
          } else {
            ball_px = gap2_left - PONG_BALL_SIZE - 1;
          }
          pong_balls[ballIndex].x = ball_px * 16;
        }
      }
    }
  }
  function triggerDigitTransition(
    digitIndex: number,
    oldChar: number,
    newChar: number,
  ): void {
    digit_transitions[digitIndex].state = DIGIT_BREAKING;
    digit_transitions[digitIndex].old_char = oldChar;
    digit_transitions[digitIndex].new_char = newChar;
    digit_transitions[digitIndex].state_timer = millis();
    digit_transitions[digitIndex].hit_count = 0;
    digit_transitions[digitIndex].fragments_spawned = 0;
    digit_transitions[digitIndex].assembly_progress = 0.0;
  }
  function updateDigitTransitions(): void {
    for (let i = Math.trunc(0); i < 5; i++) {
      if (digit_transitions[i].state == DIGIT_NORMAL) continue;
      let elapsed = Math.trunc(millis() - digit_transitions[i].state_timer);
      if (digit_transitions[i].state == DIGIT_BREAKING) {
        if (
          digit_transitions[i].hit_count >= BALL_HIT_THRESHOLD ||
          elapsed >= DIGIT_TRANSITION_TIMEOUT
        ) {
          if (settings.pongDigitShatter) {
            digit_transitions[i].state = DIGIT_ASSEMBLING;
            digit_transitions[i].state_timer = millis();
            digit_transitions[i].assembly_progress = 0.0;
            spawnAssemblyFragments(i, digit_transitions[i].new_char);
          } else {
            digit_transitions[i].state = DIGIT_NORMAL;
            digit_transitions[i].assembly_progress = 1.0;
          }
        }
      } else if (digit_transitions[i].state == DIGIT_ASSEMBLING) {
        let progress = Math.fround(elapsed) / DIGIT_ASSEMBLY_DURATION;
        if (progress >= 1.0) {
          digit_transitions[i].state = DIGIT_NORMAL;
          digit_transitions[i].assembly_progress = 1.0;
          for (let f = Math.trunc(0); f < MAX_PONG_FRAGMENTS; f++) {
            if (fragment_targets[f].target_digit == i) {
              pong_fragments[f].active = false;
              fragment_targets[f].target_digit = -1;
            }
          }
        } else {
          digit_transitions[i].assembly_progress = progress;
        }
      }
    }
  }
  function updateDigitBouncePong(): void {
    let currentTime = Math.trunc(millis());
    let deltaTime = (currentTime - lastPhysicsUpdate) / 1000.0;
    if (deltaTime > 0.1 || lastPhysicsUpdate == 0) {
      deltaTime = 0.025;
    }
    lastPhysicsUpdate = currentTime;
    let physicsScale = deltaTime / 0.05;
    let SPRING_STRENGTH = settings.pongBounceStrength / 10.0;
    let DAMPING = settings.pongBounceDamping / 100.0;
    for (let i = Math.trunc(0); i < 5; i++) {
      if (digit_offset_y[i] != 0 || digit_velocity[i] != 0) {
        let spring_force_y = -digit_offset_y[i] * SPRING_STRENGTH;
        digit_velocity[i] += spring_force_y * physicsScale;
        digit_velocity[i] *= Math.pow(DAMPING, physicsScale);
        digit_offset_y[i] += digit_velocity[i] * physicsScale;
        if (digit_offset_y[i] > 4) digit_offset_y[i] = 4;
        if (digit_offset_y[i] < -4) digit_offset_y[i] = -4;
        if (
          Math.abs(digit_offset_y[i]) < 0.1 &&
          Math.abs(digit_velocity[i]) < 0.1
        ) {
          digit_offset_y[i] = 0;
          digit_velocity[i] = 0;
        }
      }
      if (digit_offset_x[i] != 0 || digit_velocity_x[i] != 0) {
        let spring_force_x = -digit_offset_x[i] * SPRING_STRENGTH;
        digit_velocity_x[i] += spring_force_x * physicsScale;
        digit_velocity_x[i] *= Math.pow(DAMPING, physicsScale);
        digit_offset_x[i] += digit_velocity_x[i] * physicsScale;
        if (digit_offset_x[i] > 4) digit_offset_x[i] = 4;
        if (digit_offset_x[i] < -4) digit_offset_x[i] = -4;
        if (
          Math.abs(digit_offset_x[i]) < 0.1 &&
          Math.abs(digit_velocity_x[i]) < 0.1
        ) {
          digit_offset_x[i] = 0;
          digit_velocity_x[i] = 0;
        }
      }
    }
  }
  return {
    setDisplayed(live: string) {
      displayed = live;
    },
    configure(value?: PongSettings) {
      settings = normalizePong(value);
      breakout_paddle.width = settings.pongPaddleWidth;
    },
    get state() {
      return {
        now,
        displayed,
        balls: pong_balls,
        paddle: breakout_paddle,
        transitions: digit_transitions,
        fragments: pong_fragments,
        targets: fragment_targets,
        offsetX: digit_offset_x,
        offsetY: digit_offset_y,
      };
    },
    tick(live: string, seconds: number, replay = false) {
      now += 16;
      if (!initialized) {
        displayed = live;
        spawnPongBall(0);
        pong_balls[0].state = PONG_BALL_SPAWNING;
        pong_balls[0].spawn_timer = now;
        initialized = true;
        if (!replay) return;
      }
      for (const i of [0, 1, 3, 4])
        if (replay || displayed[i] !== live[i])
          triggerDigitTransition(
            i,
            displayed.charCodeAt(i),
            live.charCodeAt(i),
          );
      displayed = live;
      const breaking = digit_transitions.findIndex(
        (d) => d.state === DIGIT_BREAKING,
      );
      if (breaking >= 0 && seconds >= 55) {
        if (!pong_balls[1].active) spawnPongBall(1);
        breakout_paddle.target_x = DIGIT_X[breaking] + 7;
        for (const b of pong_balls)
          if (b.active && b.state === PONG_BALL_NORMAL) {
            b.vx = b.vx > 0 ? 22 : -22;
            b.vy = b.vy > 0 ? 22 : -22;
          }
      } else {
        pong_balls[1].active = false;
        const b = pong_balls[0];
        if (b.active && b.state === PONG_BALL_NORMAL) {
          b.vx = b.vx > 0 ? tickSpeed() : -tickSpeed();
          b.vy = b.vy > 0 ? tickSpeed() : -tickSpeed();
        }
      }
      for (let i = 0; i < 2; i++)
        if (pong_balls[i].active) {
          updatePongBall(i);
          checkPongCollisions(i);
        }
      updateBreakoutPaddle();
      updateDigitTransitions();
      updatePongFragments();
      updateAssemblyFragments();
      updateDigitBouncePong();
    },
    draw(
      frame: Framebuffer,
      date: Date,
      o: {
        color: string;
        zone: string;
        blink: boolean;
        hour24: boolean;
        dateFormat?: number;
      },
      pm: boolean,
    ) {
      frame.clear('#000000');
      drawGfxText(
        frame,
        classicDate(date, o.zone, o.dateFormat ?? 0),
        34,
        4,
        1,
        '#ffffff',
      );
      if (!o.hour24) drawGfxText(frame, pm ? 'PM' : 'AM', 110, 4, 1, '#ffffff');
      for (let i = 0; i < 5; i++) {
        const d = digit_transitions[i];
        let ch = displayed[i];
        if (d.state === DIGIT_BREAKING) {
          if (
            d.hit_count > 0 &&
            Math.floor(now / (100 - d.hit_count * 20)) % 2 === 0
          )
            continue;
          ch = String.fromCharCode(d.old_char);
        } else if (d.state === DIGIT_ASSEMBLING) {
          if (d.assembly_progress < 0.8) continue;
          ch = String.fromCharCode(d.new_char);
        }
        if (i === 2 && o.blink && date.getMilliseconds() >= 500) ch = ' ';
        drawGfxText(
          frame,
          ch,
          DIGIT_X[i] + Math.trunc(digit_offset_x[i]),
          16 + Math.trunc(digit_offset_y[i]),
          3,
          o.color,
        );
      }
      for (const p of pong_fragments)
        if (p.active)
          frame.rect(Math.trunc(p.x), Math.trunc(p.y), 2, 2, o.color);
      frame.rect(
        breakout_paddle.x - Math.trunc(breakout_paddle.width / 2),
        60,
        breakout_paddle.width,
        2,
        '#00ffff',
      );
      for (const b of pong_balls)
        if (
          b.active &&
          (b.state !== PONG_BALL_SPAWNING || Math.floor(now / 100) % 2 === 0)
        )
          frame.rect(
            Math.trunc(b.x / 16),
            Math.trunc(b.y / 16),
            2,
            2,
            '#ffffff',
          );
    },
  };
}
