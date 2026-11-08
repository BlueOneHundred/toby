import {appearanceSetting} from './theme.mjs';
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
const only=(v,keys)=>object(v)&&Object.keys(v).every(k=>keys.includes(k));
export function validatePhoneSettings(value){if(!only(value,['displayName','profileAvatarDataUrl','appearance']))throw Error('Invalid phone settings.');if(value.displayName!==undefined&&(typeof value.displayName!=='string'||value.displayName.length>80))throw Error('Use a name under 80 characters.');if(value.profileAvatarDataUrl!==undefined&&value.profileAvatarDataUrl!==null&&(typeof value.profileAvatarDataUrl!=='string'||value.profileAvatarDataUrl.length>1400000||!/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(value.profileAvatarDataUrl)))throw Error('Choose a smaller profile image.');if(value.appearance!==undefined)appearanceSetting(value.appearance);return value;}
export function validatePhoneComputer(v){
 if(!only(v,['operation','human','revision','inputs'])||!['open','keepalive','close','refresh','restart','stop','control','input'].includes(v.operation))throw Error('Invalid computer control.');
 if(v.operation==='control'){if(typeof v.human!=='boolean')throw Error('Choose who controls the computer.');}else if(v.human!==undefined)throw Error('Unexpected control owner.');
 if(v.operation==='input'){
  if(!Number.isSafeInteger(v.revision)||v.revision<0||!Array.isArray(v.inputs)||!v.inputs.length||v.inputs.length>64)throw Error('Invalid computer input.');
  for(const i of v.inputs){if(!only(i,['name','args'])||!object(i.args))throw Error('Invalid computer input.');const a=i.args;
   if(['click_screen','pointer_event','wheel_input'].includes(i.name)){if(!Number.isFinite(a.x)||!Number.isFinite(a.y)||a.x<0||a.x>1280||a.y<0||a.y>800)throw Error('Pointer is outside the computer screen.');}
   if(i.name==='click_screen'){if(!only(a,['x','y','button','clickCount'])||a.button!==undefined&&!['left','right'].includes(a.button)||a.clickCount!==undefined&&![1,2,3].includes(a.clickCount))throw Error('Invalid click.');}
   else if(i.name==='pointer_event'){if(!only(a,['x','y','button','type','buttons'])||!['down','up','move'].includes(a.type)||!['left','right'].includes(a.button)||a.buttons!==undefined&&![0,1,2].includes(a.buttons))throw Error('Invalid pointer event.');}
   else if(i.name==='wheel_input'){if(!only(a,['x','y','deltaX','deltaY'])||![a.deltaX,a.deltaY].every(n=>Number.isFinite(n)&&Math.abs(n)<=2000))throw Error('Invalid scroll.');}
   else if(i.name==='type_text'){if(!only(a,['text'])||typeof a.text!=='string'||a.text.length>6000)throw Error('Use shorter text.');}
   else if(i.name==='press_key'){if(!only(a,['key'])||typeof a.key!=='string'||!/^(?:(?:Control|Alt|Shift|Meta)\+)*(?:[A-Z0-9]|Enter|Tab|Escape|ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Backspace|Delete|Home|End|PageUp|PageDown|Space)$/.test(a.key))throw Error('Unsupported keyboard key.');}
   else if(i.name==='browse_url'){if(!only(a,['url'])||typeof a.url!=='string'||a.url.length>4000)throw Error('Use a web address.');let u;try{u=new URL(a.url);}catch{throw Error('Use a web address.');}if(!['http:','https:'].includes(u.protocol)||u.username||u.password)throw Error('Use an HTTP or HTTPS address without credentials.');}
   else if(i.name==='copy_selection'){if(Object.keys(a).length)throw Error('Invalid copy.');}
   else throw Error('This computer action is not available from the phone.');
  }
 }else if(v.inputs!==undefined||v.revision!==undefined)throw Error('Unexpected computer input.');return v;
}
