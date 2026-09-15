"""Port the four procedural upstream ambient modules to isolated JS closures.
Run with Python 3; optional first argument is the firmware checkout.
The generated code keeps upstream control flow. Platform drawing/time are injected.
"""
from pathlib import Path
import re,sys,struct
root=Path(__file__).resolve().parents[1]
src=Path(sys.argv[1]) if len(sys.argv)>1 else root.parent/'AnimatedPixelClock'
out=root/'app/ambient-native';out.mkdir(exist_ok=True)
for name,entry in [('invaders','ambientInvadersFrame'),('pacman_chase','ambientPacmanChaseFrame'),('stars','ambientStarsFrame'),('aquarium','ambientAquariumFrame')]:
 s=(src/'src/ambient'/f'ambient_{name}.cpp').read_text()
 s=re.sub(r'/\*.*?\*/|//[^\n]*','',s,flags=re.S)
 s=re.sub(r'^#include.*\n','',s,flags=re.M)
 s=re.sub(r'^#define\s+(\w+)\s+([^\n]+)',r'const \1 = \2;',s,flags=re.M)
 s=re.sub(r'struct (?:Bullet|Boom|Actor|AqFish|AqBubble|Star)\s*\{.*?\};','',s,flags=re.S)
 s=s.replace('static struct { float x; int dir; bool active; bool alive; } ufo;', 'let ufo = {x:0,dir:0,active:false,alive:false};')
 s=s.replace('enum GMode { G_NORMAL, G_FRIGHT, G_EYES };','const G_NORMAL=0,G_FRIGHT=1,G_EYES=2;')
 replacements={
  'static bool invAlive[INV_COUNT];':'let invAlive=Array(INV_COUNT).fill(false);',
  'static Bullet pBullets[3];':'let pBullets=Array.from({length:3},()=>({x:0,y:0,active:false}));',
  'static Bullet bombs[4];':'let bombs=Array.from({length:4},()=>({x:0,y:0,active:false}));',
  'static Boom booms[10];':'let booms=Array.from({length:10},()=>({x:0,y:0,age:0,active:false}));',
  'static Actor pac;':'let pac={};',
  'static Actor gh[GHOST_COUNT];':'let gh=Array.from({length:GHOST_COUNT},()=>({}));',
  'static uint8_t ghMode[GHOST_COUNT];':'let ghMode=Array(GHOST_COUNT).fill(0);',
  'static bool dot[MZ_ROWS][MZ_COLS];':'let dot=Array.from({length:MZ_ROWS},()=>Array(MZ_COLS).fill(false));',
  'static bool power[MZ_ROWS][MZ_COLS];':'let power=Array.from({length:MZ_ROWS},()=>Array(MZ_COLS).fill(false));',
  'static AqBubble bubbles[AQ_BUBBLES];':'let bubbles=Array.from({length:AQ_BUBBLES},()=>({x:0,y:0,speed:0,sway:0}));',
 }
 for a,b in replacements.items():s=s.replace(a,b)
 s=re.sub(r'static (?:Star|AmbStar) stars\[(\w+)\];',r'let stars=Array.from({length:\1},()=>({x:0,y:0,z:0}));',s)
 s=re.sub(r'static AqFish fish\[AQ_FISH\] = \{(.*?)\};',lambda m:'let fish=['+re.sub(r'\{([^,]+),([^,]+),([^,]+),([^}]+)\}',r'{x:\1,y:\2,speed:\3,color:\4}',m[1])+'];',s,flags=re.S)
 s=re.sub(r'static const struct \{ int8_t c, r; \} POWER_CELLS\[4\] = \{(.*?)\};',lambda m:'const POWER_CELLS=['+re.sub(r'\{([^,]+),([^}]+)\}',r'{c:\1,r:\2}',m[1])+'];',s,flags=re.S)
 s=re.sub(r'(?:static )?(const )?(?:int8_t|uint16_t|int) (\w+)(?:\[\w+\])+ = (\{.*?\});',lambda m:('const ' if m[1] else 'let ')+m[2]+' = '+m[3].replace('{','[').replace('}',']')+';',s,flags=re.S)
 # C++ output reference parameters become return values at the two call sites.
 s=s.replace('int& loCol, int& hiCol','').replace('loCol = INV_COLS; hiCol = -1;', 'let loCol = INV_COLS, hiCol = -1;')
 s=s.replace('\n}\n\n\nstatic int bottomRowInColumn', '\nreturn [loCol,hiCol];\n}\n\n\nstatic int bottomRowInColumn')
 s=s.replace('int loCol, hiCol;\n  livingColumnBounds(loCol, hiCol);','let [loCol, hiCol] = livingColumnBounds();')
 s=s.replace('int i, int& tc, int& tr','int i').replace('if (ghMode[i] == G_EYES) { tc = PEN_COL; tr = PEN_ROW; return; }','let tc,tr; if (ghMode[i] == G_EYES) return [PEN_COL,PEN_ROW];')
 s=s.replace('{ tc = pac.col; tr = pac.row; return; }','return [pac.col,pac.row];').replace('{ tc = SCATTER_C[i]; tr = SCATTER_R[i]; return; }','return [SCATTER_C[i],SCATTER_R[i]];')
 s=s.replace('else if (tr >= MZ_ROWS) tr = MZ_ROWS - 1;','else if (tr >= MZ_ROWS) tr = MZ_ROWS - 1;\n return [tc,tr];')
 s=s.replace('int tc, tr;\n        ghostTarget(i, tc, tr);','let [tc,tr] = ghostTarget(i);')
 s=s.replace('static unsigned long lastBomb = 0;','')
 if name=='invaders':s='let lastBomb=0;\n'+s
 s=re.sub(r'for \(auto& (\w+) : (\w+)\)',r'for (const \1 of \2)',s)
 s=re.sub(r'(?:static )?(?:inline )?(?:void|bool|int|float) (\w+)\(([^)]*)\)\s*\{',lambda m:'function '+m[1]+'('+re.sub(r'(?:const )?(?:unsigned long|int8_t|uint8_t|uint16_t|bool|int|float|Actor|AqFish|AqBubble|Boom|Star|AmbStar)\s*&?\s*','',m[2])+') {',s)
 s=re.sub(r'\(int\)\(sizeof\((\w+)\) / sizeof\(\1\[0\]\)\)',r'\1.length',s)
 s=re.sub(r'\((?:float|long)\)', '',s)
 # Explicit integer casts (all operands in these sources are names/calls or balanced expressions).
 while '(int)' in s:
  pos=s.index('(int)'); start=pos+5
  if s[start]=='(':
   depth=1;end=start+1
   while depth:
    depth+=(s[end]=='(')-(s[end]==')');end+=1
  else:
   m=re.match(r'[\w.]+(?:\[[^\]]+\][\w.]*)*(?:\([^()]*\))?',s[start:]);end=start+len(m[0])
  s=s[:pos]+'Math.trunc('+s[start:end]+')'+s[end:]
 s=re.sub(r'\b(\d+(?:\.\d*)?(?:e\d+)?)f\b',r'\1',s)
 s=re.sub(r'\b(?:static )?(const )?(?:unsigned long|uint16_t|uint8_t|int8_t|long|float|int|bool|AqBubble|AqFish|Star|AmbStar)\s*&?\s*(?=\w)',lambda m:'const ' if m[1] else 'let ',s)
 s=s.replace('booms[i] = {x, y, 0, true};','booms[i] = {x, y, age:0, active:true};')
 s=s.replace('pBullets[i] = {cannonX, (CANNON_Y - 3), true};','pBullets[i] = {x:cannonX, y:CANNON_Y - 3, active:true};')
 s=s.replace('bombs[i] = {cellX(c), (cellY(r) + 8), true};','bombs[i] = {x:cellX(c), y:cellY(r) + 8, active:true};')
 s=s.replace('(SCREEN_WIDTH - fleetWidth) / 2','Math.trunc((SCREEN_WIDTH - fleetWidth) / 2)')
 s=s.replace('(deathTimer * 4) / 32','Math.trunc((deathTimer * 4) / 32)')
 s=re.sub(r'\(now / (\d+)\)',r'Math.trunc(now / \1)',s)
 s=re.sub(r'\n\s*\n\s*\n','\n\n',s)
 prefix='// Generated from Keralots/AnimatedPixelClock by scripts/port-ambient.py.\n// Keep upstream state transitions; regenerate rather than hand editing.\nexport function createEffect(env) {\nconst {display,millis,random,drawSpaceCharacter,drawPacman}=env;\nconst SCREEN_WIDTH=128,SCREEN_HEIGHT=64,DISPLAY_BLACK=0,DISPLAY_WHITE=0xffff,COL_PACMAN=0xffe0;\nconst SPRITE_COLOR=x=>x, min=Math.min, abs=Math.abs, fabsf=Math.abs, sinf=Math.sin;\n'
 (out/(name+'.js')).write_text(prefix+s+'\nreturn '+entry+';\n}\n')
# Preserve exact upstream packed pixels in the existing PCA container.
s=(src/'src/ambient/thisisfine_frames.h').read_text()
palette=[int(x,16) for x in re.findall(r'0x[0-9a-fA-F]+',s.split('TIF_PALETTE')[1].split('};')[0])]
frames=bytes(int(x,16) for x in re.findall(r'0x[0-9a-fA-F]+',s.split('TIF_FRAMES')[1]))
assert len(palette)==16 and len(frames)==33*4096
(root/'public/ambient').mkdir(exist_ok=True)
(root/'public/ambient/this-is-fine.pca').write_bytes(b'PCA1'+struct.pack('<HHBBBB',33,90,16,0,0,0)+struct.pack('<16H',*palette)+struct.pack('<33H',*([90]*33))+frames)
