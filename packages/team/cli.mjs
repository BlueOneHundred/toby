import {resolve,join} from 'node:path';import {mkdir,writeFile} from 'node:fs/promises';
import {TeamStore} from './store.mjs';import {teamServer} from './server.mjs';
const [directory,portValue='8788']=process.argv.slice(2);if(!directory)throw new Error('Usage: node packages/team/cli.mjs PRIVATE_DATA_DIRECTORY [PORT]');
const port=Number(portValue);if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('Choose a port from 1024 to 65535.');
const root=resolve(directory);await mkdir(root,{recursive:true,mode:0o700});const store=new TeamStore(root);
try{const code=store.bootstrap();await writeFile(join(root,'owner-invitation.txt'),code,{flag:'wx',mode:0o600});console.log('Owner invitation saved privately in the data directory as owner-invitation.txt. It expires in 24 hours.');}catch(e){if(!e.message.includes('already initialized'))throw e;}
const server=teamServer(store);await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});console.log('Gratis team pilot: http://127.0.0.1:'+port+' (loopback only). Use a private HTTPS tunnel for other devices.');
for(const event of ['SIGINT','SIGTERM'])process.on(event,()=>{server.close(()=>{store.close();process.exit(0);});server.closeAllConnections();});
