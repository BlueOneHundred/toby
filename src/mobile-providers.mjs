import {getClaudeStatus} from './claude-backend.mjs';
import {getCodexStatus,getCodexModels} from './codex-client.mjs';

const claudeModels = ['haiku','sonnet','opus'].map(id=>({id,name:id[0].toUpperCase()+id.slice(1),defaultEffort:'medium'}));
export class MobileProviders {
  constructor({claudeStatus=getClaudeStatus,codexStatus=getCodexStatus,codexModels=getCodexModels,onChange=()=>{}}={}) {
    Object.assign(this,{claudeStatus,codexStatus,codexModels,onChange});
    this.catalog=[];this.updated=0;this.pending=null;
  }
  snapshot(){if(Date.now()-this.updated>300000)void this.refresh().catch(()=>{});return this.catalog;}
  async refresh(force=false){
    if(this.pending)return this.pending;
    if(!force&&Date.now()-this.updated<300000)return this.catalog;
    this.pending=(async()=>{
      const [claude,codex]=await Promise.all([this.claudeStatus(),this.codexStatus()]);
      let models=[];
      if(codex.signedIn)try{models=await this.codexModels();}catch{}
      this.catalog=[{id:'claude',name:'Claude',signedIn:!!claude.signedIn,models:claudeModels},
        {id:'codex',name:'Codex',signedIn:!!codex.signedIn,models:models.map(m=>({id:m.id,name:m.name,isDefault:m.isDefault,defaultEffort:m.defaultEffort,efforts:m.efforts}))}];
      this.updated=Date.now();this.onChange();return this.catalog;
    })().finally(()=>{this.pending=null;});
    return this.pending;
  }
  async select(service,{conversationId,provider,model}){
    const c=service._conversation(conversationId);
    if(c.parentThreadId)throw new Error('Choose the main conversation.');
    if(service.teams.busy(c))throw new Error('Wait for this reply to finish before changing models.');
    const available=(await this.refresh(true)).find(p=>p.id===provider);
    if(!available?.signedIn)throw new Error(`Sign in to ${provider==='claude'?'Claude Code':'Codex'} on your desktop first.`);
    const chosen=available.models.find(m=>m.id===model);
    if(!chosen)throw new Error('This model is not available. Reopen the model picker to refresh it.');
    const remembered=service.state.settings.providerDefaults?.[provider]?.effort;
    const effort=provider==='claude'?'medium':chosen.efforts?.includes(remembered)?remembered:chosen.defaultEffort||'medium';
    await service.updateSettings({...service.state.settings,provider,model,effort});
    await service.updateBot({id:c.botId,...(provider==='claude'?{model}:{codexModel:model})});
    return c.id;
  }
}
