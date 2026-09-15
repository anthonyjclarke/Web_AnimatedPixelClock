// Dependency-free static release server. Defaults to this computer only.
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=resolve(process.argv[2]||'dist/client');
const host=process.env.HOST||'127.0.0.1';
const port=Number(process.env.PORT||3000);
if(!Number.isInteger(port)||port<1||port>65535)throw Error('PORT must be 1–65535.');
try{await stat(resolve(root,'index.html'))}catch{console.error('Build first with npm run build, or run from the extracted release folder.');process.exit(1)}
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.ico':'image/x-icon','.woff2':'font/woff2','.wasm':'application/wasm'};
const server=createServer(async(req,res)=>{
 if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405,{Allow:'GET, HEAD'});res.end();return}
 let path;
 try{path=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400);res.end();return}
 const file=resolve(root,'.'+path+(path.endsWith('/')?'index.html':''));
 if(!file.startsWith(root+sep)){res.writeHead(403);res.end();return}
 try{const body=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Content-Length':body.length,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:body)}catch{res.writeHead(404);res.end('Not found')}
});
server.on('error',e=>{console.error(e.message);process.exitCode=1});
server.listen(port,host,()=>console.log(`Pixel Clock: http://${host}:${port}/ — Ctrl+C to stop`));
