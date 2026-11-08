import {createHash} from 'node:crypto';
const cache=new Map();
export function mobileAvatarThumbnails(service,nativeImage,selectedId){
 const current=service.state.conversations.find(c=>c.id===selectedId),selected=current?.botId;
 const recent=service.state.conversations.filter(c=>!c.parentThreadId).sort((a,b)=>b.updatedAt-a.updatedAt);
 const ids=[...new Set([selected,...(current?.participantIds||[]),...recent.flatMap(c=>[c.botId,...(c.participantIds||[])])])].filter(Boolean).slice(0,200),avatars={};
 if(service.state.settings?.profileAvatarDataUrl)ids.push('__profile');
 for(const id of ids){const bot=id==='__profile'?{avatarDataUrl:service.state.settings.profileAvatarDataUrl}:service.state.bots.find(b=>b.id===id);if(!bot?.avatarDataUrl)continue;const large=id===selected,key=createHash('sha256').update(bot.avatarDataUrl).digest('hex')+':'+(large?'detail':'thumbnail');let data=cache.get(key);
  if(!data){try{const image=nativeImage.createFromDataURL(bot.avatarDataUrl);if(image.isEmpty())continue;let bytes;const limit=large?25000:2200;for(const [size,quality]of large?[[192,85],[128,70],[96,60]]:[[72,60],[48,50],[32,40],[24,30]]){bytes=image.resize({width:size,height:size,quality:'good'}).toJPEG(quality);if(bytes.length<=limit)break;}if(bytes.length>limit)continue;data='data:image/jpeg;base64,'+bytes.toString('base64');cache.set(key,data);if(cache.size>512)cache.delete(cache.keys().next().value);}catch{continue;}}
  avatars[id]=data;
 }
 return avatars;
}
