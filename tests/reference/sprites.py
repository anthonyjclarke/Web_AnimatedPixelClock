import pathlib,sys,re
sys.path.insert(0,str(pathlib.Path(__file__).parent))
# Avoid importing the generator (it runs at module scope).
def function(s,name):
 m=re.search(r'void\s+'+re.escape(name)+r'\s*\([^)]*\)\s*\{',s);assert m,name
 start=m.start();p=m.end();depth=1
 while depth:
  depth+=(s[p]=='{')-(s[p]=='}');p+=1
 return s[start:p]
root=pathlib.Path(sys.argv[1]);gfx=pathlib.Path(sys.argv[2]);out=pathlib.Path(sys.argv[3]);
clean=lambda s:re.sub(r'/\*.*?\*/|//[^\n]*','',s,flags=re.S)
source=clean(gfx.read_text())
methods=[function(source,'Adafruit_GFX::'+n).replace('Adafruit_GFX::','Display::') for n in ['fillCircle','fillCircleHelper','fillTriangle']]
code='''#include <cstdint>
#include <iostream>
#include <algorithm>
#define _swap_int16_t(a,b) std::swap(a,b)
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define DISPLAY_BLACK 0
#define COL_PACMAN 1
#define COL_MARIO_HAT 2
#define COL_MARIO_OVERALLS 3
#define COL_MARIO_SKIN 4
#define COL_MARIO_SHOES 5
#define SPRITE_COLOR(x) x
struct {bool marioSmoothAnimation=false;} settings;
struct Display {
 int pixels[8192]={};
 void startWrite(){}void endWrite(){}
 void drawPixel(int x,int y,int c){if(x>=0&&x<128&&y>=0&&y<64)pixels[y*128+x]=c;}
 void fillRect(int x,int y,int w,int h,int c){for(int yy=y;yy<y+h;yy++)for(int xx=x;xx<x+w;xx++)drawPixel(xx,yy,c);}
 void writeFastVLine(int x,int y,int h,int c){fillRect(x,y,1,h,c);}
 void writeFastHLine(int x,int y,int w,int c){fillRect(x,y,w,1,c);}
'''+''.join(m[:m.index('{')].replace('Display::','')+';' for m in methods)+'};\nDisplay display;\n'+'\n'.join(methods)
for file,fn in [('clock_mario.cpp','drawMario'),('clock_pacman.cpp','drawPacman')]:code+='\n'+function(clean((root/'src/clocks'/file).read_text()),fn)
code+='''
int main(){
 for(int d:{1,-1,2,-2,3,-3,4,-4})for(int m=0;m<4;m++){
 std::fill(std::begin(display.pixels),std::end(display.pixels),0);drawPacman(64,32,d,m);
 std::cout<<"pacman "<<d<<" "<<m<<" ";for(auto c:display.pixels)std::cout<<c;std::cout<<"\\n";}
 for(int right=0;right<2;right++)for(int frame=0;frame<2;frame++)for(int jump=0;jump<2;jump++){
 std::fill(std::begin(display.pixels),std::end(display.pixels),0);drawMario(64,52,right,frame,jump);
 std::cout<<"mario "<<right<<" "<<frame<<" "<<jump<<" ";for(auto c:display.pixels)std::cout<<c;std::cout<<"\\n";}
}
'''
out.write_text(code)
