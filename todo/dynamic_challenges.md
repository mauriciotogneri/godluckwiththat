# Dynamic Challenges

Make the 10 divine challenges adapt to the colony. `src/data/challenges.json` declares only base values per challenge; when a challenge starts, the game scales them up for a thriving colony and down for a struggling one, so the game feels neither too hard nor too easy. A headless bot simulation of the real engine is used to tune both the base values and the scaling.

## Decisions

| #   | Decision                               | Choice                                                                                                                                                                                                       |
| --- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Guarantee the scaling must never break | Always winnable                                                                                                                                                                                              |
| 2   | What scaling measures                  | Hybrid: requirement amounts follow a feasibility estimate (can this colony meet them in time); overall colony health (economy, faith, military, research, population) adjusts blessing, punishment and delay |
| 3   | How a struggling colony is helped      | Faith and resource amounts shrink first; building-level and worker requirements get a longer timer plus a small level cut (about 20% at most)                                                                |
| 4   | What the player sees                   | A short mood line in the challenge popup ("The gods are merciful" … "The gods are demanding"), about 5 tiers, no numbers                                                                                     |
| 5   | Start the tuning targets               | The Camp start; new games switch back to it (`createInitialColony()` currently returns the advanced City colony)                                                                                             |
| 6   | Target run length                      | About 2 hours at speed 1 for an average player                                                                                                                                                               |
| 7   | Kinds of requirements                  | Unchanged: faith, resources, altar/temple/monument levels, workers                                                                                                                                           |
| 8   | Blessings and punishments              | A harder challenge gives a stronger blessing (mostly magnitude, duration modestly); a struggling colony gets a milder punishment, with worker and building losses scaled to colony size                      |
| 9   | When tuning is done                    | See [Done criteria](#done-criteria)                                                                                                                                                                          |
| 10  | Saves                                  | Saves keep only progress, the failure count, the mood and the adjusted values of the challenge in progress; not-yet-started challenges always come from the data file; old saves get an upgrade step         |
| 11  | Reference for "healthy"                | A per-challenge table of typical colony stats, generated from the average bot, stored in `balancing.js`                                                                                                      |

Also agreed:

- The delay is decided when a challenge is activated (and again after a failure); requirements, timer, blessings and punishment are decided when the countdown starts and stay fixed until it ends. Every retry is recalculated and eases a little more per failure.
- Starting limits (final numbers come from the simulation): at most +30% harder, building levels cut by at most about 20%, timer extended to at most about 1.75–2×.
- Same-type blessings and punishments refresh instead of stacking, enforced in code (durations are no longer fixed, so the duration-based rule in `docs/specs.md` no longer holds).
- The simulation runs as its own command (`npm run simulate`), not as part of `npm test`; fast unit tests cover the scaling functions.

## Done Criteria

Measured with `SIM_ASSERT=1` on about 30 seeds per bot:

- **Weak bot**: clears every challenge within 2 attempts, on every seed.
- **Average bot**: median run 105–135 minutes; at most 2 failures on about 90% of seeds; median time left on the timer per challenge 20–40% (successful attempts only).
- **Strong bot**: no failures on any seed; median time to first meet the requirements at or after half the timer.
- Bot sanity: weak < average < strong on HQ tier, research and production at 30, 60 and 90 minutes.

## Key Facts

- A challenge resolves only when its timer runs out, even if the requirements are met earlier. Run length is therefore mostly the sum of delays and timers (75 minutes today with no failures); the 2-hour target comes mainly from the new base schedule.
- The late base requirements cannot be reached: Temple 29→30 costs about 864k wood and 432k stone (build time about 63 minutes), Altar 50's last level about 380k wood, and challenge 10 alone needs about 100 territory slots. Base values must be redesigned, not tweaked.
- Building unlocks are checked only in the UI: `levelUpBuilding` and `buyUnits` do not check the HQ tier, and the research window hides the Disasters category. The bots enforce both themselves.
- Randomness in the tick path lives only in `state.js` (`_sacrificeWorkers`, `_downgradeRandomBuildings`, `_generateRaidArmy`, `_generateTributeDemand`), so runs can be seeded.
- Saves currently store full challenge definitions (`Challenge.toJSON`), and `createInitialChallenges` shares `requirements.resources` and `blessing.resources` objects with the imported JSON (editing them in place would leak into the next new game).
- Failures are not counted anywhere today, and there is no raid win/loss counter.
- Worker and building-level losses loop with `i < count`, so adjusted counts must be integers. Durations display in whole minutes (`formatMinutes`), so scaled durations should be multiples of 60 s.
- `meta.version` exists (currently 1) but nothing checks it.

## Phase 0 — Simulation and Baseline

Measure the current game from the Camp start with three bots before any scaling code exists. Details in `docs/simulation.md`.

- [x] Add `State.advanceProgress(delta)` (season, construction, research, challenges, events, raids, in the existing order); the game screen delegates to it
- [x] Add the `State.unlockedBuildings` getter (the game screen keeps its own computed, since the engine is not reactive)
- [x] Tests for the progress order and for the getter at each HQ tier (`tests/engine/state.test.js`)
- [x] Add `colonyStats(state)` in `src/js/engine/colony_stats.js` (elapsed time, HQ tier and level, workers, stock and net rates, storage cap, production value, faith rate, army, research count, building levels, free territory, construction multiplier, unlocked resources and buildings) with `tests/engine/colony_stats.test.js`
- [x] Simulation setup: `vitest.simulation.config.js`, `npm run simulate`, lint covers `scripts/simulation/`, ESLint `process` global for that folder only, reports folder git-ignored
- [x] Entry `scripts/simulation/simulate.sim.js` with the options `SIM_BOTS`, `SIM_RUNS`, `SIM_SEED`, `SIM_MAX_HOURS`, `SIM_STEP`, `SIM_ASSERT`
- [x] Seeded randomness (`seeded_random.js`): the engine and the bot get separate streams; `Math.random` is restored after each run
- [x] Harness (`harness.js`): Camp start, closes blocking windows without game time passing, mirrors the game screen's catch-up loop
- [x] Recorder (`run_recorder.js`): per attempt — timings, requirements, colony stats at activation and countdown start, first time met, spare share, result, blessing; raids; run length
- [x] Report (`report.js`): per bot and per challenge tables, progress at 30/60/90 minutes, sanity check, reference-table snippet for `balancing.js`
- [x] Bots (`bots/bot.js`, `bot_profiles.js`, `economy_planner.js`, `challenge_planner.js`, `military_planner.js`): weak, average and strong profiles using only public State actions
- [x] Baseline run recorded in `docs/simulation.md`; same seed gives a byte-identical report
- [x] Review fixes: a run cut off mid-countdown no longer counts as 0% spare share; a challenge resolved on the last step is closed before the run ends (a win at the cap counts); the harness stops stepping when a bot action pauses the game

Baseline (current `challenges.json`, no scaling, 20 seeds per bot, 5-hour cap):

| #   | Bot     | Runs won | Challenges cleared (median) | Failures per run | Stuck at                                               |
| --- | ------- | -------- | --------------------------- | ---------------- | ------------------------------------------------------ |
| 1   | Weak    | 0 / 20   | 4                           | 26.6             | #5 (11 runs), #8 (9 runs)                              |
| 2   | Average | 0 / 20   | 7                           | 24.0             | #8 (every run)                                         |
| 3   | Strong  | 0 / 20   | 9                           | 22.0             | #10 (every run); clears #8 after about 12 tries (~3 h) |

## Phase 1 — Data and Save Model

Separate base values from adjusted values, persist failures, enforce no stacking and upgrade old saves. Gameplay numbers do not change yet.

- [x] `constants.js`: build `CHALLENGE_DEFINITIONS` once from `challenges.json`, with nulls filled in, deep-frozen
- [x] `constants.js`: add `SAVE_VERSION = 2` and use it in `createInitialMeta`
- [x] `constants.js`: `createInitialChallenges()` builds each challenge with `Challenge.fromDefinition(definition)`
- [x] `challenge.js`: new fields `base` (frozen definition, never saved), `failures` (default 0) and `mood` (default null); `delay`, `timeout`, `requirements`, `blessings` and `punishment` now mean the values in effect
- [x] `challenge.js`: `static fromDefinition(definition)` deep-copies the base values into new `Blessing`/`Punishment` objects and a new `resources` object (removes the shared-reference risk)
- [x] `challenge.js`: `reset()` keeps `failures`
- [x] `challenge.js`: `toJSON()` saves only progress (index, status, delay, delayElapsed, timeoutElapsed, failures, mood), plus timeout, requirements, blessings and punishment while the status is `started`
- [x] `challenge.js`: `fromJSON(data, definition)` re-attaches `base` and fills missing values from it
- [x] `challenges.js`: `fail()` increments `active.failures`
- [x] `challenges.js`: `complete()` and `fail()` remove an active effect of the same type before adding the new copy (refresh instead of stacking)
- [x] `challenges.js`: `toJSON()` saves `completed` as a list of indexes and drops `pending`; `fromJSON(data, definitions)` rebuilds both from the definitions and ignores unknown indexes
- [x] `meta.js`: `fromJSON(data, definitions)` passes the definitions through
- [x] New `src/js/engine/save_migration.js` with `migrateSave(data)`, run by `State.fromJSON` before `Meta.fromJSON`: version 1 → 2 (completed → indexes; an active `started` challenge keeps its stored values as adjusted values; an active `activated` challenge keeps its delay and timers; pending dropped); a version newer than `SAVE_VERSION` throws, so the existing catch shows "Load Failed"
- [x] `state.js` `fromJSON`: run the migration first and pass `CHALLENGE_DEFINITIONS`
- [x] Tests: `challenge.test.js` (`fromDefinition` deep copy, failures, both `toJSON` shapes, `base` not saved)
- [x] Tests: `challenges.test.js` (failures increment, same-type refresh, rebuild from definitions, completed saved as indexes)
- [x] Tests: `serialization.test.js` (missing `failures` or `mood`)
- [x] Tests: `constants.test.js` (definitions frozen; changing one game's challenge affects neither the definitions nor a second new game); replace the 300 s duration pin with type-only checks
- [x] Tests: new `save_migration.test.js` (a version 1 fixture taken from current main: active started with its window open, active activated, completed list; version set to 2; newer version rejected)
- [x] Tests: `state.test.js` (version 1 and version 2 load round trips); update `tests/helpers/factories.js`
- [x] Verify: targeted tests and lint pass; the simulation reproduces the Phase 0 baseline (except where blessings used to stack); a version 1 save loads in the browser

## Phase 2 — Scaling Logic

Pure, deterministic functions in the engine; every tuning number lives in `balancing.js`.

- [x] `enums.js`: `CHALLENGE_MOOD_MERCIFUL`, `CHALLENGE_MOOD_LENIENT`, `CHALLENGE_MOOD_WATCHFUL`, `CHALLENGE_MOOD_STERN`, `CHALLENGE_MOOD_DEMANDING`; `constants.js`: ordered `CHALLENGE_MOODS`
- [x] `balancing.js`: new "Challenge scaling" section with starting values (first guesses, set by Phase 3):

  | #   | Constant                                | Starting value                                | Purpose                                                        |
  | --- | --------------------------------------- | --------------------------------------------- | -------------------------------------------------------------- |
  | 1   | `CHALLENGE_TARGET_TIME_SHARE`           | about 0.65                                    | Estimated time to meet ÷ timer that requirements are fitted to |
  | 2   | `CHALLENGE_MIN_AMOUNT_SCALE`            | about 0.15                                    | Floor for faith and resource shrinking                         |
  | 3   | `CHALLENGE_MAX_HARDEN_SCALE`            | 1.3                                           | Hardening cap                                                  |
  | 4   | `CHALLENGE_MAX_LEVEL_CUT`               | 0.2                                           | Largest level or worker cut                                    |
  | 5   | `CHALLENGE_MAX_TIMEOUT_SCALE`           | about 1.75                                    | Longest timer extension                                        |
  | 6   | `CHALLENGE_FAILURE_EASE`                | about 0.15 per failure                        | Lowers the target share on each retry                          |
  | 7   | `CHALLENGE_FAILURE_TIMEOUT_BONUS`       | about 0.1                                     | Extra timer per failure                                        |
  | 8   | `CHALLENGE_FAILURE_DELAY_BONUS`         | about 60 s                                    | Extra recovery time per failure                                |
  | 9   | `CHALLENGE_DELAY_SCALE_MIN` / `_MAX`    | 0.75 / 1.5                                    | Delay range driven by health                                   |
  | 10  | `CHALLENGE_HEALTH_WEIGHTS`              | —                                             | Weight per stat in the health score                            |
  | 11  | `CHALLENGE_HEALTH_RATIO_MIN` / `_MAX`   | 0.25 / 4                                      | Clamp on each stat ratio                                       |
  | 12  | `CHALLENGE_BLESSING_MAGNITUDE_RANGE`    | about [0.75, 1.3]                             | Blessing strength range                                        |
  | 13  | `CHALLENGE_BLESSING_DURATION_RANGE`     | about [0.9, 1.15]                             | Blessing duration range                                        |
  | 14  | `CHALLENGE_PUNISHMENT_SEVERITY_RANGE`   | about [0.5, 1.15]                             | Punishment severity range                                      |
  | 15  | `CHALLENGE_PUNISHMENT_MAX_WORKER_SHARE` | about 0.25                                    | Cap on workers lost                                            |
  | 16  | `CHALLENGE_PUNISHMENT_MAX_LEVEL_SHARE`  | —                                             | Cap on building levels lost                                    |
  | 17  | `CHALLENGE_EFFECT_CAPS`                 | productivity ≤ 0.6, faith/resource loss ≤ 0.6 | Upper limits on effect values                                  |
  | 18  | `CHALLENGE_MOOD_THRESHOLDS`             | —                                             | Difficulty limits for the 5 moods                              |
  | 19  | `CHALLENGE_AMOUNT_ROUNDING`             | —                                             | Rounding steps for amounts                                     |
  | 20  | `CHALLENGE_REFERENCE_STATS`             | neutral placeholder (health 1)                | 10 rows, each `{index, runs, activation, countdownStart}`      |

- [x] New `src/js/engine/challenge_scaling.js` — `healthScore(stats, referenceSnapshot)`: weighted geometric mean of clamped stat ratios (a reference near 0 counts as ratio 1; HQ tier uses (tier+1)/(refTier+1)); 1.0 means a typical colony
- [x] `estimateCompletionTime(requirements, stats)`: seconds needed, or Infinity — resources needed (requirement amounts, building level costs via temporary building instances, recruit food); resource time = max of missing ÷ net rate; build chain = Σ build time × construction multiplier, plus HQ expansions when territory is short; storehouse levels when an amount or a level cost exceeds the cap; HQ tier upgrades when a building is locked; faith income counts free temple slots idle workers could fill; result = max(resource time, build chain)
- [x] `fitRequirements(definition, stats, failures)` in stages: target = timer × target share × (1 − failure ease)^failures; A (time to spare) raises all values up to ×1.3; B1 (too hard) shrinks faith and resources down to the floor; B2 (still too hard) extends the timer up to the maximum and cuts levels and workers by up to 20%; C (backstop) caps each value at what the colony can reach in the maximum timer, drops still-locked resources, and flags the backstop
- [x] Rounding: amounts to nice steps; levels and workers to integers ≥ 1 (cut uses `ceil(base × 0.8)`); timer up to 30 s
- [x] `challengeDifficulty(scales)`: average applied scale ÷ timer scale (above 1 = harder than base)
- [x] `adjustBlessing(blessing, difficulty)`: new `Blessing`; productivity, construction, warm and cold scaled to whole percents and capped; gifted resources rounded to 50; territory an integer; duration scales a little and rounds to 60 s
- [x] `adjustPunishment(punishment, health, stats, referenceSnapshot)`: new `Punishment`; severity from health; fractions capped; duration rounded to 60 s; base worker and level counts mean "for the reference colony at this index" — lost = round(base ÷ reference × current × severity), capped, integers
- [x] `adjustDelay(baseDelay, health, failures)`: longer when struggling, shorter when thriving, plus the per-failure bonus; rounded to 10 s
- [x] `challengeMood(difficulty)`: one of the 5 moods
- [x] `adjustChallenge(definition, stats, referenceRow, failures)`: single entry point returning `{timeout, requirements, blessings, punishment, mood, scales, backstop}`
- [x] `state.js` `_decideChallengeDelay()`: after `challenges.activate()` in `advanceChallenges`, and in `acknowledgePunishment` after the punishment is applied and `update(0)` has run
- [x] `state.js` `_decideChallengeCountdown()`: before `challenges.start()` and before the future event is created (so its countdown uses the adjusted timer); assigns new objects, no in-place changes
- [x] Both hooks do nothing when `challenge.base` is null (keeps existing fixed-value tests stable)
- [x] Health production measure counts only output that can still be stored (production into full storage overrates an overflowing colony — confirmed)
- [x] Tests: new `challenge_scaling.test.js` (health 1 at the reference and moves the right way; estimate respects storage, territory and locked content; amounts grow up to ×1.3 and shrink to the floor; level cut ≤ 20%; timer ≤ maximum; every failure eases further; integer outputs and nice rounding; locked resource dropped and backstop flagged; blessing strength follows difficulty; punishment milder at low health and scaled to colony size; mood thresholds; definitions never changed)
- [x] Tests: `state.test.js` (delay set at activation and after a failure; values set at countdown start and fixed mid-countdown; event countdown matches the adjusted timer; retry recalculates; save/load mid-countdown keeps the values; challenges without a base are left alone)
- [x] Simulation report shows scales, moods and backstop counts per attempt
- [x] Verify: targeted tests and lint pass

Implementation notes (where the code differs from or adds to the list above):

- Extra constants: `CHALLENGE_HEALTH_MIN_REFERENCE` (per-stat "reference near 0" limit), and rounding steps `CHALLENGE_TIMEOUT_ROUNDING` (30 s), `CHALLENGE_DURATION_ROUNDING` (60 s), `CHALLENGE_DELAY_ROUNDING` (10 s), `CHALLENGE_GIFT_ROUNDING` (50). Health weights: economy split 0.5 production / 0.5 HQ tier, then 1 each for faith, army, research, workers.
- `colonyStats` gained `templeWorkers`, `house` and `storehouse`; `productionValue` now counts only output that can still be stored (this also changes the report's sanity check and reference table).
- Build time: each building's levels one after another, buildings in parallel (longest chain), HQ upgrades and expansions first; expansions ignore the expansion research discount.
- B2 re-grows the amounts once the timer and level cut are found; the backstop starts from the base amounts (level cut at its largest), caps each part on its own, then lowers them together.
- Timers never exceed the longest timer rounded down (300 s → 510 s, not 540 s). Punishment durations scale with the severity.
- `State.challengeScaling` keeps the last countdown adjustment (scales, backstop) for the simulation; not saved.
- The recorder now takes each attempt's timer and requirements at countdown start (they were copied at activation, which skewed spare share).

## Phase 3 — Tuning

- [x] Re-record the Phase 0 baseline's production figures with the Phase 2 measure (output into full storage no longer counts), so the baseline-vs-final comparison uses the same figure — new `SIM_SCALING=0` switch; challenge results unchanged, raids within 0.1 per run, the sanity check now passes
- [ ] New base delays and timers in `challenges.json`: Σ(delay + timer) about 6,600–7,000 s; longer early delays for the Camp start; late timers around 600–900 s
- [ ] `SIM_CALIBRATE=1` mode: for each challenge, print the amount the average bot's countdown-start colony would meet at the target share
- [ ] New base requirements from calibration, rounded to nice numbers, keeping each challenge's theme and kinds and asking only for content the average bot has unlocked by then
- [ ] Generate the reference table from the average bot, paste it into `CHALLENGE_REFERENCE_STATS`, rerun; repeat until rows change by less than about 10%
- [ ] Cap the worker requirement at a share of the colony's workers at countdown start (new `balancing.js` constant, start about 0.5): winning sacrifices the required workers, while failing costs at most `CHALLENGE_PUNISHMENT_MAX_WORKER_SHARE` (0.25); unit test it and check it in the simulation
- [ ] Tune the scaling constants until every done criterion passes with `SIM_ASSERT=1` on about 30 seeds per bot (fill in `DONE_CRITERIA` in `report.js`)
- [ ] Revisit blessing and punishment base values now that durations are no longer tied to the old no-stacking timing
- [ ] Record baseline vs final tables, seed count and changed constants in `docs/simulation.md`
- [ ] If "strong bot needs at least half the timer" cannot be met within the +30% cap, stop and decide on an extra hardening lever (e.g. a shorter timer)

## Phase 4 — Interface, Locales and Camp Start

- [ ] `game_screen.vue` `syncChallenges`: add `mood`
- [ ] `challenge_detail_modal.vue`: mood line under the title when set (frontend-design skill, shared styles, `rgba` colours, `rem` radii)
- [ ] Five keys in `ca.js`, `en.js`, `es.js`, `fr.js`, `it.js`: `challenge.mood.merciful`, `.lenient`, `.watchful`, `.stern`, `.demanding`; `locale_keys.test.js` passes
- [ ] Check the detail, success and failure windows show the adjusted values correctly (integers, percents, whole-minute durations, zero losses hidden)
- [ ] `constants.js`: `createInitialColony()` returns `createInitialColonyBasic()`; fix its JSDoc; test the Camp start (level 1, 250 food, 100 wood)
- [ ] Browser check: new game starts at Camp; mood line shows; a failure then a retry shows easier values; save/load mid-countdown keeps the values; a version 1 save loads; no console errors

## Phase 5 — Docs and Final Verification

- [ ] `docs/architecture.md`: Challenges System (base vs adjusted values, failures, mood, refresh rule, save version 2 and migration), new modules (`challenge_scaling.js`, `save_migration.js`), Save/Load, the `createInitialColony` note
- [ ] `docs/specs.md`: challenge lifecycle (delay at activation; requirements, timer, blessings and punishment at countdown start; retries ease), scaling of requirements, blessings and punishments, losses relative to colony size, no-stacking now enforced by refreshing, starting colony, `challenges.json` holds base values and `balancing.js` the scaling constants and reference table
- [ ] `docs/testing.md`: rows for the new test files
- [ ] `todo/todo.md`: remove the "make blessings and punishments dynamic" item
- [ ] Final run: `npm run lint:fix`, targeted tests, `SIM_ASSERT=1 npm run simulate` (all PASS, report saved), `npm run build`, browser check with the console

## Open Issues

- **Soft-lock** — a colony with 0 workers and under 50 food can never recruit again. 13 of 20 strong baseline runs end this way after challenge 10's punishment (100 workers, 30 levels). Phase 2's size-based losses should remove this trigger; check after Phase 3 whether a general safety net is still needed.
- **Production measure** — done in Phase 2: `productionValue` counts only output that can still be stored.
- **Phase 2 first guesses** (agreed, tuned in Phase 3) — equal health weights for economy, faith, military, research and population; building levels lost capped at about 10% of total levels; the 5 mood bands evenly spaced around difficulty 1; amounts rounded to steps of 10/50/100/500 by size.
- **Spare share** — assumed to count only successful attempts, not attempts that met the requirements and then spent them.
- **Possible bug (not verified)** — `selectBlessing` and `acknowledgePunishment` always unpause, even if a tutorial popup is still open; the raid window re-checks.
- **Phase 2 smoke run (3 seeds, not tuned)** — the weak bot fails challenge 1 on most first tries, and the average bot fails challenge 3's first try (temple raised to 6) though it passes the retry; check in Phase 3 whether the estimate or the bots are at fault.
- **Report mood counts** — moods and backstops count every countdown that started, including one cut off by the time cap, so they can exceed the finished attempts.
- **Review nits not applied** — duplicated constants and formulas in the bots (raid size, blessing-to-resource mapping, producer list, `SECONDS_PER_MINUTE`), unused exports and fields, milestone snapshots taken on a cold→warm step, the report file name ignoring `SIM_MAX_HOURS` and `SIM_STEP`.

## Risks

- The criteria certify heuristic bots, not people; weak < average < strong is checked, and the weak bot spends about a third of its time short on food or wood.
- The time estimate is a straight-line extrapolation (ignores growth, seasons, raids, competing spending); `CHALLENGE_TARGET_TIME_SHARE` absorbs the error.
- Values are fixed for the whole countdown, so a raid loss or punishment mid-countdown can make that attempt unwinnable; the failure nudge recovers on the retry.
- The reference table and the scaling depend on each other; they are iterated to a fixed point in Phase 3.
- Circular imports: keep `colony_stats.js` and `challenge_scaling.js` imported only by `state.js`, the simulation and tests; pass definitions into the models as parameters.
- A migrated in-progress challenge keeps its old (possibly impossible) values until that countdown ends; retries are recalculated from the base.
