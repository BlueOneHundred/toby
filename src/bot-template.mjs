import {createHash} from 'node:crypto';
const SHAPES=new Set(['blob','cloud','square','sparkle','clover','heart','flower','teardrop','tablet','wedge','house','star','hex','sphere','capsule','pebble','squircle','heartChubby','starFlower','star6']);
const COLORS=new Set(['black','brown','red','orange','yellow','green','cyan','blue','violet','magenta','gray']);
const KEYS=['name','instructions','userPromptTemplate','avatarShape','avatarColor','avatarDataUrl','model','codexModel','requiredCapabilities'];
const capabilities=['web','files','computer','connections'];
const checksum=bot=>createHash('sha256').update(JSON.stringify(bot)).digest('hex');
const secret=/\b(?:sk-(?:ant-)?[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|AKIA[A-Z0-9]{16}|Bearer\s+[A-Za-z0-9._~-]{16,})\b|-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:password|api[_ -]?key|access[_ -]?token|client[_ -]?secret)\s*[:=]\s*["']?[^\s"']{8,}/i;
function text(value,max){if(typeof value!=='string'||value.length>max)throw new Error('Template contains invalid text.');return value;}
export function validateTemplate(value){
 if(!value||Object.keys(value).some(k=>!['format','version','bot','checksum'].includes(k))||value.format!=='gratis-bot-template'||value.version!==1)throw new Error('Unsupported bot template.');
 const bot=value.bot;if(!bot||Object.keys(bot).some(k=>!KEYS.includes(k))||KEYS.some(k=>!Object.hasOwn(bot,k)))throw new Error('Template contains unexpected or missing fields.');
 if(!text(bot.name,255).trim()||!text(bot.userPromptTemplate,16000).includes('{{message}}'))throw new Error('Template needs a name and {{message}} in its user prompt.');text(bot.instructions,16000);
 if(!SHAPES.has(bot.avatarShape)||!COLORS.has(bot.avatarColor))throw new Error('Unsupported template avatar.');
 if(bot.avatarDataUrl!==null&&(typeof bot.avatarDataUrl!=='string'||bot.avatarDataUrl.length>2000000||!/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(bot.avatarDataUrl)))throw new Error('Template avatar must be a PNG.');
 if(!['','haiku','sonnet','opus'].includes(bot.model)||typeof bot.codexModel!=='string'||bot.codexModel.length>200||bot.codexModel&&!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(bot.codexModel))throw new Error('Unsupported model preference.');
 if(!Array.isArray(bot.requiredCapabilities)||new Set(bot.requiredCapabilities).size!==bot.requiredCapabilities.length||bot.requiredCapabilities.some(c=>!capabilities.includes(c)))throw new Error('Unsupported tool requirement.');
 if(secret.test([bot.name,bot.instructions,bot.userPromptTemplate].join('\n')))throw new Error('Template appears to contain a credential. Remove it from the instructions before sharing.');
 const canonical=Object.fromEntries(KEYS.map(k=>[k,bot[k]]));if(value.checksum!==checksum(canonical))throw new Error('Template checksum does not match. Ask for a fresh export.');return structuredClone(canonical);
}
export function validateBotConfiguration(bot){const canonical=Object.fromEntries(KEYS.map(k=>[k,bot?.[k]]));if(!bot||Object.keys(bot).some(k=>!KEYS.includes(k)))throw new Error('Unexpected bot configuration.');return validateTemplate({format:'gratis-bot-template',version:1,bot:canonical,checksum:checksum(canonical)});}
export function exportTemplate(bot){
 const clean={name:bot.name,instructions:bot.instructions,userPromptTemplate:bot.userPromptTemplate||'{{message}}',avatarShape:bot.avatarShape||bot.avatarDefaultShape||'sphere',avatarColor:bot.avatarColor||bot.avatarDefaultColor||'brown',avatarDataUrl:bot.avatarDataUrl||null,model:bot.model||'',codexModel:bot.codexModel||'',requiredCapabilities:capabilities.filter(k=>bot.capabilities?.[k]!==false)};
 const value={format:'gratis-bot-template',version:1,bot:clean,checksum:checksum(clean)};validateTemplate(value);return value;
}
export function parseTemplate(source){if(typeof source!=='string'||Buffer.byteLength(source)>2100000)throw new Error('Choose a bot template under 2.1 MB.');return validateTemplate(JSON.parse(source));}
export async function importTemplate(service,bot){
 bot=validateBotConfiguration(bot);
 // The review authorizes configuration only. All tools and personal recall stay off.
 const result=await service.createBot({name:bot.name,instructions:bot.instructions,userPromptTemplate:bot.userPromptTemplate,avatarShape:bot.avatarShape,avatarColor:bot.avatarColor,promptMode:'manual'});
 return service.updateBot({id:result.activeBotId,model:bot.model,codexModel:bot.codexModel,avatarDataUrl:bot.avatarDataUrl,capabilities:Object.fromEntries(capabilities.map(k=>[k,false])),memoryProfileAccess:false});
}
