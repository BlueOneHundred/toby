import {avatarSvg} from './avatar.mjs';
import {pointerGaze} from './avatar-gaze.mjs';
const NS='http://www.w3.org/2000/svg',views=new Map();
let worker,sequence=0,inFlight=false,frameRequest,lastFrame=0;
const pointer={x:0,y:0,active:false},reduce=matchMedia('(prefers-reduced-motion: reduce)');
const hash=value=>{let n=2166136261;for(const c of value)n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;};
function node(tag,attrs={}){const n=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,String(v));return n;}
function eligible(view){const dialog=[...document.querySelectorAll('dialog[open]')].at(-1);return view.visible&&!view.config.photo&&view.element.isConnected&&(!dialog||dialog.contains(view.element));}
function shouldRun(){return !reduce.matches&&!document.hidden&&[...views.values()].some(eligible);}
function wake(){if(!frameRequest&&shouldRun())frameRequest=requestAnimationFrame(tick);}
function ensureWorker(){
 if(worker)return;
 worker=new Worker(new URL('./avatar-worker.mjs',import.meta.url),{type:'module'});
 worker.onmessage=event=>{
  inFlight=false;
  for(const frame of event.data.frames||[]){const view=views.get(frame.id);if(!view||view.revision!==frame.revision||view.config.photo||reduce.matches)continue;
   if(view.transition&&view.ready){const ghost=document.createElement('img');ghost.alt='';ghost.className='avatar-ghost';ghost.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(view.svg));view.element.append(ghost);ghost.animate([{opacity:1},{opacity:0}],{duration:190,easing:'ease-out'}).onfinish=()=>ghost.remove();view.svg.animate([{opacity:0},{opacity:1}],{duration:190});}
   view.transition=false;view.body.setAttribute('d',frame.body);view.eyes.setAttribute('d',frame.eyes);view.outline.setAttribute('d',frame.body);
   const pad=(frame.size-frame.boxSize)/2;view.group.setAttribute('transform',`scale(${100/frame.boxSize}) translate(${-pad} ${-pad})`);view.outline.setAttribute('transform',`translate(${frame.size/2} ${frame.size/2}) scale(1.14) translate(${-frame.size/2} ${-frame.size/2})`);
   view.element.dataset.ready='true';view.ready=true;
  }
  wake();
 };
 worker.onerror=()=>{inFlight=false;worker?.terminate();worker=null;for(const v of views.values()){v.ready=false;v.element.dataset.ready='false';}cancelAnimationFrame(frameRequest);frameRequest=null;};
}
function tick(time){
 frameRequest=null;if(!shouldRun()){lastFrame=0;return;}
 if(inFlight||time-lastFrame<1000/(pointer.active?60:30)){wake();return;}
 const dt=lastFrame?Math.min(.1,(time-lastFrame)/1000):1/30;lastFrame=time;
 const items=[];
 for(const view of views.values()){
  if(!eligible(view))continue;
  const r=view.element.getBoundingClientRect(),follow=view.config.follow==='global'||view.hover;
  const gaze=pointer.active&&follow?pointerGaze(r,pointer):null;
  items.push({id:view.id,revision:view.revision,shape:view.config.shape,mode:view.config.mode||'idle',compact:r.width<48,boxSize:Math.round(Math.max(32,Math.min(128,r.width))),seed:hash(view.id),gaze,pulse:view.pulse});
 }
 if(items.length){ensureWorker();inFlight=true;worker.postMessage({type:'frame',items,dt});}
 wake();
}
const observer=new IntersectionObserver(entries=>{for(const entry of entries){const view=views.get(entry.target.dataset.motionId);if(view){view.visible=entry.isIntersecting;view.mounted ||= entry.target.isConnected;}}wake();});
let cleanupQueued=false;
new MutationObserver(()=>{if(cleanupQueued)return;cleanupQueued=true;queueMicrotask(()=>{cleanupQueued=false;const ids=[];for(const[id,v]of views)if(v.mounted&&!v.element.isConnected){observer.unobserve(v.element);views.delete(id);ids.push(id);}if(ids.length)worker?.postMessage({type:'remove',ids});wake();});}).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['open']});
window.addEventListener('pointermove',event=>{pointer.x=event.clientX;pointer.y=event.clientY;pointer.active=true;wake();},{passive:true});
window.addEventListener('blur',()=>{pointer.active=false;});
document.addEventListener('pointerleave',()=>{pointer.active=false;});
document.addEventListener('visibilitychange',()=>{lastFrame=0;wake();});
reduce.addEventListener('change',()=>{for(const v of views.values()){v.element.dataset.ready=String(v.ready&&!reduce.matches&&!v.config.photo);if(reduce.matches){for(const animation of v.element.getAnimations({subtree:true}))animation.cancel();v.element.querySelectorAll('.avatar-ghost').forEach(g=>g.remove());}}lastFrame=0;wake();});

export function animatedAvatar(key,config){
 let view=views.get(key);
 if(!view){
  const element=document.createElement('span');element.className='avatar-motion';element.dataset.motionId=key;
  const fallback=document.createElement('img');fallback.className='avatar-static';fallback.alt='';
  const svg=node('svg',{viewBox:'0 0 100 100','aria-hidden':'true',class:'avatar-drawing'}),group=node('g'),defs=node('defs'),maskId=`gratis-avatar-mask-${++sequence}`;
  const mask=node('mask',{id:maskId,maskUnits:'userSpaceOnUse',x:-200,y:-200,width:600,height:600}),eyes=node('path',{fill:'black'});
  mask.append(node('rect',{x:-200,y:-200,width:600,height:600,fill:'white'}),eyes);defs.append(mask);
  const outline=node('path',{fill:'none',stroke:'#666','stroke-width':1.5,class:'avatar-outline'}),body=node('path',{mask:`url(#${maskId})`,class:'avatar-body'});group.append(defs,outline,body);svg.append(group);element.append(fallback,svg);
  view={id:key,element,fallback,svg,group,body,eyes,outline,config:{},revision:0,pulse:0,ready:false,visible:false,mounted:false,hover:false};views.set(key,view);
  element.addEventListener('pointerenter',()=>{view.hover=true;wake();});element.addEventListener('pointerleave',()=>{view.hover=false;});observer.observe(element);
 }
 const changedShape=view.config.shape&&view.config.shape!==config.shape;
 const changed=JSON.stringify(view.config)!==JSON.stringify(config);
 if(changed){view.transition=!!changedShape;view.config={...config};view.revision++;view.body.style.fill=config.color;view.outline.style.display=config.outlined?'':'none';view.element.classList.toggle('avatar-photo',!!config.photo);
  view.fallback.src=config.photo||avatarSvg(config.name||'',config.color,config.shape,!!config.front);
  if(config.photo){view.element.dataset.ready='false';view.ready=false;worker?.postMessage({type:'remove',ids:[key]});}
 }
 view.element.dataset.mode=config.mode||'idle';view.element.dataset.ready=String(view.ready&&!reduce.matches&&!config.photo);wake();return view.element;
}
export function pulseAvatar(key){const view=views.get(key);if(!view||reduce.matches)return;view.pulse++;view.element.animate([{transform:'scale(.91)'},{transform:'scale(1.06)',offset:.55},{transform:'scale(1)'}],{duration:300,easing:'cubic-bezier(.22,.8,.3,1)'});wake();}
