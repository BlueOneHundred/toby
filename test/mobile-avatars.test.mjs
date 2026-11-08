import test from 'node:test';import assert from 'node:assert/strict';import {mobileAvatarThumbnails} from '../src/mobile-avatars.mjs';
test('phone photo projection stays bounded and skips invalid images',()=>{const bots=Array.from({length:50},(_,i)=>({id:'bot'+i,avatarDataUrl:'photo'+i})),conversations=bots.map((b,i)=>({id:'chat'+i,botId:b.id,updatedAt:50-i}));const service={state:{bots,conversations}};const native={createFromDataURL:value=>({isEmpty:()=>value==='photo4',resize:()=>({toJPEG:()=>Buffer.from('small photo')})})};const photos=mobileAvatarThumbnails(service,native,'chat49');assert.ok(photos.bot49);assert.equal(photos.bot4,undefined);assert.equal(Object.keys(photos).length,49);assert.ok(Object.values(photos).every(v=>v.startsWith('data:image/jpeg;base64,')));});

import {mobileSnapshot} from '../src/mobile-projection.mjs';
import {avatarAppearance} from '../src/avatar.mjs';
test('phone avatars preserve the desktop appearance when legacy bots have no explicit shape',()=>{
 const bots=[{id:'primary',name:'Gratis'},{id:'helper',name:'Research partner'},{id:'custom',name:'Designer',avatarShape:'cloud',avatarColor:'blue'}];
 const conversations=bots.map((bot,index)=>({id:'chat'+index,botId:bot.id,title:'New conversation',updatedAt:index,messages:[]}));
 const service={state:{bots,conversations,settings:{provider:'claude'}},teams:{busy:()=>false},_bot:id=>bots.find(b=>b.id===id)};
 const snapshot=mobileSnapshot(service,'chat0');
 for(const bot of bots){const expected=avatarAppearance(bot,bot.id==='primary'),row=snapshot.conversations.find(c=>c.botId===bot.id);assert.equal(row.avatarShape,expected.shape);assert.equal(row.avatarColor,expected.color);}
 assert.equal(snapshot.conversations.find(c=>c.botId==='primary').avatarColor,'#ffffff');
});
