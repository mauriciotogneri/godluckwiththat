# Balance Simulation

A headless simulation that plays full games against the real engine with heuristic bots, to measure how the challenges, raids and progression play out. It changes nothing in the game: the bots use only the public `State` actions, and the engine runs unmodified.

## Running It

```bash
npm run simulate
SIM_BOTS=strong SIM_RUNS=5 npm run simulate
SIM_SEED=100 SIM_MAX_HOURS=3 npm run simulate
```

It runs through Vitest (`vitest.simulation.config.js`, which merges the Vite config for the `@` alias and uses the same setup file as the tests) and is not part of `npm test`. The text report is printed to the terminal and the full data (report plus every run) is written to `scripts/simulation/reports/report_<bots>_seed<seed>_runs<runs>.json`, with `_noscaling` added when scaling is off (git-ignored, overwritten by the same options).

| Variable        | Default | Meaning                                                                                      |
|-----------------|---------|----------------------------------------------------------------------------------------------|
| `SIM_BOTS`      | all     | Comma list of bots: `weak`, `average`, `strong`                                              |
| `SIM_RUNS`      | 20      | Seeds per bot. Run *i* uses seed `SIM_SEED + i`; every bot plays the same seeds              |
| `SIM_SEED`      | 1       | Base seed                                                                                     |
| `SIM_MAX_HOURS` | 5       | Game hours before a run stops as did-not-finish                                               |
| `SIM_STEP`      | 1       | Game seconds per simulation step                                                              |
| `SIM_ASSERT`    | off     | `1` or `true`: fail when a done criterion is unmet (`DONE_CRITERIA` in `report.js`)           |
| `SIM_SCALING`   | on      | `0` or `false`: the engine does not scale the challenges; they keep the fixed values of `challenges.json` (the harness drops each challenge's definition) |

The default (3 bots × 20 seeds × 5 hours, 1-second steps) takes about 55 seconds. The same options always produce a byte-identical JSON file.

`SIM_ASSERT` currently checks only the bot sanity check below (a stub); the challenge criteria come with the rebalancing.

## How It Works

| File                                       | Role                                                                                                   |
|--------------------------------------------|--------------------------------------------------------------------------------------------------------|
| `scripts/simulation/simulate.sim.js`       | Entry: reads the options, mocks analytics, audio, storage and `t()` like the state tests, runs every bot on every seed, prints and saves the report |
| `scripts/simulation/harness.js`            | `runGame({profile, seed, maxSeconds, step, scaling})`: one game (`scaling` false keeps the fixed challenge values) |
| `scripts/simulation/seeded_random.js`      | `createSeededRandom(seed)` (mulberry32)                                                                |
| `scripts/simulation/run_recorder.js`       | `RunRecorder`: watches a game and keeps what the report needs                                          |
| `scripts/simulation/report.js`             | Aggregates the runs, sanity check, done criteria, text tables and the reference snippet               |
| `scripts/simulation/bots/bot.js`           | `Bot`: the heuristic player                                                                            |
| `scripts/simulation/bots/bot_profiles.js`  | `WEAK_BOT`, `AVERAGE_BOT`, `STRONG_BOT`                                                                |
| `scripts/simulation/bots/*_planner.js`     | Economy, challenge and military helpers of the bot                                                     |

**Game loop** — each run starts a new game from the Camp (`createInitialColonyBasic()`, whatever `createInitialColony()` returns) with the tutorial not yet completed, so the tutorial popups fire and the bot closes them. Each step mirrors the game screen's catch-up loop: `state.update(step)`, `state.checkTutorial()`, then `state.advanceProgress(step)` (season, construction, research, challenges, events, raids). While the game is paused the bot closes the blocking window (tutorial popup, challenge reward or failure, raid result) without game time passing. Between steps the bot decides every `decisionInterval` game seconds. The past event list is cleared every 10 game minutes (it only grows). A run ends at the win screen or at the time cap.

**Randomness** — `Math.random` is replaced by a seeded stream during a run and restored afterwards; the bot has its own stream (seed + offset), so its skipped decisions never shift the engine's raid and punishment rolls.

**Engine hooks** — `State.advanceProgress(delta)` (the progress order, also used by the game screen), `State.unlockedBuildings` (the HQ building unlocks), `State.challengeScaling` (how the engine scaled the challenge as its countdown started: scales, mood, backstop flag; not saved) and `colonyStats(state)` in `src/js/engine/colony_stats.js` (a plain snapshot: elapsed time, HQ tier and level, workers, stock and net rate per resource, storage cap, production value, faith rate, army, research count, building levels, religious levels, temple workers, house and storehouse levels, free territory, construction multiplier, unlocked resources and buildings). `productionValue` is the net production of the bounded resources weighted by `TRIBUTE_RESOURCE_VALUES`, counting only output that can still be stored: a resource at the storage cap adds no gain (a loss still counts).

## Bots

One `Bot` class, driven by a profile. It respects the HQ building unlocks and the hidden Disasters research category itself (the engine does not check them), reads the state the way the screen shows it (including the raid forecast) and never looks at upcoming challenge requirements: a challenge only exists for it once its countdown runs.

Each decision it recruits into free jobs, splits the workers, dismisses idle workers while food or wood runs at a loss, answers an announced raid, then walks a wish list in priority order:

1. **Food/wood** — farm or woodcutter levels when their workers cannot cover the upkeep.
2. **Population** — a house level when beds run short, and a producer level (where it wants workers most) when beds outnumber jobs or that producer is full while its resource is missing. It saves for these only while income covers them within 4 minutes, so ever pricier levels never hold back the rest.
3. **Challenge** (after its reaction delay) — religious levels (upgrading the HQ when the building is locked, expanding when the territory is full), temple and altar levels when faith comes too slowly (and the Settlement upgrade at Camp for the temple), producer and storehouse levels for resources, houses for workers. Up to half the workers move to the producers the countdown needs. Requirements already met, or still reachable in time, are held (not spent); the challenge's own levels may use held amounts.
4. **Storage** — a storehouse level when a resource nears the cap (or ahead of the next HQ costs). A cost that cannot fit in storage is always replaced by a storehouse level.
5. **Territory** — expand when few slots are free; upgrade the HQ tier when affordable.
6. **Economy** — build each unlocked producer once, altars up to a per-tier target, the market (strong).
7. **Research** — the next tier of the profile's chains.
8. **Military** — units (or military building levels) until the expected raid's forecast reaches the profile's ratio.

It starts every item it can pay for, up to a budget per decision. The first unaffordable item it saves for is held back from cheaper wishes once income covers it within a minute; HQ upgrades only respect the challenge hold. The costs of the first three unaffordable items steer the worker split.

When a raid is announced and the forecast is not good enough, it trains the units that raise the forecast most for their cost (adding a military building level when there is no room), pays to delay when the raid is 30 seconds away, and the strong bot calls it off when it cannot delay; otherwise it accepts the loss. The weak bot only calls a raid off when that costs at most a quarter of each resource in stock.

| Setting                         | Weak                                   | Average                                        | Strong                                           |
|---------------------------------|----------------------------------------|------------------------------------------------|--------------------------------------------------|
| Decision interval               | 20 s                                   | 5 s                                            | 2 s                                              |
| Reaction after countdown starts | 90 s                                   | 15 s                                           | 0 s                                              |
| Skipped decisions               | 20%                                    | none                                           | none                                             |
| Actions per decision            | 1                                      | 2                                              | 3                                                |
| Keeps requirements once met     | no                                     | yes                                            | yes                                              |
| Worker split                    | fixed 60/40 food/wood for upkeep, the rest evenly over the other workplaces | food/wood upkeep +10%, the rest in proportion to what it saves for, 15% temple, 10% academy | food/wood upkeep +5%, the rest to the bottleneck resource first, 15% temple, 15% academy |
| Storehouse                      | at the cap                             | at 80% of the cap                              | at 60%, and before the next HQ costs pass 75%    |
| HQ upgrade                      | needs 2× the cost in stock (or full storage) | when affordable                          | when affordable                                  |
| Expands territory at            | 1 free slot                            | 2 free slots                                   | 3 free slots                                     |
| House built at                  | 0 free beds                            | 2 free beds                                    | 5 free beds                                      |
| Altars per HQ tier              | 3                                      | 5                                              | 6                                                |
| Research                        | none                                   | one at a time: construction, food production, storage, habitation, faith, mining | two at a time, quickest first, every chain except disasters |
| Army                            | none; calls a raid off only when cheap | forecast ratio 1.05; delays when it would lose | forecast ratio 1.3; delays, then calls off        |
| Market                          | no                                     | no                                             | buys missing resources, sells resources at the cap |
| Blessing choice                 | first option                           | productivity blessing for its weakest resource | highest estimated value                          |

## Report

- **Runs per bot** — finished and did-not-finish runs, run length to the win screen (median, p10, p90), failures per run, most attempts on one challenge, challenges completed, HQ tier at the end, share of time in a food/wood shortage, the challenge where unfinished runs stopped, and raids won/lost/called off/delayed per run.
- **Challenges per bot** — runs that reached each challenge, attempts, first-try success, runs that completed it, median time from countdown start until the requirements were first met, median spare share (`1 − time to meet / timeout`), and how the engine scaled the countdowns: median amount scale (faith and resources), level scale (building levels and workers) and timer scale against the base values (kinds the challenge does not have are left out), attempts per mood (`M`erciful, `L`enient, `W`atchful, `S`tern, `D`emanding) and attempts where the backstop kicked in (a locked resource dropped, or values capped at what the colony can reach).
- **Progress at 30/60/90 minutes** — median HQ tier, research count, production value, workers and building levels.
- **Sanity check** — HQ tier, research and production value should order the bots weak < average < strong at each milestone.
- **Reference snippet** — for the average bot, the median `colonyStats` when each challenge first activates and when its countdown starts, printed as JavaScript to paste into `balancing.js` later. Not printed when scaling is off (`SIM_SCALING=0`): the reference must come from scaled runs.

Each attempt in the JSON also keeps its activation time, delay, countdown start, timeout, requirements, colony stats at activation and countdown start, the `scales`, `mood` and `backstop` the engine chose as the countdown started (null until then, or for a challenge without a definition), whether the requirements were met at the start, whether they still were at the end, the result and the blessing chosen.

## Baseline

Current `src/data/challenges.json`, no scaling (`SIM_SCALING=0 npm run simulate`). 20 seeds per bot (seeds 1–20), 5-hour cap, 1-second steps. Re-recorded once production value stopped counting output into full storage: only the production figures changed, and raids by at most 0.1 per run.

### Runs per bot

| Bot     | Finished | Failures/run | Max attempts | Challenges done (median) | End HQ tier | Time in shortage | Stopped at        | Raids won/lost/called off/delays per run |
|---------|----------|--------------|--------------|--------------------------|-------------|------------------|-------------------|------------------------------------------|
| weak    | 0 / 20   | 26.6         | 25           | 4                        | Town        | 32%              | #5 ×11, #8 ×9     | 0 / 39.1 / 0.2 / 0                       |
| average | 0 / 20   | 24.0         | 24           | 7                        | City        | 0%               | #8 ×20            | 19.6 / 17.4 / 0 / 29.7                   |
| strong  | 0 / 20   | 22.0         | 14           | 9                        | City        | 6%               | #10 ×20           | 33.5 / 9.1 / 0.1 / 1.9                   |

No bot reaches the win screen, so there is no run length yet.

### Challenges

First-try success / runs that completed it / median spare share, and the median minute the first attempt activates:

| Challenge                | Weak                      | Average                   | Strong                    |
|--------------------------|---------------------------|---------------------------|---------------------------|
| 1 — altar 5              | 0% / 20 / 25% (0 m)       | 100% / 20 / 28% (0 m)     | 100% / 20 / 33% (0 m)     |
| 2 — faith 500            | 30% / 20 / 48% (22 m)     | 0% / 20 / 39% (5.5 m)     | 0% / 20 / 15% (5.5 m)     |
| 3 — temple 5             | 75% / 20 / 57% (33 m)     | 100% / 20 / 83% (16.5 m)  | 100% / 20 / 90% (16.5 m)  |
| 4 — faith 2000           | 100% / 20 / 81% (38.5 m)  | 100% / 20 / 75% (22 m)    | 100% / 20 / 42% (22 m)    |
| 5 — monument 5           | 25% / 9 / 15% (44 m)      | 100% / 20 / 79% (27.5 m)  | 100% / 20 / 57% (27.5 m)  |
| 6 — faith 3000           | 100% / 9 / 100% (59.5 m)  | 100% / 20 / 100% (38 m)   | 100% / 20 / 100% (38 m)   |
| 7 — resources, 20 workers | 0% / 9 / 49% (65 m)      | 100% / 20 / 100% (43.5 m) | 80% / 20 / 95% (43.5 m)   |
| 8 — faith 5000, altar 30, temple 15, resources | 0% / 0 / – (102 m) | 0% / 0 / – (54 m) | 0% / 20 / 52% (54 m) |
| 9 — faith 8000, monument 10, resources, 50 workers | – | – | 5% / 20 / 48% (180 m) |
| 10 — everything, 100 workers | –                     | –                         | 0% / 0 / – (201 m)        |

### Progress (medians)

| Bot     | Minute | HQ tier    | Research | Production value/s | Workers | Building levels |
|---------|--------|------------|----------|--------------------|---------|-----------------|
| weak    | 30     | Settlement | 0        | 12.5               | 120     | 48              |
| weak    | 60     | Town       | 0        | 13.7               | 120     | 55              |
| weak    | 90     | Town       | 0        | 6.1                | 50      | 39              |
| average | 30     | Town       | 5        | 19.5               | 130     | 77              |
| average | 60     | City       | 11       | 30.8               | 165     | 100             |
| average | 90     | City       | 14       | 43.4               | 180     | 114             |
| strong  | 30     | Town       | 8        | 28.2               | 130     | 76              |
| strong  | 60     | City       | 18       | 47.8               | 165     | 107             |
| strong  | 90     | City       | 25       | 63.1               | 165     | 128             |

### Sanity Check

HQ tier, research and production value order the bots weak < average < strong at 30, 60 and 90 minutes, so the sanity check passes. Production value first counted output flowing into full storage, and the order then held only at 90 minutes (weak 39.9 / 36.5 / 9.7, average 29.1 / 34.0 / 43.4, strong 29.5 / 47.8 / 63.1): the weak bot's fixed 60/40 split piles food at the cap (59–65% of its value early on). Worker counts converge around 120–130 at 30 minutes because house and producer levels cost 1.4× more per level.

### Where the Bots Get Stuck

- **Challenge 2 (faith 500)** starts at 5.5 minutes for the average and strong bots, still at Camp with no temple: it fails the first time in every run and passes on the retry, after the Settlement upgrade.
- **Weak, challenge 1 and 5** — with a 90-second reaction and one action per 20 seconds it fails the five altars almost every time (77 attempts over 20 runs). Challenge 5 (monument 5, Town) costs 10 building levels per failure; together with raids it lost with no army (39 per run), 11 of 20 runs never pass it, and the colony shrinks to a median 50 workers at 90 minutes.
- **Average, challenge 8** — altar 30 and temple 15 plus 5000 faith and stocks within 10 minutes: never met in 460 attempts.
- **Strong, challenges 8–10** — it passes 8 after about 12 attempts on average (at about 3 hours) and 9 after about two, then fails 10 every time. Each failure of challenge 10 removes 100 workers and 30 building levels: 13 of 20 strong runs end with 0 workers. A colony with no workers and less than 50 food can never recruit again, so those games are stuck for good.

### Bot Limitations

- The weak bot spends about a third of its time in a food or wood shortage, mostly late: lost raids and wildfire punishments shrink the woodcutter, and with wood at 0 it cannot buy the level back. A player would likely dismiss workers sooner; the bot only dismisses idle ones.
- Expected raids are sized from the engine's raid formula with an even split of the unlocked unit types (the real split is random); the forecast for an announced raid is the one the military window shows.
- Blessing values for the strong bot are rough estimates (production share × duration, stock value for raid protection, no value for Blessed Markets).
- Bots never downgrade buildings and never plan around upcoming challenges.
