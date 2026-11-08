import {existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
if(existsSync('.git')){
 execFileSync('git',['config','core.hooksPath','.githooks']);
 try{execFileSync('git',['remote','get-url','upstream'],{stdio:'ignore'});}catch{execFileSync('git',['remote','add','upstream','https://github.com/promptadvisers/gratis.git']);}
 execFileSync('git',['remote','set-url','--push','upstream','disabled://public-core']);
}
