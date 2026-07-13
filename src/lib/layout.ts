// Pack the symbols of one card onto a round face without heavy overlap.
// Coordinates are normalised to a unit circle centred at (0,0), radius 1.
// The result is deterministic given the seed, so preview and PDF agree.

import { makeRng } from './rng';

export interface Placement {
  /** Index into the card's own symbol list. */
  slot: number;
  x: number; // -1..1
  y: number; // -1..1
  /** Symbol radius as a fraction of the card radius. */
  r: number;
  /** Rotation in radians. */
  rot: number;
}

export interface LayoutOptions {
  count: number;
  seed: number | string;
  maxRotationRad: number;
  /** Multiplies the base symbol size (settings.symbolScale). */
  scale: number;
}

export function layoutCard(opts: LayoutOptions): Placement[] {
  const { count, seed, maxRotationRad, scale } = opts;
  const rng = makeRng(seed);
  const placements: Placement[] = [];

  // Size symbols so their combined area fills a sensible fraction of the card.
  // Random circle packing tops out around 50–55% density, so aim a bit under.
  const base = Math.min(0.42, Math.sqrt(0.44 / count)) * scale;
  const pad = 0.02; // keep symbols just inside the rim
  const gap = 1.04; // minimum separation factor between symbols

  // Clearance of a candidate: how far it is from touching its nearest
  // neighbour. >= 0 means no overlap. We keep the best candidate seen so a
  // failed placement still lands in the roomiest spot rather than on top of
  // another symbol.
  const clearance = (x: number, y: number, r: number): number => {
    let min = Infinity;
    for (const p of placements) {
      const c = Math.hypot(x - p.x, y - p.y) - (r + p.r) * gap;
      if (c < min) min = c;
    }
    return min;
  };

  for (let slot = 0; slot < count; slot++) {
    let r = base * (0.82 + rng() * 0.42); // size variety, Dobble-style
    let placed = false;
    let best = { x: 0, y: 0, r, clear: -Infinity };

    for (let tries = 0; tries < 2400 && !placed; tries++) {
      const maxDist = 1 - r - pad;
      if (maxDist <= 0) {
        r *= 0.9;
        continue;
      }
      const ang = rng() * Math.PI * 2;
      const dist = Math.sqrt(rng()) * maxDist; // uniform over the disc
      const x = Math.cos(ang) * dist;
      const y = Math.sin(ang) * dist;
      const clear = placements.length ? clearance(x, y, r) : Infinity;

      if (clear >= 0) {
        const rot = (rng() * 2 - 1) * maxRotationRad;
        placements.push({ slot, x, y, r, rot });
        placed = true;
      } else {
        if (clear > best.clear) best = { x, y, r, clear };
        if (tries > 0 && tries % 200 === 0) r *= 0.92; // shrink to help it fit
      }
    }

    if (!placed) {
      // Shrink toward the best spot found until it no longer overlaps.
      let { x, y, r: br } = best;
      while (br > 0.05 && clearance(x, y, br) < 0) br *= 0.9;
      placements.push({ slot, x, y, r: br, rot: (rng() * 2 - 1) * maxRotationRad });
    }
  }
  return placements;
}
