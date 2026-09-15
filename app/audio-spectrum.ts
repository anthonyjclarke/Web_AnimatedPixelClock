import {encodeAudio} from './audio-frame';
// Companion _process_block / _process_wave, fixed 48 kHz / 1920-frame blocks.
export const AUDIO_RATE=48000, BLOCK_SIZE=1920, FFT_SIZE=2048;
const clampByte=(n:number)=>Math.trunc(Math.max(0,Math.min(255,n)));
export class AudioSpectrum {
  private agc=-55;
  private waveRef=.02;
  private window=Float32Array.from({length:BLOCK_SIZE},(_,i)=>.5-.5*Math.cos(2*Math.PI*i/(BLOCK_SIZE-1)));
  private bins=Array.from({length:32},(_,i)=>{
    const lo=Math.trunc(50*(16000/50)**(i/32)/(AUDIO_RATE/FFT_SIZE));
    return [lo,Math.max(lo+1,Math.trunc(50*(16000/50)**((i+1)/32)/(AUDIO_RATE/FFT_SIZE)))];
  });
  process(mono:Float32Array){
    if(mono.length!==BLOCK_SIZE||mono.some(v=>!Number.isFinite(v)))throw Error('Expected 1920 finite mono samples');
    const real=new Float64Array(FFT_SIZE),imag=new Float64Array(FFT_SIZE);
    for(let i=0;i<BLOCK_SIZE;i++)real[i]=Math.fround(mono[i]*this.window[i]);
    // In-place radix-2 FFT, unnormalized like numpy.fft.rfft.
    for(let i=1,j=0;i<FFT_SIZE;i++){
      let bit=FFT_SIZE>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;
      if(i<j)[real[i],real[j]]=[real[j],real[i]];
    }
    for(let n=2;n<=FFT_SIZE;n<<=1)for(let start=0;start<FFT_SIZE;start+=n)for(let j=0;j<n/2;j++){
      const angle=-2*Math.PI*j/n,c=Math.cos(angle),s=Math.sin(angle),a=start+j,b=a+n/2;
      const r=real[b]*c-imag[b]*s,im=real[b]*s+imag[b]*c;
      real[b]=real[a]-r;imag[b]=imag[a]-im;real[a]+=r;imag[a]+=im;
    }
    const db=this.bins.map(([lo,hi])=>{
      let sum=0;for(let i=lo;i<hi;i++)sum+=real[i]**2+imag[i]**2;
      const amp=Math.fround(Math.sqrt(sum/(hi-lo)));
      return Math.fround(20*Math.fround(Math.log10(Math.fround(amp+1e-7))));
    });
    this.agc=Math.max(this.agc-1.5*.04,...db,-55);
    const bands=Uint8Array.from(db,v=>clampByte((v-(this.agc-38))/38*255));
    const low=new Float32Array(BLOCK_SIZE/8);
    for(let i=0;i<low.length;i++){let sum=0;for(let j=0;j<8;j++)sum+=mono[i*8+j];low[i]=sum/8;}
    let start=0;for(let i=0;i<low.length-128;i++)if(low[i]<=0&&low[i+1]>0){start=i+1;break;}
    const segment=low.subarray(start,start+128);
    this.waveRef=Math.max(this.waveRef*.55**.04,...Array.from(segment,Math.abs),.02);
    const waveform=Uint8Array.from(segment,v=>clampByte(v/this.waveRef*118+128));
    return encodeAudio(bands,waveform);
  }
}
// Synthetic input only: no microphone, audio device or system-audio capture.
export function demoBlock(sequence:number){
  return Float32Array.from({length:BLOCK_SIZE},(_,i)=>{
    const t=(sequence*BLOCK_SIZE+i)/AUDIO_RATE;
    const beat=Math.exp(-((t%(.6))*14));
    return .38*beat*Math.sin(2*Math.PI*90*t)+.12*Math.sin(2*Math.PI*(440*t+8*Math.sin(t)))+.05*Math.sin(2*Math.PI*3200*t);
  });
}
