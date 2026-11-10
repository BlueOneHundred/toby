import {existsSync} from 'node:fs';
import {mkdtemp,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {launchTestApp} from './electron-fixture.mjs';
const candidates=process.platform==='darwin'?['dist/mac-arm64/Gratis.app/Contents/MacOS/Gratis','dist/mac/Gratis.app/Contents/MacOS/Gratis']:process.platform==='win32'?['dist/win-unpacked/Gratis.exe']:['dist/linux-unpacked/gratis','dist/linux-unpacked/Gratis'];
const executable=process.env.GRATIS_TEST_APP||candidates.find(existsSync);if(!executable)throw Error('Packaged Gratis executable not found.');
execFileSync(process.execPath,['test/package-edition.mjs'],{env:{...process.env,GRATIS_TEST_APP:path.resolve(executable)},stdio:'inherit',timeout:90000});
execFileSync(process.execPath,['test/packaged-avatars.mjs'],{env:{...process.env,GRATIS_TEST_APP:path.resolve(executable)},stdio:'inherit',timeout:90000});
execFileSync(process.execPath,['test/ui-polish.mjs'],{env:{...process.env,GRATIS_TEST_APP:path.resolve(executable)},stdio:'inherit',timeout:90000});
execFileSync(process.execPath,['test/desktop-features.mjs'],{env:{...process.env,GRATIS_TEST_APP:path.resolve(executable)},stdio:'inherit',timeout:90000});
const directory=await mkdtemp(path.join(tmpdir(),'gratis-release-'));
let app;
try{
 const launch=()=>launchTestApp({directory,executablePath:path.resolve(executable)});
 app=await launch();let page=await app.firstWindow();await page.locator('#new-bot').waitFor();
 await page.evaluate(async()=>{const state=await window.orbit.snapshot();await window.orbit.updateBot({id:state.bots[0].id,name:'Release smoke test',promptMode:'manual',instructions:'Reply briefly.'});await window.orbit.send({conversationId:state.conversations[0].id,text:'Test the packaged chat.'});});
 await page.waitForFunction(async()=>{const state=await window.orbit.snapshot();return state.conversations[0].messages.some(m=>m.role==='assistant'&&m.status==='complete'&&m.content);});
 await app.evaluate(({app})=>{const require=process.getBuiltinModule('module').createRequire(app.getAppPath()+'/package.json');const {CloudComputer}=require(app.getAppPath()+'/src/cloud-computer.mjs');globalThis.homeWatchEvents=[];CloudComputer.prototype.watch=function(_bot,id,visible){globalThis.homeWatchEvents.push({id,visible});};});
 await page.locator('#home-bots .bot-tile').first().click();await page.locator('#show-computer').click();await page.locator('#work-panel').waitFor({state:'visible'});
 await page.locator('#show-bots').click();await page.locator('#work-panel').waitFor({state:'hidden'});assert.equal(await page.locator('#workspace-resize').isVisible(),false);
 assert.equal(await page.locator('main').evaluate(el=>el.classList.contains('workspace-open')),false);
 await page.waitForFunction(async()=>await window.orbit.snapshot().then(()=>true));
 const watches=await app.evaluate(()=>globalThis.homeWatchEvents);assert.equal(watches.at(-1).visible,false);
 await page.locator('#home-bots .bot-tile').first().click();assert.equal(await page.locator('#work-panel').isVisible(),false);
 await app.close();app=null;
 app=await launch();page=await app.firstWindow();await page.locator('#new-bot').waitFor();
 const state=await page.evaluate(()=>window.orbit.snapshot());assert.equal(state.bots[0].name,'Release smoke test');assert.ok(state.conversations[0].messages.some(m=>m.content==='Test the packaged chat.'));
 console.log(JSON.stringify({packagedChat:true,restartPersistence:true,computerClosesOnHome:true,platform:process.platform,arch:process.arch}));
}finally{await app?.close();await rm(directory,{recursive:true,force:true});}

execFileSync(process.execPath,['test/recovery-desktop.mjs'],{env:{...process.env,GRATIS_TEST_APP:path.resolve(executable)},stdio:'inherit',timeout:90000});

execFileSync(process.execPath,['test/community-sharing-desktop.mjs'],{env:{...process.env,GRATIS_TEST_APP:path.resolve(executable)},stdio:'inherit',timeout:90000});
execFileSync(process.execPath,['test/pages-desktop.mjs'],{stdio:'inherit',env:{...process.env,GRATIS_TEST_APP:path.resolve(executable)},timeout:90000});

execFileSync(process.execPath,['test/slack-desktop.mjs'],{stdio:'inherit',env:{...process.env,GRATIS_TEST_APP:path.resolve(executable)},timeout:90000});

execFileSync(process.execPath,['test/dialog-buttons.mjs'],{stdio:'inherit',env:{...process.env,GRATIS_TEST_APP:path.resolve(executable)},timeout:90000});
