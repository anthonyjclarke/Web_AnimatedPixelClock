"""Run the original TRON helpers with deterministic host platform stubs."""
from pathlib import Path
import re,sys,subprocess
root=Path(sys.argv[1]);out=Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
s=(root/'src/clocks/clock_tron.cpp').read_text().split('void resetTronAnimation()')[0];s=re.sub(r'^#include[^\n]*','',s,flags=re.M)
shim=r'''
#include <cstdint>
#include <cmath>
#include <cstring>
#include <iostream>
#include <iomanip>
#include <algorithm>
#define COL_TRON_BLUE 0x05ff
#define COL_TRON_ORANGE 0xfc60
#define SPRITE_COLOR(x) x
struct Settings{int tronBikeStyle=0;}settings;
uint32_t rng=1;long random(long n){rng=rng*1664525u+1013904223u;return (uint64_t(rng)*n)>>32;}
int constrain(int x,int a,int b){return std::max(a,std::min(b,x));}
uint16_t digitColor(){return 0x67b5;}bool shouldShowColon(){return true;}
struct Display{void drawLine(int,int,int,int,uint16_t){}void drawPixel(int,int,uint16_t){}void fillRect(int,int,int,int,uint16_t){}}display;
'''
main=r'''
int main(){phase=DUEL;activeDigit=-1;nextBuilder=0;int initial[]={2,3,5,9};for(int i=0;i<4;i++)shown[i]=target[i]=initial[i];spawn(0,16);spawn(1,16);
for(int i=0;i<6000;i++){uint32_t now=(i+1)*16;if(i==100)for(int j=0;j<4;j++)target[j]=0;updateBike(0,now);updateBike(1,now);updateTrace(.016f,now);std::cout<<std::setprecision(9)<<int(phase)<<' '<<activeDigit<<' '<<builder<<' '<<nextBuilder<<' '<<buildX<<' '<<buildY<<' '<<buildDir<<' '<<int(built)<<' '<<int(traceIndex);for(int j=0;j<4;j++)std::cout<<' '<<shown[j];for(auto &b:bikes)std::cout<<' '<<b.x<<' '<<b.y<<' '<<b.dir<<' '<<b.count<<' '<<b.dead<<' '<<b.stepped<<' '<<b.crashed;std::cout<<'\n';}}
'''
p=out/'tron.cpp';p.write_text(shim+s+main);subprocess.run(['clang++','-std=c++17',str(p),'-o',str(out/'tron')],check=True)
