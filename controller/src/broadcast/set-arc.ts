// Set arc (fork: obscura, mixing round 2) — the hour as a DJ set, not a
// shuffle. A working DJ plans when the set should LIFT, HOLD and RELEASE
// (Mixed In Key's set-programming guide; the "energy boost" convention of
// stepping one Camelot number clockwise per track to lift, counter-clockwise
// to release). Mini-runs (dj-agent/runs.ts) used to drift tempo by a fixed
// ±6 BPM from the daypart's speed and never touch the key; they now follow
// this arc: each pick of a run steps the key one wheel number in the arc's
// direction and nudges the tempo with it, and the mix graph + re-rank find
// the tracks that make those steps clean.
//
// Pure — the date and the daypart speed come in, a direction goes out — so
// the shape is unit-pinned (scripts/set-arc.test.ts).

export type ArcDirection = 'lift' | 'hold' | 'release';

// The hour in four quarters. Brisk dayparts (speed > 1) build twice with a
// breather, landing a release into the top of the hour where the ident and
// news usually sit; even dayparts hold and lift once; mellow ones mostly hold
// and drift down. The last quarter always eases — the hour boundary is where
// shows hand over and the DJ talks, so a peak there is wasted.
const SHAPES: Record<'brisk' | 'even' | 'mellow', readonly ArcDirection[]> = {
  brisk: ['lift', 'hold', 'lift', 'release'],
  even: ['hold', 'lift', 'hold', 'release'],
  mellow: ['hold', 'release', 'hold', 'release'],
};

export function arcShape(speed: number): 'brisk' | 'even' | 'mellow' {
  if (speed > 1.02) return 'brisk';
  if (speed < 0.98) return 'mellow';
  return 'even';
}

export function arcDirection(at: Date, speed: number): ArcDirection {
  const quarter = Math.min(3, Math.floor(at.getMinutes() / 15));
  return SHAPES[arcShape(speed)][quarter];
}

// One Camelot step in the arc's direction, keeping the letter (inner/outer
// ring = minor/major is a mood choice, not an energy one). Unknown or
// unparsable keys pass through unchanged — a run with no key target simply
// ranks on tempo, exactly as before.
export function stepCamelot(key: string | null, dir: ArcDirection): string | null {
  if (!key || dir === 'hold') return key;
  const m = /^(\d{1,2})([AB])$/.exec(key.trim().toUpperCase());
  if (!m) return key;
  const n = parseInt(m[1], 10);
  if (n < 1 || n > 12) return key;
  const next = dir === 'lift' ? (n % 12) + 1 : ((n + 10) % 12) + 1;
  return `${next}${m[2]}`;
}

// Tempo nudge per run step: ~2.5% each way, inside the stretch window so the
// render can always lock consecutive steps, and small enough that a three-
// step lift reads as momentum rather than a gear change.
export const ARC_BPM_STEP = 0.025;

export function stepBpm(bpm: number | null, dir: ArcDirection): number | null {
  if (bpm == null || !Number.isFinite(bpm) || bpm <= 0) return bpm;
  if (dir === 'hold') return bpm;
  const next = bpm * (dir === 'lift' ? 1 + ARC_BPM_STEP : 1 - ARC_BPM_STEP);
  return Math.max(50, Math.round(next * 10) / 10);
}
