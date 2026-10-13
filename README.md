# THREE BEATS / SECTOR 12

A playable 4 x 3 simultaneous tactical duel. Choose a fighter, program three commands, then watch both fighters reveal and resolve each beat. Existing card costs, damage, movement, guards, traps, victory conditions, and AI strategy remain authoritative in `src/game.js` and `src/ai.js`.

## Run and build

No dependencies or external APIs are required. Serve the repository using any static HTTP server:

```sh
python -m http.server 8080
# Open http://localhost:8080
npm run build
# Deploy the generated dist directory
```

`vercel.json` builds `dist` and sets a one-day revalidatable cache for the supplied assets. `classic.html` redirects to the complete game rather than loading the retired dashboard against the new renderer.

## Play

- START and CHARACTER open the four-fighter selection screen. Choose opponent and Easy / Normal / Expert AI, then start the match.
- Select three commands. A single click on a filled reservation removes it. Directional commands and Raven's trap require an explicit direction or tile.
- CPU cards remain face down until their individual beat. One editable player queue is displayed.
- Each beat plays reveal, simultaneous movement, actual attack ranges, attack VFX, hit/graze/miss/guard feedback, then knockback. Cyan identifies YOU; pink identifies CPU. Solid boundaries are direct hits, dashed boundaries are grazes.
- HP popups show actual HP lost after guards and overkill. The caption names the attacker, card, origin, affected coordinates, grade, raw damage, guard reduction, and actual damage.
- 1x / 2x, skip, pause, replay, menu navigation, alternate arena, and sound controls are available. Leaving a match cancels its AI worker and animation playback. Reduced-motion settings are respected.
- Win, defeat, draw, KO, and the round limit use the original engine. Results composite the winner's win pose and loser's lose pose over the supplied result background. Rematch retains the matchup.

Keyboard: Tab navigates buttons; Enter activates the focused button or submits a complete queue from the page; Backspace removes the last command; Escape cancels targeting or pauses; H opens the guide.

## Assets and architecture

`game_ready/` contains all 76 curated WebP assets supplied in `THREE_BEATS_GAME_READY_27MB.zip`. The manifest and implementation brief are retained in `docs/asset-pack/`. `src/assets.js` maps their exact manifest paths. The eight `ui/buttons/` images are reference-only, as required by the brief; all interactive buttons use semantic HTML/CSS. Live engine-derived EN / DM / GR values appear below each complete card illustration; printed numbers in supplied art may differ. Older assets remain in source history but are not shipped in the new build, except the favicon.

- `src/game.js`: deterministic rules and structured move / attack / damage / trap / push events. Presentation metadata can be disabled for AI simulations without changing results.
- `src/ai.js`, `src/ai-worker.js`: original AI selection strategy, executed in a cancellable worker so the interface stays responsive. It never reads the current player's queue.
- `src/combat-view.js`: coordinate-linked VFX and cancellable playback clock; approximately 1.88 seconds per beat at 1x.
- `src/app.js`: menu, selection, queue editing, match lifecycle, secret reveals, settings, and transitions.
- `src/result-view.js`: shared result compositor.

High-resolution match assets are decoded before the VS introduction finishes. CSS uses cover backgrounds; character poses retain transparency. Desktop, tablet, and mobile layouts avoid horizontal page scrolling.

## Verification

```sh
npm test
npm run test:browser
npm run build
```

The 16 engine/asset/presentation tests cover queue rules, AI legality, simultaneous movement, hit geometry, guards, overkill, trap detonation, knockback, and per-attack guard allocation. Every matchup/card combination is compared between presentation and AI simulation modes.

The Chromium browser test uses actual mouse input and keyboard navigation. It checks all 76 image decodes, four fighter selections, queue editing, secret reveal timing, pause/2x/skip/cancel, actual AI match completion and rematch, four viewport sizes, and deterministic HIT/GRAZE/MISS/GUARD/movement/push/trap/win/defeat/draw scenarios through the production engine and renderer. Screenshots are written to ignored `artifacts/`. Test-only fixtures are served by the test server and excluded from the production build. Temporary Chromium profiles are cleaned after each run.

Chrome or Edge is supported on Windows; Chrome/Chromium is supported on Linux. GitHub Actions runs tests, the static build, and browser verification, and uploads screenshots.

## Scope

This remains a local browser AI combat demo. Character animation uses the supplied static poses and composited VFX; the pack does not include skeletal or frame-by-frame character animation. Online multiplayer, Steam integration, ranked persistence, and a soundtrack are outside the existing demo scope.
