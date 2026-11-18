// Toby build 34: a bot may read its OWN saved tool results.
// When a tool answer is too big for the chat, the Claude Agent SDK saves it to
//   <home>/.claude/projects/<the conversation's workspace folder, as a name>/<session>/tool-results/<id>.json|txt
// and tells the bot to read that file. read_file only allowed paths inside the bot's workspace, so the bot got a red
// "Use a path inside the bot workspace." error and never saw the answer (for example the newest lines of a big
// decisions file). This allows exactly those files, read-only, and only for the conversation that made them.
import {createHash} from 'node:crypto';
import {homedir} from 'node:os';
import {resolve,sep,basename,dirname} from 'node:path';
import {readFile,stat} from 'node:fs/promises';
export const PART_CHARS=40_000;
export function ownToolResultPath(path,conversationId,home=homedir()){
  if(typeof path!=='string'||!conversationId)return null;
  const full=resolve(path),root=resolve(home,'.claude','projects')+sep;
  if(!full.startsWith(root))return null;
  const rest=full.slice(root.length).split(sep);
  if(rest.length!==4||rest[2]!=='tool-results'||!/^[\w.-]+\.(json|txt)$/.test(rest[3]))return null;
  const hash=createHash('sha256').update(conversationId).digest('hex');
  return rest[0].endsWith(hash)?full:null;
}
export async function readToolResult(full,part=1){
  const info=await stat(full);if(!info.isFile())throw new Error('Not a saved tool result.');
  const text=await readFile(full,'utf8'),parts=Math.max(1,Math.ceil(text.length/PART_CHARS)),n=Math.min(Math.max(1,part|0),parts);
  return {file:basename(full),part:n,parts,text:text.slice((n-1)*PART_CHARS,n*PART_CHARS),note:n<parts?`Part ${n} of ${parts}. Call read_file again with the same path and part ${n+1} for more.`:`Part ${n} of ${parts}: the end.`};
}

// Toby build 35: search a saved tool result for a word (bots have no Bash or grep). Returns the matching lines with
// their line numbers, case-insensitive, at most 200 lines, each cut to 400 characters.
export const FIND_MAX=200;
export async function findInToolResult(full,find){
  const info=await stat(full);if(!info.isFile())throw new Error('Not a saved tool result.');
  const needle=String(find||'').trim().toLowerCase();if(!needle)throw new Error('Give some text to find.');
  const lines=(await readFile(full,'utf8')).split(/\r?\n/),hits=[];
  for(let i=0;i<lines.length;i++)if(lines[i].toLowerCase().includes(needle)){hits.push(`${i+1}: ${lines[i].slice(0,400)}`);if(hits.length>=FIND_MAX)break;}
  return {file:basename(full),find:String(find),matches:hits.length,lines:hits,note:hits.length>=FIND_MAX?`Only the first ${FIND_MAX} matching lines are shown. Search for something more exact.`:hits.length?'Line numbers count from 1. Use part with no find to read the whole file.':'No line contains that text.'};
}
