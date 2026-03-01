// src/rng.js
// Seeded random number generator utilities.
// Used by worldGen.js so each planet generates consistently.

/* ============================================================
   MULBERRY32 RNG
   Fast, simple, deterministic, good for procedural gen.
============================================================ */

export function createRNG(seed = 1) {
  let t = seed >>> 0;

  return function () {
    t += 0x6D2B79F5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/* ============================================================
   Helper functions (use RNG instance)
============================================================ */

export function randRange(rng, min, max) {
  return min + rng() * (max - min);
}

export function randInt(rng, min, max) {
  return Math.floor(randRange(rng, min, max + 1));
}

export function chance(rng, probability) {
  return rng() < probability;
}

/* ============================================================
   Optional: hash-based seed helper
   (Lets you derive consistent sub-seeds from base seeds)
============================================================ */

export function deriveSeed(baseSeed, salt) {
  let hash = 0;
  const str = String(baseSeed) + String(salt);

  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // convert to 32-bit int
  }

  return Math.abs(hash);
}
