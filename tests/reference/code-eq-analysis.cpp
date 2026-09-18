#include "viz_frame.h"
#include <cstdio>
int main(){wow::PcFrameDeriver d;wow::VizFrame f{};unsigned char b[32],w[128]{};printf("[");for(int n=0;n<160;n++){for(int c=0;c<32;c++)b[c]=n<25||n>=100?0:(n%20<3?255:(n*7+c*11)%180);d.feed(b,w,.04f,f);if(n)printf(",");printf("{\"beat\":%d,\"strength\":%.9g,\"bass\":%.9g,\"mid\":%.9g,\"treble\":%.9g,\"level\":[",f.beat,f.strength,f.bass,f.mid,f.treble);for(int i=0;i<32;i++)printf("%s%.9g",i?",":"",f.level[i]);printf("],\"peak\":[");for(int i=0;i<32;i++)printf("%s%.9g",i?",":"",f.peak[i]);printf("]}");}printf("]\n");}
