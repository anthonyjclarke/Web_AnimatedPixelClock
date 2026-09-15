// ESP32 src/viz/visualizer.{h,cpp}: FFT1 + 32 bands [+ 128 waveform bytes].
export const BAND_COUNT = 32;
export const WAVE_POINTS = 128;
export const effects = [
  {id:0,name:'Classic EQ',available:true},
  {id:1,name:'Neon Mirror',available:true},
  {id:2,name:'Phosphor Waterfall',available:true},
  {id:3,name:'Purple LED Stage',available:true},
  {id:5,name:'Starfield Overdrive',available:true},
  {id:6,name:'Oscilloscope',available:true},
] as const;
export type EffectId = typeof effects[number]['id'];
export interface AudioFrame {
  bands: Uint8Array;
  waveform: Uint8Array | null;
  serial: number;
  waveSerial: number;
  receivedAt: number; // monotonic milliseconds, never Date.now()
}
export class AudioFrameStore {
  frame: AudioFrame | null = null;
  private forcedAt: number | null = null;
  private serial = 0;
  private waveSerial = 0;
  force(now:number){this.forcedAt=now;}
  clear(){this.frame=null;this.forcedAt=null;}
  ingest(packet:Uint8Array,now:number):boolean {
    if(!Number.isFinite(now)||packet.length<36||packet[0]!==70||packet[1]!==70||packet[2]!==84||packet[3]!==49)return false;
    const waveform=packet.length>=164?packet.slice(36,164):null;
    this.frame={bands:packet.slice(4,36),waveform,serial:++this.serial,waveSerial:waveform?++this.waveSerial:this.waveSerial,receivedAt:now};
    return true;
  }
  // requestAnimationFrame timestamps can precede packets delivered before the
  // callback executes. A newer packet is fresh, not a disconnected source.
  recent(now:number,maxAge:number){return !!this.frame&&Number.isFinite(now)&&Math.max(0,now-this.frame.receivedAt)<=maxAge;}
  stale(now:number){return !this.recent(now,2000);}
  eligible(now:number){return this.recent(now,10000)||(this.forcedAt!==null&&now>=this.forcedAt&&now-this.forcedAt<10000);}
}
export function encodeAudio(bands:Uint8Array,waveform:Uint8Array|null):Uint8Array {
  if(bands.length!==BAND_COUNT||(waveform&&waveform.length!==WAVE_POINTS))throw Error('Invalid audio frame size');
  const packet=new Uint8Array(waveform?164:36);packet.set([70,70,84,49]);packet.set(bands,4);if(waveform)packet.set(waveform,36);return packet;
}
