"""Regenerate fixtures from NickoScope's pinned source; developer-only, MIT."""
import hashlib, json, pathlib, subprocess, sys, tempfile
ref=pathlib.Path(sys.argv[1]).resolve()
sha='85c9be92a5b33b17c126ab63db6bc2ae7c9cc331'
if subprocess.check_output(['git','-C',str(ref),'rev-parse','HEAD'],text=True).strip()!=sha:
    raise SystemExit('Reference checkout must be at '+sha)
sys.path.insert(0,str(ref/'tools/audiofx'))
from effects_matrix import CodeEQ
from gfx import Canvas
out=pathlib.Path(__file__).resolve().parents[1]/'fixtures'
fx=CodeEQ();cv=Canvas();hashes=[]
for n in range(300):
    level=[0.0 if n<60 else 1.0 if n>=260 else ((n*7+c*11)%101)/100 for c in range(32)]
    f=dict(level=level,peak=[min(1,x+.2) if n>=60 else 0 for x in level],bass=sum(level[:8])/8,mid=sum(level[8:24])/16,treble=sum(level[24:])/8,beat=n in (80,110,170,230),strength=.7)
    fx.update(f);cv.clear();fx.render(cv,n/60,1/60)
    hashes.append(hashlib.sha256(cv.rgb().tobytes()).hexdigest())
(out/'code-eq-reference.json').write_text(json.dumps(dict(source='NickoScope/AnimatedPixelClock@'+sha,fps=60,sha256=hashes),indent=2)+'\n')
with tempfile.TemporaryDirectory() as tmp:
    exe=str(pathlib.Path(tmp)/'analysis')
    subprocess.run(['c++','-std=c++17','-O2','-ffp-contract=off','-I'+str(ref/'src/viz/wow'),str(pathlib.Path(__file__).with_name('code-eq-analysis.cpp')),str(ref/'src/viz/wow/viz_frame.cpp'),'-o',exe],check=True)
    result=subprocess.check_output([exe])
    (out/'audio-analysis-reference.json').write_bytes(result)
