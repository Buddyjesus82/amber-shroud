# The Amber Shroud

Mobile-first narrative PWA by **bigjerm21**. Flagship path: **The Hunger in the Amber**.

This is not a tabletop clone. There are no dice, no skill checks, and no rolls. You survive on **Sap (Drops)**, **Heat** with three factions, what you carry, and the doors you pick. Hub roam between authored Hunger chapters.

## Play

1. **New game** and pick a start door — kits are distinct and they bruise the same Cache Run:
   - **Ironwood Break** (Prisoner) — Drop, scrap, Cartel scrip, vat wrench. Cartel Heat already on you.
   - **First Drop** (Outcast) — empty vial, Silas's tip. Sap is thin. Stray lean.
   - **Vessel** (Cult) — Drop, rusted dagger, Oram's map, cloth. Seeker / Thalia pressure.
2. Roam the hub: moving costs **Sap**. Kit verbs change the yard, the Spine, and the Threshold. At 0 Sap you get an authored crisis, not a random death.
3. Optional free-text: type things like `ask cache`, `drink`, `hide`, `bury`, `steal`. Keyword map — no live LLM, no dice.
4. When you have a heading (rumor, Silas's tip, or Oram's map), the Hunger hook unlocks.
5. **Chapter 1 — Cache Run** is the same spine for every door: want → trail → Ossa → Zafir → Sybella poker → Red Maw. Verbs and spends depend on kit, Heat, and flags. Climax is resource poker: spend Sap, burn a Glint, bait Hollows, flee+Heat, or lay a false trail.
6. Land in **Red Maw Approach** with what you spent. Chapter 2, *The Walking Amber*, is stubbed on purpose.

Progress saves to `localStorage` on every action. **Continue** from the title screen.

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
