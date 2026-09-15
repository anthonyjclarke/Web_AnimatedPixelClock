import {AudioFrameStore} from './audio-frame';
import {AudioSpectrum,demoBlock} from './audio-spectrum';
export type InputState={kind:'none'|'file'|'microphone'|'demo';status:'stopped'|'starting'|'running'|'paused'|'ended'|'error';name:string;error:string};
const stopped:InputState={kind:'none',status:'stopped',name:'No source selected',error:''};
export class BrowserAudioInput {
  readonly store=new AudioFrameStore();
  state:InputState={...stopped};
  private generation=0;
  private context:AudioContext|null=null;
  private node:AudioWorkletNode|null=null;
  private source:AudioBufferSourceNode|MediaStreamAudioSourceNode|null=null;
  private stream:MediaStream|null=null;
  private timer:ReturnType<typeof setInterval>|null=null;
  private processor=new AudioSpectrum();
  constructor(private changed:(state:InputState)=>void){}
  private publish(patch:Partial<InputState>){this.state={...this.state,...patch};this.changed(this.state);}
  stop(){
    ++this.generation;
    if(this.timer!==null)clearInterval(this.timer);this.timer=null;
    this.stream?.getTracks().forEach(track=>track.stop());this.stream=null;
    if(this.source&&'stop' in this.source){this.source.onended=null;try{this.source.stop();}catch{}}
    this.source?.disconnect();this.source=null;
    if(this.node){this.node.port.onmessage=null;this.node.disconnect();this.node=null;}
    if(this.context){this.context.onstatechange=null;void this.context.close().catch(()=>{});this.context=null;}
    this.store.clear();this.processor=new AudioSpectrum();this.publish(stopped);
  }
  private begin(kind:InputState['kind'],name:string){
    this.stop();this.store.force(performance.now());this.publish({kind,name,status:'starting',error:''});return this.generation;
  }
  private async prepare(token:number){
    if(typeof AudioContext==='undefined')throw Error('Web Audio is unavailable in this browser. Try the demo or a current browser.');
    const context=new AudioContext({sampleRate:48000});this.context=context;
    await context.resume();
    if(token!==this.generation)return null;
    await context.audioWorklet.addModule('/audio-capture.js');
    if(token!==this.generation)return null;
    const node=new AudioWorkletNode(context,'pixel-audio-capture');this.node=node;
    node.port.onmessage=event=>{
      if(token!==this.generation||context.state!=='running'||this.state.status==='paused')return;
      const mono=event.data;
      if(!(mono instanceof Float32Array)||mono.length!==1920)return;
      this.store.ingest(this.processor.process(mono),performance.now());
    };
    // The worklet outputs silence; microphone input is never monitored.
    node.connect(context.destination);
    context.onstatechange=()=>{
      if(token!==this.generation||this.state.status==='starting')return;
      this.publish({status:context.state==='running'?'running':'paused'});
    };
    return {context,node};
  }
  private failed(token:number,error:unknown){
    if(token!==this.generation)return;
    this.stop();
    const name=error instanceof Error?error.name:'';
    const message=name==='NotAllowedError'?'Microphone access was denied. Allow access in your browser, or choose an audio file.':name==='NotFoundError'?'No microphone was found. Connect one or choose an audio file.':error instanceof Error?error.message:'Audio could not be started.';
    this.publish({status:'error',error:message});
  }
  async file(file:File){
    const token=this.begin('file',file.name);
    try{
      if(file.size>100*1024*1024)throw Error('Choose an audio file smaller than 100 MB.');
      const prepared=await this.prepare(token);if(!prepared)return;
      const bytes=await file.arrayBuffer();if(token!==this.generation)return;
      const buffer=await prepared.context.decodeAudioData(bytes);if(token!==this.generation)return;
      const source=prepared.context.createBufferSource();this.source=source;source.buffer=buffer;
      source.connect(prepared.node);source.connect(prepared.context.destination);
      source.onended=()=>{if(token!==this.generation)return;const name=this.state.name;this.stop();this.publish({kind:'file',name,status:'ended'});};
      source.start();this.publish({status:'running'});
    }catch(error){this.failed(token,error);}
  }
  async microphone(){
    const token=this.begin('microphone','Microphone');
    try{
      if(!navigator.mediaDevices?.getUserMedia)throw Error('Microphone capture requires a supported browser on HTTPS or localhost.');
      // Request permission only in response to the Microphone button.
      const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false},video:false});
      if(token!==this.generation){stream.getTracks().forEach(track=>track.stop());return;}
      this.stream=stream;
      const prepared=await this.prepare(token);if(!prepared)return;
      const source=prepared.context.createMediaStreamSource(stream);this.source=source;source.connect(prepared.node);
      for(const track of stream.getTracks())track.onended=()=>{if(token===this.generation)this.failed(token,Error('Microphone disconnected. Select it again to reconnect.'));};
      this.publish({status:'running'});
    }catch(error){this.failed(token,error);}
  }
  demo(){
    const token=this.begin('demo','Demo signal (synthetic)');let sequence=0;
    const tick=()=>{if(token===this.generation)this.store.ingest(this.processor.process(demoBlock(sequence++)),performance.now());};
    tick();this.timer=setInterval(tick,40);this.publish({status:'running'});
  }
  async pause(){const token=this.generation;if(this.context)try{this.publish({status:'paused'});await this.context.suspend();}catch(error){this.failed(token,error);}}
  async resume(){const token=this.generation,context=this.context;if(context)try{await context.resume();if(token===this.generation&&context.state==='running')this.publish({status:'running'});}catch(error){this.failed(token,error);}}
}
