import {readFileSync} from 'node:fs';
import ts from 'typescript';
const cache=new Map();
export function moduleURL(file){
 const key=String(file);if(cache.has(key))return cache.get(key);
 const source=readFileSync(file,'utf8').replace(/from ['"](\.[^'"]+)['"]/g,(_,path)=>'from '+JSON.stringify(moduleURL(new URL(/\.(?:ts|js)$/.test(path)?path:path+'.ts',file))));
 const url='data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText).toString('base64');cache.set(key,url);return url;
}
export const importTS=file=>import(moduleURL(file));
