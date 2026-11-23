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

// Toby build 50: publish several files in ONE commit (a creator's private sample page: the page, her cover, her
// carousel slides and zips, the breakdown PDF and the fonts), through GitHub's Git Data API, so the site rebuilds
// once. folder is a path under the site such as "<app-folder>/kit". Files already there with the same name are
// replaced; nothing else in the repository changes. The page is live when <site>/<folder>/ answers with the new
// index.html (same size).
export async function publishFiles({publisher,folder,files,message,fetchImpl=globalThis.fetch,signal,wait=pause,checks=12}){
  if(!publisher?.token)throw new Error('App publishing is not set up. Tavin adds a custom connection named app_publisher in Settings, Connections.');
  if(!/^[a-z0-9][a-z0-9-]{3,60}(\/[a-z0-9][a-z0-9-]{0,30})?$/.test(folder||''))throw new Error('The page folder name is not valid.');
  if(!Array.isArray(files)||!files.length||files.length>80)throw new Error('Give between 1 and 80 files.');
  let total=0;
  for(const f of files){if(!/^[a-z0-9][a-z0-9._-]{0,80}(\/[a-z0-9][a-z0-9._-]{0,80})?$/i.test(f.path||'')||f.path.includes('..'))throw new Error('Bad file name: '+f.path);if(!Buffer.isBuffer(f.bytes))throw new Error('No bytes for '+f.path);total+=f.bytes.length;}
  if(total>60000000)throw new Error('The page files are larger than 60 MB.');
  const index=files.find(f=>f.path==='index.html');if(!index)throw new Error('The page needs an index.html.');
  const base=`https://api.github.com/repos/${publisher.owner}/${publisher.repo}`;
  const headers={Authorization:'Bearer '+publisher.token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'Toby'};
  const call=async(path,doing,options={})=>{const r=await fetchImpl(base+path,{headers:{...headers,...(options.body?{'Content-Type':'application/json'}:{})},signal,...options});
    if(r.status>=200&&r.status<300)return r.json();let detail='';try{detail=(await r.json()).message||'';}catch{}
    if(r.status===401||r.status===403)throw new Error(`GitHub refused the app publisher token while ${doing} (${r.status}). Tavin needs to check the app_publisher connection. ${detail}`.trim());
    throw new Error(`GitHub could not finish ${doing} (${r.status}). ${detail}`.trim());};
  const repo=await call('','reading the repository');const branch=repo.default_branch||'main';
  const ref=await call(`/git/ref/heads/${encodeURIComponent(branch)}`,'reading the branch');
  const head=await call(`/git/commits/${ref.object.sha}`,'reading the last commit');
  const tree=[];
  for(const f of files){const blob=await call('/git/blobs','uploading '+f.path,{method:'POST',body:JSON.stringify({content:f.bytes.toString('base64'),encoding:'base64'})});tree.push({path:`${folder}/${f.path}`,mode:'100644',type:'blob',sha:blob.sha});}
  const newTree=await call('/git/trees','making the file list',{method:'POST',body:JSON.stringify({base_tree:head.tree.sha,tree})});
  const commit=await call('/git/commits','saving the commit',{method:'POST',body:JSON.stringify({message:message||('Publish '+folder),tree:newTree.sha,parents:[ref.object.sha]})});
  await call(`/git/refs/heads/${encodeURIComponent(branch)}`,'moving the branch',{method:'PATCH',body:JSON.stringify({sha:commit.sha,force:false})});
  const url=`${publisher.site}/${folder}/`;let live=false;
  for(let i=0;i<checks&&!live;i++){await wait(10000,signal);try{const page=await fetchImpl(url,{signal,headers:{'Cache-Control':'no-cache'}});if(page.status===200){const body=Buffer.from(await page.arrayBuffer());live=body.length===index.bytes.length;}}catch(error){if(signal?.aborted)throw error;}}
  return {url,folder,live,files:files.length,bytes:total,commit:commit.sha};
}
