// Generated from Keralots/AnimatedPixelClock by scripts/port-ambient.py.
// Keep upstream state transitions; regenerate rather than hand editing.
export function createEffect(env) {
const {display,millis,random,drawSpaceCharacter,drawPacman}=env;
const SCREEN_WIDTH=128,SCREEN_HEIGHT=64,DISPLAY_BLACK=0,DISPLAY_WHITE=0xffff,COL_PACMAN=0xffe0;
const SPRITE_COLOR=x=>x, min=Math.min, abs=Math.abs, fabsf=Math.abs, sinf=Math.sin;


const MZ_COLS = 15;
const MZ_ROWS = 7;
const MZ_CELL = 8           ;
const MZ_OX = 4             ;
const MZ_OY = 4             ;
const GHOST_COUNT = 4;

const SPEED_PAC = 48.0;
const SPEED_GHOST = 36.0;
const SPEED_FRIGHT = 24.0;
const SPEED_EYES = 104.0;

const SCARE_RANGE = 4;
const FLEE_W = 10.0;
const STRAIGHT_BONUS = 2.0;
const REVERSE_PEN = 5.0;
const HUNT_RANGE = 8;

const SCATTER_MS = 6000;
const CHASE_MS = 18000;

const GHOST_COLORS = [
  0xF800,  
  0xFDB8,  
  0x07FF,  
  0xFD20,  
];
const COL_WALL = 0x021F    ;
const COL_FRIGHT = 0x001F    ;
const COL_FRIGHT2 = 0xFFFF   ;
const COL_EYE = 0xFFFF;
const COL_PUPIL = 0x001F;
const COL_DOT = 0xFED7       ;
const COL_POWER = 0xFED7;

const PEN_COL = 7;
const PEN_ROW = 3;

const SCATTER_C = [MZ_COLS - 1, 0, MZ_COLS - 1, 0];
const SCATTER_R = [0, 0, MZ_ROWS - 1, MZ_ROWS - 1];

const G_NORMAL=0,G_FRIGHT=1,G_EYES=2;

let pac={};
let pacLastDx = 1, pacLastDy = 0;
let gh=Array.from({length:GHOST_COUNT},()=>({}));
let ghMode=Array(GHOST_COUNT).fill(0);

let dot=Array.from({length:MZ_ROWS},()=>Array(MZ_COLS).fill(false));
let power=Array.from({length:MZ_ROWS},()=>Array(MZ_COLS).fill(false));
let dotsLeft = 0;

let powerUntil = 0;
let powerActive = false;
let deathTimer = 0;   

let ghostPhase = 0;    
let phaseUntil = 0;

let mouthFrame = 0;
let skirtFrame = 0;
let mzInit = false;
let lastFrame = 0, lastMouth = 0, lastSkirt = 0;

function ccx(col) { return MZ_OX + col * MZ_CELL + MZ_CELL / 2; }
function ccy(row) { return MZ_OY + row * MZ_CELL + MZ_CELL / 2; }

function isWall(c, r) {
  if (c < 0 || c >= MZ_COLS || r < 0 || r >= MZ_ROWS) return true;
  return (c >= 2 && c <= MZ_COLS - 2 && r >= 2 && r <= MZ_ROWS - 2
          && (c % 2 == 0) && (r % 2 == 0));
}

const POWER_CELLS=[
  {c:0,r: 0}, {c:MZ_COLS - 1,r: 0}, {c:0,r: MZ_ROWS - 1}, {c:MZ_COLS - 1,r: MZ_ROWS - 1},
];

function layoutBoard() {
  dotsLeft = 0;
  for (let r = 0; r < MZ_ROWS; r++) {
    for (let c = 0; c < MZ_COLS; c++) {
      dot[r][c] = false;
      power[r][c] = false;
      if (!isWall(c, r)) { dot[r][c] = true; dotsLeft++; }
    }
  }
  for (const p of POWER_CELLS) {
    if (!isWall(p.c, p.r)) { power[p.r][p.c] = true; dot[p.r][p.c] = false; }
  }
}

function placeActor(a, c, r, dx, dy) {
  a.col = a.tcol = c;
  a.row = a.trow = r;
  a.x = ccx(c);
  a.y = ccy(r);
  a.dx = dx;
  a.dy = dy;
}

function resetPositions() {
  placeActor(pac, 1, MZ_ROWS - 1, 1, 0);
  pacLastDx = 1; pacLastDy = 0;
  const gc = [4, 6, 8, 10];
  for (let i = 0; i < GHOST_COUNT; i++) {
    placeActor(gh[i], gc[i], PEN_ROW, (i & 1) ? 1 : -1, 0);
    ghMode[i] = G_NORMAL;
  }
  powerActive = false;
  ghostPhase = 0;                       
  phaseUntil = millis() + SCATTER_MS;
}

function nearestDotDist(c, r) {
  let best = 9999;
  for (let rr = 0; rr < MZ_ROWS; rr++) {
    for (let cc = 0; cc < MZ_COLS; cc++) {
      if (dot[rr][cc] || power[rr][cc]) {
        let d = abs(cc - c) + abs(rr - r);
        if (d < best) best = d;
      }
    }
  }
  return best;
}

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function choosePacDir(a) {
  
  let threat = 999;
  for (let g = 0; g < GHOST_COUNT; g++) {
    if (ghMode[g] != G_NORMAL) continue;
    let d = abs(gh[g].col - a.col) + abs(gh[g].row - a.row);
    if (d < threat) threat = d;
  }
  let scared = (threat <= SCARE_RANGE);

  let bestDx = a.dx, bestDy = a.dy;
  let bestScore = 1e9;
  let found = false;
  let order = [0, 1, 2, 3];
  for (let i = 3; i > 0; i--) { let j = random(i + 1); let t = order[i]; order[i] = order[j]; order[j] = t; }
  for (let k = 0; k < 4; k++) {
    let dx = DIRS[order[k]][0], dy = DIRS[order[k]][1];
    let nc = a.col + dx, nr = a.row + dy;
    if (isWall(nc, nr)) continue;

    let score;
    if (scared) {

      let mind = 999;
      for (let g = 0; g < GHOST_COUNT; g++) {
        if (ghMode[g] != G_NORMAL) continue;
        let d = abs(gh[g].col - nc) + abs(gh[g].row - nr);
        if (d < mind) mind = d;
      }
      score = -mind * FLEE_W + nearestDotDist(nc, nr) * 0.2;   
    } else {
      score = nearestDotDist(nc, nr);                    
    }
    
    for (let g = 0; g < GHOST_COUNT; g++) {
      if (ghMode[g] != G_FRIGHT) continue;
      let d = abs(gh[g].col - nc) + abs(gh[g].row - nr);
      if (d < HUNT_RANGE) score -= (HUNT_RANGE - d) * 2.0;
    }

    if (dx == a.dx && dy == a.dy) score -= STRAIGHT_BONUS;
    else if (dx == -a.dx && dy == -a.dy) score += REVERSE_PEN;

    if (score < bestScore) { bestScore = score; bestDx = dx; bestDy = dy; found = true; }
  }
  if (!found) { bestDx = -a.dx; bestDy = -a.dy; }   
  a.dx = bestDx; a.dy = bestDy;
  a.tcol = a.col + bestDx; a.trow = a.row + bestDy;
}

function chooseGhostDir(a, mode, tc, tr) {
  let bestDx = a.dx, bestDy = a.dy;
  let bestScore = (mode == G_FRIGHT) ? -1 : 99999;
  let found = false;
  for (let k = 0; k < 4; k++) {
    let dx = DIRS[k][0], dy = DIRS[k][1];
    if (dx == -a.dx && dy == -a.dy) continue;
    let nc = a.col + dx, nr = a.row + dy;
    if (isWall(nc, nr)) continue;
    let d = abs(nc - tc) + abs(nr - tr);
    if (mode == G_FRIGHT) {
      if (d > bestScore) { bestScore = d; bestDx = dx; bestDy = dy; found = true; }
    } else {
      if (d < bestScore) { bestScore = d; bestDx = dx; bestDy = dy; found = true; }
    }
  }
  if (!found) { bestDx = -a.dx; bestDy = -a.dy; }
  a.dx = bestDx; a.dy = bestDy;
  a.tcol = a.col + bestDx; a.trow = a.row + bestDy;
}

function ghostTarget(i) {
  let tc,tr; if (ghMode[i] == G_EYES) return [PEN_COL,PEN_ROW];
  if (ghMode[i] == G_FRIGHT) return [pac.col,pac.row];  
  if (ghostPhase == 0) return [SCATTER_C[i],SCATTER_R[i]];

  let pdx = pacLastDx, pdy = pacLastDy;
  switch (i) {
    case 0:  tc = pac.col;            tr = pac.row;            break;  
    case 1:  tc = pac.col + 4 * pdx;  tr = pac.row + 4 * pdy;  break;  
    case 2:  tc = 2 * pac.col - gh[0].col; tr = 2 * pac.row - gh[0].row; break;  
    default: {                                                          
      let cd = abs(gh[3].col - pac.col) + abs(gh[3].row - pac.row);
      if (cd > 6) { tc = pac.col; tr = pac.row; }
      else { tc = SCATTER_C[3]; tr = SCATTER_R[3]; }
    }
  }
  if (tc < 0) tc = 0; else if (tc >= MZ_COLS) tc = MZ_COLS - 1;
  if (tr < 0) tr = 0; else if (tr >= MZ_ROWS) tr = MZ_ROWS - 1;
 return [tc,tr];
}

function advanceActor(a, speed, dt) {
  let tx = ccx(a.tcol), ty = ccy(a.trow);
  let remain = fabsf(tx - a.x) + fabsf(ty - a.y);
  let move = speed * dt;
  if (move >= remain) {
    a.x = tx; a.y = ty;
    a.col = a.tcol; a.row = a.trow;
    return move - remain;
  }
  a.x += a.dx * move;
  a.y += a.dy * move;
  return -1.0;
}

function drawGhost(cx, cy, mode, bodyCol, faceDir) {
  let sx = cx - 3, sy = cy - 4;  
  if (mode == G_EYES) {
    display.fillRect(sx + 1, sy + 2, 2, 2, COL_EYE);
    display.fillRect(sx + 4, sy + 2, 2, 2, COL_EYE);
    let px = (faceDir >= 0) ? 1 : 0;
    display.drawPixel(sx + 1 + px, sy + 3, COL_PUPIL);
    display.drawPixel(sx + 4 + px, sy + 3, COL_PUPIL);
    return;
  }
  display.fillRect(sx + 1, sy, 5, 1, bodyCol);
  display.fillRect(sx, sy + 1, 7, 5, bodyCol);
  if (skirtFrame == 0) {
    display.drawPixel(sx + 0, sy + 6, bodyCol);
    display.drawPixel(sx + 2, sy + 6, bodyCol);
    display.drawPixel(sx + 4, sy + 6, bodyCol);
    display.drawPixel(sx + 6, sy + 6, bodyCol);
  } else {
    display.drawPixel(sx + 1, sy + 6, bodyCol);
    display.drawPixel(sx + 3, sy + 6, bodyCol);
    display.drawPixel(sx + 5, sy + 6, bodyCol);
  }
  if (mode == G_FRIGHT) {
    display.drawPixel(sx + 1, sy + 2, COL_EYE);
    display.drawPixel(sx + 5, sy + 2, COL_EYE);
    display.drawPixel(sx + 1, sy + 4, COL_EYE);
    display.drawPixel(sx + 3, sy + 4, COL_EYE);
    display.drawPixel(sx + 5, sy + 4, COL_EYE);
  } else {
    display.fillRect(sx + 1, sy + 2, 2, 2, COL_EYE);
    display.fillRect(sx + 4, sy + 2, 2, 2, COL_EYE);
    let px = (faceDir >= 0) ? 1 : 0;
    display.drawPixel(sx + 1 + px, sy + 3, COL_PUPIL);
    display.drawPixel(sx + 4 + px, sy + 3, COL_PUPIL);
  }
}

function pacDirCode() {
  if (pacLastDx > 0) return 1;
  if (pacLastDx < 0) return -1;
  if (pacLastDy > 0) return 2;
  return -2;
}

function ambientPacmanChaseFrame() {
  let now = millis();
  if (!mzInit) {
    layoutBoard();
    resetPositions();
    dot[pac.row][pac.col] = false;  
    lastFrame = now; lastMouth = now; lastSkirt = now;
    mzInit = true;
  }

  let dt = (now - lastFrame) / 1000.0;
  if (dt > 0.1) dt = 0.1;
  lastFrame = now;
  if (now - lastMouth > 90) { mouthFrame = (mouthFrame + 1) % 4; lastMouth = now; }
  if (now - lastSkirt > 180) { skirtFrame ^= 1; lastSkirt = now; }

  if (powerActive && now >= powerUntil) {
    powerActive = false;
    for (let i = 0; i < GHOST_COUNT; i++) if (ghMode[i] == G_FRIGHT) ghMode[i] = G_NORMAL;
  }

  if (deathTimer > 0) {
    
    deathTimer--;
    if (deathTimer == 0) resetPositions();
  } else {

    if (now >= phaseUntil) {
      ghostPhase ^= 1;
      phaseUntil = now + (ghostPhase ? CHASE_MS : SCATTER_MS);
    }

    let over = advanceActor(pac, SPEED_PAC, dt);
    if (over >= 0.0) {
      if (power[pac.row][pac.col]) {
        power[pac.row][pac.col] = false;
        powerActive = true;
        powerUntil = now + 6000;
        for (let i = 0; i < GHOST_COUNT; i++) if (ghMode[i] != G_EYES) ghMode[i] = G_FRIGHT;
      }
      if (dot[pac.row][pac.col]) { dot[pac.row][pac.col] = false; dotsLeft--; }
      if (dotsLeft == 0) { layoutBoard(); dot[pac.row][pac.col] = false; }
      choosePacDir(pac);
      pac.x += pac.dx * over; pac.y += pac.dy * over;   
    }
    if (pac.dx || pac.dy) { pacLastDx = pac.dx; pacLastDy = pac.dy; }

    for (let i = 0; i < GHOST_COUNT; i++) {
      let sp = (ghMode[i] == G_EYES) ? SPEED_EYES
                 : (ghMode[i] == G_FRIGHT) ? SPEED_FRIGHT : SPEED_GHOST;
      let gover = advanceActor(gh[i], sp, dt);
      if (gover >= 0.0) {
        if (ghMode[i] == G_EYES && gh[i].col == PEN_COL && gh[i].row == PEN_ROW) {
          ghMode[i] = G_NORMAL;
        }
        let [tc,tr] = ghostTarget(i);
        chooseGhostDir(gh[i], ghMode[i], tc, tr);
        gh[i].x += gh[i].dx * gover; gh[i].y += gh[i].dy * gover;
      }
    }

    for (let i = 0; i < GHOST_COUNT; i++) {
      if (ghMode[i] == G_EYES) continue;
      let d = fabsf(gh[i].x - pac.x) + fabsf(gh[i].y - pac.y);
      if (d < 5.0) {
        if (ghMode[i] == G_FRIGHT) {
          ghMode[i] = G_EYES;
        } else {
          deathTimer = 32;  
          break;
        }
      }
    }
  }

  display.drawRect(1, 1, 126, 62, COL_WALL);
  for (let r = 2; r <= MZ_ROWS - 2; r += 2) {
    for (let c = 2; c <= MZ_COLS - 2; c += 2) {
      display.fillRect(ccx(c) - 2, ccy(r) - 2, 5, 5, COL_WALL);
    }
  }

  for (let r = 0; r < MZ_ROWS; r++) {
    for (let c = 0; c < MZ_COLS; c++) {
      if (dot[r][c]) display.drawPixel(ccx(c), ccy(r), COL_DOT);
      else if (power[r][c] && Math.trunc(now / 250) % 2 == 0) {
        display.fillRect(ccx(c) - 1, ccy(r) - 1, 3, 3, COL_POWER);
      }
    }
  }

  let blink = powerActive && (powerUntil - now < 1500) && (Math.trunc(now / 200) % 2 == 0);
  for (let i = 0; i < GHOST_COUNT; i++) {
    let col = (ghMode[i] == G_FRIGHT) ? (blink ? COL_FRIGHT2 : COL_FRIGHT)
                                           : GHOST_COLORS[i];
    let faceDir = (gh[i].dx >= 0) ? 1 : -1;
    drawGhost(Math.trunc(gh[i].x), Math.trunc(gh[i].y), ghMode[i], col, faceDir);
  }

  if (deathTimer > 0) {
    let rad = Math.trunc((deathTimer * 4) / 32);  
    if (rad > 0) display.fillCircle(Math.trunc(pac.x), Math.trunc(pac.y), rad, SPRITE_COLOR(COL_PACMAN));
  } else {
    drawPacman(Math.trunc(pac.x), Math.trunc(pac.y), pacDirCode(), mouthFrame);
  }
}

return ambientPacmanChaseFrame;
}
