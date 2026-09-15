import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {importTS} from '../load-module.mjs';
const {AudioSpectrum}=await importTS(new URL('../../app/audio-spectrum.ts',import.meta.url));
const reference=JSON.parse(readFileSync(process.argv[2]||'/private/tmp/audio-reference.json','utf8'));
const processor=new AudioSpectrum();let maxBandError=0,maxWaveError=0;
for(const row of reference.rows){
 const packet=processor.process(Float32Array.from(row.mono));
 row.bands.forEach((value,i)=>maxBandError=Math.max(maxBandError,Math.abs(packet[4+i]-value)));
 row.wave.forEach((value,i)=>maxWaveError=Math.max(maxWaveError,Math.abs(packet[36+i]-value)));
}
assert.ok(maxBandError<=1,`Band error ${maxBandError}`);assert.ok(maxWaveError<=1,`Wave error ${maxWaveError}`);
console.log(JSON.stringify({blocks:reference.rows.length,bandBytes:reference.rows.length*32,waveBytes:reference.rows.length*128,maxBandError,maxWaveError,sourceSha256:reference.sourceSha256},null,2));
