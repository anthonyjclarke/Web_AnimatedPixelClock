"""Compile native Space helpers/update and sprite drawing with host globals."""
from pathlib import Path
import re,sys,subprocess
root=Path(sys.argv[1]);out=Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
s=(root/'src/clocks/clock_space.cpp').read_text();s=s[:s.index('// Display clock with space animation')];s=re.sub(r'^#include[^\n]*','',s,flags=re.M)
shim=r'''
#include <cstdint>
#include <ctime>
#include <cmath>
#include <iostream>
#include <iomanip>
#include <string>
#include <cstdio>
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define SPACE_PATROL_LEFT 20
#define SPACE_PATROL_RIGHT 108
#define SPACE_LASER_OFFSET_Y 4
#define SPACE_EXPLOSION_FRAMES 16
#define SCREEN_CENTER_X 64
#define MOVEMENT_THRESHOLD 1.0f
#define MAX_SPACE_FRAGMENTS 20
#define LASER_MAX_LENGTH 50
#define PI 3.1415926535897932384626433832795
#define COL_INVADER 0x07e0
#define COL_LASER 0xf800
#define SPRITE_COLOR(x) x
struct Settings{int spaceCharacterType=1,spacePatrolSpeed=5,spaceAttackSpeed=25,spaceLaserSpeed=40,spaceExplosionGravity=5;}settings;
struct Laser{float x=0,y=0,length=0;bool active=false;int target_digit_idx=-1;};
struct SpaceFragment{float x=0,y=0,vx=0,vy=0;bool active=false;};
enum SpaceState{SPACE_PATROL,SPACE_SLIDING,SPACE_SHOOTING,SPACE_EXPLODING_DIGIT,SPACE_MOVING_NEXT,SPACE_RETURNING};
SpaceState space_state=SPACE_PATROL;float space_x=64;const float space_y=56;int space_anim_frame=0,space_patrol_direction=1,space_explosion_timer=0;unsigned long last_space_update=0,last_space_sprite_toggle=0;Laser space_laser;SpaceFragment space_fragments[20];
uint32_t rng=1,nowMs=0;unsigned long millis(){return nowMs;}
long random(long a,long b){rng=rng*1664525u+1013904223u;return a+((uint64_t(rng)*(b-a))>>32);}
const int DIGIT_X[]={19,37,55,73,91};int num_targets=0,current_target_index=0,target_x_positions[4],target_digit_index[4],target_digit_values[4];
std::string shown="23:59",nextTime="00:00";int displayed_hour=23,displayed_min=59,last_minute=-1;bool displayed_is_pm=true,time_overridden=false,animation_triggered=false;unsigned long time_override_start=0;
void calculateTargetDigits(int,int,bool){num_targets=0;for(int i:{0,1,3,4})if(shown[i]!=nextTime[i]){target_x_positions[num_targets]=DIGIT_X[i]+7;target_digit_index[num_targets]=i;target_digit_values[num_targets++]=nextTime[i]-'0';}}
void updateDisplayedTimeDigit(int i,int v){shown[i]='0'+v;}
uint32_t digitColor(){return 0x64e6ac;}
struct Display{uint32_t pixels[8192]={};void drawPixel(int x,int y,uint32_t c){if(x>=0&&x<128&&y>=0&&y<64)pixels[y*128+x]=c==0x07e0?0x00ff00:c==0xf800?0xff0000:c;}void fillRect(int x,int y,int w,int h,uint32_t c){for(int j=0;j<h;j++)for(int i=0;i<w;i++)drawPixel(x+i,y+j,c);}}display;
'''
main=r'''
int main(int argc,char**argv){if(std::string(argv[1])=="sprite"){drawSpaceCharacter(atoi(argv[2]),atoi(argv[3]),atoi(argv[4]),atoi(argv[5]));fwrite(display.pixels,4,8192,stdout);return 0;}
settings.spacePatrolSpeed=atoi(argv[1]);settings.spaceAttackSpeed=atoi(argv[2]);settings.spaceLaserSpeed=atoi(argv[3]);settings.spaceExplosionGravity=atoi(argv[4]);tm t={};t.tm_min=40;
for(int i=0;i<2400;i++){nowMs+=16;t.tm_sec=i<100?55:56;updateSpaceAnimation(&t);std::cout<<std::setprecision(9)<<int(space_state)<<' '<<shown<<' '<<space_x<<' '<<space_anim_frame<<' '<<space_patrol_direction<<' '<<current_target_index<<' '<<space_explosion_timer<<' '<<space_laser.active<<' '<<space_laser.x<<' '<<space_laser.length;for(auto &p:space_fragments)std::cout<<' '<<p.active<<' '<<p.x<<' '<<p.y<<' '<<p.vx<<' '<<p.vy;std::cout<<'\n';}}
'''
p=out/'space.cpp';p.write_text(shim+s+main);subprocess.run(['clang++','-std=c++17',str(p),'-o',str(out/'space')],check=True)
