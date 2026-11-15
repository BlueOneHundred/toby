// Toby: publishes one companion app (a single index.html) to the GitHub repository that Vercel serves at
// app.blueonehundred.com. Each app lives in its own folder with a random ending, so links cannot be guessed.
import {randomInt} from 'node:crypto';
const ALPHABET='abcdefghjkmnpqrstuvwxyz23456789';
export const randomEnding=(length=8)=>Array.from({length},()=>ALPHABET[randomInt(ALPHABET.length)]).join('');
const pause=(ms,signal)=>new Promise((resolve,reject)=>{const t=setTimeout(resolve,ms);signal?.addEventListener('abort',()=>{clearTimeout(t);reject(signal.reason);},{once:true});});
export async function publishApp({publisher,html,name,previousFolder,fetchImpl=globalThis.fetch,signal,wait=pause,checks=12}){
  if(!publisher?.token)throw new Error('App publishing is not set up. Tavin adds a custom connection named app_publisher in Settings, Connections.');
  if(!Buffer.isBuffer(html)||html.length<1000||html.length>20000000)throw new Error('The app file is missing or is not a sensible size.');
  if(!/^[a-z0-9][a-z0-9-]{2,40}$/.test(name))throw new Error('Use a short name: lowercase letters, numbers and dashes.');
  const folder=previousFolder&&/^[a-z0-9-]{4,60}$/.test(previousFolder)?previousFolder:name+'-'+randomEnding();
  const api=`https://api.github.com/repos/${publisher.owner}/${publisher.repo}/contents/${folder}/index.html`;
  const headers={Authorization:'Bearer '+publisher.token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'Toby'};
  const fail=async(response,doing)=>{let detail='';try{detail=(await response.json()).message||'';}catch{}
    if(response.status===401||response.status===403)return new Error(`GitHub refused the app publisher token while ${doing} (${response.status}). Tavin needs to check the app_publisher connection. ${detail}`.trim());
    return new Error(`GitHub could not finish ${doing} (${response.status}). ${detail}`.trim());};
  let sha;const existing=await fetchImpl(api,{headers,signal});
  if(existing.status===200)sha=(await existing.json()).sha;else if(existing.status!==404)throw await fail(existing,'checking the app folder');
  const put=await fetchImpl(api,{method:'PUT',headers:{...headers,'Content-Type':'application/json'},signal,body:JSON.stringify({message:(sha?'Update':'Publish')+' app '+folder,content:html.toString('base64'),...(sha?{sha}:{})})});
  if(put.status!==200&&put.status!==201)throw await fail(put,'uploading the app');
  const url=`${publisher.site}/${folder}/`;
  // The site rebuilds about a minute after the upload. A fresh app is live when its page answers; an update when the new size shows up.
  let live=false;
  for(let i=0;i<checks&&!live;i++){await wait(10000,signal);try{const page=await fetchImpl(url,{signal,headers:{'Cache-Control':'no-cache'}});if(page.status===200){const body=Buffer.from(await page.arrayBuffer());live=body.length===html.length;}}catch(error){if(signal?.aborted)throw error;}}
  return {url,folder,updated:Boolean(sha),live,bytes:html.length};
}
