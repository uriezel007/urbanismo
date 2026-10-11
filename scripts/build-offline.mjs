import {readFileSync,writeFileSync,mkdirSync,cpSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
const modules=['model','engine','viewer','calibration','obj','app'];
let code='(()=>{\n"use strict";\n';
for(const name of modules){let source=readFileSync(`web/src/${name}.ts`,'utf8').replace(/^import .*?;\s*$/gm,'').replace(/^export /gm,'');code+=stripTypeScriptTypes(source,{mode:'strip'})+'\n';}
code+='})();';
// Compile the emitted script before writing the artifact; this does not replace TypeScript type checking.
new Function(code);
const template=readFileSync('web/index.html','utf8');
const html=template.replace('/*STYLE*/',readFileSync('web/style.css','utf8')).replace('/*APP*/',()=>code.replaceAll('</script','<\\/script'));
mkdirSync('dist',{recursive:true});writeFileSync('dist/index.html',html);cpSync('phei','dist/phei',{recursive:true});
console.log('Build offline creado: dist/index.html; sin paquetes ni CDN.');
