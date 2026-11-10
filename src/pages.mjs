import {parseHTML} from 'linkedom';
import {readFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {atomicWrite} from './storage-safety.mjs';

export const PAGE_LIMIT=250000;
const hash=value=>createHash('sha256').update(value).digest('hex');
export function pageInput(value){
 if(!value||typeof value!=='object'||Object.keys(value).some(k=>!['title','description','html','sources'].includes(k)))throw Error('Invalid page fields.');
 if(typeof value.title!=='string'||!value.title.trim()||value.title.length>160)throw Error('Give the page a title under 160 characters.');
 if(typeof value.html!=='string'||!value.html.trim()||Buffer.byteLength(value.html)>PAGE_LIMIT)throw Error('A page must contain HTML under 250 KB.');
 const document=parseHTML(value.html).document;if(document.querySelector('script[src],link[href],iframe,object,embed'))throw Error('Pages must be self-contained. Inline scripts and styles; external assets and embedded frames are not supported.');
 if(value.description!==undefined&&(typeof value.description!=='string'||value.description.length>1000))throw Error('Page description is too long.');
 const sources=value.sources||[];if(!Array.isArray(sources)||sources.length>30||sources.some(x=>typeof x!=='string'||x.length>2000))throw Error('Use up to 30 short source references.');
 return{title:value.title.trim(),description:value.description||'',html:value.html,sources};
}
export function pageMetadata(p){const current=p.revisions.at(-1);return{id:p.id,botId:p.botId,conversationId:p.conversationId,title:current.title,description:current.description,revision:current.revision,hash:current.hash,createdAt:p.createdAt,updatedAt:current.at,shared:p.shared||null};}
export class PageStore{
 constructor({directory,encrypt,decrypt,onChange=()=>{}}){Object.assign(this,{directory,encrypt,decrypt,onChange});this.state={version:1,pages:[]};this.tail=Promise.resolve();}
 async init(){try{const state=JSON.parse(await this.decrypt(await readFile(join(this.directory,'pages.secure'))));if(state.version!==1||!Array.isArray(state.pages))throw Error('Unsupported Pages data.');for(const p of state.pages){if(typeof p.id!=='string'||!Array.isArray(p.revisions)||!p.revisions.length)throw Error('Invalid saved page.');for(const r of p.revisions){pageInput({title:r.title,description:r.description,html:r.html,sources:r.sources});if(r.hash!==hash(r.html))throw Error('Saved page checksum does not match.');}}this.state=state;}catch(e){if(e.code!=='ENOENT')throw Error('Saved Pages could not be opened. Existing data was preserved.',{cause:e});}return this;}
 list({botId,conversationId}={}){return this.state.pages.filter(p=>!p.deleted&&(!botId||p.botId===botId)&&(!conversationId||p.conversationId===conversationId)).map(pageMetadata).sort((a,b)=>b.updatedAt-a.updatedAt);}
 get(id,{botId,revision}={}){const p=this.state.pages.find(p=>p.id===id&&!p.deleted&&(!botId||p.botId===botId));if(!p)throw Error('Page not found.');const r=revision===undefined?p.revisions.at(-1):p.revisions.find(r=>r.revision===revision);if(!r)throw Error('Page revision not found.');return{...pageMetadata(p),...structuredClone(r),revisionCount:p.revisions.length};}
 mutate(fn){const task=this.tail.then(async()=>{const next=structuredClone(this.state),result=fn(next),serialized=JSON.stringify(next);if(Buffer.byteLength(serialized)>16000000)throw Error('Pages storage is full. Export and remove older pages before adding more.');await mkdir(this.directory,{recursive:true,mode:0o700});await atomicWrite(join(this.directory,'pages.secure'),await this.encrypt(serialized));this.state=next;this.onChange();return structuredClone(result);});this.tail=task.catch(()=>{});return task;}
 async create({botId,conversationId,...input}){const value=pageInput(input);if(typeof botId!=='string'||typeof conversationId!=='string')throw Error('Choose an agent and chat.');return this.mutate(s=>{if(s.pages.filter(p=>!p.deleted).length>=200)throw Error('The Pages limit is 200.');const now=Date.now(),p={id:randomUUID(),botId,conversationId,createdAt:now,revisions:[{...value,revision:1,hash:hash(value.html),at:now}]};s.pages.push(p);return pageMetadata(p);});}
 async update({id,expectedRevision,botId,...input}){const value=pageInput(input);return this.mutate(s=>{const p=s.pages.find(p=>p.id===id&&!p.deleted&&(!botId||p.botId===botId));if(!p)throw Error('Page not found.');if(p.revisions.at(-1).revision!==expectedRevision)throw Error('This page changed. Read the latest revision before editing.');if(p.revisions.length>=50)throw Error('This page has 50 revisions. Export it before starting a new page.');p.revisions.push({...value,revision:expectedRevision+1,hash:hash(value.html),at:Date.now()});return pageMetadata(p);});}
 async shared(id,shared){return this.mutate(s=>{const p=s.pages.find(p=>p.id===id&&!p.deleted);if(!p)throw Error('Page not found.');p.shared=shared;return pageMetadata(p);});}
 async remove(id){return this.mutate(s=>{const p=s.pages.find(p=>p.id===id&&!p.deleted);if(!p)throw Error('Page not found.');p.deleted=true;return{ok:true};});}
 async close(){await this.tail;}
}
