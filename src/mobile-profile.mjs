import {avatarAppearance,avatarChoice} from './avatar.mjs';
export function mobileBot(bot,primary=false){const a=avatarAppearance(bot,primary),choice=avatarChoice(bot,primary);return{id:bot.id,name:bot.name,avatarShape:a.shape,avatarColor:a.color,choiceShape:choice.shape,choiceColor:choice.color,photo:!!bot.avatarDataUrl,pinned:!!bot.pinned};}
export function validateMobileProfile(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['name','avatarShape','avatarColor','avatarDataUrl','pinned'].includes(k)))throw new Error('Invalid agent profile.');
 if(value.name!==undefined&&(typeof value.name!=='string'||!value.name.trim()||value.name.length>120))throw new Error('Enter an agent name.');
 if(value.avatarShape!==undefined&&!['blob','cloud','square','sparkle','clover','heart','flower','teardrop','tablet','wedge','house','star','hex','sphere','capsule','pebble','squircle','heartChubby','starFlower','star6'].includes(value.avatarShape))throw new Error('Choose an avatar shape.');
 if(value.avatarColor!==undefined&&!['black','brown','red','orange','yellow','green','cyan','blue','violet','magenta','gray'].includes(value.avatarColor))throw new Error('Choose an avatar color.');
 if(value.avatarDataUrl!==undefined&&value.avatarDataUrl!==null&&(typeof value.avatarDataUrl!=='string'||value.avatarDataUrl.length>1400000||!/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(value.avatarDataUrl)))throw new Error('Use a smaller avatar image.');
 if(value.pinned!==undefined&&typeof value.pinned!=='boolean')throw new Error('Invalid pin setting.');
 return value;
}
