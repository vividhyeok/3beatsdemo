# Asset pack integration verification

## Repository findings

The original repository was a dependency-free static app: `index.html` and `classic.html`, two presentation stylesheets, a deterministic combat engine, a synchronous AI planner, nine rule tests, a Chromium smoke script, and a GitHub Actions check. The former renderer replaced the board immediately with each beat's final state, duplicated the player's reserved cards, and had no menu/selection/result lifecycle. These were presentation/lifecycle problems; the engine's numerical rules did not need replacement.

Read before implementation: the complete engine, AI, application, both HTML screens, CSS, tests, README, package configuration, workflow, `IMPLEMENTATION_PROMPT.md`, and all manifest entries. All 76 files were imported under their exact `game_ready/` paths. Reference buttons are retained without using them as interactive controls.

## Changes

1. Full-screen cover main menu with separate HTML buttons; four-fighter tactical selection; decoded VS introduction.
2. Single player program and hidden CPU program. CPU DOM images, names, and tooltips never expose a later beat.
3. Engine-authored events preserve post-movement origins, actual target cells, direct/graze ranges, movement steps, trap centers, guard budgets, HP before/after, actual loss, and knockback endpoints.
4. Approximately 1.88-second reveal/move/target/attack/impact/push playback. Attacker labels, directional arrows, side-colored ranges, character VFX, hit reactions, damage popups, and explicit MISS / GUARD feedback connect the visual action to the numerical result.
5. Shared guard budgets and HP caps are allocated once across multiple attack events, including delayed trap plus normal attack in the same beat.
6. Cancellable AI worker and animation clock; pause / 2x / skip; resized actors, effect anchors, and attack lines; menu/reset cancellation and hidden-tab pause.
7. Layered win/lose art with player-perspective win/defeat/draw logos; KO and round/final-round transitions; repeated rematch.
8. Engine-derived hand statistics cover mismatched numbers baked into card illustrations. Manifest mapping, selected-match preloading, asset caching, static build, and production/test fixture separation.

## Evidence

- `npm test`: 16 tests. Existing nine rule tests remain in place.
- Original pre-change engine compared against the final engine: identical complete final states in 5,547 matchup/card/position combinations.
- `npm run test:browser`: real Chromium, actual mouse click hit testing, keyboard focus, four fighters, all 76 images decoded, one-click queue removal, future enemy-card secrecy, synchronized beat phases, pause / speed / skip / cancellation, a complete real AI match and rematch.
- Production engine + renderer scenarios: direct hit, graze, miss, full guard, two-step movement, knockback, delayed trap, win, defeat, simultaneous KO draw. Displayed final HP equals engine state.
- Browser sizes: 1440x900, 768x1024, 390x844, 844x390; no horizontal page overflow. Desktop captures also use 1440x1080. Result transitions are verified at desktop and mobile sizes.
- `npm run build`: all 76 manifest assets present in `dist`; no runtime dependency installation required.
- `git diff --check`: no whitespace errors.

Browser screenshots are produced in ignored `artifacts/` and uploaded by CI. The repository does not contain a production debug hook: the test server injects a fixture module only at its dedicated test URL.

## Limits

The supplied character art is static, so movement/attack reactions use transforms, transparency, and VFX rather than a skeletal animation rig. Browser verification is Chromium-based. Mobile behavior is verified with viewport emulation rather than physical iOS/Android devices. Hosting rollout depends on the repository's deployment connection; local build verification does not imply a completed remote rollout.
