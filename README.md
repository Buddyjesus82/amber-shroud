# The Amber Shroud

Mobile-first narrative PWA by **bigjerm21**. Flagship path: **The Hunger in the Amber**.

This is not a tabletop clone. There are no dice, no skill checks, and no rolls. You survive on **Sap (Drops)**, **Heat** with three factions, what you carry, and the doors you pick. Hub roam between authored Hunger chapters.

## Play

1. **New game** and pick a start door:
   - **Ironwood Break** (Prisoner) — Camp-04 Bleed breakout
   - **First Drop** (Outcast) — Bleached Spine, empty vial, noon heat
   - **Vessel** (Cult) — Outer Threshold, fake the vessel, steal a Strider
2. Roam the hub: move between places (costs Sap), talk to NPCs, search, delay.
3. Optional free-text: type things like `ask cache`, `drink`, `hide`, `bury`, `steal`. The game matches keywords to a small intent map — no live LLM.
4. When you learn of **Kallik's cache**, the Hunger hook unlocks. You can linger until Sap runs out or hunters close in. At 0 Sap you get an authored crisis beat, not a random death.
5. Play **Chapter 1 — Cache Run** (Zafir, Ossa alive on stilts, Sybella on the sand-skiff). Climax is bargain / flee / false trail / Hollow attention.
6. Land in **Red Maw Approach** with your consequences. Chapter 2, *The Walking Amber*, is stubbed on purpose.

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

## Put it on a phone (HTTPS / PWA)

Installable as a standalone PWA (`manifest.webmanifest` + service worker in production builds).

Static output is `dist/`. Any static host works:

- **Cloudflare Pages:** upload `dist/`, or connect the repo with build command `npm run build` and output `dist`.
- **Netlify:** same (`publish = dist`).
- **Quick tunnel from your machine:**

  ```bash
  npm run build
  npx serve dist
  ```

  Then expose that URL with a HTTPS tunnel, or deploy `dist` so the phone can **Add to Home Screen**.

Service workers and install prompts need HTTPS (localhost is fine).

## Content for later chapters

Scenes, hubs, doors, and items live in TypeScript modules under `src/game/content/`. Add a chapter file, push scenes into `src/game/content/index.ts`, and hook it from a hub. The engine (`src/game/engine.ts`) applies Sap, Heat, inventory, flags, crises, and save.

## Canon (v1)

Low magic (bury a valued thing; Hollows bill you). Currency: Drops, Glints, Cartel Scrip. Three-faction war: Cartel, Seekers, Strays. **Ossa is alive.** Sybella wants a walking amber battery.
