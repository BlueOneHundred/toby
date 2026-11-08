import {createRig,contours,polygonPath,extent,fill} from './avatar-geometry.mjs';
import recipes from './assets/avatar-motion-recipes.mjs';
const actors=new Map(),cache=new Map();
const shapes=new Set('sphere cloud square sparkle clover heartChubby starFlower teardrop tablet wedge house star6 hex pebble bean egg squircle capsule cylinder gem crystal shield dome arch leaf pumpkin'.split(' '));
function random(actor){let n=actor.seed|0;n^=n<<13;n^=n>>>17;n^=n<<5;actor.seed=n|0;return(n>>>0)/4294967296;}
function clip(actor,first=false){
  const choices=actor.mode==='streaming'?['Streaming_A','Streaming_B','Streaming_C']:actor.compact?['Idle_B']:['Idle_B','Idle_B','Idle_D','Idle_B','Idle_A'];
  let name=choices[Math.floor(random(actor)*choices.length)];
  actor.rig.load(recipes[name],{phase:first?random(actor):0,transition:first?'cut':'bridge'});actor.loop=actor.rig.loopCount;
}
function paths(frame,shape,size){
  const key=shape+'|'+size+'|'+frame.quat.map(v=>v.toFixed(4)).join(',')+'|'+frame.offset.map(v=>v.toFixed(4)).join(',')+'|'+frame.squash.map(v=>v.toFixed(4)).join(',')+'|'+frame.zoom.toFixed(4)+'|'+frame.eyes.map(e=>[e.lidY,e.wid,e.tilt,...e.off,...e.oval,e.ovalMix,...e.pts.flat()].map(v=>v.toFixed(4)).join(',')).join('|');
  let value=cache.get(key);if(value){cache.delete(key);cache.set(key,value);return value;}
  const drawing=contours(frame,shape,size);
  value={body:drawing.body.map(polygonPath).join(''),eyes:drawing.eyes.map(polygonPath).join(''),size};
  cache.set(key,value);if(cache.size>1800)cache.delete(cache.keys().next().value);return value;
}
self.onmessage=event=>{
  const message=event.data;
  if(message.type==='remove'){for(const id of message.ids)actors.delete(id);return;}
  if(message.type!=='frame')return;
  const result=[];
  for(const item of message.items){
    const spec={...item,shape:shapes.has(item.shape)?item.shape:'clover'};
    let actor=actors.get(spec.id);
    if(!actor){actor={rig:createRig({body:spec.shape,isGazeAlways:true,gazeTracking:'direct'}),shape:spec.shape,seed:spec.seed||1,mode:spec.mode,compact:spec.compact,pulse:spec.pulse};actors.set(spec.id,actor);clip(actor,true);}
    if(actor.shape!==spec.shape){actor.shape=spec.shape;actor.rig.setBody(spec.shape,{isInstant:true});}
    if(actor.mode!==spec.mode){actor.mode=spec.mode;clip(actor);}
    if(actor.pulse!==spec.pulse){actor.pulse=spec.pulse;actor.rig.blink();}
    actor.rig.setGaze(spec.mode==='streaming'?null:spec.gaze||null,{immediate:true});actor.rig.advance(Math.min(message.dt,.1));
    if(actor.rig.loopCount!==actor.loop)clip(actor);
    const frame=actor.rig.frame(),size=spec.boxSize*extent(fill);
    result.push({id:spec.id,revision:spec.revision,boxSize:spec.boxSize,...paths(frame,spec.shape,size)});
  }
  self.postMessage({type:'frame',frames:result,actors:actors.size,cache:cache.size});
};
