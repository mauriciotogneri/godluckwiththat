### [a/boundary-and-encoding-cases/localization/no-singular-form-for-counted-losses] "Lose 1 workers" and "1 building levels"

- **Location:** `src/js/i18n/en.js:313-314, 636-637` (`military.workerLoss`, `military.levelLoss`, `punishment.workerLoss`, `punishment.buildingLoss`), with the same keys in `ca.js`, `es.js`, `fr.js` and `it.js`. Callers: `src/components/modals/challenge_failure_modal.vue:67-72`, `src/components/modals/military_modal.vue:320-321`.
- **Severity:** Low
- **Confidence:** High
- **Likelihood:** Medium. Small losses of exactly 1 are common for early challenges and small raid defeats.
- **Defect:** The strings are fixed plurals (`'Lose {0} workers'`, `'{0} building levels'`) and `t()` has no plural support. A loss of exactly 1 renders grammatically wrong text in all five languages. Only `time.minute`/`time.minutes` is special-cased, in `formatMinutes`.
- **Trigger:** A punishment or battle forecast whose scaled worker or level loss rounds to 1 (the callers render for any truthy or `> 0` value).
- **Evidence / verification:** Read the strings and both call sites. The `v-if` guards pass for 1, and the scaled losses are `Math.round` or `Math.min` results that can equal 1. Refutation attempt: looked for a singular key or plural helper and found none.
- **Suggested fix:** Add singular keys and pick the key by count, as `formatMinutes` does.

### [b/resource-and-configuration-parity/localization/french-templates-lack-elision] French event rows read "Construction de écurie"

- **Location:** `src/js/i18n/fr.js:261-262, 265` (`event.buildingBuilding`, `event.buildingUpgrading`, `event.researchInProgress`). Related: `src/js/engine/state.js:1472` (parameter is `name.toLowerCase()`).
- **Severity:** Low
- **Confidence:** High
- **Likelihood:** Medium. It occurs for every French player who builds or upgrades the Académie, Entrepôt, Autel, Archerie or Écurie, or researches a topic that starts with a vowel.
- **Defect:** The templates are a fixed `'Construction de {0}'`, `'Amélioration de {0}'` and `'Recherche de {0}'`, and the parameter is only lowercased. A name starting with a vowel gives "Construction de écurie" instead of "d'écurie".
- **Trigger:** A French browser starts a build, upgrade or research whose name starts with a vowel or silent h.
- **Evidence / verification:** Read the templates and the parameter construction. No elision logic exists anywhere. Refutation attempt: none found, the template is fixed.
- **Suggested fix:** Reword the French templates so no elision is needed (for example "Construction : {0}").

### [d/mixed-version-operation/events/removed-building-leaves-stuck-event-row] A removed Workshop leaves a permanent "Upcoming" row

- **Location:** `src/js/models/buildings.js:154-167` (`fromJSON` skips unknown keys). Related: `src/js/models/events/events.js:262-276`, `src/js/engine/state.js:688-703` (`advanceEvents`) and `:98-105` (`_constructingKeys`), `src/js/engine/state.js:1964-1990` (`_relocalizeFutureEvents`).
- **Severity:** Low
- **Confidence:** Medium
- **Likelihood:** Low. It needs a 0.12.x save written while a Workshop was under construction. The Workshop needed City headquarters level.
- **Defect:** Commit `b41d5591` removed the Workshop. `Buildings.fromJSON` silently drops the saved `workshop` entry, so it never appears in `_constructingKeys` and never completes. The saved future event for it (`buildingKey: 'workshop'`) is restored unchanged. Future events are removed only when a building completes or is cancelled (`dismissFutureByBuildingKey`), and the UI has no dismiss button for them. The row stays at 00:00 forever and is saved again on every save. `_relocalizeFutureEvents` skips it because its name has no translation.
- **Trigger:** Load a 0.12.x save with a Workshop under construction.
- **Evidence / verification:** Read each cited function. `Events.fromJSON` pushes every entry without validation and `advance` only decrements timers. Refutation attempt: looked for pruning in `advanceEvents`, `State.fromJSON` and `Events`; none exists. The icon for it is also a deleted file. Remaining assumption: such a save exists.
- **Suggested fix:** On load, drop future events whose `buildingKey` is not in the building class map (or whose building is not actually constructing), and reconcile research events against the academy's active research.
