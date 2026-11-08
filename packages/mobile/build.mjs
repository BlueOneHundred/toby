import {build} from 'esbuild';import {cp,mkdir} from 'node:fs/promises';
await mkdir('public',{recursive:true});await cp('web','public',{recursive:true});await cp('../../assets/gratis-icon.png','public/icon.png');for(const name of ['claude','openai'])await cp('../../src/assets/'+name+'.svg','public/'+name+'.svg');await build({entryPoints:['web/app.mjs'],outfile:'public/app.js',bundle:true,platform:'browser',target:'safari16.4',format:'esm',minify:true});

await cp('../../src/avatar-motion.css','public/avatar-motion.css');await build({entryPoints:['../../src/avatar-worker.mjs'],outfile:'public/avatar-worker.mjs',bundle:true,platform:'browser',target:'safari16.4',format:'esm',minify:true});
