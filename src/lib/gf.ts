// Finite field GF(q) arithmetic, q = p^k (p prime).
//
// Elements are integers 0..q-1. For a prime power, an element's base-p digits
// are the coefficients of its polynomial representation (digit i = coeff of x^i).
// Multiplication reduces modulo an irreducible polynomial: x^k reduces to the
// polynomial `poly` (coefficients low->high, length k).
//
// This is the engine behind Dobble deck generation — verified in scripts/verify.mjs.

interface FieldSpec {
  p: number;
  k: number;
  poly: number[];
}

const IRREDUCIBLE: Record<number, FieldSpec> = {
  4: { p: 2, k: 2, poly: [1, 1] }, // x^2 + x + 1
  8: { p: 2, k: 3, poly: [1, 1, 0] }, // x^3 + x + 1
  9: { p: 3, k: 2, poly: [2, 0] }, // x^2 + 1  (x^2 = -1 = 2)
  16: { p: 2, k: 4, poly: [1, 1, 0, 0] }, // x^4 + x + 1
  25: { p: 5, k: 2, poly: [3, 0] }, // x^2 + 2  (x^2 = -2 = 3)
  27: { p: 3, k: 3, poly: [2, 1, 0] }, // x^3 + 2x + 1
  32: { p: 2, k: 5, poly: [1, 0, 1, 0, 0] }, // x^5 + x^2 + 1
};

export interface GF {
  q: number;
  p: number;
  k: number;
  add(a: number, b: number): number;
  mul(a: number, b: number): number;
}

export function isPrime(n: number): boolean {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
  return true;
}

/** True when a valid projective plane (and therefore a Dobble deck) exists for this order. */
export function isSupportedOrder(q: number): boolean {
  return q >= 2 && (isPrime(q) || q in IRREDUCIBLE);
}

export function makeGF(q: number): GF {
  let p: number;
  let k: number;
  let r: number[];
  const spec = IRREDUCIBLE[q];
  if (spec) {
    p = spec.p;
    k = spec.k;
    r = spec.poly;
  } else if (isPrime(q)) {
    p = q;
    k = 1;
    r = [];
  } else {
    throw new Error(`Unsupported field order ${q} (not a prime or supported prime power)`);
  }

  const pw: number[] = [];
  for (let i = 0; i <= k; i++) pw[i] = p ** i;

  const digits = (a: number): number[] => {
    const d = new Array<number>(k);
    for (let i = 0; i < k; i++) d[i] = Math.floor(a / pw[i]) % p;
    return d;
  };
  const fromDigits = (d: number[]): number => {
    let v = 0;
    for (let i = 0; i < k; i++) v += ((((d[i] % p) + p) % p) * pw[i]);
    return v;
  };

  const add = (a: number, b: number): number => {
    if (k === 1) return (a + b) % p;
    const da = digits(a);
    const db = digits(b);
    const c = new Array<number>(k);
    for (let i = 0; i < k; i++) c[i] = (da[i] + db[i]) % p;
    return fromDigits(c);
  };

  const mul = (a: number, b: number): number => {
    if (k === 1) return (a * b) % p;
    const da = digits(a);
    const db = digits(b);
    const c = new Array<number>(2 * k - 1).fill(0);
    for (let i = 0; i < k; i++)
      for (let j = 0; j < k; j++) c[i + j] = (c[i + j] + da[i] * db[j]) % p;
    for (let idx = 2 * k - 2; idx >= k; idx--) {
      const coeff = c[idx];
      if (!coeff) continue;
      c[idx] = 0;
      for (let j = 0; j < k; j++) c[idx - k + j] = (c[idx - k + j] + coeff * r[j]) % p;
    }
    return fromDigits(c.slice(0, k));
  };

  return { q, p, k, add, mul };
}
