// src/ui.js
// HUD + button wiring. No canvas rendering here.

import { INVENTORY_CAPACITY } from "./constants.js";
import { isAtShip } from "./world.js";

/* ============================================================
   Cached DOM refs
============================================================ */

const dom = {
  planetName: null,
  planetDesc: null,

  fuelText: null,
  depthText: null,
  invText: null,

  goalsList: null,
  goalHint: null,

  launchBtn: null,
  invList: null,
  dumpBtn: null
};

let callbacks = {
  onLaunch: null,
  onDumpCargo: null
};

/* ============================================================
   Init / wiring
============================================================ */

export function initUI() {
  dom.planetName = document.getElementById("planetName");
  dom.planetDesc = document.getElementById("planetDesc");

  dom.fuelText = document.getElementById("fuelText");
  dom.depthText = document.getElementById("depthText");
  dom.invText = document.getElementById("invText");

  dom.goalsList = document.getElementById("goalsList");
  dom.goalHint = document.getElementById("goalHint");

  dom.launchBtn = document.getElementById("launchBtn");
  dom.invList = document.getElementById("invList");
  dom.dumpBtn = document.getElementById("dumpBtn");

  // Safe checks so you get readable errors if HTML ids are wrong
  for (const [k, v] of Object.entries(dom)) {
    if (!v) {
      // Some HUD layouts might omit optional elements, but these are core:
      if (["planetName","fuelText","depthText","invText","goalsList","launchBtn"].includes(k)) {
        throw new Error(`ui.js: Missing required element with id="${k === "planetName" ? "planetName" :
          k === "planetDesc" ? "planetDesc" :
          k === "fuelText" ? "fuelText" :
          k === "depthText" ? "depthText" :
          k === "invText" ? "invText" :
          k === "goalsList" ? "goalsList" :
          k === "goalHint" ? "goalHint" :
          k === "launchBtn" ? "launchBtn" :
          k === "invList" ? "invList" :
          k === "dumpBtn" ? "dumpBtn" : k
        }" in index.html`);
      }
    }
  }
}

/**
 * Wire UI buttons to callbacks provided by main.js.
 * @param {{onLaunch: Function, onDumpCargo: Function}} cbs
 */
export function wireButtons(cbs) {
  callbacks = { ...callbacks, ...cbs };

  if (dom.launchBtn) {
    dom.launchBtn.addEventListener("click", () => {
      if (typeof callbacks.onLaunch === "function") callbacks.onLaunch();
    });
  }

  if (dom.dumpBtn) {
    dom.dumpBtn.addEventListener("click", () => {
      if (typeof callbacks.onDumpCargo === "function") callbacks.onDumpCargo();
    });
  }
}

/* ============================================================
   HUD logic helpers
============================================================ */

function goalsMet(state) {
  const goals = state.planet?.goals || {};
  const inv = state.player?.inventory || {};

  for (const name in goals) {
    const need = goals[name];
    const have = inv[name] || 0;
    if (have < need) return false;
  }
  return true;
}

function setText(el, text) {
  if (!el) return;
  el.textContent = text;
}

function clearChildren(el) {
  if (!el) return;
  while (el.firstChild) el.removeChild(el.firstChild);
}

/* ============================================================
   Update HUD
============================================================ */

export function updateHUD(state) {
  if (!state || !state.player) return;

  // Planet labels
  if (dom.planetName) dom.planetName.textContent = state.planet?.name ?? "Planet";
  if (dom.planetDesc) dom.planetDesc.textContent = state.planet?.id ?? "";

  // Fuel / depth / inventory
  const fuel = Math.floor(state.player.fuel ?? 0);
  const fuelMax = state.player.fuelMax ?? 0;
  setText(dom.fuelText, `${fuel}/${fuelMax}`);

  const depth = Math.max(0, Math.floor((state.player.y ?? 0) - state.surfaceY));
  setText(dom.depthText, `${depth} tiles`);

  setText(dom.invText, `${state.player.invCount}/${INVENTORY_CAPACITY}`);

  // Goals list
  clearChildren(dom.goalsList);

  const goals = state.planet?.goals || {};
  const inv = state.player.inventory || {};

  const goalNames = Object.keys(goals);
  if (goalNames.length === 0) {
    const line = document.createElement("div");
    line.textContent = "(No goals)";
    dom.goalsList.appendChild(line);
  } else {
    for (const name of goalNames) {
      const need = goals[name];
      const have = inv[name] || 0;
      const done = have >= need;

      const line = document.createElement("div");
      line.textContent = `${done ? "✅" : "⬜"} ${name}: ${have}/${need}`;
      dom.goalsList.appendChild(line);
    }
  }

  // Inventory list
  if (dom.invList) {
    clearChildren(dom.invList);
    const entries = Object.entries(inv).sort((a, b) => b[1] - a[1]);

    if (entries.length === 0) {
      dom.invList.textContent = "(empty)";
    } else {
      for (const [name, count] of entries) {
        const line = document.createElement("div");
        line.textContent = `${name}: ${count}`;
        dom.invList.appendChild(line);
      }
    }
  }

  // Launch button logic
  const met = goalsMet(state);
  const atShip = isAtShip(state);

  if (dom.launchBtn) {
    dom.launchBtn.disabled = !(met && atShip);
  }

  if (dom.goalHint) {
    if (!met) dom.goalHint.textContent = "Collect the materials to unlock launch.";
    else if (!atShip) dom.goalHint.textContent = "Goals met! Return to your ship to launch.";
    else dom.goalHint.textContent = "Ready to launch!";
  }
}
