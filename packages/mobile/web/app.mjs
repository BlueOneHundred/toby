import {renderIcon} from '../../../src/assets/icons.mjs';
import {marked} from 'marked';import DOMPurify from 'dompurify';import {avatarSvg,avatarColor} from '../../../src/avatar.mjs';
const $=id=>document.getElementById(id),KEY='gratis.mobile.v1',PENDING='gratis.mobile.pending';let auth,snapshot,online=false,nextSeq=1,revision,selected=null,protocol=1,busy=false,timer,posting=false,lastRetry=0,showList=true,messageKey='',listKey='';
try{auth=JSON.parse(localStorage.getItem(KEY)||'null');}catch{}
document.querySelectorAll('[data-icon]').forEach(node=>renderIcon(node,node.dataset.icon));
let keyboardHeldHeight=null,keyboardReleaseTimer;
const notice=text=>{$('notice').textContent=text;$('notice').hidden=!text;};
function resize(){
 const editing=document.activeElement?.matches('textarea,input')||keyboardHeldHeight!==null;
 const standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone;
 document.body.classList.toggle('editing',!!editing);
 const height=editing?(keyboardHeldHeight??window.visualViewport?.height??innerHeight):standalone?screen.height:null;
 document.documentElement.style.setProperty('--height',height?height+'px':'100dvh');if(window.scrollY||window.scrollX)window.scrollTo(0,0);
}
window.visualViewport?.addEventListener('resize',resize);window.addEventListener('resize',resize);window.addEventListener('pageshow',resize);document.addEventListener('focusin',event=>{if(event.target.matches('textarea,input')){clearTimeout(keyboardReleaseTimer);keyboardHeldHeight=null;queueMicrotask(resize);}});document.addEventListener('focusout',event=>{if(event.target.matches('textarea,input')){keyboardHeldHeight=$('app').getBoundingClientRect().height;clearTimeout(keyboardReleaseTimer);keyboardReleaseTimer=setTimeout(()=>{keyboardHeldHeight=null;resize();},250);}});resize();
async function request(action,body={},token=auth?.token,room=auth?.roomId){const r=await fetch('/api/'+room+'/'+action,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(body),signal:AbortSignal.timeout(10000)});const value=await r.json();if(!r.ok)throw new Error(value.error||'Connection failed');return value;}
function saveAuth(value){auth=value;if(value)localStorage.setItem(KEY,JSON.stringify(value));else{localStorage.removeItem(KEY);localStorage.removeItem(PENDING);}}
function pairingLink(value){const u=new URL(value,location.origin);if(u.origin!==location.origin||!/^#[a-f0-9]{32}\.[a-f0-9]{64}$/.test(u.hash))throw new Error('Use the current pairing link from your computer.');return u.hash.slice(1).split('.');}
async function claim(value){try{const [roomId,invite]=pairingLink(value);history.replaceState(null,'','/');$('pair-link').value='';$('pair-status').textContent='Connecting to your computer…';const result=await request('claim',{},invite,roomId);localStorage.removeItem(PENDING);posting=false;saveAuth({roomId,token:result.token});selected=null;snapshot=undefined;messageKey='';listKey='';revision=undefined;poll();}catch(e){$('pair-status').textContent=e.message;}}
function connection(value){online=value;$('connection-status').textContent=value?'Connected to your computer':'Computer offline';$('status-dot').dataset.online=String(value);$('connection-status').parentElement.classList.toggle('offline',!value);$('send').disabled=!value||posting||!$('prompt').value.trim();$('new-chat').disabled=!value;}
function avatarSource(bot){return avatarSvg(bot?.botName||bot?.title,avatarColor(bot?.avatarColor,'dark'),bot?.avatarShape);}
let providerChoiceKey='';
function renderProviderChoices(){
 const providers=snapshot?.providers||[],chat=snapshot?.selected;
 const current=providers.find(p=>p.id===chat?.provider),model=current?.models.find(m=>m.id===chat?.model);
 $('current-model-label').textContent=current?current.name+' · '+(model?.name||chat.model):chat?.provider==='demo'?'Local demo · choose a subscription':'Choose provider and model';
 const key=JSON.stringify({protocol,providers,provider:chat?.provider,model:chat?.model,online,posting,busy:chat?.status==='working'});if(key===providerChoiceKey)return;providerChoiceKey=key;
 const choices=providers.map(provider=>{const section=document.createElement('section');section.className='provider-group';const heading=document.createElement('h3'),logo=document.createElement('img');logo.src='/'+(provider.id==='claude'?'claude':'openai')+'.svg';logo.alt='';heading.append(logo,document.createTextNode(provider.name));section.append(heading);const status=document.createElement('p');status.className='provider-status';status.textContent=provider.signedIn?'Subscription connected':'Sign in on your desktop';section.append(status);for(const item of provider.models){const button=document.createElement('button');button.type='button';button.className='model-option';button.dataset.provider=provider.id;button.dataset.model=item.id;button.disabled=protocol<2||!online||posting||!provider.signedIn||chat?.status==='working';const label=document.createElement('span');label.textContent=item.name;button.append(label);if(chat?.provider===provider.id&&chat?.model===item.id){const check=document.createElement('span');renderIcon(check,'check');button.append(check);button.classList.add('selected');}button.onclick=()=>void command('model',selected,undefined,{provider:provider.id,model:item.id});section.append(button);}return section;});
 if(!choices.length){const waiting=document.createElement('p');waiting.className='model-note';waiting.textContent='Checking desktop connections…';choices.push(waiting);}
 $('provider-choices').replaceChildren(...choices);$('refresh-providers').disabled=protocol<2||!online||posting;$('model-picker-status').textContent=posting&&(pending()?.kind==='model'||pending()?.kind==='providers')?'Updating from your desktop…':protocol<2?'Updating the connection. Model controls will be ready shortly.':'';
}
function openModels(){$('menu').hidden=true;closeTools();renderProviderChoices();$('model-picker-error').hidden=true;if(!$('model-dialog').open)$('model-dialog').showModal();}
function views(){
 $('list-view').hidden=!showList;$('chat-view').hidden=showList;$('back').hidden=showList;$('new-chat').hidden=!showList;
 document.body.dataset.view=showList?'list':'chat';
 const current=snapshot?.conversations.find(c=>c.id===selected);
 $('heading').textContent=showList?'Gratis':(current?.group?current?.title:current?.botName)||current?.title||'Conversation';
 $('heading-avatar').hidden=showList;
 if(!showList){$('heading-avatar').src=avatarSource(current);$('prompt').placeholder='Message '+(current?.botName||'your assistant');}
}
function openChat(id){selected=id;showList=false;views();$('prompt').value=localStorage.getItem('gratis.draft.'+id)||'';if(snapshot?.selected?.id!==id)void command('select',id);messageKey='';renderMessages();requestAnimationFrame(()=>{$('messages').scrollTop=$('messages').scrollHeight;$('jump').hidden=true;});}
function renderList(){const query=$('search').value.toLowerCase(),rows=(snapshot?.conversations||[]).filter(c=>(c.title+' '+c.botName).toLowerCase().includes(query)),key=JSON.stringify(rows);if(key===listKey)return;listKey=key;$('empty').hidden=rows.length>0;
 $('conversations').replaceChildren(...rows.map(c=>{const b=document.createElement('button');b.className='chat-row';b.dataset.conversationId=c.id;b.type='button';const img=document.createElement('img');img.className='avatar';img.alt='';img.src=avatarSvg(c.botName,avatarColor(c.avatarColor,'dark'),c.avatarShape);const copy=document.createElement('span');copy.className='row-copy';const title=document.createElement('strong');title.textContent=c.title;const detail=document.createElement('small');detail.textContent=c.status==='working'?'Working…':c.preview||c.botName||'Ready';copy.append(title,detail);b.append(img,copy);b.onclick=()=>openChat(c.id);return b;}));}
function renderMessages(){
 renderProviderChoices();
 const chat=snapshot?.selected;if(!chat||chat.id!==selected)return;
 const key=JSON.stringify(chat);if(key===messageKey)return;messageKey=key;
 const target=$('messages'),atBottom=target.scrollHeight-target.scrollTop-target.clientHeight<100,oldTop=target.scrollTop;
 target.classList.toggle('group-chat',!!chat.group);
 const items=chat.messages.map(m=>{
  const item=document.createElement('article');item.className='message '+m.role;item.dataset.messageId=m.id;
  const speaker=document.createElement('div');speaker.className='speaker';speaker.textContent=m.speaker||'Assistant';
  const content=document.createElement('div');content.className='content';
  if(m.role==='user')content.textContent=m.content;
  else if(m.content){content.innerHTML=DOMPurify.sanitize(marked.parse(m.content),{FORBID_TAGS:['img','video','audio','iframe','form','input','button']});content.querySelectorAll('a').forEach(a=>{a.target='_blank';a.rel='noopener noreferrer';});}
  else{content.textContent='•••';content.classList.add('typing');}
  item.append(speaker,content);
  if(m.role==='assistant'&&m.provider){const source=document.createElement('div');source.className='message-source';source.textContent=m.provider==='demo'?'Demo':(m.provider==='codex'?'Codex':m.provider==='claude'?'Claude':m.provider)+(m.model?' · '+m.model:'');item.append(source);}
  if(['error','cancelled'].includes(m.status)){const note=document.createElement('small');note.className='message-status';note.textContent=m.status==='error'?'This reply failed. Open the desktop to retry.':'This reply was stopped.';item.append(note);}
  return item;
 });
 if(chat.messages[0]?.createdAt){const date=document.createElement('div');date.className='date-label';date.textContent=new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(chat.messages[0].createdAt);items.unshift(date);}
 if(!items.length){const item=document.createElement('article');item.className='message assistant';const content=document.createElement('div');content.className='content';content.textContent='What would you like to work on?';item.append(content);items.push(item);}
 if(chat.status==='working'){const waiting=document.createElement('span');waiting.className='waiting-avatar';waiting.setAttribute('aria-label','Working');const img=document.createElement('img');img.src=avatarSource(snapshot.conversations.find(c=>c.id===selected));img.alt='';waiting.append(img);items.push(waiting);}
 target.replaceChildren(...items);
 $('stop').hidden=chat.status!=='working';$('chat-hint').textContent=chat.truncated?'Showing recent messages. Full history is on your computer.':chat.queued?chat.queued+' message queued':'';
 if(atBottom)target.scrollTop=target.scrollHeight;else target.scrollTop=oldTop;$('jump').hidden=atBottom;views();
}
function pending(){try{return JSON.parse(localStorage.getItem(PENDING)||'null');}catch{return null;}}
async function poll(){if(busy||!auth||document.hidden)return;busy=true;try{const result=await request('poll',{revision});nextSeq=result.nextSeq;protocol=result.protocol||1;
 if(!result.confirmed){$('pair-screen').hidden=false;$('app').hidden=true;$('pair-status').textContent='One last step: choose “Trust this phone” on your computer.';return;}
 $('pair-screen').hidden=true;$('app').hidden=false;connection(result.online);if(result.snapshot){snapshot=result.snapshot;revision=result.revision;renderProviderChoices();if(!selected)selected=snapshot.selected?.id;renderList();renderMessages();}
 const p=pending();posting=!!p;if(p&&p.seq===result.nextSeq&&online&&Date.now()-lastRetry>3000){lastRetry=Date.now();void request('command',p).catch(()=>{});}if(p&&result.receipt?.seq===p.seq){posting=false;if(result.receipt.ok){localStorage.removeItem(PENDING);if(p.kind==='send'){if(selected!==p.conversationId||$('prompt').value.trim()===p.text){localStorage.removeItem('gratis.draft.'+p.conversationId);if(selected===p.conversationId)$('prompt').value='';}$('delivery-status').textContent='Delivered to your desktop';}else if(p.kind==='new'&&snapshot?.selected)openChat(snapshot.selected.id);else if(p.kind==='model')$('model-dialog').close();notice('');}else{localStorage.removeItem(PENDING);notice(result.receipt.detail+(p.kind==='send'?' Your draft was kept.':''));if($('model-dialog').open){$('model-picker-error').hidden=false;$('model-picker-error').textContent=result.receipt.detail;}}}
 renderProviderChoices();if(!result.online)$('delivery-status').textContent='Keep your computer awake and Gratis running';else if(!pending())$('send').disabled=!$('prompt').value.trim();
 }catch(e){connection(false);$('delivery-status').textContent='Reconnecting…';if(/revoked|authorization|unavailable/i.test(e.message)){$('pair-screen').hidden=false;$('app').hidden=true;$('pair-status').textContent=e.message+' Create a new code on your computer.';saveAuth(null);snapshot=undefined;}}
 finally{busy=false;clearTimeout(timer);if(auth&&!document.hidden)timer=setTimeout(poll,900);}}
async function command(kind,conversationId,text,fields={}){if(posting||!online)return;const value={seq:nextSeq,kind,...(conversationId?{conversationId}:{}),...(text?{text}:{}),...fields};posting=true;localStorage.setItem(PENDING,JSON.stringify(value));renderProviderChoices();$('send').disabled=true;$('delivery-status').textContent='Sending…';try{await request('command',value);revision=undefined;poll();}catch(e){const uncertain=/fetch|network|timed|aborted|load failed/i.test(e.message);posting=uncertain;notice(e.message+' Your text has been kept.');if(!uncertain)localStorage.removeItem(PENDING);if(kind==='model'||kind==='providers'){$('model-picker-error').textContent=e.message;$('model-picker-error').hidden=false;}}}
$('pair-form').onsubmit=e=>{e.preventDefault();void claim($('pair-link').value);};$('search').oninput=()=>{listKey='';renderList();};$('back').onclick=()=>{showList=true;views();};$('menu-button').onclick=()=>{$('menu').hidden=!$('menu').hidden;$('menu-button').setAttribute('aria-expanded',String(!$('menu').hidden));};$('new-chat').onclick=()=>void command('new');$('stop').onclick=()=>void command('stop',selected);$('jump').onclick=()=>{$('messages').scrollTop=$('messages').scrollHeight;$('jump').hidden=true;};
$('prompt').oninput=()=>{if(selected)localStorage.setItem('gratis.draft.'+selected,$('prompt').value);$('send').disabled=!online||posting||!$('prompt').value.trim();$('prompt').style.height='auto';$('prompt').style.height=Math.min(130,$('prompt').scrollHeight)+'px';};$('composer').onsubmit=e=>{e.preventDefault();const text=$('prompt').value.trim();if(text){void command('send',selected,text);$('prompt').blur();}};
$('disconnect').onclick=async()=>{try{await request('forget');saveAuth(null);localStorage.removeItem(PENDING);location.reload();}catch(e){notice(e.message);}};
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void poll();else clearTimeout(timer);});window.addEventListener('online',()=>void poll());
if(location.hash)void claim(location.href);else if(auth)void poll();
if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});

function closeTools(){$('composer-tools').hidden=true;$('compose-menu').setAttribute('aria-expanded','false');}
$('compose-menu').onclick=()=>{const open=$('composer-tools').hidden;$('composer-tools').hidden=!open;$('compose-menu').setAttribute('aria-expanded',String(open));};
$('tools-new').onclick=()=>{closeTools();void command('new');};
$('tools-chats').onclick=()=>{closeTools();showList=true;views();};
$('tools-connection').onclick=()=>{closeTools();$('menu').hidden=false;$('menu-button').setAttribute('aria-expanded','true');};
document.addEventListener('pointerdown',event=>{if(!event.target.closest('#composer-tools,#compose-menu'))closeTools();if(!event.target.closest('#menu,#menu-button,#tools-connection')){$('menu').hidden=true;$('menu-button').setAttribute('aria-expanded','false');}});

$('choose-model').onclick=openModels;
$('tools-model').onclick=openModels;
$('close-model').onclick=()=>$('model-dialog').close();
$('refresh-providers').onclick=()=>void command('providers',selected||snapshot?.selected?.id);
// Retain the send gesture while iOS adjusts the focused viewport.
let sendGesture;
$('send').addEventListener('pointerdown',event=>{if(event.button!==0||$('send').disabled)return;sendGesture={id:event.pointerId,x:event.clientX,y:event.clientY};$('send').setPointerCapture(event.pointerId);});
$('send').addEventListener('pointerup',event=>{const gesture=sendGesture;sendGesture=null;if(!gesture||gesture.id!==event.pointerId)return;event.preventDefault();if(Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)<16)$('composer').requestSubmit();});
$('send').addEventListener('pointercancel',()=>{sendGesture=null;});
$('send').addEventListener('click',event=>{event.preventDefault();if(event.detail===0)$('composer').requestSubmit();});
