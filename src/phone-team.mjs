import {mobileAvatarThumbnails} from './mobile-avatars.mjs';
/** Only the desktop principal's authorized shared projection crosses the paired transport. */
export function phoneTeamSnapshot(connection,selectedId,nativeImage){
 const state=connection?.current;if(!state)return{connected:false};
 const shared=state.threads.filter(t=>t.shared),selected=shared.find(t=>t.id===selectedId)||shared[0];
 const visible=[...(selected?[selected]:[]),...shared.filter(t=>t!==selected)].slice(0,100);
 const rooms=visible.map(t=>({id:t.id,spaceId:t.spaceId,botId:t.botId,title:t.title,preview:t.messages.at(-1)?.content.slice(0,100)||'',working:state.jobs.some(j=>j.threadId===t.id&&['queued','running'].includes(j.status))}));
 const bots=state.bots.filter(b=>state.spaces.some(s=>s.id===b.spaceId&&!s.personalFor)).sort((a,b)=>Number(b.id===selected?.botId)-Number(a.id===selected?.botId)).slice(0,100);
 const avatars=nativeImage?mobileAvatarThumbnails({state:{settings:{},bots:bots.map(b=>({id:b.id,avatarDataUrl:b.template.avatarDataUrl})),conversations:bots.map(b=>({id:b.id,botId:b.id,updatedAt:0}))}},nativeImage,selected?.botId,80000):{};
 let used=0;const messages=[];for(const m of [...(selected?.messages||[])].reverse().slice(0,50)){const content=(m.content||'').slice(0,12000);if(used+content.length>80000)break;used+=content.length;messages.unshift({id:m.id,role:m.role,content,status:m.status,at:m.at,speaker:state.people.find(p=>p.id===m.personId)?.name||'Participant'});}
 const spaces=state.spaces.filter(s=>!s.personalFor).sort((a,b)=>Number(b.id===selected?.spaceId)-Number(a.id===selected?.spaceId)).slice(0,200).map(({id,name,parentId,role})=>({id,name,parentId,role}));
 return{connected:true,person:{id:state.person.id,name:state.person.name},spaces,bots:bots.map(b=>({id:b.id,spaceId:b.spaceId,name:b.template.name,shape:b.template.avatarShape,color:b.template.avatarColor,photo:avatars[b.id]})),rooms,selected:selected?{id:selected.id,spaceId:selected.spaceId,botId:selected.botId,title:selected.title,messages}:null};
}
export function validatePhoneTeam(value){if(!value||Object.keys(value).some(k=>!['action','threadId','botId','spaceId','text','requestId','respond'].includes(k))||!['select','create','send'].includes(value.action))throw new Error('Invalid team action.');if(value.respond!==undefined&&typeof value.respond!=='boolean')throw new Error('Invalid response choice.');for(const name of ['threadId','botId','spaceId','requestId'])if(value[name]!==undefined&&(typeof value[name]!=='string'||value[name].length>128))throw new Error('Invalid team identity.');if(value.action==='send'&&(typeof value.text!=='string'||!value.text.trim()||value.text.length>6000||!value.threadId||!value.requestId))throw new Error('Enter a team message under 6,000 characters.');return value;}
