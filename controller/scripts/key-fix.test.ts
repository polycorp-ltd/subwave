// Key-fix (fork, mixing round 2): the ±1 semitone retune that turns a
// clashing seam Camelot-safe — wheel transposition and the choice of shift.

import assert from 'node:assert/strict';
import test from 'node:test';
import { keyCompat, keyFixSemitones, transposeCamelot } from '../src/music/mix.js';

test('a semitone is seven wheel steps, ring kept', () => {
  assert.equal(transposeCamelot('8A', 1), '3A');   // A minor → Bb minor
  assert.equal(transposeCamelot('8A', -1), '1A');  // A minor → Ab minor
  assert.equal(transposeCamelot('8B', 12), '8B');  // an octave is home
  assert.equal(transposeCamelot('12B', 1), '7B');
  assert.equal(transposeCamelot('nope', 1), null);
});

test('compatible seams need no fix', () => {
  assert.equal(keyFixSemitones('8A', '8A'), 0);
  assert.equal(keyFixSemitones('8A', '9A'), 0);
  assert.equal(keyFixSemitones('8A', '8B'), 0);
});

test('a one-semitone clash is fixed toward the incoming key', () => {
  // 3A (Bb minor) → 8A (A minor): retune the outgoing down a semitone.
  const s = keyFixSemitones('3A', '8A');
  assert.equal(s, -1);
  assert.equal(keyCompat(transposeCamelot('3A', s), '8A'), 1);
  // 1A (Ab minor) → 8A: up one.
  assert.equal(keyFixSemitones('1A', '8A'), 1);
});

test('a clash no single semitone fixes stays a clash', () => {
  assert.equal(keyFixSemitones('8A', '5A'), 0); // ±7 wheel steps land on 3A/1A — neither near 5A
  assert.equal(keyFixSemitones('8A', '11A'), 0);
  assert.equal(keyFixSemitones(null, '8A'), 0);
});
