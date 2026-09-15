"""Compile unmodified firmware Dino update helpers with deterministic host stubs."""
from pathlib import Path
import re,sys,subprocess
root=Path(sys.argv[1]);out=Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
s=(root/'src/clocks/clock_dino.cpp').read_text().split('// ========== Drawing ==========')[0]
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
struct Settings{int dinoSpeed=12,dinoCactusFreq=1;bool dinoShowClouds=true,dinoShowDate=false;}settings;
int constrain(int x,int a,int b){return std::max(a,std::min(b,x));}
uint32_t rng=1,nowMs=0;unsigned long millis(){return nowMs;}
long random(long a,long b){rng=rng*1664525u+1013904223u;return a+((uint64_t(rng)*(b-a))>>32);}
const int DIGIT_X[]={19,37,55,73,91};int num_targets=0,target_digit_index[4],target_digit_values[4];
std::string shown="23:59";int displayed_hour=23,displayed_min=59;bool displayed_is_pm=true,time_overridden=false;unsigned long time_override_start=0;
void calculateTargetDigits(int,int,bool){num_targets=0;for(int i:{0,1,3,4})if(shown[i]!='0'){target_digit_index[num_targets]=i;target_digit_values[num_targets++]=0;}}
void updateDisplayedTimeDigit(int i,int v){shown[i]='0'+v;}
uint8_t getDisplayedDigitValue(int i){return shown[i]-'0';}
float digit_offset_y[5]={},digit_velocity[5]={};
void updateDigitBounce(){static unsigned long last=0;float dt=(nowMs-last)/1000.0;if(dt>.1||last==0)dt=.025;last=nowMs;float scale=dt/.05;for(int i=0;i<5;i++)if(digit_offset_y[i]||digit_velocity[i]){digit_velocity[i]+=.6*scale;digit_offset_y[i]+=digit_velocity[i]*scale;if(digit_offset_y[i]>=0){digit_offset_y[i]=0;digit_velocity[i]=0;}}}

'''
main=r'''
int main(int argc,char**argv){settings.dinoSpeed=atoi(argv[1]);settings.dinoCactusFreq=atoi(argv[2]);settings.dinoShowDate=atoi(argv[3]);resetDinoAnimation();tm t={};t.tm_min=40;
for(int i=0;i<3000;i++){nowMs+=16;t.tm_sec=i<100?55:56;updateDinoAnimation(&t);std::cout<<std::setprecision(9)<<int(dino_phase)<<' '<<shown<<' '<<dino_jump_y<<' '<<dino_jump_vy<<' '<<dino_airborne<<' '<<dino_leg_frame<<' '<<dino_ground_phase<<' '<<ptero_active<<' '<<ptero_x<<' '<<ptero_y<<' '<<ptero_wing_frame<<' '<<dino_cur_change;for(auto &c:dino_cacti)std::cout<<' '<<c.active<<' '<<c.x<<' '<<c.tall;for(auto &c:dino_clouds)std::cout<<' '<<c.x<<' '<<c.y;for(int j=0;j<5;j++)std::cout<<' '<<digit_offset_y[j]<<' '<<digit_velocity[j];for(auto &d:dino_dust)std::cout<<' '<<d.active<<' '<<d.x<<' '<<d.y<<' '<<d.vx<<' '<<d.vy<<' '<<d.life;std::cout<<'\n';}}

'''
p=out/'dino.cpp';p.write_text(shim+s+main);subprocess.run(['clang++','-std=c++17',str(p),'-o',str(out/'dino')],check=True)
