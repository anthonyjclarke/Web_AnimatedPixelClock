int main(int argc,char**argv){
 bool mario=std::string(argv[1])=="mario";shown=argv[2];nextTime=argv[3];
 if(argc>5){settings.marioWalkSpeed=std::stoi(argv[5]);settings.marioSmoothAnimation=std::stoi(argv[6]);settings.pacmanSpeed=std::stoi(argv[7]);settings.pacmanEatingSpeed=std::stoi(argv[8]);settings.pacmanMouthSpeed=std::stoi(argv[9]);}
 int idle=argc>4?std::stoi(argv[4]):0;
 tm timeinfo={};timeinfo.tm_min=34;timeinfo.tm_sec=55;
 std::cout<<std::setprecision(9);
 for(int tick=1;tick<=1200;tick++){
  nowMs=tick*16;timeinfo.tm_sec=tick<=idle?55:56;
  if(mario){updateMarioAnimation(&timeinfo);std::cout<<"["<<tick<<","<<mario_state<<","<<mario_x<<","<<mario_jump_y<<","<<mario_walk_frame<<",\""<<shown<<"\"]\n";}
  else{updatePacmanAnimation(&timeinfo);uint64_t mask=0;int idx=pending_digit_index!=255?pending_digit_index:current_eating_digit_index;for(int i=0;i<35;i++)if(digitEatenPellets[idx][i/8]&(1<<(i%8)))mask|=1ULL<<i;
   std::cout<<"["<<tick<<","<<pacman_state<<","<<pacman_x<<","<<pacman_y<<","<<pacman_direction<<","<<pacman_mouth_frame<<",\""<<shown<<"\","<<mask<<"]\n";}
 }
}
