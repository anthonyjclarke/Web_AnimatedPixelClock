"""Compile unchanged native Snake helpers and update function with host stubs."""
from pathlib import Path
import re,sys,subprocess
root=Path(sys.argv[1]);out=Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
s=(root/'src/clocks/clock_snake.cpp').read_text();s=s[:s.index('// ========== Display ==========')];s=re.sub(r'^#include[^\n]*','',s,flags=re.M)
shim=r'''
#include <cstdint>
#include <ctime>
#include <iostream>
#include <string>
#include <cmath>
#include <algorithm>
struct Settings{int snakeLength=8,snakeSpeed=12;bool snakeWallBorder=false,snakeShowDate=false;}settings;
uint32_t rng=1,nowMs=0;unsigned long millis(){return nowMs;}
long random(long a,long b){rng=rng*1664525u+1013904223u;return a+((uint64_t(rng)*(b-a))>>32);}long random(long n){return random(0,n);}
int constrain(int x,int a,int b){return std::max(a,std::min(b,x));}
const int DIGIT_X[]={19,37,55,73,91};std::string shown="23:59",nextTime="00:00";
int displayed_hour=23,displayed_min=59;bool displayed_is_pm=true,time_overridden=false;unsigned long time_override_start=0;
int num_targets=0,target_digit_index[4],target_digit_values[4];
void updateDigitBounce(){}void triggerDigitBounce(int){}
int getDisplayedDigitValue(int i){return shown[i]-'0';}void updateDisplayedTimeDigit(int i,int v){shown[i]='0'+v;}
void calculateTargetDigits(int,int,bool){num_targets=0;for(int i:{0,1,3,4})if(shown[i]!=nextTime[i]){target_digit_index[num_targets]=i;target_digit_values[num_targets++]=nextTime[i]-'0';}}
'''
main=r'''
int main(int argc,char**argv){settings.snakeSpeed=atoi(argv[1]);settings.snakeLength=atoi(argv[2]);settings.snakeWallBorder=atoi(argv[3]);settings.snakeShowDate=atoi(argv[4]);resetSnakeAnimation();tm t={};t.tm_min=40;
for(int i=0;i<3500;i++){nowMs+=16;t.tm_sec=i<100?55:56;updateSnakeAnimation(&t);std::cout<<int(snake_phase)<<' '<<shown<<' '<<snake_dir_x<<' '<<snake_dir_y<<' '<<snake_target_len<<' '<<snake_food_cx<<' '<<snake_food_cy<<' '<<snake_food_active<<' '<<snake_body_len;for(int j=0;j<snake_body_len;j++)std::cout<<' '<<int(snake_body[j].cx)<<' '<<int(snake_body[j].cy);std::cout<<' '<<snake_pellet_count;for(int j=0;j<snake_pellet_count;j++)std::cout<<' '<<int(snake_pellets[j].px)<<' '<<int(snake_pellets[j].py)<<' '<<snake_pellets[j].active;std::cout<<'\n';}}
'''
p=out/'snake.cpp';p.write_text(shim+s+main);subprocess.run(['clang++','-std=c++17',str(p),'-o',str(out/'snake')],check=True)
