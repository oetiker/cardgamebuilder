// Build the incidence structure of the projective plane PG(2, q):
//   points  -> symbols   (q^2 + q + 1 of them)
//   lines   -> cards     (q^2 + q + 1 of them)
// A card (line) contains a symbol (point) when the point lies on the line.
// This yields the Dobble property: any two cards share exactly one symbol.

import { makeGF, isSupportedOrder } from './gf';

/** Canonical representatives of PG(2,q) points — also used for lines. */
function canonicalTriples(q: number): number[][] {
  const t: number[][] = [];
  for (let y = 0; y < q; y++) for (let z = 0; z < q; z++) t.push([1, y, z]);
  for (let z = 0; z < q; z++) t.push([0, 1, z]);
  t.push([0, 0, 1]);
  return t;
}

export interface Incidence {
  order: number;
  symbolsPerCard: number;
  symbolCount: number;
  /** For each card, the sorted list of symbol indices it carries. */
  cards: number[][];
}

export function buildIncidence(q: number): Incidence {
  if (!isSupportedOrder(q)) throw new Error(`Unsupported deck order ${q}`);
  const gf = makeGF(q);
  const points = canonicalTriples(q);
  const lines = canonicalTriples(q);
  const cards = lines.map((L) => {
    const symbols: number[] = [];
    for (let pi = 0; pi < points.length; pi++) {
      const P = points[pi];
      const dot = gf.add(gf.mul(L[0], P[0]), gf.add(gf.mul(L[1], P[1]), gf.mul(L[2], P[2])));
      if (dot === 0) symbols.push(pi);
    }
    return symbols;
  });
  return {
    order: q,
    symbolsPerCard: q + 1,
    symbolCount: points.length,
    cards,
  };
}

/** Assert the defining Dobble invariant. Throws if the deck is malformed. */
export function assertValid(inc: Incidence): void {
  const n = inc.order * inc.order + inc.order + 1;
  if (inc.symbolCount !== n) throw new Error(`symbolCount ${inc.symbolCount} != ${n}`);
  if (inc.cards.length !== n) throw new Error(`cardCount ${inc.cards.length} != ${n}`);
  for (let i = 0; i < inc.cards.length; i++) {
    if (inc.cards[i].length !== inc.symbolsPerCard)
      throw new Error(`card ${i} has ${inc.cards[i].length} symbols`);
  }
  for (let i = 0; i < inc.cards.length; i++) {
    const si = new Set(inc.cards[i]);
    for (let j = i + 1; j < inc.cards.length; j++) {
      let shared = 0;
      for (const s of inc.cards[j]) if (si.has(s)) shared++;
      if (shared !== 1) throw new Error(`cards ${i}&${j} share ${shared} symbols`);
    }
  }
}
