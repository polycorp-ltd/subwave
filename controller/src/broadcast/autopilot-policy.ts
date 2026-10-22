// Mix-graph autopilot policy (fork: obscura, mixing round 2).
//
// When the DJ may not make a model call — nobody is listening under
// llm.pauseWhenEmpty, or the daily token cap is spent — upstream lets
// Liquidsoap coast on auto.m3u. auto.m3u is a shuffled mood playlist: no pair
// drain, no blend, every seam a plain crossfade, and the first listener to tune
// in hears that until the LLM catches up two tracks later. The autopilot fills
// the slot instead with a ZERO-token pick from the same candidate pool the
// pool picker builds (show filters, blocklist, no-repeat and artist windows
// all ride the existing chokepoints), chosen by measured seam score from the
// mix graph — so a coasting station is still a mixing one.
//
// Pure: the call sites (queue.ts deadline/track-start, dj-agent's budget gate)
// pass in the live readings. Gate and choice live here so the three callers
// can't drift.

export interface AutopilotGate {
  enabled: boolean;       // config.mixing.autopilot (env AUTOPILOT, default on)
  autoPick: boolean;      // the operator's auto-pick switch — off means off
  pairDrain: boolean;     // queue.pairDrainActive(): DJ-mode persona + pairDrain
  streamIdle: boolean;    // programme frozen by the idle monitor — no seam to fill
}

// The autopilot only exists to keep SEAMS mixing, so it rides the same
// DJ-mode/pair-drain condition the blend machinery does; a non-DJ persona
// keeps upstream's coast byte-for-byte. A frozen (idle) programme has no
// clock: the on-air track's wall-clock remaining runs down while nothing
// plays, and picking against it would fill the queue for nobody.
export function autopilotAllowed(g: AutopilotGate): boolean {
  return g.enabled && g.autoPick && g.pairDrain && !g.streamIdle;
}

// How close to the best seam a candidate must score to share the draw. Wide
// enough that a graph clique can't lock the station into a loop (the no-repeat
// windows stop exact repeats, not a tight orbit of six tracks), narrow enough
// that a 0.9 blend never loses to a 0.6 crossfade.
export const AUTOPILOT_SCORE_BAND = 0.08;
export const AUTOPILOT_DRAW_SIZE = 4;

// Choose from a pool already filtered + ranked by the pool picker. `score` is
// the directed seam score seed → candidate (mix-graph), null when unmeasured.
// No candidate measured at all → the pool's own first choice (its ranking
// already folds in tempo/key compatibility), exactly the pool picker's own
// no-model fallback.
export function chooseAutopilotCandidate<T>(
  candidates: readonly T[],
  score: (c: T) => number | null,
  rng: () => number = Math.random,
): { choice: T; score: number | null } | null {
  if (candidates.length === 0) return null;
  const scored = candidates
    .map((c, i) => ({ c, i, s: score(c) }))
    .filter((x): x is { c: T; i: number; s: number } => typeof x.s === 'number' && Number.isFinite(x.s));
  if (scored.length === 0) return { choice: candidates[0], score: null };
  scored.sort((a, b) => b.s - a.s || a.i - b.i);
  const best = scored[0].s;
  const draw = scored.filter(x => x.s >= best - AUTOPILOT_SCORE_BAND).slice(0, AUTOPILOT_DRAW_SIZE);
  // Weighted by score so the strongest seam is still the likeliest.
  const total = draw.reduce((sum, x) => sum + Math.max(1e-6, x.s), 0);
  let r = rng() * total;
  for (const x of draw) {
    r -= Math.max(1e-6, x.s);
    if (r <= 0) return { choice: x.c, score: x.s };
  }
  const last = draw[draw.length - 1];
  return { choice: last.c, score: last.s };
}
