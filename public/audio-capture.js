// Accumulate mono PCM in the audio rendering thread, independent of UI refresh.
// Linear resampling is used only when the device cannot run at 48 kHz.
class PixelAudioCapture extends AudioWorkletProcessor {
  constructor(){super();this.block=new Float32Array(1920);this.count=0;this.index=0;this.next=0;this.previous=0;}
  process(inputs){
    const channels=inputs[0];if(!channels?.length)return true;
    for(let i=0;i<channels[0].length;i++){
      let value=0;for(const channel of channels)value+=channel[i]/channels.length;
      while(this.next<=this.index){
        const fraction=this.next-(this.index-1);
        this.block[this.count++]=this.previous+(value-this.previous)*fraction;
        this.next+=sampleRate/48000;
        if(this.count===1920){this.port.postMessage(this.block,[this.block.buffer]);this.block=new Float32Array(1920);this.count=0;}
      }
      this.previous=value;this.index++;
    }
    return true;
  }
}
registerProcessor('pixel-audio-capture',PixelAudioCapture);
