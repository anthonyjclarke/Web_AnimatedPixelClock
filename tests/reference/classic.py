"""Native Standard/Large functions plus a host GFX text renderer, no firmware edits."""
from pathlib import Path
import sys,re,subprocess
root=Path(sys.argv[1]);font=Path(sys.argv[2]);out=Path(sys.argv[3]);out.mkdir(parents=True,exist_ok=True)
s=(root/'src/clocks/clock_common.cpp').read_text()
def function(name):
 m=re.search(r'void '+name+r'\([^)]*\)\s*\{',s);start=m.start();p=m.end();depth=1
 while depth:depth+=(s[p]=='{')-(s[p]=='}');p+=1
 return s[start:p]
shim=r'''
#include <cstdint>
#include <cstdio>
#include <cstring>
#include <ctime>
#include <cstdlib>
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define DISPLAY_WHITE 0xffffff
struct Settings{bool use24Hour=true;int dateFormat=0;}settings;
bool wifiConnected=true,ntpSynced=true,colon=true;tm timeinfoGlobal={};uint32_t color=0x64e6ac;
uint32_t digitColor(){return color;}bool shouldShowColon(){return colon;}
bool getTimeWithTimeout(tm*t){*t=timeinfoGlobal;return true;}
void formatTimeForDisplay(int h,int m,int&oh,int&om,bool&pm){pm=h>=12;oh=settings.use24Hour?h:(h%12?h%12:12);om=m;}
void drawNoWiFiIcon(int,int){}
struct Display{uint32_t pixels[8192]={};int size=1,x=0,y=0;uint32_t col=0xffffff;
void setTextSize(int n){size=n;}void setCursor(int a,int b){x=a;y=b;}void setTextColor(uint32_t c){col=c;}
void print(const char*s){for(;*s;s++){for(int c=0;c<5;c++)for(int r=0;r<8;r++)if(font[(unsigned char)*s*5+c]&(1<<r))for(int yy=0;yy<size;yy++)for(int xx=0;xx<size;xx++){int px=x+c*size+xx,py=y+r*size+yy;if(px>=0&&px<128&&py>=0&&py<64)pixels[py*128+px]=col;}x+=6*size;}}
}display;
'''
main=r'''
int main(int argc,char**argv){bool large=atoi(argv[1]);settings.use24Hour=atoi(argv[2]);settings.dateFormat=atoi(argv[3]);colon=atoi(argv[4]);timeinfoGlobal.tm_year=126;timeinfoGlobal.tm_mon=8;timeinfoGlobal.tm_mday=13+atoi(argv[5]);timeinfoGlobal.tm_wday=atoi(argv[5]);timeinfoGlobal.tm_hour=atoi(argv[6]);timeinfoGlobal.tm_min=5;if(large)displayLargeClock();else displayStandardClock();fwrite(display.pixels,4,8192,stdout);}
'''
p=out/'classic.cpp';p.write_text(font.read_text()+shim+function('drawMeridiemIndicator')+function('displayStandardClock')+function('displayLargeClock')+main);subprocess.run(['clang++','-std=c++17',str(p),'-o',str(out/'classic')],check=True)
