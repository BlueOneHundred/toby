import {transcribeAudio,decodeAudio} from './voice.mjs';
export class MobileDictation {
  constructor({service,directory,transcribe=transcribeAudio,onChange=()=>{},available=()=>true}){Object.assign(this,{service,directory,transcribe,onChange,available});this.jobs=new Map();this.current=null;}
  snapshot(conversationId){const job=this.jobs.get(conversationId);return job?{id:job.id,phase:job.phase,text:job.text,error:job.error,send:job.send}:undefined;}
  start(command){
    const c=this.service._conversation(command.conversationId);if(c.parentThreadId)throw new Error('Choose the main conversation.');
    if(this.current||!this.available())throw new Error('Finish the current recording first.');
    if(this.jobs.get(c.id)?.id===command.requestId)return c.id;
    decodeAudio(command);
    const controller=new AbortController(),job={id:command.requestId,phase:'transcribing',send:command.send,controller};
    this.jobs.set(c.id,job);if(this.jobs.size>40)this.jobs.delete(this.jobs.keys().next().value);this.current=job;this.onChange();
    job.promise=(async()=>{try{
      const result=await this.transcribe(command,{dataDir:this.directory,settings:{...this.service.state.settings,voiceCleanup:true},signal:controller.signal});
      controller.signal.throwIfAborted();job.text=result.text;
      if(job.send)await this.service.send({conversationId:c.id,text:result.text});
      job.phase='complete';
    }catch(error){job.phase=controller.signal.aborted?'cancelled':'error';job.error=controller.signal.aborted?'Recording cancelled.':String(error.message||'Could not transcribe this recording.').slice(0,250);}
    finally{if(this.current===job)this.current=null;this.onChange();}})();
    return c.id;
  }
  cancel({conversationId,requestId}){const job=this.jobs.get(conversationId);if(job?.id===requestId)job.controller.abort();return conversationId;}
  async close(){this.current?.controller.abort();await this.current?.promise?.catch(()=>{});}
}
