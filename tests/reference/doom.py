from pathlib import Path
import re,subprocess
out=Path('/private/tmp/doom-reference');out.mkdir(exist_ok=True)
s=Path('tests/reference/upstream/clock_doom.cpp').read_text().split('static void updateDoomAnimation')[0];s=re.sub(r'^#include[^\n]*','',s,flags=re.M)
shim=r'''
#include <cstdint>
#include <cstring>
#include <cstdlib>
#include <cstdio>
#include <algorithm>
using std::min;
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define DISPLAY_BLACK 0
#define COL_DOOM_EMBER 0x1820
#define COL_DOOM_FLAME 0xcb61
#define COL_DOOM_CORE 0xffff
#define SPRITE_COLOR(x) x
struct Settings{int doomFlameHeight=20,doomGroundHeight=13,doomWind=0;bool doomShowDate=false,doomBurningDigits=true,doomSmoothFire=false;}settings;
int constrain(int n,int a,int b){return std::max(a,std::min(b,n));}
unsigned long millis(){return 0;}
const int DIGIT_X[]={19,37,55,73,91};
struct Display{void fillRect(int,int,int,int,int){}}display;
'''
main=r'''
int main(int argc,char**argv){settings.doomSmoothFire=atoi(argv[1]);settings.doomWind=atoi(argv[2]);settings.doomFlameHeight=atoi(argv[3]);settings.doomGroundHeight=atoi(argv[4]);settings.doomBurningDigits=atoi(argv[5]);settings.doomShowDate=atoi(argv[6]);resetDoomAnimation();for(int i=0;i<120;i++){doomSpread(doomTimeY());doomStampSources("12:34",doomTimeY());fwrite(doom_heat,1,8192,stdout);}}
'''
p=out/'doom.cpp';p.write_text(shim+s+main);subprocess.run(['clang++','-std=c++17',str(p),'-o',str(out/'doom')],check=True)
