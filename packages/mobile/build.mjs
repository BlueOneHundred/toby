import {build} from 'esbuild';import {cp,mkdir} from 'node:fs/promises';
await mkdir('public',{recursive:true});await cp('web','public',{recursive:true});await cp('../../assets/gratis-icon.png','public/icon.png');await build({entryPoints:['web/app.mjs'],outfile:'public/app.js',bundle:true,platform:'browser',target:'safari16.4',minify:true});
