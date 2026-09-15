"""Compile unmodified firmware MatrixRain update helpers with deterministic host stubs."""
from pathlib import Path
import re,sys,subprocess
root=Path(sys.argv[1]);out=Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
s=(root/'src/clocks/clock_matrix.cpp').read_text().split('// ========== Drawing ==========')[0]
s=re.sub(r'^#include[^\n]*','',s,flags=re.M)
shim=r'''
#include <cstdint>
#include <ctime>
#include <cmath>
#include <iostream>
#include <iomanip>
#include <string>
#include <algorithm>
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define PI 3.14159265358979323846
#define TWO_PI (2*PI)
#define HALF_PI (PI/2)
#define COL_MATRIX_RAIN 0x07e8
#define SPRITE_COLOR(x) x
struct Settings{int matrixRainSpeed=12,matrixRainDensity=1;bool matrixShowDate=false,matrixTransparent=false;}settings;
int constrain(int x,int a,int b){return std::max(a,std::min(b,x));}
uint32_t rng=1,nowMs=0;unsigned long millis(){return nowMs;}
long random(long a,long b){rng=rng*1664525u+1013904223u;return a+((uint64_t(rng)*(b-a))>>32);}
const int DIGIT_X[]={19,37,55,73,91};int num_targets=0,target_digit_index[4],target_digit_values[4];
std::string shown="23:59";int displayed_hour=23,displayed_min=59;bool displayed_is_pm=true,time_overridden=false;unsigned long time_override_start=0;
void calculateTargetDigits(int,int,bool){num_targets=0;for(int i:{0,1,3,4})if(shown[i]!='0'){target_digit_index[num_targets]=i;target_digit_values[num_targets++]=0;}}
void updateDisplayedTimeDigit(int i,int v){shown[i]='0'+v;}
uint8_t getDisplayedDigitValue(int i){return shown[i]-'0';}
void triggerDigitBounce(int){} void updateDigitBounce(){}
'''
main=r'''
int main(int argc,char**argv){settings.matrixRainSpeed=atoi(argv[1]);settings.matrixRainDensity=atoi(argv[2]);resetMatrixRainAnimation();tm t={};t.tm_min=40;
for(int i=0;i<2000;i++){nowMs+=16;t.tm_sec=i<100?55:56;updateMatrixAnimation(&t);std::cout<<std::setprecision(9)<<shown;for(int j=0;j<5;j++)std::cout<<' '<<mx_decode[j]<<' '<<mx_decode_t[j]<<' '<<mx_decode_swap[j]<<' '<<int(mx_decode_char[j]);for(int j=0;j<21;j++){auto &c=mx_cols[j];std::cout<<' '<<c.active<<' '<<c.headRow<<' '<<c.speed<<' '<<int(c.trailLen)<<' '<<c.respawn;for(int r=0;r<8;r++)std::cout<<' '<<int(mx_chars[j][r]);}std::cout<<'\n';}}

'''
p=out/'matrix.cpp';p.write_text(shim+s+main);subprocess.run(['clang++','-std=c++17',str(p),'-o',str(out/'matrix')],check=True)
