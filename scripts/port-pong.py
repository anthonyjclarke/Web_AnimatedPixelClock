"""Generate the Pong numerical helpers from the user's ESP32 source.
Platform timing, shared globals and rendering live in the handwritten wrapper.
"""
from pathlib import Path
import re
root=Path(__file__).resolve().parents[1]
s=(root.parent/'AnimatedPixelClock/src/clocks/clock_pong.cpp').read_text()
# Select numerical helper functions; omit platform entrypoints and render methods.
pattern=r'(?:static\s+)?(?:bool|void|SpaceFragment\*)\s+(\w+)\s*\([^)]*\)\s*\{'
selected=[]
skip={'initPongAnimation','resetPongAnimation','updatePongAnimation','displayClockWithPong'}
for m in re.finditer(pattern,s):
 name=m.group(1)
 if name in skip or name.startswith('draw'):continue
 depth=1;i=m.end()
 while depth:
  if s[i]=='{':depth+=1
  if s[i]=='}':depth-=1
  i+=1
 selected.append(s[m.start():i])
s='\n'.join(selected)
s=re.sub(r'//[^\n]*','',s)
s=s.replace('static unsigned long lastPhysicsUpdate = 0;','')
s=s.replace('PONG_TICK_BALL_SPEED','tickSpeed()').replace('->','.').replace('nullptr','null')
s=s.replace('&pong_fragments[i]','pong_fragments[i]')
s=re.sub(r"'(.)'",lambda m:str(ord(m[1])),s)
# Convert casts, covering parenthesized or indexed unary operands.
pat=r'\((int|long|float|unsigned long|uint8_t)\)\s*'
while (m:=re.search(pat,s)):
 start=m.end();i=start
 if s[i]=='(':
  depth=1;i+=1
  while depth:
   if s[i]=='(':depth+=1
   elif s[i]==')':depth-=1
   i+=1
 else:
  mm=re.match(r'[\w.]+(?:\[[^\]]+\])?(?:\.[\w]+)?',s[start:]);i=start+len(mm[0])
 expr=s[start:i];s=s[:m.start()]+(('Math.fround' if m[1]=='float' else 'Math.trunc')+'('+expr+')')+s[i:]
# Typed function parameters.
def fn(m):
 ret,name,args=m.groups();out=[]
 for arg in args.split(','):
  if not arg.strip():continue
  typ,var=arg.strip().rsplit(' ',1);out.append(var+': '+('number' if typ in ('int','char') else 'number'))
 return 'function '+name+'('+', '.join(out)+')'+(': Fragment | null' if ret=='SpaceFragment*' else ': boolean' if ret=='bool' else ': void')+' {'
s=re.sub(r'(?:static\s+)?(bool|void|SpaceFragment\*)\s+(\w+)\s*\(([^)]*)\)\s*\{',fn,s)
# All scalar declarations; C++ integer initializers truncate toward zero.
def decl(m):
 typ,name,expr=m.groups()
 if expr is None:return 'let '+name+': '+('boolean' if typ=='bool' else 'number')
 expr=expr.strip();expr='Math.trunc('+expr+')' if typ in ('int','long','unsigned long','uint8_t') else expr
 return 'let '+name+' = '+expr
s=re.sub(r'\b(?:const\s+)?(unsigned long|int|long|float|bool|uint8_t)\s+(\w+)(?:\s*=\s*([^;]+))?(?=;)',decl,s)
s=re.sub(r'SpaceFragment\*\s+(\w+)\s*=',r'let \1 =',s)
# Integer compound assignment cases involving division.
s=re.sub(r'(pong_balls\[ballIndex\]\.v[xy]) = (\([^;]+\) / 4);',r'\1 = Math.trunc(\2);',s)
# Runtime math names.
for name in ['abs','sqrt','cos','sin','atan2','pow']:
 s=re.sub(r'\b'+name+r'\(',('Math.abs' if name=='abs' else 'Math.'+name)+'(',s)
s=s.replace('return (pongDigitGlyph[c - 48][gy] >> (4 - gx)) & 0x01;', 'return Boolean((pongDigitGlyph[c - 48][gy] >> (4 - gx)) & 0x01);')
# Strip blank lines and retain native function boundaries.
s=re.sub(r'\n\s*\n','\n',s)
header=(root/'scripts/pong-wrapper-head.txt').read_text();tail=(root/'scripts/pong-wrapper-tail.txt').read_text()
(root/'app/pong.ts').write_text(header+'\n'+s+'\n'+tail)
