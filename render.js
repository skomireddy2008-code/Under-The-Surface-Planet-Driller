// src/render.js
// Draws the game world + player + ship + overlays onto the canvas.

import {
  TILE_SIZE,
  COLORS,
  MAT,
  MAT_DEF,
  clamp
} from "./constants.js";

import {
  getVisibleTileRect,
  tileToScreenPx,
  isAtShip
} from "./world.js";

/* ============================================================
   Helpers
============================================================ */

function goalsMet(state) {
  const goals = state.planet?.goals || {};
  const inv = state.player?.inventory || {};
  for (const name in goals) {
    if ((inv[name] || 0) < goals[name]) return false;
  }
  return true;
}

function drawSurfaceLine(state, ctx) {
  const y = state.surfaceY * TILE_SIZE - state.camY;
  ctx.fillStyle = COLORS.surface;
  ctx.fillRect(0, y, state.viewW, 3);
}

function drawShip(state, ctx) {
  const sx = state.shipX * TILE_SIZE - state.camX;
  const sy = state.shipY * TILE_SIZE - state.camY;

  // Simple ship silhouette
  ctx.fillStyle = COLORS.ship;
  ctx.fillRect(sx - 12, sy - 18, 24, 18);
  ctx.fillRect(sx - 20, sy - 8, 40, 12);

  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.strokeRect(sx - 20 + 0.5, sy - 8 + 0.5, 40 - 1, 12 - 1);
}

/**
 * Draw an actual handheld drill:
 * - motor housing
 * - pistol grip + trigger
 * - chuck
 * - spiral bit that "spins" while drilling
 *
 * dir: -1 (left), 0 (down), 1 (right)
 */
function drawHandDrill(ctx, x, y, dir, spinning) {
  ctx.save();

  // Rotation based on direction
  let rot = 0;
  if (dir === 1) rot = 0;
  else if (dir === -1) rot = Math.PI;
  else rot = Math.PI / 2;

  ctx.translate(x, y);
  ctx.rotate(rot);

  // Colors
  const body = "rgba(220, 230, 255, 0.95)";
  const dark = "rgba(30, 40, 70, 0.95)";
  const mid  = "rgba(120, 140, 200, 0.95)";
  const metal = "rgba(240, 245, 255, 0.95)";
  const shadow = "rgba(0,0,0,0.35)";

  // roundRect polyfill for older browsers (just in case)
  if (!ctx.roundRect) {
    ctx.roundRect = function(x, y, w, h, r) {
      const rr = Math.min(r, w / 2, h / 2);
      this.beginPath();
      this.moveTo(x + rr, y);
      this.arcTo(x + w, y, x + w, y + h, rr);
      this.arcTo(x + w, y + h, x, y + h, rr);
      this.arcTo(x, y + h, x, y, rr);
      this.arcTo(x, y, x + w, y, rr);
      this.closePath();
      return this;
    };
  }

  // --- BODY (motor housing) ---
  // Shadow
  ctx.fillStyle = shadow;
  ctx.roundRect(-10 + 1, -7 + 1, 22, 14, 5).fill();

  // Main housing
  ctx.fillStyle = body;
  ctx.roundRect(-10, -7, 22, 14, 5).fill();

  // Top ridge
  ctx.fillStyle = mid;
  ctx.roundRect(-9, -6, 20, 5, 3).fill();

  // Rear cap
  ctx.fillStyle = dark;
  ctx.roundRect(-12, -6, 6, 12, 3).fill();

  // --- HANDLE (pistol grip) ---
  // Handle shadow
  ctx.fillStyle = shadow;
  ctx.roundRect(-1 + 1, 5 + 1, 8, 14, 4).fill();

  // Handle
  ctx.fillStyle = dark;
  ctx.roundRect(-1, 5, 8, 14, 4).fill();

  // Trigger
  ctx.fillStyle = metal;
  ctx.roundRect(2, 4, 3, 5, 2).fill();

  // --- CHUCK ---
  ctx.fillStyle = dark;
  ctx.roundRect(10, -4, 7, 8, 3).fill();

  // Chuck rings
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(12, -3); ctx.lineTo(12, 3);
  ctx.moveTo(14, -3); ctx.lineTo(14, 3);
  ctx.stroke();

  // --- BIT BASE ---
  ctx.fillStyle = metal;
  ctx.roundRect(17, -2, 4, 4, 2).fill();

  // --- BIT SHAFT ---
  ctx.strokeStyle = metal;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(21, 0);
  ctx.lineTo(34, 0);
  ctx.stroke();

  // --- SPIRAL GROOVES (animated) ---
  const phase = spinning ? (performance.now() / 70) : 0;
  ctx.strokeStyle = "rgba(30,40,70,0.75)";
  ctx.lineWidth = 1.2;

  for (let i = 0; i < 6; i++) {
    const t = i / 6;
    const px = 22 + t * 11;
    const amp = 2.2;
    const py = Math.sin(phase + t * Math.PI * 3) * amp;

    ctx.beginPath();
    ctx.moveTo(px, py - 2.2);
    ctx.lineTo(px + 2.8, py + 2.2);
    ctx.stroke();
  }

  // --- BIT TIP ---
  ctx.fillStyle = metal;
  ctx.beginPath();
  ctx.moveTo(34, 0);
  ctx.lineTo(38, -2.5);
  ctx.lineTo(38, 2.5);
  ctx.closePath();
  ctx.fill();

  // Highlight dot
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath();
  ctx.arc(5, -2, 1.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Player drawing (astronaut + drill)
 */
function drawPlayer(state, ctx) {
  const p = state.player;

  const px = p.x * TILE_SIZE - state.camX;
  const py = p.y * TILE_SIZE - state.camY;

  // Astronaut body
  ctx.fillStyle = COLORS.player;
  ctx.fillRect(px - 7, py - 18, 14, 18);   // body
  ctx.fillRect(px - 10, py - 12, 20, 6);   // helmet band

  // Determine facing direction for drill
  const left = !!(state.keys["a"] || state.keys["arrowleft"]);
  const right = !!(state.keys["d"] || state.keys["arrowright"]);
  const dir = right ? 1 : left ? -1 : 0;

  // Drill near hands (slightly forward based on direction)
  const drillX = px + (dir === 1 ? 14 : dir === -1 ? -14 : 0);
  const drillY = py - 10;

  drawHandDrill(ctx, drillX, drillY, dir, !!state.drillHeld);
}

function drawToast(state, ctx) {
  if (!state.message || state.messageT <= 0) return;

  const a = clamp(state.messageT / 2.0, 0, 1);
  ctx.globalAlpha = a;

  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(20, 20, 520, 38);

  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.strokeRect(20.5, 20.5, 520 - 1, 38 - 1);

  ctx.fillStyle = "#e8eefc";
  ctx.font = "14px system-ui";
  ctx.fillText(state.message, 34, 44);

  ctx.globalAlpha = 1;
}

function drawDepthIndicator(state, ctx) {
  const barX = state.viewW - 20;
  const barY = 10;
  const barW = 8;
  const barH = state.viewH - 20;

  // Track
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(barX, barY, barW, barH);

  // Marker (player depth)
  const t = clamp(state.player.y / state.gridH, 0, 1);
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.fillRect(barX, barY + t * barH - 4, barW, 8);
}

function drawLaunchHint(state, ctx) {
  if (!goalsMet(state)) return;
  if (!isAtShip(state)) return;

  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(20, state.viewH - 62, 460, 42);

  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.strokeRect(20.5, state.viewH - 62 + 0.5, 460 - 1, 42 - 1);

  ctx.fillStyle = "#e8eefc";
  ctx.font = "14px system-ui";
  ctx.fillText("Goals complete! Click 'Launch to Next Planet' in the HUD. 🚀", 34, state.viewH - 36);
}

/* ============================================================
   Main render
============================================================ */

export function renderFrame(state, ctx) {
  // Clear
  ctx.clearRect(0, 0, state.viewW, state.viewH);

  // Background
  ctx.fillStyle = COLORS.sky;
  ctx.fillRect(0, 0, state.viewW, state.viewH);

  // Surface line
  drawSurfaceLine(state, ctx);

  // Tiles (only visible rect)
  if (state.world?.grid) {
    const rect = getVisibleTileRect(state, TILE_SIZE);

    for (let y = rect.startY; y < rect.endY; y++) {
      for (let x = rect.startX; x < rect.endX; x++) {
        const cell = state.world.grid[y][x];
        if (!cell || cell.mat === MAT.AIR) continue;

        const def = MAT_DEF[cell.mat];
        const pos = tileToScreenPx(state, x, y, TILE_SIZE);

        // Fill
        ctx.fillStyle = def.color;
        ctx.fillRect(pos.sx, pos.sy, TILE_SIZE, TILE_SIZE);

        // Outline
        ctx.strokeStyle = "rgba(255,255,255,0.06)";
        ctx.strokeRect(pos.sx + 0.5, pos.sy + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);

        // Damage overlay (cracked look)
        if (cell.hpMax > 0 && cell.hp < cell.hpMax) {
          const t = clamp(cell.hp / cell.hpMax, 0, 1);
          ctx.fillStyle = "rgba(0,0,0,0.25)";
          ctx.fillRect(pos.sx, pos.sy, TILE_SIZE, TILE_SIZE * (1 - t));
        }
      }
    }
  }

  // Ship + Player
  drawShip(state, ctx);
  drawPlayer(state, ctx);

  // Overlays
  drawToast(state, ctx);
  drawDepthIndicator(state, ctx);
  drawLaunchHint(state, ctx);
}
