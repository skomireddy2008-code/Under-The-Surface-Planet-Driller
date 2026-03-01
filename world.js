// src/world.js
// Grid helpers: bounds checks, get/set cells, collision helpers, conversions.

import { MAT } from "./constants.js";

/* ============================================================
   Bounds + Cell Access
============================================================ */

export function inBounds(state, x, y) {
  return (
    x >= 0 &&
    x < state.gridW &&
    y >= 0 &&
    y < state.gridH
  );
}

export function getCell(state, x, y) {
  if (!state.world || !state.world.grid) return null;
  if (!inBounds(state, x, y)) return null;
  return state.world.grid[y][x];
}

export function setCell(state, x, y, cell) {
  if (!state.world || !state.world.grid) return false;
  if (!inBounds(state, x, y)) return false;
  state.world.grid[y][x] = cell;
  return true;
}

export function isAir(cell) {
  return !cell || cell.mat === MAT.AIR;
}

export function isSolid(cell) {
  // Solid means the player cannot occupy this tile.
  return !!cell && cell.mat !== MAT.AIR;
}

/* ============================================================
   Safe integer tile coords from float player coords
============================================================ */

export function tileX(xFloat) {
  return Math.floor(xFloat);
}

export function tileY(yFloat) {
  return Math.floor(yFloat);
}

/* ============================================================
   Collision helpers (1-tile player)
   Player is treated as occupying ONE tile at (floor(x), floor(y)).
============================================================ */

export function canOccupy(state, xFloat, yFloat) {
  const x = tileX(xFloat);
  const y = tileY(yFloat);
  const cell = getCell(state, x, y);
  return !isSolid(cell);
}

export function hasGroundBelow(state, xFloat, yFloat) {
  const x = tileX(xFloat);
  const y = tileY(yFloat);
  const below = getCell(state, x, y + 1);
  return isSolid(below);
}

/* ============================================================
   Ship proximity helper
============================================================ */

export function isAtShip(state) {
  const p = state.player;
  if (!p) return false;

  // Near ship in X, and above/at surface line
  return (
    Math.abs(p.x - state.shipX) <= 2 &&
    p.y <= state.surfaceY - 1
  );
}

/* ============================================================
   World/Screen conversions (rendering convenience)
============================================================ */

export function worldToScreen(state, xPixels, yPixels) {
  // Converts world pixel coords into screen pixel coords
  return {
    sx: xPixels - state.camX,
    sy: yPixels - state.camY
  };
}

export function tileToWorldPx(state, tx, ty, tileSize) {
  return {
    wx: tx * tileSize,
    wy: ty * tileSize
  };
}

export function tileToScreenPx(state, tx, ty, tileSize) {
  return {
    sx: tx * tileSize - state.camX,
    sy: ty * tileSize - state.camY
  };
}

/* ============================================================
   Iterate visible tiles (for rendering speed)
============================================================ */

export function getVisibleTileRect(state, tileSize) {
  // Returns { startX, startY, endX, endY } inclusive/exclusive tile bounds
  const startX = Math.floor(state.camX / tileSize) - 1;
  const startY = Math.floor(state.camY / tileSize) - 1;
  const endX = startX + Math.ceil(state.viewW / tileSize) + 3;
  const endY = startY + Math.ceil(state.viewH / tileSize) + 3;

  return {
    startX: Math.max(0, startX),
    startY: Math.max(0, startY),
    endX: Math.min(state.gridW, endX),
    endY: Math.min(state.gridH, endY)
  };
}
