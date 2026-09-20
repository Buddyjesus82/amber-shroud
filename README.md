# The Amber Shroud

Mobile-first narrative PWA by **bigjerm21**. Flagship path: **The Hunger in the Amber**.

This is not a tabletop clone. There are no dice, no skill checks, and no rolls. You survive on **Sap (Drops)**, **Heat** with three factions, what you carry, and the doors you pick. Hub roam between authored Hunger chapters.

## Play

1. **New game** and pick a start door — kits are distinct and they bruise the same Cache Run:
   - **Ironwood Break** (Prisoner) — Cartel Scrip only in the holding pens. Oil-Tooth Jaxson is the inside man (sabotage + hotwire). **Kaelen the Sifter** is the rumor counter + merchant (scrap → Drops of Oasis Sap; Glints → intel).
   - **First Drop** (Outcast) — empty vial, Silas's tip. Sap is thin. Stray lean. Kaelen still sells Drops and rumors at dusk.
   - **Vessel** (Cult) — Drop, rusted dagger, Oram's map, cloth. Seeker / Thalia pressure.
2. Roam the hub: open **Map** (next to Heat / Gear). Walk **connected routes** only — no teleport. Each hop costs **Sap**; Camp-04 is farthest from Red Maw / First Spires (4 legs), Bleached Spine closer (2), Outer Threshold closest (1). Longer roads cost more hops (a few edges cost 2). At 0 Sap you get an authored crisis, not a random death.
3. **Heat** is faction attention, not XP. A first-game tip explains it; tap a Heat number anytime; a toast fires when Heat rises.
4. **Gear** is inventory (Gear sheet only — no kit strip under Heat): equip a **weapon** (**Bite**) and **armor** (**Hide**). Integers compare gear. They never add to a roll. Loot from downed enemies. Buy a Needle Knife or Dust Cloak from **Kaelen the Sifter**. Gear gates verbs — still no dice.
5. **Sybella is Seekers-only.** Prisoner / First Drop get hunt, skiff, capture pressure. She never feeds or bargains with Cartel or Dune-Strays.
6. Optional free-text **Do**: try `ask oil-tooth`, `scavenge`, `who is kaelen`. Keyword map — no live LLM, no dice. Misses say so. First meet on a hub NPC is a full card; later scenes show only what they are doing now. Type **who is [name]** to get the card back.
7. **Scavenge** is a sticky hub verb — scrap and trade goods, sometimes a Drop of Oasis Sap. Kaelen still trades scrap → Drop. Risky **skim** at vents/wells costs Heat. Ask **Kaelen the Sifter** for rumors/news (they sell or trade leads). Door facilitators (Oil-Tooth, Silas, Oram) run the first starting quest only — they are not the full cast. When you have a heading (Kaelen intel, Silas's tip, or Oram's map), the Hunger hook unlocks.
8. **Chapter 1 — Cache Run** is the same spine for every door: want → trail → Ossa → Zafir → Sybella poker → Red Maw. Verbs and spends depend on kit, Heat, and flags. Climax is resource poker: spend Sap, burn a Glint, bait Hollows, flee+Heat, or lay a false trail.
9. Land in **Red Maw Approach** with what you spent. Chapter 2, *The Walking Amber*, is stubbed on purpose.

Progress auto-saves to `localStorage` on every action — **one slot per door** (Prisoner, Outcast, Vessel). **Continue** resumes the last door you touched. Starting a door that already has a save asks Resume vs Overwrite; the other doors stay. An old single `amber-shroud.save.v1` migrates into that door’s slot once.

## Run locally

```bash
npm install && npm run dev
```

Dev server: `http://127.0.0.1:43177` (binds on all interfaces). Use phone portrait, or a narrow desktop pane.

```bash
npm run build
npm run preview
```

## Phone (permanent)

GitHub Pages (project site): **https://buddyjesus82.github.io/amber-shroud/**

Open that URL in Safari (iPhone) or Chrome (Android) → Share / menu → **Add to Home Screen**.

CI: `.github/workflows/pages.yml` runs `npm ci && npm run build` with `GITHUB_PAGES=true` (Vite `base` is `/amber-shroud/`) and deploys `dist/`.

Local play stays at the site root (`npm run dev`). For a local Pages-shaped build: `GITHUB_PAGES=true npm run build && npx serve dist`.

## Content for later chapters

Scenes, hubs, doors, and items live in TypeScript modules under `src/game/content/`. Add a chapter file, push scenes into `src/game/content/index.ts`, and hook it from a hub. The engine (`src/game/engine.ts`) applies Sap, Heat, inventory, flags, crises, and save.

## Canon (v1)

Low magic (bury a valued thing; Hollows bill you). Currency: Drops, Glints, Cartel Scrip. Three-faction war: Cartel, Seekers, Strays. **Ossa is alive.** Sybella wants a walking amber battery.
