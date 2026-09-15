// Port of ESP32 clock_mario.cpp idle encounters and sprites (MIT).
// Native state branches retained; JS numbers used for encounter physics.
import type { MarioSettings } from './character-settings';
import type { Paint } from './drawing';
type Enemy = {
  type: number;
  state: number;
  x: number;
  walkFrame: number;
  animTimer: number;
  fromRight: boolean;
};
type Coin = {
  x: number;
  y: number;
  vy: number;
  active: boolean;
  frame: number;
};
type Fireball = { x: number; y: number; vy: number; active: boolean };
export type EncounterHost = {
  settings: MarioSettings;
  x: number;
  jump: number;
  velocity: number;
  facingRight: boolean;
  frame: number;
  phase: string;
  offsets: number[];
  triggerBounce: (index: number) => void;
};
export function createMarioEncounters(
  host: EncounterHost,
  randomSource: () => number,
) {
  const random = (a: number, b?: number) =>
    b === undefined
      ? Math.floor(randomSource() * a)
      : a + Math.floor(randomSource() * (b - a));
  const min = Math.min,
    abs = Math.abs;
  const ENEMY_NONE = 0,
    ENEMY_GOOMBA = 1,
    ENEMY_SPINY = 2,
    ENEMY_KOOPA = 3,
    ENEMY_WALKING = 0,
    ENEMY_SQUASHING = 1,
    ENEMY_HIT = 2,
    ENEMY_DEAD = 3,
    ENEMY_SHELL_SLIDING = 4;
  const ENCOUNTER_MARIO_VS_ENEMY = 0,
    ENCOUNTER_ENEMY_PASS_BY = 1,
    ENCOUNTER_COIN_BLOCKS = 2,
    ENCOUNTER_MULTI_ENEMY = 3,
    ENCOUNTER_STAR = 4,
    ENCOUNTER_MUSHROOM = 5;
  const MARIO_IDLE = 'idle',
    MARIO_ENCOUNTER_WALKING = 'encounterWalking',
    MARIO_ENCOUNTER_JUMPING = 'encounterJumping',
    MARIO_ENCOUNTER_SHOOTING = 'encounterShooting',
    MARIO_ENCOUNTER_SQUASH = 'encounterSquash',
    MARIO_ENCOUNTER_RETURNING = 'encounterReturning';
  const SCREEN_WIDTH = 128,
    SCREEN_HEIGHT = 64,
    ENCOUNTER_TIME_SCALE = 16 / 35,
    MARIO_START_X = -15,
    TIME_Y = 26,
    MARIO_HEAD_OFFSET = 10,
    DIGIT_BOTTOM = 47,
    JUMP_POWER = -4.5,
    GRAVITY = 0.6,
    MARIO_BOUNCE_VELOCITY = 2,
    mario_base_y = 62,
    DIGIT_X = [19, 37, 55, 73, 91],
    MAX_COINS = 4;
  const DISPLAY_BLACK = '#000000',
    COL_GOOMBA = '#a42829',
    COL_SPINY = '#ff8200',
    COL_KOOPA = '#00ff00',
    COL_COIN = '#ffff00',
    COL_STAR = '#ffff00',
    COL_MUSHROOM = '#ff0000',
    COL_FIREBALL = '#ff8200',
    COL_MARIO_HAT = '#ff0000',
    COL_MARIO_SKIN = '#ffb6c5',
    COL_MARIO_OVERALLS = '#0000ff',
    COL_MARIO_SHOES = '#a42829';
  const SPRITE_COLOR = (c: string) => c;
  const enemy = (): Enemy => ({
    type: 0,
    state: 3,
    x: 0,
    walkFrame: 0,
    animTimer: 0,
    fromRight: true,
  });
  let currentEnemy = enemy(),
    secondEnemy = enemy(),
    secondEnemyActive = false,
    encounterVariation = 0;
  let marioFireball: Fireball = { x: 0, y: 0, vy: 0, active: false },
    marioStar = {
      x: 0,
      y: 0,
      vy: 0,
      vx: 0,
      active: false,
      frame: 0,
      bounceCount: 0,
    },
    marioMushroom = { x: 0, vx: 0, active: false, frame: 0 };
  let marioStarPowered = false,
    marioStarTimer = 0,
    marioGrowthTimer = 0,
    shellSlideSpeed = 0,
    marioCoins = 0;
  const coins: Coin[] = Array.from({ length: 4 }, () => ({
    x: 0,
    y: 0,
    vy: 0,
    active: false,
    frame: 0,
  }));
  let now = 0,
    lastEncounterEnd = 0,
    nextEncounterDelay = 15000;
  const millis = () => now;
  let paint: Paint = () => {};
  const display = {
    fillRect: (x: number, y: number, w: number, h: number, c: string) =>
      paint(Math.trunc(x), Math.trunc(y), w, h, c),
    drawPixel: (x: number, y: number, c: string) =>
      paint(Math.trunc(x), Math.trunc(y), 1, 1, c),
  };
  function rollEncounterDelay() {
    switch (host.settings.marioEncounterFreq) {
      case 0:
        return random(25000, 35000);
      case 2:
        return random(8000, 15000);
      case 3:
        return random(2000, 5000);
      default:
        return random(15000, 25000);
    }
  }

  let coinDigitIndices = Array<number>(3).fill(0);
  let numCoinTargets = 0;
  let currentCoinTargetIdx = 0;
  let coinDigitBounceTriggered = false;

  function getEnemyWalkSpeed(type: number) {
    if (type == ENEMY_GOOMBA) return 0.7;
    if (type == ENEMY_KOOPA) return 0.8;
    return 1.3;
  }

  let encounterEnemyApproachSpeed = 1.0;
  let encounterMeetX = 64.0;

  function getEncounterSpeedMult() {
    let mult = [0.65, 0.85, 1.1];
    let idx = min(Math.trunc(2), host.settings.marioEncounterSpeed);
    return mult[idx];
  }

  function spawnCoin(digitIndex: number) {
    for (let i = 0; i < MAX_COINS; i++) {
      if (!coins[i].active) {
        coins[i].x = DIGIT_X[digitIndex] + 7;
        coins[i].y = TIME_Y - 14;
        coins[i].vy = -2.5 * ENCOUNTER_TIME_SCALE;
        coins[i].active = true;
        coins[i].frame = 0;
        marioCoins++;
        if (marioCoins > 99) marioCoins = 0;
        break;
      }
    }
  }

  function updateCoins() {
    let ts = ENCOUNTER_TIME_SCALE;
    for (let i = 0; i < MAX_COINS; i++) {
      if (!coins[i].active) continue;
      coins[i].vy += 0.3 * ts;
      coins[i].y += coins[i].vy;
      coins[i].frame++;

      if (coins[i].y > TIME_Y + 3) {
        coins[i].active = false;
      }
    }
  }

  function drawCoin(c: Coin) {
    if (!c.active) return;
    let cx = Math.trunc(c.x);
    let cy = Math.trunc(c.y);
    let col = SPRITE_COLOR(COL_COIN);

    if (Math.trunc(c.frame / 3) % 2 == 0) {
      display.fillRect(cx, cy + 1, 4, 4, col);
      display.fillRect(cx + 1, cy, 2, 6, col);
    } else {
      display.fillRect(cx + 1, cy, 2, 6, col);
    }
  }

  function setupCoinBlockTargets() {
    let validDigits = [0, 1, 3, 4];
    numCoinTargets = random(1, 4);

    for (let i = 3; i > 0; i--) {
      let j = random(i + 1);
      let tmp = validDigits[i];
      validDigits[i] = validDigits[j];
      validDigits[j] = tmp;
    }

    for (let i = 0; i < numCoinTargets; i++) {
      coinDigitIndices[i] = validDigits[i];
    }

    for (let i = 0; i < numCoinTargets - 1; i++) {
      for (let j = i + 1; j < numCoinTargets; j++) {
        if (coinDigitIndices[j] < coinDigitIndices[i]) {
          let tmp = coinDigitIndices[i];
          coinDigitIndices[i] = coinDigitIndices[j];
          coinDigitIndices[j] = tmp;
        }
      }
    }

    currentCoinTargetIdx = 0;
    coinDigitBounceTriggered = false;
  }

  function calcApproachSpeed(meetX: number, enemyStartX: number) {
    let ts = ENCOUNTER_TIME_SCALE;
    let sm = getEncounterSpeedMult();
    let walkSpeed = (host.settings.marioWalkSpeed / 10.0) * 1.3 * sm * ts;
    let marioTravel = meetX - MARIO_START_X;
    let enemyTravel = enemyStartX - meetX;
    if (marioTravel < 1.0) marioTravel = 1.0;
    encounterEnemyApproachSpeed = (enemyTravel * walkSpeed) / marioTravel;

    encounterEnemyApproachSpeed = min(
      encounterEnemyApproachSpeed,
      walkSpeed * 0.75,
    );
    encounterMeetX = meetX;
  }

  function randomEnemyType() {
    let r = random(100);
    if (r < 35) return ENEMY_GOOMBA;
    if (r < 65) return ENEMY_SPINY;
    return ENEMY_KOOPA;
  }

  function startIdleEncounter() {
    marioFireball.active = false;
    secondEnemyActive = false;
    marioStar.active = false;
    marioStarPowered = false;
    marioStarTimer = 0;
    marioMushroom.active = false;
    marioGrowthTimer = 0;
    shellSlideSpeed = 0;

    let roll = random(100);
    if (roll < 15) {
      encounterVariation = ENCOUNTER_ENEMY_PASS_BY;
      currentEnemy.type = randomEnemyType();
      currentEnemy.state = ENEMY_WALKING;
      currentEnemy.x = SCREEN_WIDTH + random(5, 30);
      currentEnemy.walkFrame = 0;
      currentEnemy.animTimer = 0;
      currentEnemy.fromRight = true;
      encounterEnemyApproachSpeed =
        getEnemyWalkSpeed(currentEnemy.type) *
        getEncounterSpeedMult() *
        ENCOUNTER_TIME_SCALE;
      host.x = MARIO_START_X;
      host.phase = MARIO_ENCOUNTER_WALKING;
      return;
    } else if (roll < 40) {
      encounterVariation = ENCOUNTER_COIN_BLOCKS;
      currentEnemy.type = ENEMY_NONE;
      setupCoinBlockTargets();
      host.x = MARIO_START_X;
      host.facingRight = true;
      host.jump = 0;
      host.velocity = 0;
      host.phase = MARIO_ENCOUNTER_WALKING;
      return;
    } else if (roll < 48) {
      encounterVariation = ENCOUNTER_MULTI_ENEMY;

      let meetX = random(20, 85);
      let enemyStartX = SCREEN_WIDTH + random(5, 15);
      calcApproachSpeed(meetX, enemyStartX);

      currentEnemy.type = ENEMY_GOOMBA;
      currentEnemy.state = ENEMY_WALKING;
      currentEnemy.x = enemyStartX;
      currentEnemy.walkFrame = 0;
      currentEnemy.animTimer = 0;
      currentEnemy.fromRight = true;

      secondEnemy.type = ENEMY_GOOMBA;
      secondEnemy.state = ENEMY_WALKING;
      secondEnemy.x = enemyStartX + 18;
      secondEnemy.walkFrame = 4;
      secondEnemy.animTimer = 0;
      secondEnemy.fromRight = true;
      secondEnemyActive = true;
    } else if (roll < 53) {
      encounterVariation = ENCOUNTER_STAR;
      currentEnemy.type = ENEMY_NONE;

      let validDigits = [0, 1, 3, 4];
      numCoinTargets = 1;
      coinDigitIndices[0] = validDigits[random(4)];
      currentCoinTargetIdx = 0;
      coinDigitBounceTriggered = false;
      host.x = MARIO_START_X;
      host.facingRight = true;
      host.jump = 0;
      host.velocity = 0;
      host.phase = MARIO_ENCOUNTER_WALKING;
      return;
    } else if (roll < 58) {
      encounterVariation = ENCOUNTER_MUSHROOM;
      currentEnemy.type = ENEMY_NONE;
      let validDigits = [0, 1];
      numCoinTargets = 1;
      coinDigitIndices[0] = validDigits[random(2)];
      currentCoinTargetIdx = 0;
      coinDigitBounceTriggered = false;
      host.x = MARIO_START_X;
      host.facingRight = true;
      host.jump = 0;
      host.velocity = 0;
      host.phase = MARIO_ENCOUNTER_WALKING;
      return;
    } else {
      encounterVariation = ENCOUNTER_MARIO_VS_ENEMY;

      let meetX = random(20, 100);
      let enemyStartX = SCREEN_WIDTH + random(5, 15);
      calcApproachSpeed(meetX, enemyStartX);

      currentEnemy.type = randomEnemyType();
      currentEnemy.state = ENEMY_WALKING;
      currentEnemy.x = enemyStartX;
      currentEnemy.walkFrame = 0;
      currentEnemy.animTimer = 0;
      currentEnemy.fromRight = true;
    }

    host.x = MARIO_START_X;
    host.facingRight = true;
    host.jump = 0;
    host.velocity = 0;
    host.phase = MARIO_ENCOUNTER_WALKING;
  }

  function abortEncounter() {
    currentEnemy.type = ENEMY_NONE;
    currentEnemy.state = ENEMY_DEAD;
    secondEnemyActive = false;
    secondEnemy.type = ENEMY_NONE;
    marioFireball.active = false;
    marioStar.active = false;
    marioStarPowered = false;
    marioStarTimer = 0;
    marioMushroom.active = false;
    marioGrowthTimer = 0;
    shellSlideSpeed = 0;
    for (let i = 0; i < MAX_COINS; i++) coins[i].active = false;
    host.phase = MARIO_IDLE;
    host.x = MARIO_START_X;
    host.jump = 0;
    host.velocity = 0;
    lastEncounterEnd = millis();
    nextEncounterDelay = rollEncounterDelay();
  }

  const ENCOUNTER_GOOMBA_DIST = 14;
  const ENCOUNTER_SPINY_DIST = 28;
  const FIREBALL_SPEED = 3.5;
  const FIREBALL_GRAVITY = 0.5;
  const FIREBALL_BOUNCE = -2.8;
  const SQUASH_FRAMES = 8;
  const HIT_FRAMES = 12;

  let enemyFallY = 0;
  let enemyFallVY = 0;

  function updateIdleEncounter() {
    let ts = ENCOUNTER_TIME_SCALE;
    let sm = getEncounterSpeedMult();
    let walkSpeed = (host.settings.marioWalkSpeed / 10.0) * 1.3 * sm * ts;
    let frameCount = host.settings.marioSmoothAnimation ? 4 : 2;
    let enemySpeed = getEnemyWalkSpeed(currentEnemy.type) * sm * ts;

    currentEnemy.walkFrame++;
    if (secondEnemyActive) secondEnemy.walkFrame++;

    updateCoins();

    switch (host.phase) {
      case MARIO_ENCOUNTER_WALKING: {
        if (currentEnemy.state == ENEMY_WALKING) {
          currentEnemy.x -= encounterEnemyApproachSpeed;
        }
        if (secondEnemyActive && secondEnemy.state == ENEMY_WALKING) {
          secondEnemy.x -= encounterEnemyApproachSpeed;
        }

        if (encounterVariation == ENCOUNTER_ENEMY_PASS_BY) {
          let lastEnemyX = secondEnemyActive ? secondEnemy.x : currentEnemy.x;
          if (lastEnemyX < -15) {
            currentEnemy.type = ENEMY_NONE;
            currentEnemy.state = ENEMY_DEAD;
            secondEnemyActive = false;
            host.phase = MARIO_IDLE;
            lastEncounterEnd = millis();
            nextEncounterDelay = rollEncounterDelay();
          }
          break;
        }

        if (
          encounterVariation == ENCOUNTER_COIN_BLOCKS ||
          encounterVariation == ENCOUNTER_STAR ||
          encounterVariation == ENCOUNTER_MUSHROOM
        ) {
          if (encounterVariation == ENCOUNTER_STAR && marioStar.active) {
            marioStar.vy += 0.4 * ts;
            marioStar.y += marioStar.vy;
            marioStar.x += marioStar.vx;
            marioStar.frame++;
            if (marioStar.y >= mario_base_y - 8) {
              marioStar.y = mario_base_y - 8;
              marioStar.vy = -2.0 * ts;
              marioStar.bounceCount++;
              if (marioStar.bounceCount >= 3) {
                marioStar.vx = 0;
              }
            }

            if (marioStar.bounceCount >= 3) {
              if (abs(host.x - marioStar.x) > 5) {
                host.x += marioStar.x > host.x ? walkSpeed : -walkSpeed;
                host.facingRight = marioStar.x > host.x;
                host.frame = (host.frame + 1) % frameCount;
              } else {
                marioStar.active = false;
                marioStarPowered = true;
                marioStarTimer = 50;
                marioCoins += 5;
                host.phase = MARIO_ENCOUNTER_RETURNING;
                host.facingRight = true;
              }
            }

            break;
          }

          if (
            encounterVariation == ENCOUNTER_MUSHROOM &&
            marioMushroom.active
          ) {
            marioMushroom.x += marioMushroom.vx;
            marioMushroom.frame++;
            if (abs(host.x - marioMushroom.x) > 5) {
              host.x += walkSpeed;
              host.facingRight = true;
              host.frame = (host.frame + 1) % frameCount;
            } else {
              marioMushroom.active = false;
              marioGrowthTimer = 255;
              marioCoins += 3;
              host.phase = MARIO_ENCOUNTER_RETURNING;
              host.facingRight = true;
            }

            if (marioMushroom.x > SCREEN_WIDTH + 10) {
              marioMushroom.active = false;
              host.phase = MARIO_ENCOUNTER_RETURNING;
              host.facingRight = true;
            }
            break;
          }

          let targetX = DIGIT_X[coinDigitIndices[currentCoinTargetIdx]] + 9;
          if (abs(host.x - targetX) > 3) {
            if (host.x < targetX) {
              host.x += walkSpeed;
              host.facingRight = true;
            } else {
              host.x -= walkSpeed;
              host.facingRight = false;
            }
            host.frame = (host.frame + 1) % frameCount;
          } else {
            host.x = targetX;
            host.phase = MARIO_ENCOUNTER_JUMPING;
            host.velocity = JUMP_POWER * ts;
            host.jump = 0;
            coinDigitBounceTriggered = false;
          }
          break;
        }

        let stopDist =
          currentEnemy.type == ENEMY_SPINY
            ? ENCOUNTER_SPINY_DIST
            : ENCOUNTER_GOOMBA_DIST;
        let distToEnemy = currentEnemy.x - host.x;

        if (distToEnemy > stopDist) {
          host.x += walkSpeed;
          host.facingRight = true;
          host.frame = (host.frame + 1) % frameCount;
        } else {
          if (currentEnemy.type == ENEMY_SPINY) {
            host.phase = MARIO_ENCOUNTER_SHOOTING;
            marioFireball.x = host.x + 6;
            marioFireball.y = mario_base_y - 6;
            marioFireball.vy = -1.5 * ts;
            marioFireball.active = true;
          } else {
            host.phase = MARIO_ENCOUNTER_JUMPING;
            host.velocity = JUMP_POWER * ts;
            host.jump = 0;
          }
        }
        break;
      }

      case MARIO_ENCOUNTER_JUMPING: {
        if (
          encounterVariation == ENCOUNTER_COIN_BLOCKS ||
          encounterVariation == ENCOUNTER_STAR ||
          encounterVariation == ENCOUNTER_MUSHROOM
        ) {
          host.velocity += GRAVITY * ts;
          host.jump += host.velocity;

          let mario_head_y =
            mario_base_y + Math.trunc(host.jump) - MARIO_HEAD_OFFSET;
          if (
            !coinDigitBounceTriggered &&
            host.velocity < 0 &&
            mario_head_y <= DIGIT_BOTTOM
          ) {
            coinDigitBounceTriggered = true;
            let digitIdx = coinDigitIndices[currentCoinTargetIdx];
            host.triggerBounce(digitIdx);

            if (encounterVariation == ENCOUNTER_STAR) {
              marioStar.x = DIGIT_X[digitIdx] + 7;
              marioStar.y = TIME_Y - 14;
              marioStar.vy = -3.0 * ts;
              marioStar.vx = 1.2 * ts;
              marioStar.active = true;
              marioStar.frame = 0;
              marioStar.bounceCount = 0;
            } else if (encounterVariation == ENCOUNTER_MUSHROOM) {
              marioMushroom.x = DIGIT_X[digitIdx] + 25;
              marioMushroom.vx = walkSpeed * 0.7;
              marioMushroom.active = true;
              marioMushroom.frame = 0;
            } else {
              spawnCoin(digitIdx);
            }
            host.velocity = MARIO_BOUNCE_VELOCITY * ts;
          }

          if (host.jump >= 0) {
            host.jump = 0;
            host.velocity = 0;
            if (encounterVariation == ENCOUNTER_COIN_BLOCKS) {
              currentCoinTargetIdx++;
              if (currentCoinTargetIdx < numCoinTargets) {
                host.phase = MARIO_ENCOUNTER_WALKING;
              } else {
                host.phase = MARIO_ENCOUNTER_RETURNING;
                host.facingRight = true;
              }
            } else {
              host.phase = MARIO_ENCOUNTER_WALKING;
            }
          }
          break;
        }

        if (currentEnemy.state == ENEMY_WALKING) {
          let distToEnemy = currentEnemy.x - host.x;
          if (distToEnemy > 2) {
            let approachSpeed = min(walkSpeed * 0.8, distToEnemy * 0.3 * ts);
            host.x += approachSpeed;
          }
          currentEnemy.x -= encounterEnemyApproachSpeed * 0.3;
        }

        if (secondEnemyActive && secondEnemy.state == ENEMY_WALKING) {
          secondEnemy.x -= encounterEnemyApproachSpeed * 0.5;
        }

        host.velocity += GRAVITY * ts;
        host.jump += host.velocity;

        let mario_head_y =
          mario_base_y + Math.trunc(host.jump) - MARIO_HEAD_OFFSET;
        if (host.velocity < 0 && mario_head_y <= DIGIT_BOTTOM) {
          for (let i = 0; i < 5; i++) {
            if (i == 2) continue;
            let digitCenter = DIGIT_X[i] + 9;
            if (
              abs(Math.trunc(host.x) - digitCenter) < 12 &&
              host.offsets[i] == 0
            ) {
              host.triggerBounce(i);
              break;
            }
          }
        }

        if (host.velocity > 0 && host.jump >= -5) {
          if (
            currentEnemy.state == ENEMY_WALKING &&
            abs(host.x - currentEnemy.x) < 10
          ) {
            host.x = currentEnemy.x;
            host.jump = 0;
            host.velocity = 0;

            if (
              encounterVariation == ENCOUNTER_MULTI_ENEMY &&
              secondEnemyActive
            ) {
              currentEnemy.type = ENEMY_NONE;
              currentEnemy.state = ENEMY_DEAD;
              currentEnemy = { ...secondEnemy };
              secondEnemyActive = false;
              host.velocity = JUMP_POWER * ts;
              host.jump = -5;
            } else if (currentEnemy.type == ENEMY_KOOPA) {
              currentEnemy.state = ENEMY_SHELL_SLIDING;
              currentEnemy.animTimer = 30;
              shellSlideSpeed = 4.0 * ts;
              host.phase = MARIO_ENCOUNTER_SQUASH;
              marioCoins++;
            } else {
              currentEnemy.state = ENEMY_SQUASHING;
              currentEnemy.animTimer = SQUASH_FRAMES;
              host.phase = MARIO_ENCOUNTER_SQUASH;
              marioCoins++;
            }
          } else if (host.jump >= 0) {
            host.jump = 0;
            host.velocity = 0;
            host.phase = MARIO_ENCOUNTER_RETURNING;
            host.facingRight = true;
          }
        }
        break;
      }

      case MARIO_ENCOUNTER_SHOOTING: {
        updateMarioFireball();

        if (secondEnemyActive && secondEnemy.state == ENEMY_WALKING) {
          secondEnemy.x -= getEnemyWalkSpeed(secondEnemy.type) * ts;
        }

        if (!marioFireball.active) {
          if (currentEnemy.state == ENEMY_HIT) {
            host.phase = MARIO_ENCOUNTER_SQUASH;
          } else {
            host.phase = MARIO_ENCOUNTER_RETURNING;
            host.facingRight = true;
          }
        }
        break;
      }

      case MARIO_ENCOUNTER_SQUASH: {
        if (currentEnemy.state == ENEMY_SHELL_SLIDING) {
          currentEnemy.x += shellSlideSpeed;
          currentEnemy.walkFrame++;
          if (
            currentEnemy.x > SCREEN_WIDTH + 15 ||
            currentEnemy.animTimer == 0
          ) {
            currentEnemy.type = ENEMY_NONE;
            currentEnemy.state = ENEMY_DEAD;
            host.phase = MARIO_ENCOUNTER_RETURNING;
            host.facingRight = true;
          }
          if (currentEnemy.animTimer > 0) currentEnemy.animTimer--;
          break;
        }

        if (currentEnemy.animTimer > 0) {
          currentEnemy.animTimer--;

          if (currentEnemy.state == ENEMY_HIT) {
            enemyFallVY += 0.5 * ts;
            enemyFallY += enemyFallVY;
          }
        } else {
          currentEnemy.type = ENEMY_NONE;
          currentEnemy.state = ENEMY_DEAD;
          host.phase = MARIO_ENCOUNTER_RETURNING;
          host.facingRight = true;
        }

        if (currentEnemy.state == ENEMY_HIT && enemyFallY > 30) {
          currentEnemy.type = ENEMY_NONE;
          currentEnemy.state = ENEMY_DEAD;
          host.phase = MARIO_ENCOUNTER_RETURNING;
          host.facingRight = true;
        }
        break;
      }

      case MARIO_ENCOUNTER_RETURNING: {
        let returnSpeed = walkSpeed;
        if (marioStarPowered) {
          returnSpeed = walkSpeed * 2.0;
          if (marioStarTimer > 0) marioStarTimer--;
          else marioStarPowered = false;
        }

        host.x += returnSpeed;
        host.facingRight = true;
        host.frame = (host.frame + 1) % frameCount;

        if (host.x > SCREEN_WIDTH + 15) {
          host.x = MARIO_START_X;
          host.phase = MARIO_IDLE;
          currentEnemy.type = ENEMY_NONE;
          secondEnemyActive = false;
          marioStarPowered = false;
          marioStarTimer = 0;
          marioGrowthTimer = 0;
          lastEncounterEnd = millis();
          nextEncounterDelay = rollEncounterDelay();
        }
        break;
      }

      default:
        break;
    }
  }

  function updateMarioFireball() {
    if (!marioFireball.active) return;
    let ts = ENCOUNTER_TIME_SCALE;

    marioFireball.x += FIREBALL_SPEED * ts;
    marioFireball.vy += FIREBALL_GRAVITY * ts;
    marioFireball.y += marioFireball.vy;

    if (marioFireball.y >= mario_base_y - 4) {
      marioFireball.y = mario_base_y - 4;
      marioFireball.vy = FIREBALL_BOUNCE * ts;
    }

    if (
      currentEnemy.type != ENEMY_NONE &&
      currentEnemy.state == ENEMY_WALKING &&
      abs(marioFireball.x - currentEnemy.x) < 8
    ) {
      currentEnemy.state = ENEMY_HIT;
      currentEnemy.animTimer = HIT_FRAMES;
      marioFireball.active = false;
      enemyFallY = 0;
      enemyFallVY = -3.0 * ENCOUNTER_TIME_SCALE;
    }

    if (marioFireball.x > SCREEN_WIDTH + 10) {
      marioFireball.active = false;
    }
  }

  function drawGoomba(x: number, y: number, frame: number, squashing: boolean) {
    let sx = x - 5;
    let sy = y - 10;
    let col = SPRITE_COLOR(COL_GOOMBA);

    if (squashing) {
      display.fillRect(sx - 1, y - 2, 12, 2, col);
      return;
    }

    display.fillRect(sx + 2, sy, 6, 1, col);

    display.fillRect(sx + 1, sy + 1, 8, 1, col);

    display.fillRect(sx, sy + 2, 10, 2, col);

    display.fillRect(sx + 1, sy + 4, 8, 3, col);

    display.drawPixel(sx + 1, sy + 4, DISPLAY_BLACK);
    display.drawPixel(sx + 2, sy + 5, DISPLAY_BLACK);
    display.drawPixel(sx + 8, sy + 4, DISPLAY_BLACK);
    display.drawPixel(sx + 7, sy + 5, DISPLAY_BLACK);

    display.drawPixel(sx + 3, sy + 5, DISPLAY_BLACK);
    display.drawPixel(sx + 6, sy + 5, DISPLAY_BLACK);

    display.fillRect(sx + 2, sy + 7, 6, 1, col);

    if (Math.trunc(frame / 4) % 2 == 0) {
      display.fillRect(sx + 1, sy + 8, 3, 2, col);
      display.fillRect(sx + 6, sy + 8, 3, 2, col);
    } else {
      display.fillRect(sx + 2, sy + 8, 3, 2, col);
      display.fillRect(sx + 5, sy + 8, 3, 2, col);
    }
  }

  function drawSpiny(x: number, y: number, frame: number, hit: boolean) {
    let sx = x - 5;
    let sy = y - 10;
    let col = SPRITE_COLOR(COL_SPINY);

    if (hit) {
      display.fillRect(sx + 2, sy + 1, 2, 2, col);
      display.fillRect(sx + 6, sy + 1, 2, 2, col);

      display.fillRect(sx + 1, sy + 3, 8, 4, col);

      display.drawPixel(sx + 1, sy + 7, col);
      display.drawPixel(sx + 2, sy + 8, col);
      display.drawPixel(sx + 4, sy + 7, col);
      display.drawPixel(sx + 5, sy + 8, col);
      display.drawPixel(sx + 7, sy + 7, col);
      display.drawPixel(sx + 8, sy + 8, col);
      return;
    }

    display.drawPixel(sx + 1, sy + 1, col);
    display.drawPixel(sx + 2, sy, col);
    display.drawPixel(sx + 4, sy + 1, col);
    display.drawPixel(sx + 5, sy, col);
    display.drawPixel(sx + 7, sy + 1, col);
    display.drawPixel(sx + 8, sy, col);

    display.fillRect(sx + 1, sy + 2, 8, 2, col);
    display.fillRect(sx, sy + 4, 10, 2, col);

    display.drawPixel(sx + 2, sy + 4, DISPLAY_BLACK);
    display.drawPixel(sx + 4, sy + 4, DISPLAY_BLACK);

    display.fillRect(sx + 1, sy + 6, 8, 2, col);

    if (Math.trunc(frame / 4) % 2 == 0) {
      display.fillRect(sx + 1, sy + 8, 3, 2, col);
      display.fillRect(sx + 6, sy + 8, 3, 2, col);
    } else {
      display.fillRect(sx + 2, sy + 8, 3, 2, col);
      display.fillRect(sx + 5, sy + 8, 3, 2, col);
    }
  }

  function drawEnemy(e: Enemy) {
    if (e.type == ENEMY_NONE || e.state == ENEMY_DEAD) return;
    if (e.x < -10 || e.x > SCREEN_WIDTH + 10) return;

    let y = mario_base_y;

    if (e.state == ENEMY_HIT) {
      y = mario_base_y + Math.trunc(enemyFallY);
      if (y > SCREEN_HEIGHT + 10) return;
    }

    if (e.type == ENEMY_GOOMBA) {
      drawGoomba(Math.trunc(e.x), y, e.walkFrame, e.state == ENEMY_SQUASHING);
    } else if (e.type == ENEMY_KOOPA) {
      drawKoopa(
        Math.trunc(e.x),
        y,
        e.walkFrame,
        e.state == ENEMY_SHELL_SLIDING,
        !e.fromRight,
      );
    } else {
      drawSpiny(Math.trunc(e.x), y, e.walkFrame, e.state == ENEMY_HIT);
    }
  }

  function drawMarioFireball(fb: Fireball) {
    if (!fb.active) return;
    let fx = Math.trunc(fb.x);
    let fy = Math.trunc(fb.y);
    let col = SPRITE_COLOR(COL_FIREBALL);

    display.fillRect(fx + 1, fy, 2, 1, col);
    display.fillRect(fx, fy + 1, 4, 2, col);
    display.fillRect(fx + 1, fy + 3, 2, 1, col);
  }

  function drawKoopa(
    x: number,
    y: number,
    frame: number,
    shellOnly: boolean,
    facingRight: boolean,
  ) {
    let sx = x - 5;
    let sy = y - 10;
    let col = SPRITE_COLOR(COL_KOOPA);

    if (shellOnly) {
      display.fillRect(sx + 1, sy + 4, 8, 4, col);
      display.fillRect(sx + 2, sy + 3, 6, 1, col);
      display.fillRect(sx + 2, sy + 8, 6, 1, col);

      display.drawPixel(sx + 4, sy + 5, DISPLAY_BLACK);
      display.drawPixel(sx + 5, sy + 5, DISPLAY_BLACK);
      display.drawPixel(sx + 4, sy + 6, DISPLAY_BLACK);
      display.drawPixel(sx + 5, sy + 6, DISPLAY_BLACK);
      return;
    }

    if (facingRight) {
      display.fillRect(sx + 7, sy, 3, 3, col);
      display.drawPixel(sx + 8, sy + 1, DISPLAY_BLACK);
    } else {
      display.fillRect(sx, sy, 3, 3, col);
      display.drawPixel(sx + 1, sy + 1, DISPLAY_BLACK);
    }

    display.fillRect(sx + 2, sy + 2, 6, 2, col);
    display.fillRect(sx + 1, sy + 4, 8, 3, col);

    if (facingRight) {
      display.drawPixel(sx + 3, sy + 4, DISPLAY_BLACK);
      display.drawPixel(sx + 4, sy + 5, DISPLAY_BLACK);
      display.drawPixel(sx + 6, sy + 4, DISPLAY_BLACK);
    } else {
      display.drawPixel(sx + 6, sy + 4, DISPLAY_BLACK);
      display.drawPixel(sx + 5, sy + 5, DISPLAY_BLACK);
      display.drawPixel(sx + 3, sy + 4, DISPLAY_BLACK);
    }

    display.fillRect(sx + 2, sy + 7, 6, 1, col);

    if (Math.trunc(frame / 4) % 2 == 0) {
      display.fillRect(sx + 1, sy + 8, 3, 2, col);
      display.fillRect(sx + 6, sy + 8, 3, 2, col);
    } else {
      display.fillRect(sx + 2, sy + 8, 3, 2, col);
      display.fillRect(sx + 5, sy + 8, 3, 2, col);
    }
  }

  function drawStarSprite(x: number, y: number, frame: number) {
    let sx = x - 3;
    let sy = Math.trunc(y) - 3;
    let col = SPRITE_COLOR(COL_STAR);

    if (Math.trunc(frame / 4) % 2 == 0) {
      display.drawPixel(sx + 3, sy, col);
      display.fillRect(sx + 1, sy + 1, 5, 1, col);
      display.fillRect(sx, sy + 2, 7, 2, col);
      display.fillRect(sx + 1, sy + 4, 5, 1, col);
      display.drawPixel(sx + 1, sy + 5, col);
      display.drawPixel(sx + 5, sy + 5, col);

      display.drawPixel(sx + 3, sy + 2, DISPLAY_BLACK);
    } else {
      display.fillRect(sx + 2, sy, 3, 1, col);
      display.fillRect(sx, sy + 1, 7, 1, col);
      display.fillRect(sx + 1, sy + 2, 5, 2, col);
      display.fillRect(sx, sy + 4, 7, 1, col);
      display.fillRect(sx + 2, sy + 5, 3, 1, col);
      display.drawPixel(sx + 3, sy + 3, DISPLAY_BLACK);
    }
  }

  function drawMushroomSprite(x: number, y: number, frame: number) {
    let sx = x - 4;
    let sy = y - 10;
    let col = SPRITE_COLOR(COL_MUSHROOM);

    display.fillRect(sx + 2, sy, 4, 1, col);
    display.fillRect(sx + 1, sy + 1, 6, 1, col);
    display.fillRect(sx, sy + 2, 8, 3, col);

    display.drawPixel(sx + 3, sy + 2, DISPLAY_BLACK);
    display.drawPixel(sx + 4, sy + 2, DISPLAY_BLACK);
    display.drawPixel(sx + 3, sy + 3, DISPLAY_BLACK);
    display.drawPixel(sx + 4, sy + 3, DISPLAY_BLACK);

    display.fillRect(sx + 1, sy + 5, 6, 2, col);
    display.drawPixel(sx + 2, sy + 5, DISPLAY_BLACK);
    display.drawPixel(sx + 4, sy + 5, DISPLAY_BLACK);

    display.fillRect(sx + 2, sy + 7, 4, 3, col);
  }

  function drawBigMario(
    x: number,
    y: number,
    facingRight: boolean,
    frame: number,
  ) {
    if (x < -12 || x > SCREEN_WIDTH + 12) return;
    let sx = x - 5;
    let sy = y - 13;

    let hat = SPRITE_COLOR(COL_MARIO_HAT);
    let skin = SPRITE_COLOR(COL_MARIO_SKIN);
    let overalls = SPRITE_COLOR(COL_MARIO_OVERALLS);
    let shoes = SPRITE_COLOR(COL_MARIO_SHOES);

    display.fillRect(sx + 2, sy, 6, 2, hat);
    if (facingRight) {
      display.drawPixel(sx + 8, sy + 1, hat);
    } else {
      display.drawPixel(sx + 1, sy + 1, hat);
    }

    display.fillRect(sx + 2, sy + 2, 6, 3, skin);

    display.fillRect(sx + 1, sy + 5, 8, 3, overalls);

    if (facingRight) {
      display.drawPixel(sx, sy + 6, skin);
      display.drawPixel(sx + 9, sy + 5 + (frame % 2), skin);
    } else {
      display.drawPixel(sx + 9, sy + 6, skin);
      display.drawPixel(sx, sy + 5 + (frame % 2), skin);
    }

    if (frame % 2 == 0) {
      display.fillRect(sx + 1, sy + 8, 3, 4, shoes);
      display.fillRect(sx + 5, sy + 8, 3, 4, shoes);
    } else {
      display.fillRect(sx, sy + 8, 3, 4, shoes);
      display.fillRect(sx + 6, sy + 8, 3, 4, shoes);
    }
  }

  return {
    start: startIdleEncounter,
    abort: abortEncounter,
    step: (ms: number, seconds: number, allow: boolean) => {
      now = ms;
      if (host.phase.startsWith('encounter')) updateIdleEncounter();
      else if (
        allow &&
        host.phase === 'idle' &&
        seconds < 50 &&
        now - lastEncounterEnd >= nextEncounterDelay
      )
        startIdleEncounter();
    },
    reschedule: () => {
      lastEncounterEnd = now;
      nextEncounterDelay = rollEncounterDelay();
    },
    get count() {
      return marioCoins % 100;
    },
    get variation() {
      return encounterVariation;
    },
    get big() {
      return (
        marioGrowthTimer > 0 || (marioStarPowered && marioStarTimer % 3 !== 0)
      );
    },
    draw: (p: Paint) => {
      paint = p;
      drawEnemy(currentEnemy);
      if (secondEnemyActive) drawEnemy(secondEnemy);
      drawMarioFireball(marioFireball);
      if (marioStar.active)
        drawStarSprite(
          Math.trunc(marioStar.x),
          Math.trunc(marioStar.y),
          marioStar.frame,
        );
      if (marioMushroom.active)
        drawMushroomSprite(
          Math.trunc(marioMushroom.x),
          62,
          marioMushroom.frame,
        );
      for (const c of coins) drawCoin(c);
    },
    drawBig: (p: Paint) => {
      paint = p;
      drawBigMario(
        Math.trunc(host.x),
        62 + Math.trunc(host.jump),
        host.facingRight,
        host.frame,
      );
    },
  };
}
