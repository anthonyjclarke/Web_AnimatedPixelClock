"""Compile unchanged v2.3 effect functions with a deterministic host display."""
from pathlib import Path
import re,sys,subprocess
root=Path(sys.argv[1]);out=Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
shim=r'''
#include <cmath>
#include <cstdint>
#include <cstring>
#include <cstdio>
#include <cstdlib>
#include <algorithm>
#include <iostream>
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define VIZ_WAVE_POINTS 128
#define SCOPE_TRAIL_MAX 4
#define SCOPE_TRAIL_DEFAULT 3
#define COL_SCOPE_GRID 0x07e0
#define COL_SCOPE_TRACE 0xffe0
#define COL_SCOPE_PEAK 0xf800
#define SPRITE_COLOR(x) x
struct Settings{bool vizShowClock=false,scopeGrid=true,scopeFill=false,scopeFlat=false;int scopeTrail=3,scopeGain=100;}settings;
uint32_t rng=1;long random(long lo,long hi){rng=rng*1664525u+1013904223u;return lo+rng%(hi-lo);}
struct Display{
 uint16_t pixels[8192]={};
 void drawPixel(int x,int y,uint16_t c){if(x>=0&&x<128&&y>=0&&y<64)pixels[y*128+x]=c;}
 void drawLine(int x0,int y0,int x1,int y1,uint16_t c){
  bool steep=abs(y1-y0)>abs(x1-x0);if(steep){std::swap(x0,y0);std::swap(x1,y1);}if(x0>x1){std::swap(x0,x1);std::swap(y0,y1);}
  int dx=x1-x0,dy=abs(y1-y0),err=dx/2,ystep=y0<y1?1:-1;
  for(;x0<=x1;x0++){if(steep)drawPixel(y0,x0,c);else drawPixel(x0,y0,c);err-=dy;if(err<0){y0+=ystep;err+=dx;}}
 }
 void setTextSize(int){}void setTextColor(uint16_t){}void setCursor(int,int){}void print(const char*){}
}display;
'''
scope=r'''
int main(int argc,char**argv){settings.vizShowClock=atoi(argv[1]);settings.scopeGain=atoi(argv[2]);settings.scopeTrail=atoi(argv[3]);settings.scopeFill=atoi(argv[4]);settings.scopeFlat=atoi(argv[5]);
 uint8_t wave[128];for(int n=0;n<6;n++){for(int i=0;i<128;i++)wave[i]=n==0?128:(i*(n*2+1))%256;memset(display.pixels,0,sizeof(display.pixels));drawOscilloscope(wave,n+1,false,.016f,n==0);fwrite(display.pixels,2,8192,stdout);} }
'''
star=r'''
int main(){float levels[32];uint8_t raw[32];for(int n=0;n<300;n++){
 for(int i=0;i<32;i++){raw[i]=n<10?0:n<70?200:n<110?20:240;levels[i]=raw[i]/255.f;}
 memset(display.pixels,0,sizeof(display.pixels));drawStarfieldOverdrive(levels,raw,n/3+1,1.f/60,n==0);
 std::cout<<drive<<' '<<boost<<' '<<cooldown<<' '<<phase<<' ';for(auto &s:stars)std::cout<<s.x<<' '<<s.y<<' '<<s.z<<' ';std::cout<<'\n';}}
'''
for name,main in [('oscilloscope',scope),('starfield',star)]:
 source=re.sub(r'^#include[^\n]*','',(root/'src/viz'/f'{name}.cpp').read_text(),flags=re.M)
 path=out/f'{name}.cpp';path.write_text(shim+source+main)
 subprocess.run(['clang++','-std=c++17',str(path),'-o',str(out/name)],check=True)
