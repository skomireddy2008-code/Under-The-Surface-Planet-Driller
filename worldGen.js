// src/worldGen.js
// Procedural generation for planet worlds.
// Produces a tile grid with materials + drill HP.

import { GRID_W, GRID_H, SURFACE_Y_DEFAULT, MAT, MAT_DEF } from "./constants.js";
import { PLANETS } from "./planets.js";
import { createRNG, randInt, randRange, chance, deriveSeed } from "./rng.js";

/**
 * World format returned:
 * {
 *   gridW, gridH, surfaceY,
 *   grid: Cell[][],
 *   seedUsed: number
 * }
 *
 * Cell format:
 * { mat: MAT.*, hpMax: number, hp: number }
 */

/* -----------------------------
   Cell helpers
----------------------------- */
function makeCell(mat) {
  const def = MAT_DEF[mat];
  const hardness = def?.hardness ?? 0;
  const hpMax = hardness <= 0 ? 0 : Math.round(hardness * 14);
  return { mat, hpMax, hp: hpMax };
}

/* -----------------------------
   Vein / blob placement
----------------------------- */
function placeBlob(grid, rng, {
  mat,
  cx,
  cy,
  radius
}, surfaceY) {
  const h = grid.length;
  const w = grid[0].length;

  for (let y = cy - radius; y <= cy + radius; y++) {
    if (y < surfaceY || y >= h) continue;

    for (let x = cx - radius; x <= cx + radius; x++) {
      if (x < 0 || x >= w) continue;

      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // A bit of randomness so blobs look organic
      const jitter = randRange(rng, -0.7, 0.7);
      const threshold = radius * randRange(rng, 0.55, 0.95);

      if (dist + jitter <= threshold) {
        // Only replace solid blocks (don’t fill air caves)
        if (grid[y][x].mat !== MAT.AIR) {
          grid[y][x] = makeCell(mat);
        }
      }
    }
  }
}

/* -----------------------------
   Main planet generator
----------------------------- */
export function loadPlanet(planetIndex) {
  const planet = PLANETS[planetIndex];
  if (!planet) {
    throw new Error(`loadPlanet: invalid planetIndex ${planetIndex}`);
  }

  const gridW = GRID_W;
  const gridH = GRID_H;
  const surfaceY = SURFACE_Y_DEFAULT;

  // Derive seed so different planets are reliably different
  const seedUsed = deriveSeed(planet.seed, planet.id);
  const rng = createRNG(seedUsed);

  // Create base grid
  const grid = new Array(gridH);
  for (let y = 0; y < gridH; y++) {
    grid[y] = new Array(gridW);

    for (let x = 0; x < gridW; x++) {
      let mat = MAT.AIR;

      // Above surface: air
      if (y >= surfaceY) {
        // Base layers: dirt then rock
        if (y < planet.spawn.dirtTo) mat = MAT.DIRT;
        else mat = MAT.ROCK;

        // Random air pockets (caves) deeper down
        const caveChance = planet.spawn.airPocketChance ?? 0;
        if (y > surfaceY + 6 && caveChance > 0 && chance(rng, caveChance)) {
          mat = MAT.AIR;
        }
      }

      grid[y][x] = makeCell(mat);
    }
  }

  // Place veins/blobs
  const veins = planet.spawn.veins || [];
  for (const v of veins) {
    const count = v.count ?? 0;
    for (let i = 0; i < count; i++) {
      const cx = randInt(rng, 6, gridW - 7);
      const cy = randInt(rng, Math.max(surfaceY, v.minY ?? surfaceY), Math.min(gridH - 1, v.maxY ?? gridH - 1));
      const radius = randInt(rng, v.size?.[0] ?? 6, v.size?.[1] ?? 18);

      placeBlob(
        grid,
        rng,
        { mat: v.mat, cx, cy, radius },
        surfaceY
      );
    }
  }

  // Optional: guarantee some goal materials exist (basic safety)
  // (So you don’t get unlucky and miss a goal item.)
  ensureGoalMaterialsExist(grid, planet, rng, surfaceY);

  return {
    gridW,
    gridH,
    surfaceY,
    grid,
    seedUsed
  };
}

/* -----------------------------
   Goal safety (optional but helpful)
----------------------------- */
function ensureGoalMaterialsExist(grid, planet, rng, surfaceY) {
  // If a planet requires a material, ensure at least a small cluster exists.
  // We map goal names to MAT ids via MAT_DEF names.
  const neededNames = Object.keys(planet.goals || {});
  if (!neededNames.length) return;

  // Build name->matId lookup from MAT_DEF
  const nameToMat = {};
  for (const key in MAT_DEF) {
    const matId = Number(key);
    const nm = MAT_DEF[matId].name;
    nameToMat[nm] = matId;
  }

  for (const goalName of neededNames) {
    const matId = nameToMat[goalName];
    if (matId == null) continue;

    // Quick scan: do we already have this material somewhere?
    let found = false;
    for (let y = surfaceY; y < grid.length && !found; y++) {
      for (let x = 0; x < grid[0].length; x++) {
        if (grid[y][x].mat === matId) { found = true; break; }
      }
    }

    if (!found) {
      // Place a guaranteed blob deep enough to feel “under the surface”
      const cx = randInt(rng, 10, grid[0].length - 11);
      const cy = randInt(rng, Math.max(surfaceY + 20, 40), grid.length - 6);
      const radius = randInt(rng, 8, 14);
      placeBlob(grid, rng, { mat: matId, cx, cy, radius }, surfaceY);
    }
  }
}
