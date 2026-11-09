import {DurableObject} from 'cloudflare:workers';
import {MobileRoom} from './room';
import {sha256Hex,secureEqual} from './crypto';
const secret=(s:unknown):s is string=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
const json=(value:unknown,status=200)=>Response.json(value,{status,headers});
async function body(request:Request,maximum=32000):Promise<Record<string,unknown>>{const reader=request.body?.getReader();if(!reader)return{};let size=0;const chunks:Uint8Array[]=[];try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>maximum){await reader.cancel();throw new Error('Request too large');}chunks.push(value);}}finally{reader.releaseLock();}const bytes=new Uint8Array(size);let offset=0;for(const part of chunks){bytes.set(part,offset);offset+=part.length;}const parsed=JSON.parse(new TextDecoder().decode(bytes)||'{}');if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('Invalid body');return parsed;}
export class PhoneRoom extends DurableObject<Env>{
 room:MobileRoom;
 constructor(ctx:DurableObjectState,env:Env){super(ctx,env);this.room=new MobileRoom(ctx.storage);}
 async fetch(request:Request){try{const url=new URL(request.url),value=await body(request,new URL(request.url).pathname==='/desktop'?2400000:new URL(request.url).pathname==='/command'?2400000:32000),token=request.headers.get('Authorization')?.replace(/^Bearer /,'')||'';
  if(url.pathname==='/init'){await this.room.initialize(String(value.desktopHash),String(value.inviteHash),String(value.roomId));return json({ok:true});}
  if(!secret(token))return json({error:'Authorization required'},401);
  if(url.pathname==='/desktop')return json(this.room.desktop(await sha256Hex(token),value));
  if(url.pathname==='/claim')return json(await this.room.claim(token,value.hello as Parameters<MobileRoom["claim"]>[1]));
  if(url.pathname==='/poll')return json(await this.room.poll(token,typeof value.revision==='string'?value.revision:undefined,Number.isSafeInteger(value.afterSequence)?Number(value.afterSequence):undefined));
  if(url.pathname==='/command')return json(await this.room.command(token,value));
  if(url.pathname==='/forget')return json(await this.room.forget(token));
  return json({error:'Unknown action'},404);
 }catch(error){return json({error:error instanceof Error?error.message:'Request failed'},400);}}
 async alarm(){await this.room.alarm();}
}
export default {async fetch(request:Request,env:Env){const url=new URL(request.url);try{
 if(url.pathname==='/health')return json({ok:true,protocol:1,product:'Gratis mobile'});
 if(url.pathname==='/api/start'){
  if(request.method!=='POST')return json({error:'POST required'},405);
  const enrollment=request.headers.get('Authorization')?.replace(/^Bearer /,'')||'';
  if(!env.MOBILE_ENROLLMENT_KEY||!await secureEqual(enrollment,env.MOBILE_ENROLLMENT_KEY))return json({error:'Invalid enrollment key'},401);
  const value=await body(request);if(typeof value.roomId!=='string'||!/^[a-f0-9]{32}$/.test(value.roomId)||!secret(value.desktopToken)||!secret(value.invite))return json({error:'Invalid pairing request'},400);
  const response=await env.ROOMS.getByName(value.roomId).fetch(new Request('https://room/init',{method:'POST',body:JSON.stringify({desktopHash:await sha256Hex(value.desktopToken),inviteHash:await sha256Hex(value.invite),roomId:value.roomId})}));
  if(!response.ok)return response;return json({roomId:value.roomId});
 }
 const route=url.pathname.match(/^\/api\/([a-f0-9]{32})\/(desktop|claim|poll|command|forget)$/);
 if(route){if(request.method!=='POST')return json({error:'POST required'},405);if(route[2]!=='desktop'&&request.headers.get('Origin')!==url.origin)return json({error:'Invalid phone origin'},403);
  if(!secret(request.headers.get('Authorization')?.replace(/^Bearer /,'')))return json({error:'Authorization required'},401);const value=await body(request,route[2]==='desktop'?2400000:route[2]==='command'?2400000:32000);return env.ROOMS.getByName(route[1]).fetch(new Request('https://room/'+route[2],{method:'POST',headers:{Authorization:request.headers.get('Authorization')||''},body:JSON.stringify(value)}));}
 if(url.pathname.startsWith('/api/'))return json({error:'Not found'},404);
 const response=await env.ASSETS.fetch(request),secured=new Response(response.body,response);for(const[k,v]of Object.entries(headers))secured.headers.set(k,v);if(['/page-frame.html','/page-frame'].includes(url.pathname)){secured.headers.set('Content-Security-Policy',"default-src 'none';script-src 'unsafe-inline';style-src 'unsafe-inline';img-src data:;font-src data:;connect-src 'none';object-src 'none';frame-src 'none';base-uri 'none';form-action 'none';frame-ancestors 'self';sandbox allow-scripts");return secured;}secured.headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");secured.headers.set('Permissions-Policy','camera=(), microphone=(self), geolocation=()');return secured;
 }catch(error){return json({error:error instanceof Error?error.message:'Request failed'},400);}}};
