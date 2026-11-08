import {createHash} from 'node:crypto';
export function mobileAvatarThumbnails(service,nativeImage,selectedId){
 const current=service.state.conversations.find(c=>c.id===selectedId),selected=current?.botId;
 const ids=[...new Set([selected,...(current?.participantIds||[]),...service.state.conversations.filter(c=>!c.parentThreadId).sort((a,b)=>b.updatedAt-a.updatedAt).map(c=>c.botId)])].filter(Boolean).slice(0,32),avatars={};
 for(const id of ids){const bot=service.state.bots.find(b=>b.id===id);if(!bot?.avatarDataUrl)continue;const key=createHash('sha256').update(bot.avatarDataUrl).digest('hex')+':'+(id===selected?'192':'72');let data=cache.get(key);if(!data){try{const image=nativeImage.createFromDataURL(bot.avatarDataUrl);if(image.isEmpty())continue;const bytes=image.resize({width:id===selected?192:72,height:id===selected?192:72,quality:'good'}).toJPEG(id===selected?85:70);if(bytes.length>(id===selected?35000:7000))continue;data='data:image/jpeg;base64,'+bytes.toString('base64');cache.set(key,data);if(cache.size>64)cache.delete(cache.keys().next().value);}catch{continue;}}avatars[id]=data;}
 return avatars;
}
const cache=new Map();
