import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {MobileProviders} from '../src/mobile-providers.mjs';
import {ChatService} from '../src/chat-service.mjs';
import {mobileCommand} from '../src/mobile-bridge.mjs';
import {mobileSnapshot} from '../src/mobile-projection.mjs';
const options={claudeStatus:async()=>({signedIn:true}),codexStatus:async()=>({signedIn:true}),codexModels:async()=>[{id:'test-codex',name:'Test Codex',defaultEffort:'low',efforts:['low','medium']}]};
test('phone model selection uses existing subscriptions and persists desktop settings without exporting credentials',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'gratis-provider-test-')),service=new ChatService({dataDir:directory,backend:async function*(){yield 'reply';}});
 try{
  await service.init();const providers=new MobileProviders(options),conversationId=service.state.activeConversationId;
  await providers.select(service,{conversationId,provider:'claude',model:'haiku'});
  assert.equal(service.state.settings.provider,'claude');assert.equal(service._bot(service.state.activeBotId).model,'haiku');
  await providers.select(service,{conversationId,provider:'codex',model:'test-codex'});
  assert.equal(service.state.settings.provider,'codex');assert.equal(service.state.settings.effort,'low');
  assert.equal(service._bot(service.state.activeBotId).codexModel,'test-codex');
  const projection=mobileSnapshot(service,conversationId,providers.snapshot());assert.equal(projection.selected.model,'test-codex');
  assert.equal(projection.providers.length,2);assert.doesNotMatch(JSON.stringify(projection),/token|apiKey|authMethod|sessionId/);
  await assert.rejects(providers.select(service,{conversationId,provider:'codex',model:'not-in-catalog'}),/not available/);
 }finally{await service.close();await rm(directory,{recursive:true,force:true});}
});
test('missing subscription rejects a phone selection without changing the workspace',async()=>{
 const providers=new MobileProviders({...options,claudeStatus:async()=>({signedIn:false})});
 let changed=false;const service={_conversation:()=>({}),teams:{busy:()=>false},updateSettings:()=>{changed=true;}};
 await assert.rejects(providers.select(service,{conversationId:'chat',provider:'claude',model:'sonnet'}),/Sign in/);assert.equal(changed,false);
});
test('the phone protocol accepts only bounded provider choices',()=>{
 assert.equal(mobileCommand({kind:'model',seq:1,conversationId:'chat',provider:'claude',model:'haiku'}).model,'haiku');
 assert.throws(()=>mobileCommand({kind:'model',seq:1,conversationId:'chat',provider:'evil',model:'x'}));
 assert.throws(()=>mobileCommand({kind:'send',seq:1,conversationId:'chat',text:'hi',provider:'claude'}));
 assert.throws(()=>mobileCommand({kind:'model',seq:1,conversationId:'chat',provider:'claude',model:'haiku',apiKey:'secret'}));
});
