// Set arc (fork, mixing round 2) — the hour as a DJ set: lift / hold /
// release by quarter-hour and daypart, Camelot stepping and tempo nudges.

import assert from 'node:assert/strict';
import test from 'node:test';
import { arcDirection, arcShape, stepBpm, stepCamelot, ARC_BPM_STEP } from '../src/broadcast/set-arc.js';

const at = (min: number) => new Date(2026, 9, 23, 20, min, 0);

test('daypart speed picks the shape', () => {
  assert.equal(arcShape(1.06), 'brisk');
  assert.equal(arcShape(1.0), 'even');
  assert.equal(arcShape(0.9), 'mellow');
});

test('quarter-hours walk the shape, and the hour always eases out', () => {
  assert.deepEqual([0, 15, 30, 45].map(m => arcDirection(at(m), 1.06)), ['lift', 'hold', 'lift', 'release']);
  assert.deepEqual([0, 15, 30, 45].map(m => arcDirection(at(m), 1.0)), ['hold', 'lift', 'hold', 'release']);
  for (const speed of [0.9, 1.0, 1.06]) assert.equal(arcDirection(at(59), speed), 'release');
});

test('Camelot steps wrap the wheel and keep the ring', () => {
  assert.equal(stepCamelot('8A', 'lift'), '9A');
  assert.equal(stepCamelot('12B', 'lift'), '1B');
  assert.equal(stepCamelot('1A', 'release'), '12A');
  assert.equal(stepCamelot('5B', 'release'), '4B');
  assert.equal(stepCamelot('5B', 'hold'), '5B');
});

test('unknown keys pass through — a keyless run still ranks on tempo', () => {
  assert.equal(stepCamelot(null, 'lift'), null);
  assert.equal(stepCamelot('C major', 'lift'), 'C major');
  assert.equal(stepCamelot('13A', 'lift'), '13A');
});

test('tempo nudges stay inside the stretch window and never collapse', () => {
  assert.equal(stepBpm(120, 'lift'), 123);
  assert.equal(stepBpm(120, 'release'), 117);
  assert.equal(stepBpm(120, 'hold'), 120);
  assert.equal(stepBpm(null, 'lift'), null);
  assert.equal(stepBpm(51, 'release'), 50);
  assert.ok(ARC_BPM_STEP < 0.08, 'one step must stay lockable by the render stretch');
});
