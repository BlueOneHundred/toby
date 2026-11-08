import {existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
const candidates=process.platform==='darwin'?['dist/mac-arm64/Gratis.app/Contents/MacOS/Gratis','dist/mac/Gratis.app/Contents/MacOS/Gratis']:process.platform==='win32'?['dist/win-unpacked/Gratis.exe']:['dist/linux-unpacked/gratis','dist/linux-unpacked/Gratis'];
const executable=candidates.find(existsSync);if(!executable)throw Error('Packaged Gratis executable not found.');
execFileSync(process.execPath,['test/package-edition.mjs'],{env:{...process.env,GRATIS_TEST_APP:path.resolve(executable)},stdio:'inherit',timeout:90000});
