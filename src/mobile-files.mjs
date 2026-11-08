import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,basename} from 'node:path';
export async function attachMobileFile(service,files,command){
 const c=service._conversation(command.conversationId);service._threadOpen(c);
 const bytes=Buffer.from(command.file.base64,'base64');if(!bytes.length||bytes.length>1_000_000)throw new Error('Use a file under 1 MB.');
 const directory=await mkdtemp(join(tmpdir(),'gratis-upload-'));
 try{const name=basename(command.file.name).replace(/[^\w. -]/g,'_').replace(/^\.+/,'')||'attachment';const file=join(directory,name);await writeFile(file,bytes,{mode:0o600});const added=await files.import(c.botId,[file]);c.draftAttachments=[...(c.draftAttachments||[]),...added].slice(0,10);await service._changed();return c.id;}
 finally{await rm(directory,{recursive:true,force:true});}
}
