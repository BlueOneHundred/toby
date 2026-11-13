export function sidebarPreview(text=''){return text.replace(/^#{1,6}\s+/gm,'').replace(/\[([^\]]+)\]\([^)]+\)/g,'$1').replace(/(\*\*|__|`)/g,'').replace(/\s+/g,' ').trim();}
const activityAt=c=>{const times=c.messages.map(m=>m.createdAt).filter(Number.isFinite);return times.length?times.reduce((latest,time)=>Math.max(latest,time),c.createdAt||0):c.updatedAt;};
// Toby: bots keep a fixed team order (Toby first, then the team in the order
// below; any other bot after them, oldest first). Group chats follow the bots,
// most recent first. Pinned items still come first.
export const TEAM_ORDER=['Toby','Daily Planner','Product Scout','Ebook Builder','Creator Partnerships','Outreach Writer','Partner Manager','Creative Studio','Income Coach','Maintenance','Lead Researcher'];
export function teamRank(name=''){const i=TEAM_ORDER.findIndex(n=>n.toLowerCase()===String(name).trim().toLowerCase());return i<0?TEAM_ORDER.length:i;}
const order=(a,b)=>{if(a.kind!==b.kind)return a.kind==='bot'?-1:1;if(a.kind==='bot')return teamRank(a.bot.name)-teamRank(b.bot.name)||a.createdAt-b.createdAt||a.key.localeCompare(b.key);return b.activity-a.activity||b.createdAt-a.createdAt||a.key.localeCompare(b.key);};
// Bots and group chats share one sidebar. Hidden teammate
// conversations never become separate entries or reorder a bot's personal chat.
export function sidebarItems(state,query=''){
 const roots=state.conversations.filter(c=>!c.parentThreadId).sort((a,b)=>activityAt(b)-activityAt(a)),needle=query.trim().toLowerCase();
 const bots=state.bots.map(bot=>{
  const chats=roots.filter(c=>c.botId===bot.id&&c.kind!=='group'),latest=chats[0];
  return{kind:'bot',key:bot.id,bot,pinned:!!bot.pinned,activity:Math.max(bot.createdAt,latest?activityAt(latest):0),createdAt:bot.createdAt,preview:sidebarPreview(latest?.messages.findLast(m=>m.content)?.content||bot.instructions||'New conversation'),search:[bot.name,...chats.flatMap(c=>[c.title,...c.messages.map(m=>m.content)])].join(' ')};
 });
 const groups=roots.filter(c=>c.kind==='group').map(conversation=>({kind:'group',key:conversation.id,conversation,pinned:!!conversation.pinned,activity:activityAt(conversation),createdAt:conversation.createdAt,search:[conversation.title,...(conversation.participantIds||[]).map(id=>state.bots.find(b=>b.id===id)?.name||''),...conversation.messages.map(m=>m.content)].join(' ')}));
 return[...bots,...groups].filter(item=>!needle||item.search.toLowerCase().includes(needle)).sort((a,b)=>Number(b.pinned)-Number(a.pinned)||order(a,b));
}
