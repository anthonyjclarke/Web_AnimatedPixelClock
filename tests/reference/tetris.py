"""Compile unchanged Tetris helpers/state machine with deterministic RNG; no firmware writes."""
from pathlib import Path
import re,sys,subprocess
root=Path(sys.argv[1]);out=Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
source=(root/'src/clocks/clock_tetris.cpp').read_text();source=source[:source.index('static void updateTetrisAnimation')];source=re.sub(r'^#include[^\n]*','',source,flags=re.M)
shim=r'''
#include <cmath>
#include <cstdint>
#include <cstring>
#include <iostream>
#include <iomanip>
#include <algorithm>
#include <string>
using std::min;using std::max;
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define COL_TET_I 0
#define COL_TET_L 6
struct Settings{int tetrisFallSpeed=12,tetrisBlockStyle=0,tetrisAnimStyle=1,tetrisDatePosition=1,tetrisDotSpeed=12,tetrisDotOrder=0,tetrisSmallClockPos=1;bool tetrisIdleTumble=true,tetrisShowDate=true,tetrisDigitBounce=true,tetrisSmoothGame=false,tetrisSmallClock=false;}settings;
uint32_t rng=1,now=0;unsigned long millis(){return now;}
long random(long n){rng=rng*1664525u+1013904223u;return (uint64_t(rng)*n)>>32;}long random(long a,long b){return a+random(b-a);}
const int DIGIT_X[]={19,37,55,73,91};
struct Display{void fillRect(int,int,int,int,int){}}display;int digitColor(){return 1;}
std::string shown="12:34";int getDisplayedDigitValue(int i){return shown[i]-'0';}void updateDisplayedTimeDigit(int i,int v){shown[i]='0'+v;}void triggerDigitBounce(int){}
'''
main=r'''
int main(int argc,char**argv){settings.tetrisSmallClock=atoi(argv[1]);settings.tetrisSmoothGame=atoi(argv[2]);settings.tetrisFallSpeed=atoi(argv[3]);tetGameReset();
for(int i=0;i<3000;i++){now+=16;tetGameUpdate();std::cout<<std::setprecision(9)<<int(tet_game_phase)<<' '<<tet_pc_piece<<' '<<tet_pc_rot<<' '<<tet_pc_destCol<<' '<<tet_pc_destOy<<' '<<tet_pc_drawRot<<' '<<tet_pc_curCol<<' '<<tet_pc_py;for(int r=0;r<tetWellRows();r++)std::cout<<' '<<tet_well[r];std::cout<<'\n';}}
'''
digitmain=r'''
int main(int argc,char**argv){settings.tetrisAnimStyle=atoi(argv[1]);settings.tetrisDotSpeed=settings.tetrisFallSpeed=atoi(argv[2]);settings.tetrisDotOrder=atoi(argv[3]);settings.tetrisIdleTumble=false;settings.tetrisDatePosition=atoi(argv[4]);tet_seq_len=1;tet_seq_idx[0]=4;tet_seq_val[0]=5;tetStartDigitAnim(0);
for(int i=0;i<1800;i++){if(tet_active>=0){if(settings.tetrisAnimStyle==1)tetUpdateDots();else tetUpdateSlab();}std::cout<<std::setprecision(9)<<tet_active<<' '<<tet_slab<<' '<<tet_slab_off<<' '<<dot_n;for(int d=0;d<dot_n;d++)std::cout<<' '<<dot_delay[d]<<' '<<dot_cy[d];std::cout<<'\n';}}
'''
path=out/'tetris.cpp';path.write_text(shim+source+main);subprocess.run(['clang++','-std=c++17',str(path),'-o',str(out/'tetris')],check=True)

path=out/"digits.cpp";path.write_text(shim+source+digitmain);subprocess.run(["clang++","-std=c++17",str(path),"-o",str(out/"digits")],check=True)
