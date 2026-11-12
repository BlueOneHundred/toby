import path from 'node:path';
import {homedir} from 'node:os';
import {access} from 'node:fs/promises';
import {constants} from 'node:fs';

// Preserve the OS process essentials without inheriting provider/API secrets.
export function runtimeEnvironment(source=process.env,platform=process.platform){
 const windows=platform==='win32',p=windows?path.win32:path.posix,env={};
 const keys=['HOME','USER','LOGNAME','SHELL','TMPDIR','TMP','TEMP','LANG','LC_ALL','LC_CTYPE','SSL_CERT_FILE','SSL_CERT_DIR','NODE_EXTRA_CA_CERTS'];
 if(windows)keys.push('USERPROFILE','APPDATA','LOCALAPPDATA','SystemRoot','WINDIR','COMSPEC','PATHEXT','ProgramFiles','ProgramFiles(x86)','ProgramW6432');
 for(const key of keys){const actual=Object.keys(source).find(k=>windows?k.toLowerCase()===key.toLowerCase():k===key);if(actual&&source[actual])env[key]=source[actual];}
 env.HOME||=env.USERPROFILE||homedir();
 const inherited=source.PATH||source.Path||'';
 env.PATH=[p.join(env.HOME,'.local','bin'),...(windows?[env.APPDATA&&p.join(env.APPDATA,'npm')]:['/opt/homebrew/bin','/usr/local/bin']),inherited,...(windows?[]:['/usr/bin','/bin'])].filter(Boolean).join(windows?';':':');
 return env;
}
export function executableCandidates(name,env,platform=process.platform,arch=process.arch){
 const windows=platform==='win32',p=windows?path.win32:path.posix;
 const dirs=[...new Set((env.PATH||env.Path||'').split(windows?';':':').map(s=>s.replace(/^"|"$/g,'')).filter(s=>p.isAbsolute(s)))];
 const result=dirs.map(dir=>p.join(dir,windows?name+'.exe':name));
 // npm creates a .cmd shim; resolve the native Codex binary instead of invoking
 // a command shell with user arguments. Claude's native installer is preferred.
 if(windows&&name==='codex')for(const dir of dirs){const target=arch==='arm64'?'aarch64-pc-windows-msvc':'x86_64-pc-windows-msvc';result.push(p.join(dir,'node_modules','@openai','codex-'+(arch==='arm64'?'win32-arm64':'win32-x64'),'vendor',target,'codex','codex.exe'),p.join(dir,'node_modules','@openai','codex','vendor',target,'codex','codex.exe'));}
 return [...new Set(result)];
}
export async function findExecutable(name,env=runtimeEnvironment(),options={}){
 for(const candidate of executableCandidates(name,env,options.platform,options.arch))try{await access(candidate,process.platform==='win32'?constants.F_OK:constants.X_OK);return candidate;}catch{}
 throw new Error(`${name} was not found. Install its native client on this computer, then restart Toby.`);
}
