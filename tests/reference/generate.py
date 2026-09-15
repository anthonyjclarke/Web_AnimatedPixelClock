"""Compile selected unmodified v2.3 firmware functions against a host shim.
Source roots are arguments; no source project files are modified.
"""
import sys,re,pathlib,hashlib,json
root=pathlib.Path(sys.argv[1]); out=pathlib.Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
def clean(s):return re.sub(r'/\*.*?\*/|//[^\n]*','',s,flags=re.S)
def function(s,name):
 m=re.search(r'(?:static\s+)?(?:void|bool)\s+'+re.escape(name)+r'\s*\([^)]*\)\s*\{',s);assert m,name
 start=m.start();p=m.end();depth=1
 while depth:
  depth+=(s[p]=='{')-(s[p]=='}');p+=1
 return s[start:p]
pac=clean((root/'src/clocks/clock_pacman.cpp').read_text());mario=clean((root/'src/clocks/clock_mario.cpp').read_text())
pac_data=pac[pac.index('static const int DIGIT_X_PACMAN'):pac.index('void displayClockWithPacman')]
pac_names=['updatePacmanAnimation','updatePacmanPatrol','updatePacmanEating','startEatingDigit','finishEatingDigit','generatePellets','updatePellets','drawPellets','drawPacman']
mar_names=['advanceWalkFrameThisTick','updateMarioAnimation','drawMario']
functions=[function(pac,n) for n in pac_names]+[function(mario,n) for n in mar_names]
prototypes='\n'.join(s[:s.index('{')].strip()+';' for s in functions)
shim=(pathlib.Path(__file__).parent/'shim.cpp').read_text()
(out/'reference.cpp').write_text(shim+'\n'+pac_data+'\n'+prototypes+'\n'+'\n'.join(functions)+'\n'+(pathlib.Path(__file__).parent/'main.cpp').read_text())
(out/'source-hashes.json').write_text(json.dumps({f:hashlib.sha256((root/f).read_bytes()).hexdigest() for f in ['src/clocks/clock_pacman.cpp','src/clocks/clock_mario.cpp','src/config/settings.cpp']},indent=2))

patterns=re.search(r"digitPatterns[^=]*=\s*\{(.*?)\};",pac,re.S).group(1)
values=[int(v[2:],2) for v in re.findall(r"0b[01]+",patterns)]
(out/"glyphs.json").write_text(json.dumps([values[i:i+7] for i in range(0,70,7)]))
