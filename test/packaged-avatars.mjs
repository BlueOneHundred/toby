import {_electron as electron} from '@playwright/test';
import {mkdtemp,writeFile,readFile,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import assert from 'node:assert/strict';
import {initialState} from '../src/store.mjs';

const executable=process.env.GRATIS_TEST_APP;if(!executable)throw new Error('Set GRATIS_TEST_APP to the packaged executable.');
const dir=await mkdtemp(join(tmpdir(),'gratis-avatars-')),state=initialState();
state.bots[0].name='Avatar verification';state.bots[0].avatarShape='sphere';state.bots[0].avatarColor='white';
await writeFile(join(dir,'workspace.json'),JSON.stringify(state));
const app=await electron.launch({executablePath:resolve(executable),env:{...process.env,GRATIS_DATA_DIR:dir,GRATIS_TEST_HIDDEN:'1'}});
try{
 const page=await app.firstWindow(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.locator('#home-bots .bot-tile').first().waitFor();
 await app.evaluate(({BrowserWindow})=>{const win=BrowserWindow.getAllWindows()[0];win.webContents.setBackgroundThrottling(false);win.showInactive();});
 const avatar=page.locator('#home-bots .avatar-motion').first();
 await page.waitForFunction(()=>document.querySelector('#home-bots .avatar-motion')?.dataset.ready==='true');
 const eyes=()=>avatar.locator('mask path').getAttribute('d');
 const before=await eyes();await page.mouse.move(10,120);await page.waitForFunction(prior=>document.querySelector('#home-bots .avatar-motion mask path').getAttribute('d')!==prior,before);
 const path=await avatar.locator('.avatar-body').getAttribute('d');assert.ok(path.length>100);assert.doesNotMatch(path,/NaN|Infinity/);
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>getComputedStyle(document.querySelector('#home-bots .avatar-motion .avatar-static')).visibility==='visible');
 assert.equal(await avatar.locator('.avatar-static').evaluate(el=>getComputedStyle(el).visibility),'visible');
 await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForFunction(()=>getComputedStyle(document.querySelector('#home-bots .avatar-motion .avatar-drawing')).visibility==='visible');const restored=await eyes();await page.waitForFunction(prior=>document.querySelector('#home-bots .avatar-motion mask path').getAttribute('d')!==prior,restored);
 await page.locator('#settings-button').click();const pkg=JSON.parse(await readFile('package.json'));assert.ok((await page.locator('#app-build').textContent()).includes(pkg.version));
 const folder=resolve(process.env.UI_REVIEW_OUTPUT||'.cache/ui-polish');await mkdir(folder,{recursive:true});
 await page.locator('#settings-dialog .dialog-heading .close-dialog').click();
 const png=await app.evaluate(async({BrowserWindow})=>(await BrowserWindow.getAllWindows()[0].webContents.capturePage()).toPNG().toString('base64'));await writeFile(join(folder,'packaged-avatars.png'),Buffer.from(png,'base64'));
 assert.deepEqual(errors,[]);console.log(JSON.stringify({packagedAvatarWorker:true,cursorMotion:true,reducedMotionFallback:true,buildIdentity:true,rendererErrors:errors}));
}finally{await app.close();await rm(dir,{recursive:true,force:true});}
