export const WIDTH=128,HEIGHT=64;
const colors=new Map<string,number>();
export function rgb(color:string){
  const cached=colors.get(color);if(cached!==undefined)return cached;
  let value:number;
  if(/^#[\da-f]{6}$/i.test(color))value=parseInt(color.slice(1),16);
  else if(/^#[\da-f]{3}$/i.test(color))value=parseInt(color.slice(1).split('').map(c=>c+c).join(''),16);
  else{const match=/^rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)$/.exec(color);if(!match)throw new Error(`Unsupported pixel color: ${color}`);value=(Math.min(255,+match[1])<<16)|(Math.min(255,+match[2])<<8)|Math.min(255,+match[3]);}
  if(colors.size>512)colors.clear();colors.set(color,value);return value;
}
export class Framebuffer {
  readonly pixels=new Uint32Array(WIDTH*HEIGHT);
  clear(color='#0b1014'){this.pixels.fill(rgb(color));}
  pixel(x:number,y:number,color:string){this.rect(Math.round(x),Math.round(y),1,1,color);}
  rect(x:number,y:number,w:number,h:number,color:string){
    if(![x,y,w,h].every(Number.isFinite))throw new Error('Non-finite drawing coordinates');
    const left=Math.max(0,Math.round(x)),top=Math.max(0,Math.round(y));
    const right=Math.min(WIDTH,Math.round(x)+Math.max(0,Math.ceil(w))),bottom=Math.min(HEIGHT,Math.round(y)+Math.max(0,Math.ceil(h)));
    const value=rgb(color);for(let yy=top;yy<bottom;yy++)for(let xx=left;xx<right;xx++)this.pixels[yy*WIDTH+xx]=value;
  }
  line(x0:number,y0:number,x1:number,y1:number,color:string){
    x0=Math.round(x0);y0=Math.round(y0);x1=Math.round(x1);y1=Math.round(y1);
    if(![x0,y0,x1,y1].every(Number.isFinite))throw new Error('Non-finite line');
    const dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1;let error=dx+dy;
    for(;;){this.pixel(x0,y0,color);if(x0===x1&&y0===y1)break;const twice=2*error;if(twice>=dy){error+=dy;x0+=sx;}if(twice<=dx){error+=dx;y0+=sy;}}
  }
}
type Surface=HTMLCanvasElement|OffscreenCanvas;
export class FramePresenter {
  private surface:Surface;
  constructor(create:()=>Surface=()=>typeof OffscreenCanvas==='function'?new OffscreenCanvas(1,1):document.createElement('canvas')){this.surface=create();}
  present(target:HTMLCanvasElement,frame:Framebuffer){
    const visible=target.getContext('2d');if(!visible)return;
    const width=target.width,height=target.height;if(!width||!height)return;
    if(this.surface.width!==width)this.surface.width=width;if(this.surface.height!==height)this.surface.height=height;
    const ctx=this.surface.getContext('2d') as CanvasRenderingContext2D|OffscreenCanvasRenderingContext2D|null;if(!ctx)return;
    const sx=width/WIDTH,sy=height/HEIGHT,gx=sx>1?Math.min(.9,sx*.12):0,gy=sy>1?Math.min(.9,sy*.12):0;
    ctx.fillStyle='#030608';ctx.fillRect(0,0,width,height);
    let previous=-1;
    for(let y=0;y<HEIGHT;y++)for(let x=0;x<WIDTH;x++){
      const color=frame.pixels[y*WIDTH+x];if(color!==previous){ctx.fillStyle='#'+color.toString(16).padStart(6,'0');previous=color;}
      ctx.fillRect(x*sx+gx,y*sy+gy,sx-2*gx,sy-2*gy);
    }
    // The visible canvas is touched exactly once, after the full frame exists.
    visible.save();try{visible.setTransform(1,0,0,1,0,0);visible.globalAlpha=1;visible.globalCompositeOperation='copy';visible.drawImage(this.surface,0,0);}finally{visible.restore();}
  }
}
