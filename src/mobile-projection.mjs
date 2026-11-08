export function mobileSnapshot(service,selectedId){const roots=service.state.conversations.filter(c=>!c.parentThreadId).sort((a,b)=>b.updatedAt-a.updatedAt).slice(0,200);const allowed=new Set(roots.map(c=>c.id));const selected=roots.find(c=>c.id===(allowed.has(selectedId)?selectedId:service.state.activeConversationId))||roots[0];
 const conversations=roots.map(c=>{const bot=service.state.bots.find(b=>b.id===c.botId);return{id:c.id,title:c.title==='New conversation'?bot.name:c.title,status:service.teams.busy(c)?'working':'ready',provider:service.state.settings.provider,botName:bot.name,avatarShape:bot.avatarShape||'blob',avatarColor:bot.avatarColor||'violet'};});
 if(!selected)return{conversations};let remaining=100000,truncated=false;const messages=[];for(const m of [...selected.messages].reverse()){if(m.kind==='onboarding')continue;if(messages.length===60){truncated=true;break;}const content=m.content.slice(0,Math.min(remaining,30000));if(content.length<m.content.length)truncated=true;if(remaining<=0){truncated=true;break;}messages.unshift({id:m.id,role:m.role,content,status:m.status,speaker:m.role==='user'?'You':service.state.bots.find(b=>b.id===(m.botId||selected.botId))?.name||'Assistant'});remaining-=content.length;}
 return{conversations,selected:{id:selected.id,title:conversations.find(c=>c.id===selected.id).title,status:service.teams.busy(selected)?'working':'ready',provider:service.state.settings.provider,messages,queued:selected.queue?.length||0,computer:false,truncated}};
}
export async function executeMobile(service,command){
 if(command.kind==='new'){const bot=service.state.bots.find(b=>b.id===service.state.activeBotId)||service.state.bots[0];if(!bot)throw new Error('Create a bot on the desktop first.');const active={bot:service.state.activeBotId,conversation:service.state.activeConversationId};const c=service._newConversation(bot.id);service.state.activeBotId=active.bot;service.state.activeConversationId=active.conversation;await service._changed();return c.id;}
 const c=service._conversation(command.conversationId);if(c.parentThreadId)throw new Error('Choose a shared conversation.');
 if(command.kind==='send')await service.send({conversationId:c.id,text:command.text});
 if(command.kind==='stop')await service.stop({conversationId:c.id});
 return c.id;
}
