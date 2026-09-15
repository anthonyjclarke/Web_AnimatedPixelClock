// Generated from Keralots/AnimatedPixelClock by scripts/port-ambient.py.
// Keep upstream state transitions; regenerate rather than hand editing.
export function createEffect(env) {
const {display,millis,random,drawSpaceCharacter,drawPacman}=env;
const SCREEN_WIDTH=128,SCREEN_HEIGHT=64,DISPLAY_BLACK=0,DISPLAY_WHITE=0xffff,COL_PACMAN=0xffe0;
const SPRITE_COLOR=x=>x, min=Math.min, abs=Math.abs, fabsf=Math.abs, sinf=Math.sin;


const AQ_FISH = 5;
const AQ_BUBBLES = 6;
const AQ_KELP = 3;
const AQ_FLOOR_Y = (SCREEN_HEIGHT - 2);

let fish=[
    {x:10,y: 12,speed: 14.0,color: 0xFC00},    
    {x:60,y: 22,speed: -10.0,color: 0x07FF},   
    {x:100,y: 34,speed: 8.0,color: 0xFFE0},    
    {x:30,y: 44,speed: -16.0,color: 0xF81F},   
    {x:80,y: 52,speed: 11.0,color: 0x87F0},    
];
let bubbles=Array.from({length:AQ_BUBBLES},()=>({x:0,y:0,speed:0,sway:0}));
let aqInit = false;
let lastAqUpdate = 0;

const KELP_X = [14, 58, 108];
const KELP_H = [26, 18, 30];

function respawnBubble(b) {
  b.x = random(4, SCREEN_WIDTH - 4);
  b.y = AQ_FLOOR_Y;
  b.speed = random(8, 18);
  b.sway = random(0, 628) / 100.0;
}

function drawFish(f, tailUp) {
  let x = Math.trunc(f.x);
  let right = f.speed > 0;
  let bodyX = x;
  display.fillCircle(bodyX, f.y, 2, f.color);
  display.fillCircle(bodyX + (right ? 2 : -2), f.y, 1, f.color);
  let tailBase = bodyX + (right ? -3 : 3);
  let tailTip = tailBase + (right ? -3 : 3);
  display.fillTriangle(tailBase, f.y, tailTip, f.y - (tailUp ? 3 : 1),
                       tailTip, f.y + (tailUp ? 1 : 3), f.color);
  display.drawPixel(bodyX + (right ? 3 : -3), f.y - 1, DISPLAY_BLACK);
}

function ambientAquariumFrame() {
  let now = millis();
  if (!aqInit) {
    for (let i = 0; i < AQ_BUBBLES; i++) {
      respawnBubble(bubbles[i]);
      bubbles[i].y = random(10, AQ_FLOOR_Y);
    }
    lastAqUpdate = now;
    aqInit = true;
  }

  let dt = (now - lastAqUpdate) / 1000.0;
  if (dt > 0.1) dt = 0.1;
  lastAqUpdate = now;
  let t = now / 1000.0;

  display.drawFastHLine(0, AQ_FLOOR_Y, SCREEN_WIDTH, 0xCDAC);
  display.drawFastHLine(0, AQ_FLOOR_Y + 1, SCREEN_WIDTH, 0x8B44);
  for (let x = 6; x < SCREEN_WIDTH; x += 17) {
    display.drawPixel(x, AQ_FLOOR_Y, 0x8B44);
  }

  for (let k = 0; k < AQ_KELP; k++) {
    for (let i = 0; i < KELP_H[k]; i++) {
      let y = AQ_FLOOR_Y - 1 - i;
      let x = KELP_X[k] + Math.trunc((2.5 * sinf(t * 1.3 + k * 2.0 + i * 0.28)));
      display.drawPixel(x, y, 0x0560);
      if (i % 5 == 3) {
        display.drawPixel(x + ((i % 2) ? 1 : -1), y, 0x0560);
      }
    }
  }

  for (let i = 0; i < AQ_BUBBLES; i++) {
    let b = bubbles[i];
    b.y -= b.speed * dt;
    if (b.y < 2) {
      respawnBubble(b);
      continue;
    }
    let bx = Math.trunc((b.x + 2.0 * sinf(t * 2.0 + b.sway)));
    display.drawPixel(bx, Math.trunc(b.y), 0x861F);
  }

  for (let i = 0; i < AQ_FISH; i++) {
    let f = fish[i];
    f.x += f.speed * dt;
    if (f.speed > 0 && f.x > SCREEN_WIDTH + 8) f.x = -8;
    if (f.speed < 0 && f.x < -8) f.x = SCREEN_WIDTH + 8;
    let tailUp = (Math.trunc(now / 250) + i) % 2 == 0;
    drawFish(f, tailUp);
  }
}

return ambientAquariumFrame;
}
