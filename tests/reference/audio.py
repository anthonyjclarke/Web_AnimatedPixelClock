"""Run unchanged companion processing methods on deterministic PCM blocks."""
import ast, hashlib, json, sys
from pathlib import Path
import numpy as np
source=Path(sys.argv[1]).read_text()
tree=ast.parse(source)
methods={n.name:ast.get_source_segment(source,n) for n in ast.walk(tree) if isinstance(n,ast.FunctionDef) and n.name in ('_process_block','_process_wave')}
namespace={'np':np}
for node in tree.body:
    if isinstance(node,ast.Assign) and all(isinstance(t,ast.Name) for t in node.targets):
        try: exec(compile(ast.Module(body=[node],type_ignores=[]),'constants','exec'),namespace)
        except Exception: pass
import textwrap
exec('class Reference:\n'+''.join(textwrap.indent(methods[name],'    ')+'\n' for name in ('_process_block','_process_wave')),namespace)
c=namespace['Reference']();c._window=np.hanning(1920).astype(np.float32)
edges=50*(16000/50)**(np.arange(33)/32)
c._band_bins=[(int(edges[i]/(48000/2048)),max(int(edges[i]/(48000/2048))+1,int(edges[i+1]/(48000/2048)))) for i in range(32)]
c._agc_ref=-55.;c._wave_ref=.02
rows=[]
for n in range(32):
    hz=[0,90,440,3200,800,12000,30,0][n%8];gain=[0,.8,.01,.4][n%4]
    t=(np.arange(1920)+n*1920)/48000
    mono=(gain*np.sin(2*np.pi*hz*t)).astype(np.float32)
    rows.append({'mono':mono.tolist(),'bands':c._process_block(mono).tolist(),'wave':c._process_wave(mono).tolist()})
Path(sys.argv[2]).write_text(json.dumps({'sourceSha256':hashlib.sha256(source.encode()).hexdigest(),'rows':rows}))
