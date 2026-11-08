import test from 'node:test';
import assert from 'node:assert/strict';
import {PassThrough} from 'node:stream';
import {EventEmitter} from 'node:events';
import {runtimeEnvironment,executableCandidates} from '../src/platform-runtime.mjs';
import {nativeCodexArguments,nativeCodexClient} from '../src/codex-native.mjs';
test('Windows environment preserves OS paths without leaking provider secrets',()=>{
 const env=runtimeEnvironment({USERPROFILE:'C:\\Users\\Tester',Path:'C:\\Tools;C:\\Windows',SystemRoot:'C:\\Windows',APPDATA:'C:\\Users\\Tester\\AppData\\Roaming',OPENAI_API_KEY:'secret',ANTHROPIC_API_KEY:'secret'},'win32');
 assert.equal(env.HOME,'C:\\Users\\Tester');assert.equal(env.SystemRoot,'C:\\Windows');assert.ok(env.PATH.includes(';'));assert.equal(env.OPENAI_API_KEY,undefined);assert.equal(env.ANTHROPIC_API_KEY,undefined);
 const paths=executableCandidates('codex',env,'win32','x64');assert.ok(paths.includes('C:\\Tools\\codex.exe'));assert.ok(paths.some(p=>p.endsWith('x86_64-pc-windows-msvc\\codex\\codex.exe')));assert.ok(paths.every(p=>!p.endsWith('.cmd')));
});
test('native Codex arguments isolate user config and preserve untrusted values as arguments',()=>{
 const args=nativeCodexArguments({workingDirectory:'C:\\work & notes',model:'model',threadId:'thread',sandboxMode:'read-only',approvalPolicy:'never',networkAccessEnabled:false},{mcp_servers:{gratis:{url:'http://127.0.0.1/mcp',required:true}}},true);
 assert.deepEqual(args.slice(0,5),['exec','--ignore-user-config','--ignore-rules','--experimental-json','--ephemeral']);assert.ok(args.includes('C:\\work & notes'));assert.ok(args.includes('"approval_policy"="never"'));assert.ok(args.includes('"mcp_servers"."gratis"."required"=true'));assert.deepEqual(args.slice(-2),['resume','thread']);
});
test('Windows transport uses the SDK thread and streams a native child with cancellation',async()=>{
 let options,argv,child;
 const client=await nativeCodexClient({executable:'C:\\Tools\\codex.exe',env:{SystemRoot:'C:\\Windows'},config:{},spawnProcess:(file,args,opts)=>{assert.equal(file,'C:\\Tools\\codex.exe');argv=args;options=opts;child=new EventEmitter();child.stdin=new PassThrough();child.stdout=new PassThrough();child.stderr=new PassThrough();child.exitCode=null;child.kill=()=>{child.exitCode=0;};setImmediate(()=>{child.stdout.end(JSON.stringify({type:'thread.started',thread_id:'test'})+'\n'+JSON.stringify({type:'turn.completed',usage:{input_tokens:1,output_tokens:0}})+'\n');child.exitCode=0;child.emit('close',0);});return child;}});
 const signal=new AbortController().signal,thread=client.startThread({workingDirectory:'C:\\work',sandboxMode:'read-only'}),{events}=await thread.runStreamed('hello',{signal});const result=[];for await(const event of events)result.push(event);
 assert.equal(thread.id,'test');assert.equal(result.at(-1).type,'turn.completed');assert.equal(options.signal,signal);assert.equal(options.windowsHide,true);assert.equal(options.shell,undefined);assert.ok(argv.includes('--ignore-user-config'));
});
