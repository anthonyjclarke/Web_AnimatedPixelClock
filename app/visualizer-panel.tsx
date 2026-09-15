'use client';
import {useEffect,useRef,useState} from 'react';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from '@/components/ui/select';
import {Switch} from '@/components/ui/switch';
import {Slider} from '@/components/ui/slider';
import {BrowserAudioInput,type InputState} from './audio-input';
import {effects} from './audio-frame';
import {PlaybackClock} from './frame-time';
import {FramePresenter} from './framebuffer';
import {Visualizer,vizDefaults} from './visualizer';
import {renderClockFrame,resetClock,type Options} from './renderer';

export function VisualizerPanel({clock}:{clock:Options}){
  const canvas=useRef<HTMLCanvasElement>(null),input=useRef<BrowserAudioInput|null>(null);
  const [state,setState]=useState<InputState>({kind:'none',status:'stopped',name:'No source selected',error:''});
  const [o,setO]=useState(vizDefaults),[brightness,setBrightness]=useState(clock.brightness),[glow,setGlow]=useState(clock.glow);
  const [freshness,setFreshness]=useState('Choose an audio source to begin.');
  const settings=useRef({o,clock});settings.current={o,clock};
  const visualizer=useRef(new Visualizer());
  useEffect(()=>{
    const controller=new BrowserAudioInput(next=>{visualizer.current=new Visualizer();setState(next);});input.current=controller;controller.store.force(performance.now());
    const presenter=new FramePresenter(),playback=new PlaybackClock();let raf=0,lastStatus='';
    const draw=()=>{
      // Sample at execution time: rAF's timestamp may be older than a newly
      // received worklet packet, especially when rendering a busy frame.
      const now=performance.now();
      const {o,clock}=settings.current;playback.advance(now,clock.motion);
      if(canvas.current){
        const frame=controller.store.eligible(now)?visualizer.current.render(controller.store,now,o,clock,new Date()):renderClockFrame(canvas.current,clock,playback.seconds,new Date());
        if(frame)presenter.present(canvas.current,frame);
      }
      const source=controller.state;
      const status=source.status==='paused'?'Audio paused.':source.status==='ended'?'Playback finished. Choose a file to play again.':source.status==='starting'?'Starting audio…':source.status==='running'?(controller.store.stale(now)?controller.store.eligible(now)?'Waiting for audio — within the 10-second grace window.':'Audio disconnected — showing the clock. Reconnect or choose another source.':o.effect===6&&!controller.store.frame?.waveform?'This source has no waveform. Choose a local audio file, microphone, or demo.':'Receiving audio'):'Choose an audio source to begin. The clock is shown while audio is stopped.';
      if(status!==lastStatus){lastStatus=status;setFreshness(status);}
      raf=requestAnimationFrame(draw);
    };
    raf=requestAnimationFrame(draw);
    return()=>{cancelAnimationFrame(raf);if(canvas.current)resetClock(canvas.current);controller.stop();input.current=null;};
  },[]);
  const active=state.status==='running'||state.status==='paused'||state.status==='starting';
  const name=effects.find(effect=>effect.id===o.effect)!.name;
  return <>
    <div className="display-section"><div className="device"><div className="device-top"><span>AUDIO VISUALIZER</span><span>128 × 64 RGB</span></div><div className={'screen '+(glow?'bloom':'')} style={{filter:`brightness(${brightness/100})`}}><canvas ref={canvas} width={1024} height={512} aria-label={`${name} visualizer, ${state.name}`}/></div><div className="device-bottom"><span><i/> {name.toUpperCase()}</span><span>{state.kind==='demo'?'SYNTHETIC DEMO':'AUDIO REACTIVE'}</span></div></div></div>
    <div className="audio-status" role="status"><strong>{state.name}</strong><span>{freshness}</span></div>
    <div className="audio-layout">
      <section className="audio-card audio-source"><h2>Audio source</h2><p>Play a local audio file or use your microphone. Files stay in your browser; microphone audio is not played through your speakers.</p>
        <div className="audio-actions"><label className="quiet file-button">Choose audio file<input aria-label="Choose audio file" type="file" accept="audio/*" onChange={e=>{const file=e.target.files?.[0];if(file)void input.current?.file(file);e.target.value='';}}/></label>
        <button className="quiet" onClick={()=>void input.current?.microphone()}>Use microphone</button><button className="quiet" onClick={()=>input.current?.demo()}>Start demo signal</button></div>
        <div className="audio-actions">{state.kind==='file'&&state.status==='running'&&<button className="quiet" onClick={()=>void input.current?.pause()}>Pause audio</button>}{state.status==='paused'&&<button className="quiet" onClick={()=>void input.current?.resume()}>Resume audio</button>}<button className="quiet" disabled={!active} onClick={()=>input.current?.stop()}>Stop audio</button></div>
        {state.error&&<p className="audio-error" role="alert">{state.error}</p>}
        <p className="audio-note">The demo is a silent synthetic test signal. Microphone capture uses the microphone, not your computer’s system audio. Returning to Clock stops audio and releases the microphone.</p>
      </section>
      <section className="audio-card"><h2>Visualizer effect</h2><div className="effect-options">{effects.filter(effect=>effect.available).map(effect=><button className={'style-card '+(o.effect===effect.id?'selected':'')} key={effect.id} aria-pressed={o.effect===effect.id} onClick={()=>setO(v=>({...v,effect:effect.id}))}>{effect.name}<span className="selected-dot"/></button>)}</div><div className="setting-row"><label htmlFor="viz-clock">Corner clock</label><Switch id="viz-clock" checked={o.showClock} onCheckedChange={showClock=>setO(v=>({...v,showClock}))}/></div><p className="audio-note">Uses your clock’s timezone and time format.</p>{o.effect===6&&<>
        <div className="brightness"><label id="scope-gain">Waveform gain</label><output>{o.scope.gain}%</output></div><Slider aria-labelledby="scope-gain" min={50} max={200} step={10} value={[o.scope.gain]} onValueChange={value=>setO(v=>({...v,scope:{...v.scope,gain:Array.isArray(value)?value[0]:value}}))}/>
        <label className="zone-label" id="scope-trail">Ghost traces</label><Select value={String(o.scope.trail)} onValueChange={value=>value!==null&&setO(v=>({...v,scope:{...v.scope,trail:Number(value)}}))}><SelectTrigger aria-labelledby="scope-trail" className="zone-select"><SelectValue/></SelectTrigger><SelectContent>{[0,1,2,3,4].map(n=><SelectItem key={n} value={String(n)}>{n===0?'Off':String(n)}</SelectItem>)}</SelectContent></Select>
        {(['grid','fill','flat'] as const).map((key,i)=><div className="setting-row" key={key}><label htmlFor={'scope-'+key}>{['Graticule grid','Fill to center','Flat trace color'][i]}</label><Switch id={'scope-'+key} checked={o.scope[key]} onCheckedChange={value=>setO(v=>({...v,scope:{...v.scope,[key]:value}}))}/></div>)}
      </>}</section>
      <section className="audio-card"><h2>Color & display</h2>{o.effect===0?<>{(['low','mid','peak'] as const).map((key,i)=><div className="setting-row" key={key}><label htmlFor={'viz-'+key}>{['Lower bars','Middle bars','Upper bars & peaks'][i]}</label><input id={'viz-'+key} type="color" value={o[key]} onChange={e=>setO(v=>({...v,[key]:e.target.value}))}/></div>)}</>:o.effect===6?<>{(['gridColor','traceColor','peakColor'] as const).map((key,i)=><div className="setting-row" key={key}><label htmlFor={'scope-'+key}>{['Grid color','Trace color','Peak color'][i]}</label><input id={'scope-'+key} type="color" value={o.scope[key]} onChange={e=>setO(v=>({...v,scope:{...v.scope,[key]:e.target.value}}))}/></div>)}</>:<p>This effect uses its original firmware palette. Custom bar colors apply to Classic EQ.</p>}<div className="brightness"><label id="viz-brightness">Brightness</label><output>{brightness}%</output></div><Slider aria-labelledby="viz-brightness" min={10} max={100} value={[brightness]} onValueChange={v=>setBrightness(Array.isArray(v)?v[0]:v)}/><div className="setting-row"><label htmlFor="viz-glow">LED glow</label><Switch id="viz-glow" checked={glow} onCheckedChange={setGlow}/></div></section>
    </div>
  </>;
}
