from pathlib import Path
import re,sys,subprocess
root=Path(sys.argv[1]);out=Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
s=(root/'src/clocks/clock_pong.cpp').read_text();s=re.sub(r'^#include[^\n]*','',s,flags=re.M)
c=(root/'src/config/config.h').read_text();types=c[c.index('struct SpaceFragment {'):c.index('extern const float FRAGMENT_SPAWN_PERCENT')]
prototypes='\n'.join(m[0].rstrip('{').strip()+';' for m in re.finditer(r'(?:static\s+)?(?:bool|void|SpaceFragment\*)\s+\w+\s*\([^)]*\)\s*\{',s))
shim=r'''
#include <cstdint>
#include <cmath>
#include <cstdlib>
#include <ctime>
#include <cstdio>
#include <iostream>
#include <iomanip>
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define PI 3.14159265358979323846
#define COL_PONG_BALL 0xffff
#define COL_PONG_PADDLE 0x07ff
#define SPRITE_COLOR(x) x
#define DISPLAY_WHITE 0xffff
struct Settings{int pongBallSpeed=18,pongBounceStrength=3,pongBounceDamping=85,pongPaddleWidth=20,dateFormat=0;bool pongHorizontalBounce=true,pongDigitShatter=true;}settings;
uint32_t rng=1,nowMs=0;unsigned long millis(){return nowMs;}
long random(long a,long b){rng=rng*1664525u+1013904223u;return a+((uint64_t(rng)*(b-a))>>32);}
int displayed_hour=23,displayed_min=59;bool displayed_is_pm=true,time_overridden=false,wifiConnected=true,ntpSynced=true;
bool getTimeWithTimeout(tm*t){*t={};t->tm_year=126;t->tm_mon=8;t->tm_mday=14;t->tm_hour=nowMs<=1600?23:0;t->tm_min=nowMs<=1600?59:0;t->tm_sec=nowMs<=1600?54:55;return true;}
void formatTimeForDisplay(int h,int m,int&hh,int&mm,bool&pm){hh=h;mm=m;pm=h>=12;}
void syncDisplayedTime(tm*t){formatTimeForDisplay(t->tm_hour,t->tm_min,displayed_hour,displayed_min,displayed_is_pm);}
void maintainTimeOverride(tm*,bool){}void drawMeridiemIndicator(int,int,bool){}void drawNoWiFiIcon(int,int){}
uint16_t digitColor(){return 0x67b5;}bool shouldShowColon(){return true;}
struct Display{void fillRect(int,int,int,int,uint16_t){}void setTextSize(int){}void setTextColor(int){}void setCursor(int,int){}void print(const char*){}void print(char){}}display;
'''
globals=r'''
const float FRAGMENT_SPAWN_PERCENT[3]={.25,.5,.25};
const int DIGIT_X[5]={19,37,55,73,91};
PongBall pong_balls[2];SpaceFragment pong_fragments[40];FragmentTarget fragment_targets[40];DigitTransition digit_transitions[5];BreakoutPaddle breakout_paddle={64,64,20,3};unsigned long last_pong_update=0;
bool ball_stuck_to_paddle[2]={};unsigned long ball_stick_release_time[2]={};int ball_stuck_x_offset[2]={},paddle_last_x=64;float digit_offset_x[5]={},digit_offset_y[5]={},digit_velocity_x[5]={},digit_velocity[5]={};
'''
main=r'''
int main(int argc,char**argv){settings.pongDigitShatter=atoi(argv[1]);settings.pongHorizontalBounce=atoi(argv[2]);settings.pongBallSpeed=atoi(argv[3]);
for(int i=0;i<2000;i++){nowMs=(i+1)*16;displayClockWithPong();std::cout<<std::setprecision(9)<<breakout_paddle.x;for(auto &b:pong_balls)std::cout<<' '<<b.x<<' '<<b.y<<' '<<b.vx<<' '<<b.vy<<' '<<b.active<<' '<<int(b.state);for(int j=0;j<5;j++)std::cout<<' '<<int(digit_transitions[j].state)<<' '<<digit_transitions[j].hit_count<<' '<<digit_offset_x[j]<<' '<<digit_offset_y[j];std::cout<<'\n';}}
'''
p=out/'pong.cpp';p.write_text(shim+types+globals+prototypes+s+main);subprocess.run(['clang++','-std=c++17','-Wno-deprecated-declarations',str(p),'-o',str(out/'pong')],check=True)
