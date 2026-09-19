# The Amber Shroud

Mobile-first narrative PWA by **bigjerm21**. Flagship path: **The Hunger in the Amber**.

This is not a tabletop clone. There are no dice, no skill checks, and no rolls. You survive on **Sap (Drops)**, **Heat** with three factions, what you carry, and the doors you pick. Hub roam between authored Hunger chapters.

## Play

1. **New game** and pick a start door — kits are distinct and they bruise the same Cache Run:
   - **Ironwood Break** (Prisoner) — Cartel Scrip only in the holding pens. Oil-Tooth Jaxson is the inside man (sabotage + hotwire). **Kaelen the Sifter** is the rumor counter + merchant (scrap → Drops of Oasis Sap; optional Glints → faster intel). Rumors are free pointers, not shop quests.
   - **First Drop** (Outcast) — empty vial, Silas's tip. Sap is thin. Stray lean. Kaelen still sells Drops at dusk and points free rumors at other mouths.
   - **Vessel** (Cult) — Drop, rusted dagger, Oram's map, cloth. Seeker / Thalia pressure.
2. Roam the hub: moving costs **Sap**. Kit verbs change the yard, the Spine, and the Threshold. At 0 Sap you get an authored crisis, not a random death.
3. Optional free-text: type things like `ask cache`, `drink`, `hide`, `bury`, `steal`. Keyword map — no live LLM, no dice.
4. Ask **Kaelen the Sifter** for rumors/news. The default is free: he points you at another character or place. Go there and ask the **right questions** — only then does it crystalize into a quest (objective, stakes, reward/cost). Paid/traded rumors are optional faster leads, not the shop. Door facilitators (Oil-Tooth, Silas, Oram) run the first starting quest only — they are not the full cast. When a heading exists (Oil-Tooth's debt, Valerius's skiff, Silas's tip, Oram's map, or paid Kaelen intel), the Hunger hook unlocks.
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
