import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import {defineConfig} from 'vite';
export default defineConfig({css:{postcss:{plugins:[tailwindcss()]}},server:{open:process.env.PIXEL_CLOCK_OPEN_BROWSER==='1',watch:{useFsEvents:false,usePolling:true}},plugins:[vinext()]});
