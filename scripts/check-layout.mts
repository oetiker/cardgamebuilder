// Programmatic overlap test of the real layout packer across every deck size.
// Runs on Node's built-in type stripping:  node scripts/check-layout.mts
import { layoutCard } from '../src/lib/layout.ts';
import { DECK_SIZES } from '../src/lib/presets.ts';

let worstOverlap = 0;
let overlapping = 0;
let outside = 0;
let total = 0;

for (const sz of DECK_SIZES) {
  const count = sz.symbolsPerCard;
  // Sample many independent card layouts for this size.
  for (let card = 0; card < 200; card++) {
    const pl = layoutCard({ count, seed: `deck${sz.order}:card${card}:1`, maxRotationRad: 0.6, scale: 1 });
    for (let i = 0; i < pl.length; i++) {
      total++;
      // Inside the unit card?
      if (Math.hypot(pl[i].x, pl[i].y) + pl[i].r > 1.02) outside++;
      for (let j = i + 1; j < pl.length; j++) {
        const d = Math.hypot(pl[i].x - pl[j].x, pl[i].y - pl[j].y);
        const overlap = pl[i].r + pl[j].r - d; // >0 means they intersect
        if (overlap > 0.01) {
          overlapping++;
          worstOverlap = Math.max(worstOverlap, overlap);
        }
      }
    }
  }
}

console.log(`symbols placed: ${total}`);
console.log(`overlapping pairs (> 0.01): ${overlapping}`);
console.log(`worst overlap (fraction of card radius): ${worstOverlap.toFixed(4)}`);
console.log(`symbols spilling outside rim: ${outside}`);
const ok = overlapping === 0 && outside === 0;
console.log(ok ? '\nLAYOUT OK ✔' : '\nLAYOUT ISSUES ✗');
process.exit(ok ? 0 : 1);
