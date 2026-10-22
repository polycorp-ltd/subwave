// Mix-graph autopilot policy (fork, mixing round 2) — the gate that lets a
// zero-token pick fill a slot the DJ can't, and the seam-score draw it uses.

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  autopilotAllowed, chooseAutopilotCandidate, AUTOPILOT_SCORE_BAND, AUTOPILOT_DRAW_SIZE,
} from '../src/broadcast/autopilot-policy.js';

const on = { enabled: true, autoPick: true, pairDrain: true, streamIdle: false };

test('gate: every condition must hold', () => {
  assert.equal(autopilotAllowed(on), true);
  assert.equal(autopilotAllowed({ ...on, enabled: false }), false, 'env off → upstream coast');
  assert.equal(autopilotAllowed({ ...on, autoPick: false }), false, 'operator auto-pick off means off');
  assert.equal(autopilotAllowed({ ...on, pairDrain: false }), false, 'non-DJ persona keeps the coast');
  assert.equal(autopilotAllowed({ ...on, streamIdle: true }), false, 'frozen programme has no clock to pick against');
});

type C = { id: string; s: number | null };
const by = (c: C) => c.s;

test('empty pool → null, never a fabricated pick', () => {
  assert.equal(chooseAutopilotCandidate<C>([], by), null);
});

test('nothing measured → the pool\'s own first choice', () => {
  const pool: C[] = [{ id: 'a', s: null }, { id: 'b', s: null }];
  assert.deepEqual(chooseAutopilotCandidate(pool, by), { choice: pool[0], score: null });
});

test('a strong seam never loses to one outside the band', () => {
  const pool: C[] = [{ id: 'weak', s: 0.6 }, { id: 'strong', s: 0.92 }, { id: 'none', s: null }];
  for (const r of [0, 0.3, 0.6, 0.999]) {
    assert.equal(chooseAutopilotCandidate(pool, by, () => r)!.choice.id, 'strong');
  }
});

test('candidates inside the band share the draw (no clique lock-in)', () => {
  const pool: C[] = [
    { id: 'a', s: 0.9 }, { id: 'b', s: 0.9 - AUTOPILOT_SCORE_BAND / 2 }, { id: 'c', s: 0.5 },
  ];
  const seen = new Set<string>();
  for (let i = 0; i < 20; i++) seen.add(chooseAutopilotCandidate(pool, by, () => i / 20)!.choice.id);
  assert.deepEqual([...seen].sort(), ['a', 'b']);
});

test('the draw is capped', () => {
  const pool: C[] = Array.from({ length: 10 }, (_, i) => ({ id: `t${i}`, s: 0.9 }));
  const seen = new Set<string>();
  for (let i = 0; i < 50; i++) seen.add(chooseAutopilotCandidate(pool, by, () => i / 50)!.choice.id);
  assert.equal(seen.size, AUTOPILOT_DRAW_SIZE);
});
