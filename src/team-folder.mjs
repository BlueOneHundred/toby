// Toby: one shared folder that every bot with Files enabled can read and write,
// so the team can pass work through a common board (Desktop\Toby\Income by default).
// It reuses the private-workspace safety rules: relative paths only, no dot
// segments, no symlinks, size limits, and one write at a time across all bots.
import {WorkspaceFiles} from './workspace-files.mjs';
import {atomicWrite} from './storage-safety.mjs';
import {readFile,lstat,mkdir,stat} from 'node:fs/promises';
import {resolve} from 'node:path';
const KEY='team';
export class TeamFolder extends WorkspaceFiles {
  constructor(directory,{maxBytes=500000000,maxFiles=5000}={}){super(directory,{maxBytes,maxFiles});}
  root(){return this.directory;}
  serialize(_botId,fn){return super.serialize(KEY,fn);}
  async target(_botId,path='.',writing=false){return super.target(KEY,path,writing);}
  async usage(){return super.usage(KEY);}
  async reserve(_botId,addedBytes,addedFiles){const current=await this.usage();if(current.bytes+addedBytes>this.maxBytes||current.count+addedFiles>this.maxFiles)throw new Error('The team folder limit is reached (500 MB or 5,000 files). Ask Tavin to archive old files.');}
  // Add text to the end of a file (creates it if missing). Safer than rewriting a shared log.
  async append(path,content){return this.serialize(KEY,async()=>{if(typeof content!=='string'||!content.length)throw new Error('Add some text.');const target=await this.target(KEY,path,true),old=await lstat(target).catch(e=>{if(e.code==='ENOENT')return null;throw e;});if(old&&!old.isFile())throw new Error('Choose a file path.');const previous=old?await readFile(target):Buffer.alloc(0),next=Buffer.concat([previous,Buffer.from(content)]);if(next.length>200000)throw new Error('Files must contain at most 200 KB of text. Start a new file, for example one per day or week.');await this.reserve(KEY,next.length-previous.length,old?0:1);await mkdir(resolve(target,'..'),{recursive:true});await atomicWrite(target,next);return {path,bytes:next.length};});}
}
// Copy any file (images included) between a bot's private Files and the team folder.
export async function copyBetween({from,fromBotId,fromPath,to,toBotId,toPath}){
  const source=await from.target(fromBotId,fromPath),info=await stat(source);
  if(!info.isFile()||info.size>20000000)throw new Error('Choose a file smaller than 20 MB.');
  const bytes=await readFile(source);
  return to.serialize(toBotId,async()=>{const target=await to.target(toBotId,toPath,true),old=await lstat(target).catch(e=>{if(e.code==='ENOENT')return null;throw e;});if(old&&!old.isFile())throw new Error('Choose a file path.');await to.reserve(toBotId,bytes.length-(old?.size||0),old?0:1);await mkdir(resolve(target,'..'),{recursive:true});await atomicWrite(target,bytes);return {path:toPath,bytes:bytes.length};});
}
