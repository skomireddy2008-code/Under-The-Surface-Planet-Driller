// src/planets.js
// Planet definitions: goals, stats, and procedural spawn rules.
//
// This module should NOT import state.
// It can import constants (materials, etc.).

import { MAT } from "./constants.js";

/**
 * Each planet has:
 * - name/desc: UI flavor
 * - gravity: affects falling
 * - seed: world gen randomness
 * - fuelMax: max fuel on this planet
 * - drillPower: base drill strength on this planet
 * - goals: quota required to launch
 * - spawn: rules for world generation (layers + veins)
 *
 * worldGen.js will read these spawn rules.
 */

export const PLANETS = [
  {
    id: "rocky-1",
    name: "Rocky Starter World",
    desc: "Easy terrain. Learn to drill and manage fuel.",
    gravity: 1.0,
    seed: 1337,

    fuelMax: 150,
    drillPower: 1.0,

    // Material quota required to launch
    goals: {
      "Iron": 20,
      "Crystal": 10
    },

    // Generation rules (interpreted by worldGen.js)
    spawn: {
      // from SURFACE_Y down to dirtTo = mostly DIRT, then mostly ROCK
      dirtTo: 36,

      // random empty pockets chance (helps caves feel real)
      airPocketChance: 0.02,

      // Veins/blobs of special materials
      // count = number of blobs, size = [minRadius, maxRadius]
      veins: [
        { mat: MAT.IRON, minY: 18, maxY: 110, count: 26, size: [10, 32] },
        { mat: MAT.CRYSTAL, minY: 32, maxY: 135, count: 14, size: [8, 22] }
      ]
    }
  },

  {
    id: "volcanic-2",
    name: "Volcanic Core World",
    desc: "Hot and unstable. Harder layers and rarer rewards.",
    gravity: 1.1,
    seed: 9001,

    fuelMax: 165,
    drillPower: 1.05,

    goals: {
      "Magma": 15
    },

    spawn: {
      dirtTo: 22,
      airPocketChance: 0.015,

      veins: [
        { mat: MAT.IRON, minY: 14, maxY: 70, count: 14, size: [6, 16] },
        { mat: MAT.MAGMA, minY: 40, maxY: 139, count: 18, size: [10, 30] },
        { mat: MAT.CRYSTAL, minY: 28, maxY: 125, count: 10, size: [6, 18] }
      ]
    }
  },

  {
    id: "ice-3",
    name: "Frozen Subsurface Ocean",
    desc: "Slippery layers hide rare cores deeper down.",
    gravity: 0.9,
    seed: 424242,

    fuelMax: 180,
    drillPower: 1.1,

    goals: {
      "Ice Core": 10,
      "Crystal": 8
    },

    spawn: {
      dirtTo: 16,
      airPocketChance: 0.03,

      veins: [
        { mat: MAT.CRYSTAL, minY: 24, maxY: 95, count: 16, size: [8, 22] },
        { mat: MAT.ICECORE, minY: 60, maxY: 139, count: 14, size: [10, 26] }
      ]
    }
  }

  // Later planets (if you add):
  // - radiation planet
  // - jungle planet with toxic spores
  // - alien ruin planet with relics and traps
];

/**
 * Convenience helper (optional): find a planet by id.
 */
export function getPlanetById(id) {
  return PLANETS.find(p => p.id === id) || null;
}
