# Research System

A tech tree system where players spend Knowledge + resources + time to unlock passive bonuses. Accessed via the Academy card, which opens a tabbed modal. Full details in `docs/specs.md` (Research) and `docs/architecture.md` (Research System).

## Design

- **5 categories** (tabs, in this order): Colony, Resources, Religion, Military, Disasters
- **18 subcategories**, each a linear chain of 5 tiers (90 researches)
- **Cost**: Knowledge + two other resources (paid upfront when starting). Tiers climb the resource ladder: T1 food + wood, T2 wood + stone, T3 stone + copper, T4 copper + iron, T5 iron + gold. Each chain pays the tier's base cost times its price band: cheap ×0.75, standard ×1, premium ×1.5
- **Duration**: `cost.toSeconds × 4` (the building formula, scaled for research). Construction bonuses do not affect it
- **Parallelism**: Unlimited concurrent researches (one per chain)
- **Prerequisites**: Linear within subcategory only (level N requires level N-1)
- **Gating**: Requires Academy to be built (level >= 1)
- **Progress**: Active researches appear as future events with countdown
- **Bonuses**: Additive per completed tier, cached and recomputed only when a research completes

### Categories & Subcategories

- **Colony** — Transportation, Construction, Expansion, Storage, Habitation
  - +3%/tier worker productivity (bounded resources only), -10%/tier construction time, -8%/tier territory expansion cost, +10%/tier storage capacity, +1/tier population per house level
- **Resources** — Food prod., Food cons., Wood prod., Wood cons., Mining, Knowledge
  - +/-5%/tier production/consumption rates, +10%/tier knowledge production
- **Religion** — Faith
  - +5%/tier faith production
- **Military** — Defense, Attack, Warning
  - +10%/tier unit defense, +10%/tier unit attack, +10%/tier warning time
- **Disasters** — Floods, Health, Earthquakes
  - -10%/tier flood/disease/earthquake impact

## Status

### Done

- **Phase 1** — Data model, tech tree, research modal, i18n (en, es, fr, it, ca)
- **Phase 2** — Start, pay, timer, future events, completion, tier prerequisites
- **Phase 3** — 12 of 18 bonuses applied to game systems:
  - Colony: Transportation, Construction, Expansion, Storage, Habitation
  - Resources: Food prod., Food cons., Wood prod., Wood cons., Mining, Knowledge
  - Religion: Faith
- **Balancing** (first pass; tune by playtest) — tier base costs × per-chain price bands, research durations ×4, new Transportation, Expansion, Storage and Knowledge bonus sizes
- **Phase 4** — Modal polish (status colors, checkmarks, countdown, cost tooltips, accumulated bonus per chain, help modal) and documentation in `docs/specs.md` and `docs/architecture.md`
- **Node visuals** — a gold progress fill on active nodes, replacing the pulse. Per-research icons were tried and dropped

### Deferred

Blocked on unbuilt game systems (disasters, military). These researches can already be bought but have no effect (see [military.md](./military.md) and [disasters.md](./disasters.md)).

| Category  | Subcategory | Bonus                      | Blocked on              |
|-----------|-------------|----------------------------|-------------------------|
| Disasters | Floods      | `BONUS_FLOOD_IMPACT`       | Disaster system         |
| Disasters | Health      | `BONUS_DISEASE_IMPACT`     | Disaster system         |
| Disasters | Earthquakes | `BONUS_EARTHQUAKE_IMPACT`  | Disaster system         |
| Military  | Defense     | `BONUS_UNIT_DEFENSE`       | Combat system           |
| Military  | Attack      | `BONUS_UNIT_ATTACK`        | Combat system           |
| Military  | Warning     | `BONUS_WARNING_TIME`       | Raid warning system     |

### TODO

- Decide what happens to active researches when the Academy is downgraded to level 0 — today they keep running and complete
