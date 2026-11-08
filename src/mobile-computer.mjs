import {validatePhoneComputer} from './mobile-controls.mjs';
export class MobileComputer {
 constructor({service,cloud,control,nativeImage,onMode=()=>{},onChange=()=>{},now=Date.now}){Object.assign(this,{service,cloud,control,nativeImage,onMode,onChange,now});this.view=null;this.clipboard=null;this.cached=null;}
 close(){if(this.view)this.cloud.watch(this.view.botId,this.view.id,false,'mobile');this.view=null;this.cached=null;this.clipboard=null;this.onMode(false);}
 snapshot(id){if(!this.view)return;if(this.now()>this.view.until){this.close();return;}if(id!==this.view.id)return;const raw=this.control.snapshot(id),state=raw.state;let frame;
  if(raw.frame?.dataUrl){if(this.cached?.source!==raw.frame.dataUrl){const image=this.nativeImage.createFromDataURL(raw.frame.dataUrl);if(!image.isEmpty()){const size=image.getSize();let bytes;for(const width of [1280,1024,800]){bytes=image.resize({width,quality:'good'}).toJPEG(65);if(bytes.length<=170000)break;}if(bytes.length<=170000)this.cached={source:raw.frame.dataUrl,dataUrl:'data:image/jpeg;base64,'+bytes.toString('base64'),width:size.width,height:size.height};}}
   if(this.cached)frame={dataUrl:this.cached.dataUrl,width:this.cached.width,height:this.cached.height,at:raw.frame.at};}
  return {state:{status:state.status,control:state.control,controlRevision:state.controlRevision,error:state.error?.slice(0,400),live:state.live},frame,clipboard:this.clipboard};
 }
 async execute(command){const v=validatePhoneComputer(command.computer),c=this.control.conversation(command.conversationId);if(v.operation==='close'){if(this.view?.id===c.id)this.close();return c.id;}
  if(v.operation==='open'){if(this.service._bot(c.botId).capabilities?.computer===false)throw Error('Enable Computer in this agent’s settings on your computer first.');if(!this.cloud.connections?.value?.cloud?.token)throw Error('Connect a cloud computer in desktop Settings first.');if(this.view&&this.view.id!==c.id)this.close();this.view={id:c.id,botId:c.botId,until:this.now()+35000};this.onMode(true);this.cloud.watch(c.botId,c.id,true,'mobile');if(['idle','stopped','error'].includes(this.cloud.state(c.id).status))void this.control.start({conversationId:c.id}).catch(()=>this.onChange());this.onChange();return c.id;}
  if(!this.view||this.view.id!==c.id)throw Error('Open this computer on the phone first.');this.view.until=this.now()+35000;
  if(v.operation==='keepalive')return c.id;
  if(v.operation==='control')await this.control.control({conversationId:c.id,human:v.human});
  else if(v.operation==='restart')await this.control.start({conversationId:c.id,restart:true});
  else if(v.operation==='stop')await this.control.stop({conversationId:c.id});
  else if(v.operation==='refresh'){if(!this.cloud.live.get(c.id)?.ready)await this.cloud.execute({botId:c.botId,conversationId:c.id,name:'capture_screen',args:{},humanControl:true});}
  else if(v.operation==='input'){const result=await this.control.batch({conversationId:c.id,inputs:v.inputs,revision:v.revision});if(result?.clipboardText!==undefined)this.clipboard=String(result.clipboardText).slice(0,20000);}
  this.onChange();return c.id;
 }
}
