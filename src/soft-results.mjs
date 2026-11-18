// Toby build 32: expected outcomes are answers, not errors.
// A file that does not exist yet, a web page that answers with an HTTP error, or a PDF whose text cannot be read is a normal
// result the bot can act on. Showing them as red "error" boxes made Tavin think a bot had failed, and counting
// them as failures could stop a bot's run after 8 in a row. Real faults (bad arguments, a full team folder,
// a timed-out paid service, a blocked private address, a make_* tool given a wrong path) stay errors.
const missing=error=>error?.code==='ENOENT'||/\bENOENT\b|^Not found in the team folder|^Cover not found in the team folder/.test(String(error?.message||''));
const answer=value=>({content:[{type:'text',text:JSON.stringify(value)}]});
const READERS=['read_file','read_team_file','zoom_team_image','view_image','copy_from_team','copy_to_team'];
export function softResult(name,input={},error){
  const where=input.path||input.teamPath||input.url||'';
  if(READERS.includes(name)&&missing(error))return answer({path:where,found:false,note:'This file or folder does not exist yet. That is normal when an earlier step has not made it. Do not guess other names: use list_team_files to see what exists, then carry on with your job or say in your notes what is still missing.'});
  if(['read_webpage','view_image'].includes(name)&&error?.code==='HTTP_STATUS')return answer({url:where,opened:false,reason:String(error.message).slice(0,300),note:'This page could not be opened. Treat it as unavailable and move on; do not retry the same link.'});
  if(/^PDF text extraction is unavailable/.test(String(error?.message||'')))return answer({path:where,read:false,reason:'The text of this PDF cannot be read here.',note:'Read the Markdown or HTML version of the same document instead, or look at a page picture with zoom_team_image.'});
  return null;
}
