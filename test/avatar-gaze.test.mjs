import test from 'node:test';
import assert from 'node:assert/strict';
import {pointerGaze} from '../src/avatar-gaze.mjs';
import {createRig} from '../src/avatar-geometry.mjs';
import recipes from '../src/assets/avatar-motion-recipes.mjs';

test('pointer mapping keeps CSS coordinates aligned at any page zoom', () => {
  const rect = {x: 320, y: 180, width: 96, height: 96};
  assert.deepEqual(pointerGaze(rect, {x: 368, y: 228}), [0, -0]);
  for (const scale of [.8, 1, 1.2, 2]) {
    const scaled = Object.fromEntries(Object.entries(rect).map(([k, v]) => [k, v * scale]));
    assert.ok(pointerGaze(scaled, {x: 464 * scale, y: 132 * scale}).every(v => Math.abs(v - .5) < 1e-12));
  }
  assert.deepEqual(pointerGaze(rect, {x: -1000, y: 3000}), [-1, -1]);
});

test('direct gaze follows each new target immediately and does not drift with idle turns', () => {
  for (const body of ['sphere', 'cloud', 'square', 'sparkle', 'clover', 'heartChubby', 'starFlower', 'teardrop', 'tablet', 'wedge', 'house', 'star6', 'hex']) {
    const moving = createRig({body, isGazeAlways: true, gazeTracking: 'direct'});
    moving.load(recipes.Idle_A, {phase: .25, transition: 'cut'});
    for (const gaze of [[-1, .7], [.15, -.8], [1, 1], [0, 0]]) {
      moving.setGaze(gaze, {immediate: true});
      moving.advance(1 / 60);
      const expected = createRig({body, isGazeAlways: true, gazeTracking: 'direct'});
      expected.load(recipes.Idle_D, {phase: .75, transition: 'cut'});
      expected.setGaze(gaze, {immediate: true});
      expected.advance(1 / 60);
      assert.deepEqual(moving.frame().quat, expected.frame().quat, body);
      const held = moving.frame().quat;
      for (let frame = 0; frame < 60; frame++) moving.advance(1 / 60);
      assert.deepEqual(moving.frame().quat, held, `${body} drifts at a stationary cursor`);
    }
    moving.setGaze(null);
    for (let frame = 0; frame < 120; frame++) moving.advance(1 / 60);
    assert.ok(moving.frame().quat.every(Number.isFinite));
  }
});
