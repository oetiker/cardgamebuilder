// Standalone verification of the Dobble / projective-plane deck generator.
// This mirrors the algorithm that lives in src/lib/gf.ts + src/lib/projective.ts.
// Run:  node scripts/verify.mjs
//
// A deck of "order q" has:
//   - q + 1 symbols per card
//   - q*q + q + 1 cards
//   - q*q + q + 1 distinct symbols
// and ANY two cards share EXACTLY ONE symbol. We assert all of that here.

// --- Finite field GF(q), q = p^k -------------------------------------------

// x^k reduces to the polynomial given by `poly` (coeffs low->high, length k).
const IRREDUCIBLE = {
  4:  { p: 2, k: 2, poly: [1, 1] },        // x^2 + x + 1
  8:  { p: 2, k: 3, poly: [1, 1, 0] },     // x^3 + x + 1
  9:  { p: 3, k: 2, poly: [2, 0] },        // x^2 + 1  (x^2 = -1 = 2)
  16: { p: 2, k: 4, poly: [1, 1, 0, 0] },  // x^4 + x + 1
  25: { p: 5, k: 2, poly: [3, 0] },        // x^2 + 2  (x^2 = -2 = 3)
  27: { p: 3, k: 3, poly: [2, 1, 0] },     // x^3 + 2x + 1 (x^3 = -(2x+1) = x+2)
  32: { p: 2, k: 5, poly: [1, 0, 1, 0, 0] },// x^5 + x^2 + 1
};

function isPrime(n) {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
  return true;
}

function makeGF(q) {
  let p, k, r;
  const spec = IRREDUCIBLE[q];
  if (spec) { p = spec.p; k = spec.k; r = spec.poly; }
  else if (isPrime(q)) { p = q; k = 1; r = []; }
  else throw new Error(`Unsupported field order ${q}`);

  const pw = [];
  for (let i = 0; i <= k; i++) pw[i] = p ** i;
  const digits = (a) => {
    const d = new Array(k);
    for (let i = 0; i < k; i++) d[i] = Math.floor(a / pw[i]) % p;
    return d;
  };
  const fromDigits = (d) => {
    let v = 0;
    for (let i = 0; i < k; i++) v += ((d[i] % p) + p) % p * pw[i];
    return v;
  };
  const add = (a, b) => {
    const da = digits(a), db = digits(b), c = new Array(k);
    for (let i = 0; i < k; i++) c[i] = (da[i] + db[i]) % p;
    return fromDigits(c);
  };
  const mul = (a, b) => {
    if (k === 1) return (a * b) % p;
    const da = digits(a), db = digits(b);
    const c = new Array(2 * k - 1).fill(0);
    for (let i = 0; i < k; i++)
      for (let j = 0; j < k; j++)
        c[i + j] = (c[i + j] + da[i] * db[j]) % p;
    for (let idx = 2 * k - 2; idx >= k; idx--) {
      const coeff = c[idx];
      if (!coeff) continue;
      c[idx] = 0;
      for (let j = 0; j < k; j++)
        c[idx - k + j] = (c[idx - k + j] + coeff * r[j]) % p;
    }
    return fromDigits(c.slice(0, k));
  };
  return { q, p, k, add, mul };
}

// --- Projective plane PG(2,q): points = symbols, lines = cards --------------

function canonicalTriples(q) {
  // Representatives of PG(2,q) points (and, identically, of lines).
  const t = [];
  for (let y = 0; y < q; y++) for (let z = 0; z < q; z++) t.push([1, y, z]);
  for (let z = 0; z < q; z++) t.push([0, 1, z]);
  t.push([0, 0, 1]);
  return t;
}

function generateDeck(q) {
  const gf = makeGF(q);
  const points = canonicalTriples(q); // symbols
  const lines = canonicalTriples(q);  // cards
  const cards = lines.map((L) => {
    const symbols = [];
    for (let pi = 0; pi < points.length; pi++) {
      const P = points[pi];
      const dot = gf.add(gf.mul(L[0], P[0]), gf.add(gf.mul(L[1], P[1]), gf.mul(L[2], P[2])));
      if (dot === 0) symbols.push(pi);
    }
    return symbols;
  });
  return { symbolCount: points.length, cards };
}

// --- Assertions -------------------------------------------------------------

function verify(q) {
  const { symbolCount, cards } = generateDeck(q);
  const n = q * q + q + 1;
  const perCard = q + 1;
  const problems = [];

  if (symbolCount !== n) problems.push(`symbolCount ${symbolCount} != ${n}`);
  if (cards.length !== n) problems.push(`cardCount ${cards.length} != ${n}`);

  for (let i = 0; i < cards.length; i++) {
    if (cards[i].length !== perCard)
      problems.push(`card ${i} has ${cards[i].length} symbols, expected ${perCard}`);
  }

  // The defining property: every pair of cards shares exactly one symbol.
  for (let i = 0; i < cards.length && problems.length < 5; i++) {
    const si = new Set(cards[i]);
    for (let j = i + 1; j < cards.length; j++) {
      let shared = 0;
      for (const s of cards[j]) if (si.has(s)) shared++;
      if (shared !== 1) { problems.push(`cards ${i}&${j} share ${shared}`); break; }
    }
  }

  // Every symbol should be used (and used q+1 times in the full deck).
  const usage = new Array(n).fill(0);
  for (const c of cards) for (const s of c) usage[s]++;
  const unused = usage.filter((u) => u === 0).length;
  const wrongUse = usage.filter((u) => u !== perCard).length;
  if (unused) problems.push(`${unused} symbols unused`);
  if (wrongUse) problems.push(`${wrongUse} symbols not used exactly ${perCard}x`);

  const ok = problems.length === 0;
  console.log(
    `q=${String(q).padStart(2)}  ${perCard} sym/card  ${String(n).padStart(3)} cards  ` +
    (ok ? 'OK' : 'FAIL: ' + problems.slice(0, 5).join('; '))
  );
  return ok;
}

const orders = [2, 3, 4, 5, 7, 8, 9];
let allOk = true;
console.log('Verifying Dobble deck generation:\n');
for (const q of orders) allOk = verify(q) && allOk;
console.log('\n' + (allOk ? 'ALL DECK SIZES VALID ✔' : 'SOME DECKS INVALID �’'));
process.exit(allOk ? 0 : 1);
