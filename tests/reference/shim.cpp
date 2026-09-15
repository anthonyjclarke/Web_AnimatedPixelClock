#include <cmath>
#include <cstdint>
#include <cstring>
#include <ctime>
#include <iostream>
#include <iomanip>
#include <algorithm>
#include <string>
using std::abs;
uint32_t nowMs=0;unsigned long millis(){return nowMs;}
long random(long n){return n/2;}long random(long a,long b){return a+(b-a)/2;}
struct Settings {int pacmanMouthSpeed=10,pacmanEatingSpeed=20,pacmanSpeed=10,pacmanPelletCount=0;bool pacmanPelletRandomSpacing=true,pacmanBounceEnabled=true,marioIdleEncounters=false,marioSmoothAnimation=false;int marioWalkSpeed=20;} settings;
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define DIGIT_GRID_H 7
#define DIGIT_GRID_W 5
#define PELLET_SPACING 5
#define PELLET_SIZE 1
#define TIME_Y_PACMAN 16
#define PACMAN_PATROL_Y 56
#define PACMAN_ANIM_SPEED 16
#define MARIO_ANIM_SPEED 16
#define ENCOUNTER_ANIM_SPEED 16
#define MARIO_ANIMATION_TRIGGER_SECOND 56
#define MARIO_START_X -15
#define MARIO_TARGET_PROXIMITY 3
#define MARIO_TICK_SCALE (16.0f/35.0f)
#define JUMP_POWER -4.5
#define GRAVITY .6
#define MARIO_HEAD_OFFSET 10
#define DIGIT_BOTTOM 47
#define MARIO_BOUNCE_VELOCITY 2.0f
#define DISPLAY_BLACK 0
#define COL_PACMAN 1
#define COL_PELLET 1
#define COL_MARIO_HAT 2
#define COL_MARIO_OVERALLS 3
#define COL_MARIO_SKIN 4
#define COL_MARIO_SHOES 5
#define SPRITE_COLOR(x) x
struct Display {void fillRect(int,int,int,int,int){} void drawPixel(int,int,int){} void fillCircle(int,int,int,int){} void fillTriangle(int,int,int,int,int,int,int){} } display;
struct PathStep {uint8_t col,row;};struct PatrolPellet{int x;bool active;};
enum PacmanState {PACMAN_PATROL,PACMAN_TARGETING,PACMAN_EATING,PACMAN_RETURNING};
PacmanState pacman_state=PACMAN_PATROL;
float pacman_x=30,pacman_y=56;int pacman_direction=1,pacman_mouth_frame=0;
unsigned long last_pacman_update=0,last_pacman_mouth_toggle=0;
int last_minute_pacman=-1;bool pacman_animation_triggered=false;
bool digit_being_eaten[5]={};uint8_t digitEatenPellets[5][5]={};
uint8_t current_eating_digit_index=0,current_eating_digit_value=0,current_path_step=0;
float pellet_eat_distance=0;PatrolPellet patrol_pellets[32];int num_pellets=0;
uint8_t target_digit_queue[4],target_digit_new_values[4],target_queue_length=0,target_queue_index=0,pending_digit_index=255,pending_digit_value=0;
enum MarioState {MARIO_IDLE,MARIO_WALKING,MARIO_JUMPING,MARIO_WALKING_OFF,MARIO_ENCOUNTER_WALKING,MARIO_ENCOUNTER_JUMPING,MARIO_ENCOUNTER_SHOOTING,MARIO_ENCOUNTER_SQUASH,MARIO_ENCOUNTER_RETURNING};
MarioState mario_state=MARIO_IDLE;float mario_x=-15,mario_jump_y=0,jump_velocity=0;int mario_base_y=62,mario_walk_frame=0;bool mario_facing_right=true,digit_bounce_triggered=false,animation_triggered=false;
unsigned long last_mario_update=0,lastEncounterEnd=0,nextEncounterDelay=15000;int last_minute=-1;
bool time_overridden=false;unsigned long time_override_start=0;
int displayed_hour=12,displayed_min=34;bool displayed_is_pm=false;
int num_targets=0,current_target_index=0,target_x_positions[4],target_digit_index[4],target_digit_values[4];
const int DIGIT_X[5]={19,37,55,73,91};
std::string shown="12:34",nextTime="12:35";
void updateDigitBounce(){} void triggerDigitBounce(int){}
void abortEncounter(){}void startIdleEncounter(){}void updateIdleEncounter(){}
uint8_t getDisplayedDigitValue(int i){return shown[i]-'0';}
void updateDisplayedTimeDigit(int i,int value){shown[i]='0'+value;}
void calculateTargetDigits(int,int,bool){num_targets=0;for(int i:{0,1,3,4})if(shown[i]!=nextTime[i]){target_x_positions[num_targets]=DIGIT_X[i]+7;target_digit_index[num_targets]=i;target_digit_values[num_targets++]=nextTime[i]-'0';}}
