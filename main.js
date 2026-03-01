<script type="module" src="./src/main.js"></script>
// src/main.js
// Entry point (ONLY file linked from index.html with type="module")

import { state, initState } from "./state.js";
import { clamp } from "./constants.js";

import { PLANETS } from "./planets.js";
import { loadPlanet } from "./worldGen.js";

import { stepPlayerAndWorld } from "./player.js";
import { renderFrame } from "./render.js";
import { initUI, updateHUD, wireButtons } from "./ui.js";

/**
 * Boot sequence:
 * 1) Grab canvas + HUD DOM
 * 2) Initialize global state
 * 3) Wire input + buttons
 * 4) Load first planet
 * 5) Run game loop
 */

function getCanvasOrThrow() {
  const c = document.getElementById("c");
  if (!c) throw new Error("Canvas with id='c' not found in index.html");
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("2D context not available");
  return { canvas: c, ctx };
}

function setMessage(text, seconds = 2.0) {
  state.message = text;
  state.messageT = seconds;
}

function setupKeyboard() {
  window.addEventListener("keydown", (e) => {
    // Lowercase key map for easy checks
    const k = e.key.toLowerCase();
    state.keys[k] = true;

    if (e.code === "Space") {
      state.drillHeld = true;
      // Prevent page scrolling on space
      e.preventDefault();
    }

    // Return to ship shortcut
    if (k === "r") {
      state.player.x = state.shipX;
      state.player.y = state.surfaceY - 2;
      state.player.vx = 0;
      state.player.vy = 0;
      setMessage("Returned to ship.", 1.5);
    }
  });

  window.addEventListener("keyup", (e) => {
    const k = e.key.toLowerCase();
    state.keys[k] = false;

    if (e.code === "Space") {
      state.drillHeld = false;
      e.preventDefault();
    }
  });
}

function canLaunchNextPlanet() {
  // UI module can also enforce this, but main keeps a simple “source of truth” check.
  if (!state.planet) return false;
  if (!state.player) return false;

  // Must be at ship to launch
  const atShip =
    Math.abs(state.player.x - state.shipX) <= 2 &&
    state.player.y <= state.surfaceY - 1;

  if (!atShip) return false;

  // Must meet goals
  const goals = state.planet.goals;
  for (const goalName in goals) {
    const need = goals[goalName];
    const have = state.player.inventory?.[goalName] || 0;
    if (have < need) return false;
  }
  return true;
}

function launchToNextPlanet() {
  if (!canLaunchNextPlanet()) return;

  if (state.planetIndex >= PLANETS.length - 1) {
    setMessage("Mission complete! You finished all planets.", 4);
    return;
  }

  const nextIndex = state.planetIndex + 1;
  loadPlanetIntoState(nextIndex);
}

function loadPlanetIntoState(index) {
  state.planetIndex = index;
  state.planet = PLANETS[index];

  // Generate / load the world for this planet
  const world = loadPlanet(index);
  state.world = world;

  // Spawn ship + player near surface
  state.shipX = Math.floor(state.gridW / 2);
  state.shipY = state.surfaceY - 3;

  state.player.x = state.shipX;
  state.player.y = state.surfaceY - 2;
  state.player.vx = 0;
  state.player.vy = 0;

  // Apply planet stats
  state.player.fuelMax = state.planet.fuelMax;
  state.player.fuel = state.planet.fuelMax;
  state.player.drillPower = state.planet.drillPower;

  // Reset camera smoothly
  state.camX = 0;
  state.camY = 0;

  setMessage(`Arrived at ${state.planet.name}. Drill to meet quotas!`, 3);
  updateHUD(state);
}

function mainLoopStart(ctx) {
  let last = performance.now();

  function loop(now) {
    // dt safety clamp so lag spikes don’t explode physics
    const dt = clamp((now - last) / 1000, 0, 0.05);
    last = now;

    // Step simulation (player movement, drilling, camera, message timers, etc.)
    stepPlayerAndWorld(state, dt);

    // Update HUD (goals, fuel, depth, inventory)
    updateHUD(state);

    // Render
    renderFrame(state, ctx);

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}

/**
 * ---------- BOOT ----------
 */
(function boot() {
  const { canvas, ctx } = getCanvasOrThrow();

  // Initialize state with canvas + sizing
  initState(state, {
    canvas,
    viewW: canvas.width,
    viewH: canvas.height
  });

  // UI + buttons
  initUI();
  wireButtons({
    onLaunch: () => launchToNextPlanet(),
    onDumpCargo: () => {
      state.player.inventory = {};
      state.player.invCount = 0;
      setMessage("Cargo dumped. (testing)", 2);
      updateHUD(state);
    }
  });

  // Input
  setupKeyboard();

  // Load first planet
  loadPlanetIntoState(0);

  // Start loop
  mainLoopStart(ctx);

  // One-time hint
  setMessage("Hold SPACE to drill. Press R to return to ship.", 4);
})();
