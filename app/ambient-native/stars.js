// Generated from Keralots/AnimatedPixelClock by scripts/port-ambient.py.
// Keep upstream state transitions; regenerate rather than hand editing.
export function createEffect(env) {
const {display,millis,random,drawSpaceCharacter,drawPacman}=env;
const SCREEN_WIDTH=128,SCREEN_HEIGHT=64,DISPLAY_BLACK=0,DISPLAY_WHITE=0xffff,COL_PACMAN=0xffe0;
const SPRITE_COLOR=x=>x, min=Math.min, abs=Math.abs, fabsf=Math.abs, sinf=Math.sin;


const STAR_COUNT = 96;

let stars=Array.from({length:STAR_COUNT},()=>({x:0,y:0,z:0}));
let starsInit = false;
let lastStarUpdate = 0;

function respawnStar(s) {
  s.x = random(-1000, 1001) / 1000.0;
  s.y = random(-1000, 1001) / 1000.0;
  s.z = random(400, 1001) / 1000.0;
}

function ambientStarsFrame() {
  let now = millis();
  if (!starsInit) {
    for (let i = 0; i < STAR_COUNT; i++) {
      respawnStar(stars[i]);
      stars[i].z = random(50, 1001) / 1000.0;  
    }
    lastStarUpdate = now;
    starsInit = true;
  }

  let dt = (now - lastStarUpdate) / 1000.0;
  if (dt > 0.1) dt = 0.1;
  lastStarUpdate = now;

  for (let i = 0; i < STAR_COUNT; i++) {
    let s = stars[i];
    s.z -= 0.55 * dt;
    if (s.z <= 0.05) {
      respawnStar(s);
      continue;
    }
    let px = SCREEN_WIDTH / 2 + Math.trunc((s.x / s.z * 44));
    let py = SCREEN_HEIGHT / 2 + Math.trunc((s.y / s.z * 26));
    if (px < 0 || px >= SCREEN_WIDTH || py < 0 || py >= SCREEN_HEIGHT) {
      respawnStar(s);
      continue;
    }
    
    if (s.z > 0.6) {
      display.drawPixel(px, py, 0x4208);           
    } else if (s.z > 0.3) {
      display.drawPixel(px, py, 0x8410);           
    } else {
      display.drawPixel(px, py, DISPLAY_WHITE);
      display.drawPixel(px + 1, py, 0x8410);       
    }
  }
}

return ambientStarsFrame;
}
