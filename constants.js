// src/constants.js
// All global numeric constants, material IDs, colors, and small utilities.
// NOTHING in here should depend on other modules.

/* ============================================================
   GRID + WORLD SETTINGS
============================================================ */

export const TILE_SIZE = 24;

export const GRID_W = 80;     // Width in tiles
export const GRID_H = 140;    // Height in tiles

export const SURFACE_Y_DEFAULT = 12;  // Where underground begins

export const INVENTORY_CAPACITY = 60;

/* ============================================================
   VIEW / CAMERA DEFAULTS
============================================================ */

export const DEFAULT_VIEW_WIDTH = 960;
export const DEFAULT_VIEW_HEIGHT = 640;

/* ============================================================
   MATERIAL ENUM
============================================================ */

export const MAT = {
  AIR: 0,
  DIRT: 1,
  ROCK: 2,
  IRON: 3,
  CRYSTAL: 4,
  MAGMA: 5,
  ICECORE: 6,
  ALIEN: 7
};

/* ============================================================
   MATERIAL DEFINITIONS
   - hardness affects drill time + fuel cost
   - value can be used later for upgrades/shop
============================================================ */

export const MAT_DEF = {
  [MAT.AIR]: {
    name: "Air",
    color: "rgba(0,0,0,0)",
    hardness: 0,
    value: 0
  },

  [MAT.DIRT]: {
    name: "Dirt",
    color: "#2b2a24",
    hardness: 1,
    value: 1
  },

  [MAT.ROCK]: {
    name: "Rock",
    color: "#3a3e47",
    hardness: 2,
    value: 1
  },

  [MAT.IRON]: {
    name: "Iron",
    color: "#7c7f86",
    hardness: 3,
    value: 3
  },

  [MAT.CRYSTAL]: {
    name: "Crystal",
    color: "#39d0ff",
    hardness: 4,
    value: 6
  },

  [MAT.MAGMA]: {
    name: "Magma",
    color: "#ff5a2a",
    hardness: 5,
    value: 10
  },

  [MAT.ICECORE]: {
    name: "Ice Core",
    color: "#9fe9ff",
    hardness: 4,
    value: 9
  },

  [MAT.ALIEN]: {
    name: "Alien Relic",
    color: "#b8ff4f",
    hardness: 6,
    value: 15
  }
};

/* ============================================================
   COLORS
============================================================ */

export const COLORS = {
  bg: "#090d16",
  sky: "#0b1430",
  surface: "#15203f",

  player: "#e8eefc",
  ship: "#a9c4ff",

  shadow: "rgba(0,0,0,0.35)",
  outline: "rgba(255,255,255,0.12)"
};

/* ============================================================
   PHYSICS CONSTANTS
============================================================ */

export const BASE_GRAVITY = 18;
export const MAX_FALL_SPEED = 50;
export const MOVE_SPEED = 7.5;

export const DRILL_RATE = 0.06;   // seconds between drill hits

/* ============================================================
   SMALL UTILITIES
   (Safe to reuse anywhere)
============================================================ */

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}
