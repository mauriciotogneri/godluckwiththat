# Testing

## Framework

- **Runner**: [Vitest](https://vitest.dev/) (`vitest ^4.1`)
- **Coverage**: `@vitest/coverage-v8`
- **Config**: `vitest.config.js` merges the Vite config so `@` path aliases resolve in tests

## Commands

| Command                 | Description                       |
|-------------------------|-----------------------------------|
| `npm test`              | Run all tests once                |
| `npm run test:watch`    | Run tests in watch mode           |
| `npm run test:coverage` | Run tests with v8 coverage report |
| `npm run simulate`      | Headless balance simulation (`docs/simulation.md`); not part of `npm test` |

## Test Scope

Tests cover the **engine layer**, **model layer** and **i18n layer** — pure JavaScript with no DOM or Vue dependency. The UI layer (Vue components) is not unit-tested.

### Engine (`tests/engine/`)

| File                | Covers                                                                                                                                            |
|---------------------|---------------------------------------------------------------------------------------------------------------------------------------------------|
| `analytics.test.js` | Firebase initialization (project config, localhost/127.0.0.1 exclusion, unsupported browser, failed init), `logGameStart`/`logTutorialComplete` event names and params, no events before `init`, logging failures swallowed |
| `enums.test.js`     | Core enum values match expected strings (resources, HQ types, seasons, buildings, trade, challenge status, symbols) plus one blessing and one punishment type; research, bonus, event, storage, tutorial and analytics enums are not checked |
| `format.test.js`    | `formatTime`, `formatNumber`, `formatNumberFull`, `formatMinutes`, `formatRate`                                                                   |
| `utils.test.js`     | `canAffordCost`, `floorWithTolerance`, `storageCapacity`, `marketFeePercent`, `marketTradeQuote`, `timerProgress`, `unitCounts`                   |
| `battle.test.js`    | `armyHealth`, `armyAttack`, `resolveBattle`: the worked examples from the military plan, every counter winning at equal numbers, mirror fights (ratio 1 is a defeat at severity 0), wall absorption (not raised by Defense research), tower attack with its counter bonus and no Attack bonus, tower health with no Defense bonus, a tower defending on its own, tower archers counted in the mix the raiders counter (with no wall, the first trained unit cannot turn a win into a loss), tower archers sharing losses without dying, research applying to the colony only, defeat severity and its scaled losses, victory loss rounding and caps, empty enemy |
| `balancing.test.js` | `BUILDING_UPGRADES` keys/values, season multiplier ranges, trade fee ranges, `RESEARCH_TIER_COSTS` (5 `Cost`s, rising knowledge, resource pair per tier), `RESEARCH_SUBCATEGORY_COST_MULTIPLIERS` (every subcategory, positive), `RESEARCH_TIME_MULTIPLIER` ≥ 1, `RESEARCH_SUBCATEGORY_BONUSES` shown as whole numbers, sanity checks on the military constants (unit stats and costs, raid timing and size, defeat maximums, tribute values and prices) |
| `escape_stack.test.js` | Only the most recently pushed handler receives Escape and stops the event, Escape returns to the previous handler on removal (top or lower), other keys ignored, a single window listener attached while handlers exist, unknown removals ignored |
| `focus_stack.test.js` | Everything outside the topmost modal marked inert (not the modal or its ancestors, stopping at `<body>`), stacked and nested modals, removal order, elements added after opening marked too, focus returned to the previously focused element when the top modal closes, only its own marks cleared |
| `storage.test.js`   | `autosaveInterval` read validation: default when missing or not a number, clamped to the allowed range, valid values kept, default when storage throws |
| `constants.test.js` | `BUILDING_CLASS_MAP` keys/values, consistency with `BUILDING_UPGRADES`, `RESEARCH_COSTS` (a `Cost` for exactly the `RESEARCH_TREE` keys, knowledge rising within each chain, tier cost × price band), `RESEARCH_PREREQUISITES` (previous tier per chain, no entry for tier 1), factory functions (`createInitialColony`, `createInitialColonyBasic`, `createInitialColonyAdvanced` incl. an empty `Military`, `createInitialMeta`, `createInitialChallenges` incl. punishment field defaults when absent in `challenges.json`), the Temporary Peace and Celestial Fortification blessings in `challenges.json`, `UNIT_TYPES` / `UNIT_BUILDINGS` / `UNIT_COUNTERS`, `TUTORIAL_STEPS` `upgradeCamp` check function |
| `state.test.js`     | Game state machine (60 describe blocks, 418 tests): `constructor`, tick logic (`update`), `netProduction`, `expansionCost`, `unlockedBuildings` (per HQ tier), `advanceProgress` (call order), `advanceSeason`, `advanceConstruction`, `advanceResearch` and `advanceEvents` (incl. research and its event pausing at academy level 0 after a downgrade, punishment or lost raid, and resuming on rebuild or after a reload), `advanceChallenges`, `areChallengeRequirementsMet`, `selectBlessing`, `acknowledgePunishment`, `continueAfterWin`, `levelUpBuilding`, `recruitWorker`, `dismissWorkers`, `assignWorkers`, `unassignWorkers`, `startResearch`, `executeTrade`, `checkTutorial`, `expandTerritory`, `upgradeHeadquarters`, `downgradeBuilding`, serialization (`toJSON`/`fromJSON`), internal computations (`_computeGeneralProductivity`, `_computeSeasonMultipliers`, `_computeConsumptionRates`, `_computeProductionRates`, `_resolveChallengeTimeout`, `_deductRequirements`, `_completeChallenge`, `_failChallenge`, `_sacrificeWorkers`, `_advanceEffectTimeouts`, `_applyBlessing`, `_applyPunishment`, `_constructionDurationMult`, `_recruit`, `_triggerTutorialModal`, `_playAssignSound`, `_buildingName`); military: `buyUnits`, `dismissUnits`, upkeep with an army (incl. the shortage penalty), `advanceRaids` (no raids at Camp, grace period, interval scaling, announcement event/sound/popup, Warning research, Temporary Peace freezing, the challenge truce holding back the next raid during a retry or merciful countdown, raid event kept in sync and sorted), `_generateRaidArmy`, `_generateTributeDemand`, `_resolveRaid` (victory and defeat effects, Celestial Fortification, pause and report, past event, `raidCount`), `_raidForecast`, `_raidDefender`, `payTribute`, `acknowledgeRaid`, `_removeResourceShare`, `_downgradeRandomBuildings`, `_sacrificeWorkers` return value, saving the army and raid report and re-pausing on load |
| `colony_stats.test.js` | `colonyStats` on the real Camp start: every field of a new colony, elapsed time across years and seasons, HQ tier and unlocked resources, population, storage cap with Storage research, net rates and tribute-weighted production value (also without the active blessings), altar faith rate, army units with tower archers, research and building levels, construction multiplier, free territory with bonus and constructions, no changes to the state |

### Models (`tests/models/`)

| File                 | Covers                                                                    |
|----------------------|---------------------------------------------------------------------------|
| `colony.test.js`     | Constructor (default `Military`), `idleWorkers`, `fromJSON`/`toJSON` round-trip incl. military |
| `military.test.js`   | Constructor defaults, `totalUnits`, `fromJSON` (missing data, raid restored as `Raid`), `toJSON`, round-trip |
| `raid.test.js`       | Constructor defaults, `enemyCount`, `delayCost` growth, `cancelCost`, `canDelay` (false after 3 delays), `advance` clamping, `toJSON`, round-trip |
| `raid_report.test.js`| Constructor defaults, round-trip                                          |
| `buildings.test.js`  | `totalLevels`, `totalAssignedWorkers`, `pendingTerritory`, serialization  |
| `resources.test.js`  | Constructor defaults, `canAfford`, `deduct`, `toJSON`                     |
| `cost.test.js`       | Constructor defaults, `entries` (caching), `multiplyFloor`, `toSeconds`   |
| `season.test.js`     | `isWarm`/`isCold`, `advance` (flipping, carry-over), serialization        |
| `blessing.test.js`   | Constructor, optional fields, `fromJSON`/`toJSON`                         |
| `punishment.test.js` | Constructor, serialization                                                |
| `challenge.test.js`  | Constructor, `isDelayElapsed`, `isTimeoutElapsed`, `reset`, serialization |
| `challenges.test.js` | `totalCount`, `allCompleted`, `activate`, `start`, `complete`, `fail`, `advance`, serialization |
| `meta.test.js`       | Constructor, `gameSpeed` defaults, `fromJSON`/`toJSON` round-trip         |
| `tutorial.test.js`   | Constructor defaults, `isActive`, `dismissedModals` serialization         |
| `production.test.js` | Constructor defaults and overrides                                        |
| `consumption.test.js`| Constructor defaults and overrides                                        |
| `serialization.test.js` | Robustness: missing fields, extra fields, null/undefined inputs for all model classes (Blessing, Punishment, Challenge, Challenges, Tutorial, Resources, Season, Meta, Buildings, Headquarters, Market, Production, Consumption, Events, EventFuture, EventPast, Colony, Military, Raid, RaidReport) |

### Buildings (`tests/models/buildings/`)

Every building class has its own test file. Tests verify:

- **`levelUpCost`** (every file): returns a `Cost` instance, matches the `baseCost * multiplier ^ level` formula from `balancing.js`, increases with level. The buildings with no logic of their own test only this
- **Building-specific getters/methods**: e.g. `storageCap`, `populationCap`, `maxWorkers`, `effectiveTradeFee`, `executeTrade`, `upgradeCost`, `nextType`, `isUpgrading`, `territoryCap`, `unitCap` (barracks, archery, stable), `absorb` (wall), `archers` (tower)
- **Serialization**: `toJSON` output (`toEqual`), only in `building`, `producer`, `headquarters`, `market` and `academy`

Notable depth by file:

- `building.test.js` / `producer.test.js` — base classes: `isUnbuilt`, `isConstructing`, `levelUp`, `advance` (construction tick), worker fields (`maxWorkers`, `isEmpty`, `isFull`)
- `headquarters.test.js` — `isUpgrading`, `isMaxType`, `territoryCap`, `levelUpCost`, `upgradeCost`, `nextType`, `upgradeType`, `advanceUpgrade`, `toJSON`
- `market.test.js` — constructor (price overrides, fallback for non-finite saved prices, clamping to trading bounds), `effectiveTradeFee`, `executeTrade` (buy/sell success, rejection conditions, price clamping, multi-unit trades, per-lot price shifts, `blessedMarkets` bypass, rounding edge cases, no profitable round trips or split trades), `toJSON`
- `academy.test.js` — `Research` inner class (`constructor`, `advance`), `Academy` constructor (completed/active restoration), `isCompleted`, `isActive`, `canResearch` (incl. tier prerequisites), `isResearchPaused`, `start`, `complete`, `completedBonuses` (aggregation, caching), `toJSON`
- `storehouse.test.js` — `storageCap` (base, level scaling, bonus, floor), `levelUpCost`
- `house.test.js` — `populationCap` (base, bonus, unbuilt), `levelUpCost`

### Events (`tests/models/events/`)

| File                   | Covers                                               |
|------------------------|------------------------------------------------------|
| `event.test.js`        | Constructor, required/optional fields, serialization |
| `event_future.test.js` | Constructor, `remainingSeconds`, `advance` (decrement, clamp), `toJSON` |
| `event_past.test.js`   | Constructor, inherits Event fields                                      |
| `events.test.js`       | `addFuture`, `addPast`, `convertToPast`, `dismissFutureByType`/`ByBuildingKey`/`ByResearchKey`, `dismiss`, `hasPastEvent`, `dismissPastByType`/`ByTextKey`, `dismissAllPast`, `advance`, `setFutureRemaining`, `setFutureRemainingByResearchKey`, `sortedFuture`/`sortedPast`, serialization |

### i18n (`tests/i18n/`)

| File                | Covers                                                                                                   |
|---------------------|----------------------------------------------------------------------------------------------------------|
| `localized.test.js`   | Language resolution (browser language, region suffix, fallback to English), `t()` parameter substitution |
| `locale_keys.test.js` | Key consistency across all locale files: every non-en locale has all en keys, no extra keys, no empty strings, all values are strings |

## What Is Not Tested

| Area                           | Reason                                                                                                              |
|--------------------------------|---------------------------------------------------------------------------------------------------------------------|
| Vue components (`.vue` files)  | UI is thin — rendering, props, emits. Logic lives in models/engine. No component test setup (no `@vue/test-utils`). |
| `assets.js`                    | Auto-generated file (`npm run generate-assets`). Excluded from coverage.                                            |
| `audio.js`                     | Browser Audio API wrapper. Mocked in tests that depend on it. Excluded from coverage.                               |
| `main.js`                      | App bootstrap (analytics init, Vue mount). The game loop lives in `game_screen.vue`. Excluded from coverage.        |
| `storage.js`                   | `localStorage` wrapper. Mocked in tests that depend on it. Excluded from coverage. Only `autosaveInterval` read validation is tested (`storage.test.js`). |
| Locale files (`i18n/*.js`)     | Static key-value data. Key consistency validated by `locale_keys.test.js`. Excluded from coverage.                  |
| E2E / integration              | No browser-level tests. Game is manually tested in the browser.                                                     |

## Coverage

Coverage is collected with the `v8` provider and reported as `text` (terminal) and `html` (browsable report in `coverage/`).

**Included**: all files under `src/js/**/*.js`.

**Excluded** (in `vitest.config.js`):
- `src/js/engine/assets.js`
- `src/js/engine/audio.js`
- `src/js/engine/main.js`
- `src/js/engine/storage.js`
- `src/js/i18n/ca.js`, `en.js`, `es.js`, `fr.js`, `it.js` (locale data files; `localized.js` is covered)

## Test Patterns

### Factory Helpers (`tests/helpers/factories.js`)

Reusable factory functions (`createCost`, `createResources`, `createSeason`, `createBuilding`, `createProducer`, `createHeadquarters`, `createBlessing`, `createPunishment`, `createChallenge`, `createChallenges`, `createTutorial`, `createRaid`, `createMilitary`) provide sensible defaults with an `overrides` parameter for per-test customization.

### Building Keys (`tests/helpers/building_keys.js`)

Exports `VALID_BUILDING_KEYS` — a `Set` of all 19 `BUILDING_*` enum values. Used by `balancing.test.js` and `constants.test.js` to validate that config objects contain exactly the expected building keys.

### Mocking

- **`localized.js`** is mocked to return raw keys (`t: (key) => key`) so tests do not depend on translation content.
- **`analytics.js`** is mocked with `vi.fn()` stubs (`logTutorialComplete`) in state tests; `analytics.test.js` mocks `firebase/app` and `firebase/analytics` instead and stubs `window.location`.
- **`audio.js`** is mocked with `vi.fn()` stubs (`playSound`) so tests run without browser audio (`HTMLAudioElement`).
- **`storage.js`** is mocked with default values in `state.test.js` so it runs without `localStorage`; `storage.test.js` imports the real module and stubs `window.localStorage` via `vi.stubGlobal`.
- Browser globals (`navigator.language`, `document.documentElement`) are stubbed via `vi.stubGlobal` in i18n tests.
- `vi.resetModules()` is used in i18n, analytics and constants tests to re-evaluate module-level side effects (or apply a `vi.doMock`) between test cases.

### Setup File (`tests/helpers/setup.js`)

Pre-imports `balancing.js` to establish the correct module load order. `balancing.js` calls `new Cost()` at module scope; importing it first ensures `cost.js` receives a live binding for `RESOURCE_TIME_WEIGHTS` before `Cost` is instantiated.

### Conventions

- **File naming**: `<source_file>.test.js`, mirroring the `src/` directory structure under `tests/`. Cross-cutting suites (`serialization.test.js`, `locale_keys.test.js`) have no source counterpart.
- **Describe blocks**: top-level `describe` matches the class name (or the module/function name for engine files without a class); nested `describe` blocks match the method or getter name.
- **Assertions**: prefer `toBe` for primitives, `toBeInstanceOf` for type checks, `toEqual` for deep equality, `toBeGreaterThan` for ordering.
- **Serialization round-trips**: most model tests include a `fromJSON`/`toJSON` block that serializes and reconstructs, then asserts key fields are preserved.
