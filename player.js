// src/player.js
// Player simulation: movement, gravity, drilling, fuel, inventory, camera follow.

import {
  TILE_SIZE,
  INVENTORY_CAPACITY,
  BASE_GRAVITY,
  MAX_FALL_SPEED,
  MOVE_SPEED,
  DRILL_RATE,
  clamp,
  lerp,
  MAT,
  MAT_DEF
} from "./constants.js";

import {
  getCell,
  setCell,
  isSolid,
  tileX,
  tileY,
  hasGroundBelow,
  isAtShip
} from "./world.js";

/* ============================================================
   Inventory helpers
============================================================ */

function invGet(player, itemName) {
  return player.inventory[itemName] || 0;
}

function invAdd(player, itemName, amount = 1) {
  player.inventory[itemName] = (player.inventory[itemName] || 0) + amount;
  player.invCount += amount;
}

/* ============================================================
   Drilling
============================================================ */

function drillAt(state, tx, ty) {
  const p = state.player;
  const cell = getCell(state, tx, ty);
  if (!cell) return;
  if (cell.mat === MAT.AIR) return;

  if (p.invCount >= INVENTORY_CAPACITY) {
    state.message = "Inventory full! Return to ship (R).";
    state.messageT = 2.0;
    return;
  }
  if (p.fuel <= 0) {
    state.message = "Out of fuel! Return to ship (R).";
    state.messageT = 2.0;
    return;
  }

  const def = MAT_DEF[cell.mat];
  const hardness = def.hardness || 0;

  // Fuel cost: a little base + more for harder materials
  const fuelCost = 0.45 + hardness * 0.12;
  p.fuel = Math.max(0, p.fuel - fuelCost);

  // Damage: base damage scaled by drill power
  const dmg = Math.round(3 * (p.drillPower || 1.0));
  cell.hp -= dmg;

  if (cell.hp <= 0) {
    // Collect material
    const itemName = def.name;
    invAdd(p, itemName, 1);

    // Remove tile (turn into air)
    setCell(state, tx, ty, { mat: MAT.AIR, hpMax: 0, hp: 0 });

    // Occasional feedback message
    if (Math.random() < 0.06) {
      state.message = `Collected ${itemName}`;
      state.messageT = 1.0;
    }
  } else {
    // Write back changed hp (cell reference is already in grid, but safe)
    setCell(state, tx, ty, cell);
  }
}

/* ============================================================
   Movement + Physics (1-tile collision)
============================================================ */

function applyMovement(state, dt) {
  const p = state.player;

  // Input
  const left = !!(state.keys["a"] || state.keys["arrowleft"]);
  const right = !!(state.keys["d"] || state.keys["arrowright"]);

  let ax = 0;
  if (left) ax -= 1;
  if (right) ax += 1;

  // Smooth horizontal velocity
  p.vx = lerp(p.vx, ax * MOVE_SPEED, 0.22);

  // Gravity
  const g = BASE_GRAVITY * (state.planet?.gravity ?? 1.0);
  p.vy += g * dt;
  p.vy = clamp(p.vy, -MAX_FALL_SPEED, MAX_FALL_SPEED);

  // Proposed next position
  let nx = p.x + p.vx * dt;
  let ny = p.y + p.vy * dt;

  // Clamp into world bounds
  nx = clamp(nx, 1, state.gridW - 2);
  ny = clamp(ny, 0, state.gridH - 2);

  // ---- Vertical collision (ground) ----
  p.onGround = false;

  // If falling, and tile below is solid, stop on top of it
  if (p.vy > 0) {
    const tx = tileX(nx);
    const ty = tileY(ny);

    const below = getCell(state, tx, ty + 1);
    if (isSolid(below) && ny > ty) {
      ny = ty;      // snap to tile boundary
      p.vy = 0;
      p.onGround = true;
    }
  }

  // ---- Horizontal collision (basic) ----
  // If the tile you would occupy is solid, cancel X move
  const occupy = getCell(state, tileX(nx), tileY(ny));
  if (isSolid(occupy)) {
    nx = p.x;
    p.vx = 0;
  }

  p.x = nx;
  p.y = ny;
}

/* ============================================================
   Drilling update
============================================================ */

function applyDrilling(state, dt) {
  const p = state.player;

  if (p.drillCooldown > 0) p.drillCooldown -= dt;

  if (!state.drillHeld) return;
  if (p.drillCooldown > 0) return;

  // Drill hit interval
  p.drillCooldown = DRILL_RATE;

  const left = !!(state.keys["a"] || state.keys["arrowleft"]);
  const right = !!(state.keys["d"] || state.keys["arrowright"]);

  // Facing direction: if moving right, drill slightly ahead; if left, behind; else straight down.
  const facing = right ? 1 : left ? -1 : 0;

  const tx = tileX(p.x + facing);
  const ty = tileY(p.y + 1); // drill below feet

  drillAt(state, tx, ty);
}

/* ============================================================
   Fuel regeneration at ship
============================================================ */

function applyFuelRegen(state, dt) {
  const p = state.player;

  // Regen fuel when near ship on surface
  if (isAtShip(state)) {
    const regenRate = 12; // fuel/sec
    p.fuel = clamp(p.fuel + dt * regenRate, 0, p.fuelMax);
  }
}

/* ============================================================
   Camera follow
============================================================ */

function applyCameraFollow(state) {
  const p = state.player;

  // Camera targets player center in pixel space
  const targetCamX = p.x * TILE_SIZE - state.viewW / 2;
  const targetCamY = p.y * TILE_SIZE - state.viewH / 2;

  state.camX = lerp(state.camX, targetCamX, 0.10);
  state.camY = lerp(state.camY, targetCamY, 0.10);

  // Clamp camera to world bounds (pixel space)
  const maxCamX = state.gridW * TILE_SIZE - state.viewW;
  const maxCamY = state.gridH * TILE_SIZE - state.viewH;

  state.camX = clamp(state.camX, 0, Math.max(0, maxCamX));
  state.camY = clamp(state.camY, 0, Math.max(0, maxCamY));
}

/* ============================================================
   Messages timer
============================================================ */

function tickMessage(state, dt) {
  if (state.messageT > 0) {
    state.messageT -= dt;
    if (state.messageT <= 0) {
      state.messageT = 0;
      // keep message text; render.js can ignore if timer is 0
    }
  }
}

/* ============================================================
   Public step function
============================================================ */

export function stepPlayerAndWorld(state, dt) {
  if (!state.player || !state.world || !state.planet) return;

  // Fuel regen at ship
  applyFuelRegen(state, dt);

  // Movement + gravity + collision
  applyMovement(state, dt);

  // Drilling
  applyDrilling(state, dt);

  // Message timers
  tickMessage(state, dt);

  // Camera follow
  applyCameraFollow(state);
}
