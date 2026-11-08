import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';

// Native Windows has no POSIX launcher. Keep the SDK's public Thread API and
// stream protocol, supplying an exec transport that never invokes a shell.
function toml(value){
 if(typeof value==='string'||typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value))return JSON.stringify(value);
 if(Array.isArray(value))return '['+value.map(toml).join(', ')+']';
 throw new Error('Unsupported Codex configuration value.');
}
export function configArguments(config,prefix=[]){return Object.entries(config).flatMap(([key,value])=>{const keys=[...prefix,key];return value&&typeof value==='object'&&!Array.isArray(value)?configArguments(value,keys):['--config',keys.map(k=>JSON.stringify(k)).join('.')+'='+toml(value)];});}
export function nativeCodexArguments(args,config,ephemeral){
 const command=['exec','--ignore-user-config','--ignore-rules','--experimental-json',...(ephemeral?['--ephemeral']:[]),...configArguments(config)];
 for(const [key,flag]of [['model','--model'],['sandboxMode','--sandbox'],['workingDirectory','--cd'],['outputSchemaFile','--output-schema']])if(args[key]!==undefined)command.push(flag,args[key]);
 if(args.threadSource&&!args.threadId)command.push('--thread-source',args.threadSource);
 if(args.skipGitRepoCheck)command.push('--skip-git-repo-check');
 for(const dir of args.additionalDirectories||[])command.push('--add-dir',dir);
 const overrides={};if(args.modelReasoningEffort)overrides.model_reasoning_effort=args.modelReasoningEffort;if(args.networkAccessEnabled!==undefined)overrides.sandbox_workspace_write={network_access:args.networkAccessEnabled};if(args.webSearchMode)overrides.web_search=args.webSearchMode;if(args.approvalPolicy)overrides.approval_policy=args.approvalPolicy;
 command.push(...configArguments(overrides));
 if(args.threadId)command.push('resume',args.threadId);
 for(const image of args.images||[])command.push('--image',image);
 return command;
}
export async function nativeCodexClient({executable,env,config,ephemeral=false,spawnProcess=spawn}){
 const {Thread}=await import('@openai/codex-sdk');
 const transport={async *run(args){
  const child=spawnProcess(executable,nativeCodexArguments(args,config,ephemeral),{env:{...env,CODEX_INTERNAL_ORIGINATOR_OVERRIDE:'codex_sdk_ts'},signal:args.signal,windowsHide:true,stdio:['pipe','pipe','pipe']});
  let failure,stderr='';const done=new Promise(resolve=>{child.once('error',error=>{failure=error;resolve(null);});child.once('close',resolve);});
  child.stderr.on('data',data=>{stderr=(stderr+data).slice(-16000);});child.stdin.on('error',()=>{});child.stdin.end(args.input);
  const lines=createInterface({input:child.stdout,crlfDelay:Infinity});
  try{for await(const line of lines)yield line;const code=await done;if(failure)throw failure;if(code!==0)throw new Error('Codex exited before finishing. '+stderr.slice(-1500));}
  finally{lines.close();if(child.exitCode===null)child.kill();}
 }};
 return{startThread:options=>new Thread(transport,{},options),resumeThread:(id,options)=>new Thread(transport,{},options,id)};
}
