import {requireVersion,assertStorageCompatible} from './storage-safety.mjs';
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {Cron} from 'croner';
import {ExtraWorkdays, isWorkday} from './workdays.mjs';
const required=(v,label,max)=>{if(typeof v!=='string'||!v.trim()||v.length>max)throw new Error(`Enter ${label} under ${max} characters.`);return v.trim();};
function cronDate(timing,after){
 const cron=new Cron(timing.expression,{timezone:timing.timezone,paused:true});
 try{const next=cron.nextRun(new Date(after));if(!next)throw new Error('This cron expression has no future run.');return next.getTime();}finally{cron.stop();}
}
export function validateTiming(value){
 if(!value||typeof value!=='object')throw new Error('Choose a schedule.');
 const timezone=value.timezone||Intl.DateTimeFormat().resolvedOptions().timeZone;
 try{new Intl.DateTimeFormat('en',{timeZone:timezone}).format();}catch{throw new Error('Choose a valid timezone, such as America/Toronto.');}
 if(value.kind==='cron'){
  const expression=typeof value.expression==='string'?value.expression.trim().replace(/\s+/g,' '):'';
  if(expression.length>120||expression.split(' ').length!==5)throw new Error('Enter a five-field cron expression: minute hour day month weekday.');
  const timing={kind:'cron',expression,timezone};
  try{cronDate(timing,Date.now());}catch{throw new Error('Choose a valid cron expression with a future run.');}
  return timing;
 }
 if(value.kind==='interval'){
  if(!Number.isInteger(value.minutes)||value.minutes<15||value.minutes>10080)throw new Error('Choose an interval from 15 minutes to one week.');
  return{kind:'interval',minutes:value.minutes,timezone};
 }
 if(value.kind!=='weekly'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(value.time||''))throw new Error('Choose a time in HH:mm format.');
 const days=[...new Set(value.days||[0,1,2,3,4,5,6])].sort();
 if(!days.length||days.some(d=>!Number.isInteger(d)||d<0||d>6))throw new Error('Choose at least one day.');
 return{kind:'weekly',time:value.time,days,timezone};
}
// Toby build 44: extra is a Set of extra workdays (YYYY-MM-DD). A weekday schedule (every day Monday to Friday)
// fires on those dates too, at its usual time (board/extra-workdays.md, src/workdays.mjs).
export const weekdaySchedule=timing=>timing?.kind==='weekly'&&[1,2,3,4,5].every(d=>timing.days.includes(d))&&timing.days.length<7;
export function nextRun(timing,after,servedAt,extra){
 if(timing.kind==='cron')return cronDate(timing,Math.max(after,servedAt??after));
 if(timing.kind==='interval')return after+timing.minutes*60000;
 // Iterate actual instants, so daylight-saving gaps are skipped and repeated
 // wall-clock times do not require inventing a timezone offset.
 const format=new Intl.DateTimeFormat('en-GB',{timeZone:timing.timezone,year:'numeric',month:'2-digit',day:'2-digit',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 const localDate=t=>{const p=Object.fromEntries(format.formatToParts(t).map(p=>[p.type,p.value]));return `${p.year}-${p.month}-${p.day}`;};
 const servedDate=servedAt===undefined?null:localDate(servedAt);
 const initial=Object.fromEntries(format.formatToParts(after).map(p=>[p.type,p.value]));
 const skipToday=`${initial.hour}:${initial.minute}`>=timing.time?localDate(after):null;
 const names=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],extraOn=!!extra?.size&&weekdaySchedule(timing);
 for(let t=Math.floor(after/60000)*60000+60000,end=t+8*86400000;t<end;t+=60000){const p=Object.fromEntries(format.formatToParts(t).map(p=>[p.type,p.value]));if(localDate(t)!==servedDate&&localDate(t)!==skipToday&&(timing.days.includes(names.indexOf(p.weekday))||(extraOn&&extra.has(localDate(t))))&&`${p.hour}:${p.minute}`===timing.time)return t;}
 throw new Error('Could not determine the next scheduled time.');
}
// Toby build 53: a missed run from an earlier day is skipped, not run late (Sat 28 Nov 2026: the laptop was closed on
// Friday, and on opening Toby on Saturday every weekday schedule would have started Friday's run at once). A run missed
// earlier the same day still runs late, as before (the laptop asleep at 14:00 and opened at 16:30). A weekday schedule
// never runs late on a day that is not a workday. Only day-and-time (weekly) schedules: interval and custom cron
// schedules still coalesce missed runs into one fresh run, as in Gratis.
const localDay=(t,timezone)=>{const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(t).map(p=>[p.type,p.value]));return `${p.year}-${p.month}-${p.day}`;};
export function staleRun(timing,dueAt,now,extra=new Set()){
 if(timing?.kind!=='weekly'||!Number.isFinite(dueAt)||dueAt>now)return false;
 if(localDay(dueAt,timing.timezone)!==localDay(now,timing.timezone))return true;
 return weekdaySchedule(timing)&&!isWorkday(now,extra);
}
// Toby build 40: a run that hit a run limit gets one short, fresh turn to save its work (19 Nov: Creator Partnerships
// reached 200 tool calls with nothing saved, so Tavin had no creators that morning).
export const hitLimit=error=>/^Paused at the|^Paused after/i.test(String(error||''));
export const WRAP_UP='Your scheduled run stopped at its run limit before it finished. Do NOT continue the job or start anything new. Using at most 10 tool calls, save what you already have now: write (or finish) your main file with everything you found so far, mark clearly what is missing, and add your run line saying the run hit its limit. Then stop. Don\'t ask questions.';
export const cutShort=error=>/interrupted when the app closed|^Paused at the|^Paused after|run limit|time limit|tool-call limit/i.test(String(error||''));
const two=n=>String(n).padStart(2,'0'),day=t=>{const d=new Date(t);return `${d.getFullYear()}-${two(d.getMonth()+1)}-${two(d.getDate())}`;},clock=t=>{const d=new Date(t);return `${two(d.getHours())}:${two(d.getMinutes())}`;};
export class Schedules {
 constructor({directory,encrypt,decrypt,service,onChange=()=>{},now=Date.now,teamFolder=null}){Object.assign(this,{directory,encrypt,decrypt,service,onChange,now,teamFolder});this.items=[];this.persist=Promise.resolve();this.ticking=false;this.closed=false;this.dispatching=new Set();this.workdays=new ExtraWorkdays(teamFolder?.root?.(),now);this.extra=new Set();this.extraKey='';}
 async init(){try{const data=JSON.parse(await this.decrypt(await readFile(join(this.directory,'schedules.secure'))));requireVersion(data,'Schedules');if(!Array.isArray(data.items))throw new Error('Invalid saved records.');this.items=data.items;}catch(e){if(e.code!=='ENOENT')throw new Error('Could not unlock saved schedules.');}this.opened=true;return this;}
 snapshot(conversationId){return structuredClone(this.items.filter(i=>!conversationId||i.conversationId===conversationId));}
 async save(){if(!this.opened)throw new Error('Storage did not open safely. Existing files were preserved.');const body=JSON.stringify({version:1,items:this.items});const write=async()=>{await assertStorageCompatible(this.directory);await mkdir(this.directory,{recursive:true,mode:0o700});const tmp=join(this.directory,'.schedules-'+randomUUID());await writeFile(tmp,await this.encrypt(body),{mode:0o600});await rename(tmp,join(this.directory,'schedules.secure'));};this.persist=this.persist.then(write,write);await this.persist;this.onChange();}
 get(id,conversationId){const item=this.items.find(i=>i.id===id&&i.conversationId===conversationId);if(!item)throw new Error('This schedule does not belong to this chat.');return item;}
 async create({conversationId,title,prompt,timing,sourceMessageId}){
  const c=this.service._conversation(conversationId);if(c.parentThreadId)throw new Error('Create schedules in the shared chat.');
  title=required(title,'a schedule name',120);prompt=required(prompt,'a task',16000);timing=validateTiming(timing);
  if(this.items.filter(i=>i.conversationId===conversationId).length>=30)throw new Error('This chat already has 30 schedules.');
  const prior=sourceMessageId&&this.items.find(i=>i.conversationId===conversationId&&i.sourceMessageId===sourceMessageId&&i.prompt===prompt&&JSON.stringify(i.timing)===JSON.stringify(timing));if(prior)return structuredClone(prior);
  const item={id:randomUUID(),conversationId,botId:c.botId,title,prompt,timing,sourceMessageId,enabled:true,nextRunAt:nextRun(timing,this.now(),undefined,this.extra),createdAt:this.now(),runs:[]};this.items.push(item);await this.save();return structuredClone(item);
 }
 async update({id,conversationId,enabled,title,prompt,timing}){
  const item=this.get(id,conversationId),editing=title!==undefined||prompt!==undefined||timing!==undefined;
  if(editing&&item.runs.some(r=>['starting','running'].includes(r.status)))throw new Error('Wait for the current run to finish before editing this schedule.');
  const next={};if(title!==undefined)next.title=required(title,'a schedule name',120);if(prompt!==undefined)next.prompt=required(prompt,'a task',16000);if(timing!==undefined)next.timing=validateTiming(timing);
  if(enabled!==undefined){if(typeof enabled!=='boolean')throw new Error('Invalid schedule state.');next.enabled=enabled;}
  if(timing!==undefined||enabled===true)next.nextRunAt=nextRun(next.timing||item.timing,this.now(),undefined,this.extra);
  Object.assign(item,next);if(enabled===true)delete item.error;await this.save();return structuredClone(item);
 }
 async remove({id,conversationId}){const item=this.get(id,conversationId);if(item.runs.some(r=>['starting','running'].includes(r.status)))throw new Error('Stop the running chat before deleting its schedule.');this.items=this.items.filter(i=>i!==item);await this.save();}
 async runNow({id,conversationId}){const item=this.get(id,conversationId),c=this.service._conversation(conversationId);if(this.busy(c)||item.runs.some(r=>['starting','running'].includes(r.status)))throw new Error('This chat is busy. Wait for it to finish.');await this.startRun(item,this.now());return this.snapshot(conversationId);}
 busy(c){return this.service.closing||this.service.teams.busy(c)||this.service.teams.waiting(c)||c.queue?.length||c.queuePaused||c.computerPause||c.pendingComputerHelp||this.service.changingThreads.has(c.id);}
 async startRun(item,scheduledFor){
  const c=this.service._conversation(item.conversationId),run={id:randomUUID(),scheduledFor,startedAt:this.now(),status:'starting'};
  this.dispatching.add(run.id);
  try{
  item.runs.push(run);item.runs=item.runs.slice(-30);item.nextRunAt=nextRun(item.timing,this.now(),scheduledFor,this.extra);await this.save();
  if(this.closed||this.busy(c)){run.status='deferred';item.nextRunAt=scheduledFor;await this.save();return;}
  try{await this.service._deliver(c,item.prompt,[],{scheduled:{id:item.id,runId:run.id,title:item.title,scheduledFor}});run.status='running';await this.save();}
  catch(error){run.status='needs_review';run.error=error.message;item.enabled=false;item.error='A scheduled run could not start. Review it before resuming.';await this.save();}
  }finally{this.dispatching.delete(run.id);}
 }
 async tick(){if(this.ticking||this.closed)return;this.ticking=true;try{
  let changed=false;const wrapups=[];
  changed=await this.refreshWorkdays().catch(()=>false);
  for(const item of this.items){
   const c=this.service.state.conversations.find(c=>c.id===item.conversationId);
   if(!c){if(item.enabled){item.enabled=false;item.error='The chat was deleted.';changed=true;}continue;}
   for(const run of item.runs.filter(r=>['starting','running'].includes(r.status))){
    if(this.dispatching.has(run.id))continue;
    const index=c.messages.findIndex(m=>m.sourceScheduleRunId===run.id);
    if(index<0){run.status='needs_review';run.error='The app stopped before delivery was confirmed.';item.enabled=false;changed=true;continue;}
    if(this.service.teams.busy(c)||this.service.teams.waiting(c)||c.pendingComputerHelp||c.computerPause)continue;
    const end=c.messages.findIndex((m,i)=>i>index&&m.role==='user');
    const replies=c.messages.slice(index+1,end<0?undefined:end).filter(m=>m.role==='assistant');
    const failed=replies.find(m=>['error','cancelled'].includes(m.status));
    run.status=failed||!replies.length?'needs_review':'completed';run.finishedAt=this.now();
    // Toby build 39: a run cut short by Toby closing or by a run limit is not a reason to switch the schedule off
    // (on 18 Nov four schedules paused themselves this way and nobody saw it). It runs again at its next time,
    // and a run line tells Toby's brief what happened. A run Tavin stopped himself still pauses its schedule.
    if(run.status==='needs_review'&&cutShort(failed?.error)){run.status='interrupted';run.error=failed.error;void this.runLine(item,failed.error);if(hitLimit(failed.error)&&run.kind!=='wrapup')wrapups.push(item);}
    else if(run.status==='needs_review'){run.error=failed?.error||'No completed reply was recorded.';item.enabled=false;item.error='Review the last run, then resume this schedule.';}changed=true;
   }
   if(!item.enabled||item.nextRunAt>this.now()||this.busy(c)||item.runs.some(r=>['starting','running'].includes(r.status)))continue;
   // Build 53: a run missed on an earlier day (or a weekday run on a day off) is skipped: the schedule moves on to its next time.
   if(staleRun(item.timing,item.nextRunAt,this.now(),this.extra)){const missed=item.nextRunAt;item.nextRunAt=nextRun(item.timing,this.now(),undefined,this.extra);item.skipped=[...(item.skipped||[]),{scheduledFor:missed,skippedAt:this.now()}].slice(-30);changed=true;void this.skipLine(item,missed);continue;}
   // Coalesce missed intervals to one fresh check. Never replay a backlog.
   await this.startRun(item,item.nextRunAt);
  }
  if(changed)await this.save();
  for(const item of wrapups)await this.wrapUp(item).catch(()=>{});
 }finally{this.ticking=false;}}
 // Build 44: when board/extra-workdays.md changes, weekday schedules work out their next time again.
 async refreshWorkdays(){const days=await this.workdays.get(),key=[...days].sort().join(',');if(key===this.extraKey)return false;this.extra=days;this.extraKey=key;let changed=false;
  for(const item of this.items){if(!item.enabled||!weekdaySchedule(item.timing)||item.nextRunAt<=this.now()||item.runs.some(r=>['starting','running'].includes(r.status)))continue;const last=item.runs.filter(r=>r.kind!=='wrapup').at(-1)?.scheduledFor;const next=nextRun(item.timing,this.now(),last,days);if(next!==item.nextRunAt){item.nextRunAt=next;changed=true;}}
  return changed;}
 start(){this.timer=setInterval(()=>void this.tick().catch(()=>{}),5000);this.timer.unref?.();void this.tick().catch(()=>{});}
 async wrapUp(item){const c=this.service._conversation(item.conversationId);if(this.closed||this.busy(c))return;
  const run={id:randomUUID(),kind:'wrapup',scheduledFor:this.now(),startedAt:this.now(),status:'starting'};this.dispatching.add(run.id);
  try{item.runs.push(run);item.runs=item.runs.slice(-30);await this.save();
   try{await this.service._deliver(c,WRAP_UP,[],{scheduled:{id:item.id,runId:run.id,title:item.title+': save your work',scheduledFor:run.scheduledFor}});run.status='running';}
   catch(e){run.status='interrupted';run.error=e.message;}await this.save();}finally{this.dispatching.delete(run.id);}}
 async runLine(item,error){if(!this.teamFolder)return;const t=this.now(),bot=this.service.state.bots.find(b=>b.id===item.botId)?.name||'A bot';
  await this.teamFolder.append(`board/runs-${day(t)}.md`,`${clock(t)} | ${bot} | done: scheduled run "${item.title}" was cut short; the schedule stays on and runs again at its next time | cost: $0.00 | problems: ${String(error).replace(/\n/g,' ').slice(0,200)}\n`).catch(()=>{});}
 async skipLine(item,missed){if(!this.teamFolder)return;const t=this.now(),bot=this.service.state.bots.find(b=>b.id===item.botId)?.name||'A bot',when=t=>`${new Date(t).toDateString().slice(0,10)} ${clock(t)}`;
  await this.teamFolder.append(`board/runs-${day(t)}.md`,`${clock(t)} | ${bot} | done: scheduled run "${item.title}" for ${when(missed)} was missed (Toby was closed) and skipped, not run late; next run ${when(item.nextRunAt)} | cost: $0.00 | problems: none\n`).catch(()=>{});}
 async close(){this.closed=true;clearInterval(this.timer);await this.persist;}
}
