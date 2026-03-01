// src/state.js
// Holds the single global state object + initialization helpers.
// Other modules import { state } and read/write to it.

import { GRID_W, GRID_H, SURFACE_Y_DEFAULT } from "./constants.js";

/**
 * NOTE:
 * We keep `state` as one shared object so every module can import it
 * (or accept it as a parameter) without circular class dependencies.
 *
 * This is hackathon-friendly and modular.
 */

export const state = {
  // Canvas / view
  canvas: null,
  viewW: 960,
  viewH: 640,

  // World sizing
  gridW: GRID_W,
  gridH: GRID_H,
  surfaceY: SURFACE_Y_DEFAULT,

  // Planet / world
  planetIndex: 0,
  planet: null,    // PLANETS[planetIndex]
  world: null,     // world object returned by worldGen.loadPlanet()

  // Ship location (tile coords)
  shipX: 0,
  shipY: 0,

  // Player (tile coords but can be floats for smooth movement)
  player: {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    onGround: false,

    fuel: 0,
    fuelMax: 0,

    drillPower: 1.0,
    drillCooldown: 0,

    // Inventory: itemName => count
    inventory: {},
    invCount: 0
  },

  // Camera (pixel offsets)
  camX: 0,
  camY: 0,

  // Input
  keys: {},        // key -> boolean
  drillHeld: false,

  // UI / messages
  message: "",
  messageT: 0
};

/**
 * Initialize / reset key parts of state at boot time.
 * This runs once from main.js (and can also be used for full resets).
 */
export function initState(targetState, opts = {}) {
  const { canvas, viewW, viewH } = opts;

  if (canvas) targetState.canvas = canvas;
  if (typeof viewW === "number") targetState.viewW = viewW;
  if (typeof viewH === "number") targetState.viewH = viewH;

  // World settings (in case constants change)
  targetState.gridW = GRID_W;
  targetState.gridH = GRID_H;
  targetState.surfaceY = SURFACE_Y_DEFAULT;

  // Clear input states
  targetState.keys = {};
  targetState.drillHeld = false;

  // Reset camera
  targetState.camX = 0;
  targetState.camY = 0;

  // Reset message
  targetState.message = "";
  targetState.messageT = 0;

  // Reset player to safe defaults; planet loader will set actual stats
  targetState.player = createFreshPlayer(targetState);

  // Ship default spawn (planet loader will adjust)
  targetState.shipX = Math.floor(targetState.gridW / 2);
  targetState.shipY = targetState.surfaceY - 3;

  // Start player near ship
  targetState.player.x = targetState.shipX;
  targetState.player.y = targetState.surfaceY - 2;
}

/**
 * Returns a fresh player object.
 * Useful when you want to fully reset the player while keeping the rest.
 */
export function createFreshPlayer(s) {
  return {
    x: Math.floor((s?.gridW ?? GRID_W) / 2),
    y: (s?.surfaceY ?? SURFACE_Y_DEFAULT) - 2,

    vx: 0,
    vy: 0,
    onGround: false,

    fuel: 0,
    fuelMax: 0,

    drillPower: 1.0,
    drillCooldown: 0,

    inventory: {},
    invCount: 0
  };
}

/**
 * A small helper to set toast messages from any module.
 */
export function setMessage(text, seconds = 2.0) {
  state.message = text;
  state.messageT = seconds;
}

/**
 * Optional: soft reset when switching planets but keeping inventory.
 * (Main.js currently does planet loading directly; you can use this later.)
 */
export function resetForPlanetKeepInventory(targetState) {
  const keepInv = targetState.player.inventory;
  const keepInvCount = targetState.player.invCount;

  targetState.player = createFreshPlayer(targetState);
  targetState.player.inventory = keepInv;
  targetState.player.invCount = keepInvCount;

  targetState.camX = 0;
  targetState.camY = 0;

  targetState.keys = {};
  targetState.drillHeld = false;

  targetState.message = "";
  targetState.messageT = 0;
}
