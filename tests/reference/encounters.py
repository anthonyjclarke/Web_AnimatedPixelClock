from pathlib import Path
import re,sys,subprocess
root=Path(sys.argv[1]);out=Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
s=(root/'src/clocks/clock_mario.cpp').read_text();s=s[s.index('static unsigned long rollEncounterDelay()'):]
# Native functions are retained; host platform APIs and firmware globals are shimmed.
shim=r'''
#include <cmath>
#include <cstdint>
#include <iostream>
#include <iomanip>
#include <algorithm>
using std::min;using std::abs;
struct Settings{uint8_t marioWalkSpeed=20,marioEncounterSpeed=1,marioEncounterFreq=1;bool marioSmoothAnimation=false;}settings;
uint32_t rng=1,now=0;int firstRoll=0;bool first=true;unsigned long millis(){return now;}
long random(long n){if(first){first=false;return firstRoll;}rng=rng*1664525u+1013904223u;return (uint64_t(rng)*n)>>32;}long random(long a,long b){return a+random(b-a);}
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define ENCOUNTER_TIME_SCALE (16.0f/35.0f)
#define MARIO_START_X -15
#define TIME_Y 26
#define MARIO_HEAD_OFFSET 10
#define DIGIT_BOTTOM 47
#define JUMP_POWER -4.5
#define GRAVITY .6
#define MARIO_BOUNCE_VELOCITY 2
#define MAX_COINS 4
#define DISPLAY_BLACK 0
#define SPRITE_COLOR(x) 1
const int DIGIT_X[]={19,37,55,73,91};
enum EnemyType {ENEMY_NONE,ENEMY_GOOMBA,ENEMY_SPINY,ENEMY_KOOPA};
enum EnemyState {ENEMY_WALKING,ENEMY_SQUASHING,ENEMY_HIT,ENEMY_DEAD,ENEMY_SHELL_SLIDING};
enum Phase {MARIO_IDLE,MARIO_ENCOUNTER_WALKING,MARIO_ENCOUNTER_JUMPING,MARIO_ENCOUNTER_SHOOTING,MARIO_ENCOUNTER_SQUASH,MARIO_ENCOUNTER_RETURNING};
enum Variation {ENCOUNTER_MARIO_VS_ENEMY,ENCOUNTER_ENEMY_PASS_BY,ENCOUNTER_COIN_BLOCKS,ENCOUNTER_MULTI_ENEMY,ENCOUNTER_STAR,ENCOUNTER_MUSHROOM};
struct MarioEnemy{EnemyType type=ENEMY_NONE;EnemyState state=ENEMY_DEAD;float x=0;int walkFrame=0,animTimer=0;bool fromRight=true;};
struct MarioCoin{float x=0,y=0,vy=0;bool active=false;uint8_t frame=0;};
struct MarioFireball{float x=0,y=0,vy=0;bool active=false;};
struct Star{float x=0,y=0,vy=0,vx=0;bool active=false;uint8_t frame=0;int bounceCount=0;}marioStar;
struct Mushroom{float x=0,vx=0;bool active=false;uint8_t frame=0;}marioMushroom;
MarioEnemy currentEnemy,secondEnemy;bool secondEnemyActive=false;MarioCoin coins[4];MarioFireball marioFireball;bool marioStarPowered=false;int marioStarTimer=0,marioGrowthTimer=0,marioCoins=0;float shellSlideSpeed=0;
Phase mario_state=MARIO_IDLE;Variation encounterVariation;float mario_x=-15,mario_jump_y=0,jump_velocity=0,digit_offset_y[5]={};bool mario_facing_right=true;int mario_walk_frame=0,mario_base_y=62;unsigned long lastEncounterEnd=0,nextEncounterDelay=15000;
void triggerDigitBounce(int){}
struct Display{void fillRect(int,int,int,int,int){}void drawPixel(int,int,int){}}display;
void updateMarioFireball();void drawGoomba(int,int,int,bool);void drawSpiny(int,int,int,bool);void drawKoopa(int,int,int,bool,bool);
'''
main=r'''
int main(int argc,char**argv){firstRoll=atoi(argv[1]);rng=argc>4?atoi(argv[4]):1;settings.marioEncounterSpeed=atoi(argv[2]);settings.marioWalkSpeed=atoi(argv[3]);startIdleEncounter();for(int i=0;i<1500;i++){now+=16;if(mario_state!=MARIO_IDLE)updateIdleEncounter();std::cout<<std::setprecision(9)<<int(mario_state)<<' '<<mario_x<<' '<<mario_jump_y<<' '<<marioCoins%100<<'\n';}}
'''
p=out/'encounters.cpp';p.write_text(shim+s+main);subprocess.run(['clang++','-std=c++17',str(p),'-o',str(out/'encounters')],check=True)
