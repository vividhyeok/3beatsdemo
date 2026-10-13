# THREE BEATS: SECTOR 12 — Playable Combat Demo

A browser-playable, deterministic 4 × 3 simultaneous-programming duel prototype for partner review and balance playtests. **Steam-only commercialization is planned; this build is an internal browser demo, not a public web-game monetization product.**

## Run

Open with any static HTTP server:

```bash
python -m http.server 8080
# http://localhost:8080
```

Or use VS Code Live Server. No dependencies, accounts, installs, or external APIs.

## Included

- Four playable characters: JACK (pressure), EVE (range), RAVEN (traps), ZETA (mobility)
- Six shared commands and five unique skills per character (11 selectable cards each)
- Secret three-command queues, sequential simultaneous beat resolution
- 4 × 3 arena, 120 HP / 45 starting EN, 10 rounds, central-control tiebreak
- Deterministic hit / graze / miss geometry; simultaneous movement, collisions, guards, energy, KOs
- Raven's visible delayed trap plus manual detonation, Zeta's directional skills
- Easy / Normal / Expert AI using publicly available information (never reads the player's queue)
- Card range preview, turn log, replay-like step animations, 3-slot planning, tutorial, settings
- Korean-first responsive interface with procedurally created original SVG illustration
- Automated engine tests and optional GitHub Actions checks

## Controls

Choose both fighters and AI difficulty. Select cards for the three slots; for some cards, choose direction or target square. Click queued commands to remove. Click **3비트 실행** when ready. Hover over a skill for its approximate range (actual target is determined after earlier simultaneous movements). Use **새 대전** to restart.

## Authoritative prototype rules

See `src/game.js` for the executable rule definitions and `src/ai.js` for the computer opponent. Card descriptions in the UI are generated from these rule records. No hand draws, hit chance, critical hits, or paid power.

### Intentional prototype exclusions

Online multiplayer, Steam SDK, rank persistence, narrative story mode, soundtrack, character animation rigs and final art are **not** implemented. This is a playable mechanics demo for partner approval, not a commercial release.

## Asset provenance

All visual assets in `assets/` are newly authored procedural SVG shapes and icons. No InuYasha assets or third-party copyrighted game artwork are used.

## Testing

```bash
node --test tests/*.test.mjs
```

For balancing, record side, character matchup, outcome, HP, and unexpected tactical loops. Numbers are initial assumptions and have not been statistically balanced.

## Illustrated card pack (2026-10-13)

The game UI supports image artwork for all 26 unique card IDs using `assets/cards/<character>/<shortname>.webp` and one common card back. Asset names are defined in `src/app.js`. The illustration pack is supplied separately as `three_beats_cards_all_26_ui_assets.zip`; copy the `assets/cards/` folder from that archive to the matching repository directory before packaging a public demo. Card numerical descriptions and hit logic are always derived from `src/game.js`, not the pre-rendered art.

Game-first UI: `index.html` + `game-ui.css`. The previous dashboard remains at `classic.html` for comparison. Do not release the public build before card asset files are installed, and verify the browser smoke test.

## Illustrated combat UI

The 27 supplied PNG illustrations are mapped to the existing card IDs in `assets/cards`, including the secret card back. Desktop presents the shared and fighter decks together; smaller screens keep scrollable card rows. Combat presentation includes HP transitions, movement entrance, actual HP-loss numbers, guard feedback, impact shake, and sequential card reveals. Reduced-motion preferences are respected. Rules, card values, and AI behavior are unchanged.

Run `npm test` for rules and `node tests/browser-smoke.mjs` for a Chromium round smoke test (Chrome or Edge on Windows; Chromium/Chrome on Linux). The smoke test checks image decoding and writes `artifacts/demo-preview.png`.
