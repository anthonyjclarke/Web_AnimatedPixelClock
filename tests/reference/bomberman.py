from pathlib import Path
import re,sys,subprocess
root=Path(sys.argv[1]);out=Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
s=(root/'src/clocks/clock_bomberman.cpp').read_text();s=re.sub(r'^#include[^\n]*','',s,flags=re.M)
shim=r'''
#include <cstdint>
#include <cmath>
#include <cstdlib>
#include <ctime>
#include <iostream>
#include <iomanip>
struct Settings{bool use24Hour=true;}settings;
uint32_t rng=1,nowMs=0;unsigned long millis(){return nowMs;}
long random(long n){rng=rng*1664525u+1013904223u;return (uint64_t(rng)*n)>>32;}
bool getTimeWithTimeout(tm*t){t->tm_hour=nowMs<=1600?23:0;t->tm_min=nowMs<=1600?59:0;return true;}
void formatTimeForDisplay(int h,int m,int&hh,int&mm,bool&pm){hh=h;mm=m;pm=h>=12;}
uint16_t digitColor(){return 0x67b5;}bool shouldShowColon(){return true;}void drawMeridiemIndicator(int,int,bool){}void drawNoWiFiIcon(int,int){}bool wifiConnected=true;
struct Display{void drawLine(int,int,int,int,uint16_t){}void drawPixel(int,int,uint16_t){}void fillRect(int,int,int,int,uint16_t){}void drawRect(int,int,int,int,uint16_t){}void fillCircle(int,int,int,uint16_t){}void drawFastHLine(int,int,int,uint16_t){}void setTextSize(int){}void setTextColor(int){}void setCursor(int,int){}void print(const char*){}}display;
'''
main=r'''
int main(){for(int i=0;i<8000;i++){nowMs=(i+1)*16;displayClockWithBomberman();std::cout<<std::setprecision(9)<<int(phase)<<' '<<heroX<<' '<<heroY<<' '<<heroNode<<' '<<bombNode<<' '<<activeDigit<<' '<<facing<<' '<<routeCount<<' '<<routeIndex<<' '<<crates[0]<<' '<<crates[1]<<' '<<bonusNode<<' '<<fuseDuration;for(int j=0;j<4;j++)std::cout<<' '<<shown[j]<<' '<<flameLength[j]<<' '<<flameDigit[j]<<' '<<flameCrate[j];std::cout<<'\n';}}
'''
p=out/'bomberman.cpp';p.write_text(shim+s+main);subprocess.run(['clang++','-std=c++17',str(p),'-o',str(out/'bomberman')],check=True)
