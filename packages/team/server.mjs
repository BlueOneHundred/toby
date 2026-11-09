import {createServer} from 'node:http';
export function teamServer(store){
 const rates=new Map();
 const server=createServer(async(req,res)=>{
  res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  const reply=(status,value)=>{res.writeHead(status);res.end(JSON.stringify(value));};
  try{
   if(req.headers.origin)throw new Error('Use the native Gratis connection. Browser requests are not enabled.');
   const ip=req.socket.remoteAddress||'local',now=Date.now(),prior=rates.get(ip);const rate=prior&&prior.until>now?prior:{count:0,until:now+60000};rates.set(ip,rate);if(++rate.count>120){reply(429,{error:'Wait a minute before trying again.'});return;}if(rates.size>1000)for(const [key,v] of rates)if(v.until<=now)rates.delete(key);
   if(req.method==='GET'&&req.url==='/health'){reply(200,{service:'gratis-team',version:1});return;}
   if(req.method!=='POST'||!['/join','/call'].includes(req.url))throw new Error('Unsupported endpoint.');
   if(!String(req.headers['content-type']||'').startsWith('application/json'))throw new Error('Use JSON.');
   const pieces=[];let bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>2200000){reply(413,{error:'Request too large.'});return;}pieces.push(chunk);}const body=JSON.parse(Buffer.concat(pieces).toString());
   if(req.url==='/join'){reply(200,store.join(body));return;}
   if(!body||Object.keys(body).some(k=>!['method','args'].includes(k)))throw new Error('Unexpected fields.');
   const match=/^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization||'');if(!match){reply(401,{error:'Sign in to this team.'});return;}
   reply(200,store.call(match[1],body.method,body.args));
  }catch(error){const message=String(error.message||error);reply(/Not found or not permitted/.test(message)?403:400,{error:message.slice(0,400)});}
 });
 server.requestTimeout=15000;server.headersTimeout=10000;server.keepAliveTimeout=1000;
 return server;
}
