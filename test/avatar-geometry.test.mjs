import test from 'node:test';import assert from 'node:assert/strict';
import {createRig,contours,extent,fill} from '../src/avatar-geometry.mjs';import recipes from '../src/assets/avatar-motion-recipes.mjs';
test('all creation shapes project finite body and eye paths through idle movement and cursor extremes',()=>{
 for(const shape of ['sphere','cloud','square','sparkle','clover','heartChubby','starFlower','teardrop','tablet','wedge','house','star6','hex']){
  const rig=createRig({body:shape,isGazeAlways:true});rig.load(recipes.Idle_B,{phase:.3});
  for(const gaze of [[-1,-1],[1,1],null]){rig.setGaze(gaze);for(let n=0;n<5;n++)rig.advance(.1);const p=contours(rig.frame(),shape,36*extent(fill));assert.ok(p.body.length>0,shape);assert.ok([...p.body,...p.eyes].flat(2).every(Number.isFinite),shape);}
 }
});
