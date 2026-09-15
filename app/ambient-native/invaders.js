// Generated from Keralots/AnimatedPixelClock by scripts/port-ambient.py.
// Keep upstream state transitions; regenerate rather than hand editing.
export function createEffect(env) {
const {display,millis,random,drawSpaceCharacter,drawPacman}=env;
const SCREEN_WIDTH=128,SCREEN_HEIGHT=64,DISPLAY_BLACK=0,DISPLAY_WHITE=0xffff,COL_PACMAN=0xffe0;
const SPRITE_COLOR=x=>x, min=Math.min, abs=Math.abs, fabsf=Math.abs, sinf=Math.sin;
let lastBomb=0;

const INV_ROWS = 4;
const INV_COLS = 6;
const INV_COUNT = (INV_ROWS * INV_COLS);
const INV_COL_STEP = 15     ;
const INV_ROW_STEP = 12     ;
const INV_MARGIN = 8        ;
const INV_STEP_X = 3        ;
const INV_DROP = 6          ;
const INV_TOP_Y = 10        ;
const CANNON_Y = 60         ;

const COL_CANNON = 0x07E0 ;
const COL_PBULLET = 0xFFFF ;
const COL_BOMB = 0xFC00 ;
const COL_UFO = 0xF81F ;
const COL_BOOM_A = 0xFFE0 ;
const COL_BOOM_B = 0xFC00 ;

let invAlive=Array(INV_COUNT).fill(false);
let invAliveCount = 0;
let fleetOriginX = 0;      
let fleetOriginY = INV_TOP_Y;
let fleetDir = 1;          
let legFrame = 0;
let lastMarch = 0;

let cannonX = SCREEN_WIDTH / 2.0;
let lastCannonFire = 0;
let cannonHitTimer = 0;   

let pBullets=Array.from({length:3},()=>({x:0,y:0,active:false}));           
let bombs=Array.from({length:4},()=>({x:0,y:0,active:false}));              
let booms=Array.from({length:10},()=>({x:0,y:0,age:0,active:false}));

let ufo = {x:0,dir:0,active:false,alive:false};
let ufoNextSpawn = 0;

let invInit = false;
let lastFrame = 0;

function cellX(col) { return fleetOriginX + col * INV_COL_STEP; }
function cellY(row) { return fleetOriginY + row * INV_ROW_STEP; }

function spawnWave() {
  for (let i = 0; i < INV_COUNT; i++) invAlive[i] = true;
  invAliveCount = INV_COUNT;
  let fleetWidth = (INV_COLS - 1) * INV_COL_STEP;
  fleetOriginX = Math.trunc((SCREEN_WIDTH - fleetWidth) / 2);
  fleetOriginY = INV_TOP_Y;
  fleetDir = 1;
  legFrame = 0;
}

function spawnBoom(x, y) {
  for (let i = 0; i < booms.length; i++) {
    if (!booms[i].active) {
      booms[i] = {x, y, age:0, active:true};
      return;
    }
  }
}

function livingColumnBounds() {
  let loCol = INV_COLS, hiCol = -1;
  for (let c = 0; c < INV_COLS; c++) {
    for (let r = 0; r < INV_ROWS; r++) {
      if (invAlive[r * INV_COLS + c]) {
        if (c < loCol) loCol = c;
        if (c > hiCol) hiCol = c;
        break;
      }
    }
  }
return [loCol,hiCol];
}

function bottomRowInColumn(col) {
  for (let r = INV_ROWS - 1; r >= 0; r--) {
    if (invAlive[r * INV_COLS + col]) return r;
  }
  return -1;
}

function marchStep() {
  let [loCol, hiCol] = livingColumnBounds();
  if (hiCol < 0) return;  

  let leftEdge = cellX(loCol) - 5 + fleetDir * INV_STEP_X;
  let rightEdge = cellX(hiCol) + 5 + fleetDir * INV_STEP_X;

  if (leftEdge <= INV_MARGIN || rightEdge >= SCREEN_WIDTH - INV_MARGIN) {
    fleetDir = -fleetDir;
    fleetOriginY += INV_DROP;
  } else {
    fleetOriginX += fleetDir * INV_STEP_X;
  }
  legFrame ^= 1;
}

function fireCannon() {
  for (let i = 0; i < pBullets.length; i++) {
    if (!pBullets[i].active) {
      pBullets[i] = {x:cannonX, y:CANNON_Y - 3, active:true};
      return;
    }
  }
}

function dropBomb() {
  
  let tries = 6;
  while (tries--) {
    let c = random(INV_COLS);
    let r = bottomRowInColumn(c);
    if (r < 0) continue;
    for (let i = 0; i < bombs.length; i++) {
      if (!bombs[i].active) {
        bombs[i] = {x:cellX(c), y:cellY(r) + 8, active:true};
        return;
      }
    }
    return;
  }
}

function hitInvader(x, y) {
  for (let r = 0; r < INV_ROWS; r++) {
    for (let c = 0; c < INV_COLS; c++) {
      let idx = r * INV_COLS + c;
      if (!invAlive[idx]) continue;
      let ix = cellX(c), iy = cellY(r);
      if (x >= ix - 6 && x <= ix + 6 && y >= iy - 5 && y <= iy + 9) {
        invAlive[idx] = false;
        invAliveCount--;
        spawnBoom(ix, iy);
        return true;
      }
    }
  }
  return false;
}

function drawCannon(cx, cy) {
  if (cannonHitTimer > 0) {
    
    if (cannonHitTimer & 1) {
      display.drawPixel(cx - 2, cy, COL_BOOM_A);
      display.drawPixel(cx + 2, cy + 2, COL_BOOM_B);
      display.drawPixel(cx, cy - 1, COL_BOOM_A);
      display.drawPixel(cx + 3, cy, COL_BOOM_B);
    }
    return;
  }
  display.fillRect(cx - 4, cy + 2, 9, 3, COL_CANNON);  
  display.fillRect(cx - 1, cy, 3, 2, COL_CANNON);      
  display.drawPixel(cx, cy - 1, COL_CANNON);           
}

function drawBoom(b) {
  let rad = b.age;  
  let col = (b.age < 2) ? COL_BOOM_A : COL_BOOM_B;
  display.drawPixel(Math.trunc(b.x), Math.trunc(b.y), col);
  display.drawPixel(Math.trunc(b.x) - rad, Math.trunc(b.y), col);
  display.drawPixel(Math.trunc(b.x) + rad, Math.trunc(b.y), col);
  display.drawPixel(Math.trunc(b.x), Math.trunc(b.y) - rad, col);
  display.drawPixel(Math.trunc(b.x), Math.trunc(b.y) + rad, col);
  display.drawPixel(Math.trunc(b.x) - rad, Math.trunc(b.y) - rad, col);
  display.drawPixel(Math.trunc(b.x) + rad, Math.trunc(b.y) + rad, col);
  display.drawPixel(Math.trunc(b.x) - rad, Math.trunc(b.y) + rad, col);
  display.drawPixel(Math.trunc(b.x) + rad, Math.trunc(b.y) - rad, col);
}

function drawUfo(x, y) {
  display.fillRect(x - 4, y, 9, 2, COL_UFO);       
  display.fillRect(x - 2, y - 1, 5, 1, COL_UFO);   
  display.drawPixel(x - 5, y + 1, COL_UFO);
  display.drawPixel(x + 5, y + 1, COL_UFO);
}

function ambientInvadersFrame() {
  let now = millis();
  if (!invInit) {
    spawnWave();
    for (const b of pBullets) b.active = false;
    for (const b of bombs) b.active = false;
    for (const b of booms) b.active = false;
    ufo.active = false;
    ufoNextSpawn = now + random(4000, 9000);
    lastMarch = now;
    lastFrame = now;
    lastCannonFire = now;
    invInit = true;
  }

  let dt = (now - lastFrame) / 1000.0;
  if (dt > 0.1) dt = 0.1;
  lastFrame = now;

  let marchInterval = 650 - (INV_COUNT - invAliveCount) * 18;
  if (marchInterval < 90) marchInterval = 90;
  if (now - lastMarch >= marchInterval) {
    lastMarch = now;
    marchStep();
  }

  if (invAliveCount == 0 ||
      cellY(INV_ROWS - 1) + 8 >= CANNON_Y - 2) {
    spawnWave();
  }

  if (cannonHitTimer > 0) {
    cannonHitTimer--;
  } else {
    
    let threatX = 1e9;
    for (const b of bombs) {
      if (!b.active) continue;
      if (b.y < CANNON_Y && fabsf(b.x - cannonX) < 12.0) {
        if (fabsf(b.x - cannonX) < fabsf(threatX - cannonX)) threatX = b.x;
      }
    }

    let targetX = cannonX;
    let best = 1e9;
    let dodging = (threatX < 1e8);
    if (dodging) {
      
      targetX = (threatX > cannonX) ? cannonX - 26 : cannonX + 26;
      if (targetX < 6) targetX = cannonX + 26;
      if (targetX > SCREEN_WIDTH - 6) targetX = cannonX - 26;
    } else {
      for (let r = 0; r < INV_ROWS; r++) {
        for (let c = 0; c < INV_COLS; c++) {
          if (!invAlive[r * INV_COLS + c]) continue;
          let d = fabsf(cellX(c) - cannonX);
          if (d < best) { best = d; targetX = cellX(c); }
        }
      }
    }

    let step = (dodging ? 75.0 : 55.0) * dt;
    if (cannonX < targetX - 0.5) cannonX += min(step, targetX - cannonX);
    else if (cannonX > targetX + 0.5) cannonX -= min(step, cannonX - targetX);
    if (cannonX < 6) cannonX = 6;
    if (cannonX > SCREEN_WIDTH - 6) cannonX = SCREEN_WIDTH - 6;

    if (!dodging && now - lastCannonFire > 700 && best < 6.0) {
      fireCannon();
      lastCannonFire = now;
    }
  }

  for (const b of pBullets) {
    if (!b.active) continue;
    b.y -= 130.0 * dt;
    if (b.y < 0) { b.active = false; continue; }
    if (ufo.active && b.y <= 7 &&
        b.x >= ufo.x - 5 && b.x <= ufo.x + 5) {
      spawnBoom(ufo.x, 5);
      ufo.active = false;
      b.active = false;
      continue;
    }
    if (hitInvader(b.x, b.y)) b.active = false;
  }

  if (now - lastBomb > 1300 && invAliveCount > 0) {
    lastBomb = now;
    dropBomb();
  }
  for (const b of bombs) {
    if (!b.active) continue;
    b.y += 55.0 * dt;
    if (b.y > SCREEN_HEIGHT) { b.active = false; continue; }
    if (cannonHitTimer == 0 && b.y >= CANNON_Y - 2 &&
        b.x >= cannonX - 5 && b.x <= cannonX + 5) {
      spawnBoom(cannonX, CANNON_Y);
      cannonHitTimer = 30;  
      b.active = false;
    }
  }

  if (!ufo.active && now >= ufoNextSpawn) {
    ufo.active = true;
    ufo.alive = true;
    ufo.dir = (random(2) == 0) ? 1 : -1;
    ufo.x = (ufo.dir == 1) ? -6 : SCREEN_WIDTH + 6;
    ufoNextSpawn = now + random(9000, 18000);
  }
  if (ufo.active) {
    ufo.x += ufo.dir * 40.0 * dt;
    if (ufo.x < -8 || ufo.x > SCREEN_WIDTH + 8) ufo.active = false;
  }

  for (const b of booms) {
    if (!b.active) continue;
    b.age++;
    if (b.age > 4) b.active = false;
  }

  if (ufo.active) drawUfo(Math.trunc(ufo.x), 5);

  for (let r = 0; r < INV_ROWS; r++) {
    for (let c = 0; c < INV_COLS; c++) {
      if (!invAlive[r * INV_COLS + c]) continue;
      drawSpaceCharacter(cellX(c), cellY(r), legFrame, 0);
    }
  }

  drawCannon(Math.trunc(cannonX), CANNON_Y);

  for (const b of pBullets) {
    if (b.active) {
      display.drawPixel(Math.trunc(b.x), Math.trunc(b.y), COL_PBULLET);
      display.drawPixel(Math.trunc(b.x), Math.trunc(b.y) - 1, COL_PBULLET);
    }
  }
  for (const b of bombs) {
    if (b.active) {
      display.drawPixel(Math.trunc(b.x), Math.trunc(b.y), COL_BOMB);
      display.drawPixel(Math.trunc(b.x), Math.trunc(b.y) - 1, COL_BOMB);
    }
  }
  for (const b of booms) {
    if (b.active) drawBoom(b);
  }
}

return ambientInvadersFrame;
}
