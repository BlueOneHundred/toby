export function setupAgentNotifications({context,notice,scope}) {
 const toggle=document.getElementById('agent-notifications'),note=document.getElementById('notification-note'),states=new Map();
 const key=()=>`gratis.notifications.${scope()||'unpaired'}`;
 const enabled=()=>{try{return JSON.parse(localStorage.getItem(key())||'[]');}catch{return [];}};
 function paint(){const bot=context().bot;toggle.checked=!!bot&&enabled().includes(bot.id);toggle.disabled=!('Notification'in window);note.textContent=toggle.disabled?'Add Gratis to your Home Screen to enable notifications.':'Notify when this agent finishes while Gratis is open on this phone.';}
 toggle.onchange=async()=>{const bot=context().bot;if(!bot)return;const want=toggle.checked;toggle.disabled=true;try{if(want&&Notification.permission!=='granted'&&await Notification.requestPermission()!=='granted'){notice('Notifications were not enabled. You can change this in your phone settings.');return;}const ids=new Set(enabled());want?ids.add(bot.id):ids.delete(bot.id);localStorage.setItem(key(),JSON.stringify([...ids]));}finally{paint();}};
 async function update(snapshot){paint();for(const row of snapshot?.conversations||[]){const before=states.get(row.id);states.set(row.id,row.status);if(before!=='working'||row.status==='working'||!enabled().includes(row.botId)||!('Notification'in window)||Notification.permission!=='granted')continue;const options={body:'Your reply is ready in Gratis.',tag:'gratis-'+row.id,icon:'/icon.png',data:{conversationId:row.id}};try{const worker=await navigator.serviceWorker?.getRegistration();if(worker)await worker.showNotification(row.botName||'Gratis',options);else new Notification(row.botName||'Gratis',options);}catch{notice('Your reply is ready.');}}}
 return{paint,update};
}
