# Specs

This document contains the specifications of the game, divided into sections.

Items marked *(planned)* are designed but not implemented yet. Their design lives in [todo/military.md](../todo/military.md), [todo/port.md](../todo/port.md) and [todo/disasters.md](../todo/disasters.md).

## History

- After a shipwreck, you and your tribe find yourselves in an unknown island
- You discover an ancient portal that, upon touch, summons the gods
- They tell you that this portal is the only way to get back home
- And the gods are the only ones that can activate it
- But in order for the gods to do that, you have to prove your faith
- They will send you a series of challenges
  - If you complete a challenge, you will be blessed
  - If you fail a challenge, you will be punished
  - Only when you complete all challenges you will prove your faith
- Type of challenges
  - Build altars
  - Build temples
  - Build monuments
  - Accumulate faith
  - Offer tributes
    - Rituals (resources and people)
    - Recover relic (send military away) *(planned — see [military](../todo/military.md))*
- The first new game on a device opens with a story intro screen telling this history (shipwreck, portal, gods, ten challenges), shown once

## Colony

The colony is where the game takes place. It is where you will build your buildings, produce resources, assign workers, and perform research.

- The colony type is a separate upgrade from the HQ level
  - It changes the visual representation of the colony
  - Each colony upgrade also unlocks buildings that previously couldn't be built
  - Colony types, in order:
    - Camp → unlocks: House, Altar, Farm, Woodcutter
    - Settlement → unlocks: Storehouse, Temple, Quarry, Barracks
    - Village → unlocks: Academy, Copper Mine, Archery
    - Town → unlocks: Monument, Iron Mine, Stable, Wall
    - City → unlocks: Market, Gold Mine, Tower
  - Each colony upgrade also unlocks resources visible in the header bar:
    - Camp: Food, Wood, Faith
    - Settlement: Stone
    - Village: Knowledge, Copper
    - Town: Iron
    - City: Gold

- The colony can be improved by spending resources on
  - Buildings
  - Researches
  - Military
  - Challenges

## Starting State

A new game starts with:

- Headquarters: Camp, level 1
- All other buildings at level 0
- 250 food, 100 wood, everything else at 0 (including workers)
- Warm season, year 1
- Game speed 1x

With 0 workers nothing is produced, so the first step is to recruit workers and assign them.

## Years & Seasons

The game tracks time in years. A year consists of one warm season followed by one cold season. Years start at 1 and increment each time a cold season ends and a new warm season begins.

The game cycles over two seasons: warm and cold. Each season has different characteristics that affect the colony in different ways. The season changes every certain amount of time.

- Warm
  - Food production is increased by 20%
  - Wood consumption is decreased by 20%
- Cold
  - Food production is decreased by 20%
  - Wood consumption is increased by 20%

Seasonal modifiers are added to the research, blessing and punishment modifiers, not multiplied with them. For example, in the warm season with +10% Food Production research, food production is `base × (1 + 0.1 + 0.2)` = +30%.

## Resources

There are two types of resources

### Regular

Regular resources are capped by the storage capacity (see Storehouse). Any of them can be required as an offering by a challenge.

- Food
  - Produced in
    - Farms
  - Consumed to
    - Create workers
    - Expand HQ territory
    - Maintain population alive
    - Perform research
    - Sell at the market
    - Train infantry and cavalry
    - Feed military units (upkeep)
    - Pay raid tribute
- Wood
  - Produced in
    - Woodcutters
  - Consumed to
    - Construct buildings (including HQ territory expansion and type upgrades)
    - Maintain population alive
    - Perform research
    - Sell at the market
    - Train infantry and archers
    - Supply military units (upkeep)
    - Pay raid tribute
- Stone
  - Produced in
    - Quarries
  - Consumed to
    - Construct buildings (including HQ type upgrades)
    - Perform research
    - Sell at the market
    - Pay raid tribute
- Copper
  - Produced in
    - Copper mines
  - Consumed to
    - Upgrade the HQ type
    - Perform research
    - Sell at the market
    - Train archers
    - Pay raid tribute
- Iron
  - Produced in
    - Iron mines
  - Consumed to
    - Upgrade the HQ type
    - Perform research
    - Sell at the market
    - Train cavalry
    - Pay raid tribute
- Gold
  - Produced in
    - Gold mines
    - Market (selling resources)
  - Consumed to
    - Perform research
    - Buy resources at the market
    - Pay raid tribute

### Special

- Territory
  - Each building level occupies one territory slot (e.g. a level 3 building occupies 3 slots total)
  - Produced in
    - Headquarters
  - Consumed to
    - Construct and upgrade buildings
  - When territory is full and expanding is impossible (the largest single resource in the expansion cost exceeds storage capacity), certain buildings (farm, woodcutter, quarry, mines, academy, temple, market, altar) can be downgraded by 1 level to free a slot. Downgrading is free, instant, and returns excess workers to idle. Downgrading the academy to level 0 pauses its running research (see Research)
- Workers
  - Recruited by spending 50 food each
    - There is no separate recruit action: assigning a worker to a building when no worker is idle recruits one automatically, as long as there is enough food and the population cap allows it
  - The maximum population is determined by the house level
  - With 0 workers, nothing is produced (including the Altar's passive faith)
  - All workers (idle and assigned) consume food and wood each tick
    - If resources are insufficient, they are clamped to 0
    - Shortage penalty: when food or wood has negative net production, all production rates are reduced proportionally to the deficit ratio (uncovered consumption / total consumption), up to 100%. If both are negative, only the worst penalty applies. The penalty starts on the tick after the net production first turns negative
  - Consumed to
    - Assigned to buildings to produce resources
  - A worker that is not assigned to any building is considered idle
    - Idle workers don't produce anything, making them detrimental
  - Idle workers can be permanently dismissed (removed from the colony) to reduce consumption
- Knowledge
  - Not limited by storage capacity
  - Produced in
    - Academies
  - Consumed to
    - Perform research
- Faith
  - Not limited by storage capacity
  - Produced in
    - Altars
    - Temples
  - Granted as a one-time boost by
    - Monuments (per level upgrade)
  - Consumed to
    - Complete challenges

## Buildings

Each building has a level that can be increased by spending resources. Building and upgrading takes time — resources are deducted immediately when construction starts, but the level increments only after a construction timer expires. Build time is derived from the upgrade cost via `Cost.toSeconds`, which sums each resource amount multiplied by its time weight (defined in `RESOURCE_TIME_WEIGHTS`), then raises the total to a sub-linear exponent (`RESOURCE_TIME_EXPONENT`). During construction, buildings continue producing at their current level. Territory is reserved immediately for buildings under construction.

- Headquarters
  - Each type upgrade unlocks new buildings (see Colony types above)
    - Type upgrades cost wood, stone, copper and iron (`HQ_UPGRADE_COSTS`)
  - Increases the maximum amount of territory slots
    - Territory expansion (level up) costs food and wood
    - Expansion research lowers the expansion cost and, since build time is derived from the cost, also shortens it
  - Territory expansion and type upgrade cannot run at the same time
  - Construction research and the Rapid Construction blessing shorten both territory expansion and type upgrades
  - Workers cannot be assigned to this building
  - The higher the level, the more territory it provides
- House
  - Determines the maximum population (workers) the colony can have
  - Workers are recruited by spending food, up to the population limit
  - Idle workers can be dismissed to permanently reduce population
  - Workers cannot be assigned to this building
  - The higher the level, the higher the population cap
- Academy
  - Produces knowledge
  - The higher the level
    - The more workers it can have assigned
    - The more knowledge it produces
- Storehouse
  - Increases the maximum amount of resources that can be stored
    - Applies to food, wood, stone, copper, iron and gold. Knowledge and faith are uncapped
  - Workers cannot be assigned to this building
  - The higher the level, the more resources it can store
- Market
  - Allows trading Food, Wood, Stone, Copper, and Iron for Gold (buy or sell in lots of 100)
  - Trading requires the Market at level ≥ 1. Each trade must be a multiple of 100
  - The trade-size selector offers 100, 1000, 10000… up to the storage cap. The chosen size is remembered between sessions
  - A buy is refused if it would push the resource over the storage cap. A sell is refused if the gold received would push gold over the storage cap
  - Base gold prices per 100: Food=100, Wood=110, Stone=120, Copper=130, Iron=140
  - Default 30% trade fee, applied once to the summed lot prices: buy costs `lot prices × 1.30`, sell returns `lot prices × 0.70` (rounded down). Buying 100 food at price 100 costs 133; selling it returns 67
  - Each lot of 100 bought raises the resource price by 3 gold; each lot sold lowers it by 3 gold (AoE2-style)
  - Each lot trades at its shifted price: buying 100 food at price 100 costs 103 (before fee), selling at 100 returns 97. Bulk trades are priced lot by lot (buying 1000 food at 100 costs 103 + 106 + … + 130 = 1165 before fee), so buy/sell round trips and split trades always lose gold, even at 0% fee
  - Price floor: minimum 20 gold (sell floor ~14 gold at max fee). Price cap: 9999
  - Workers cannot be assigned to this building
  - The higher the level, the cheaper the trades (-1% fee per level above 1: 30% at level 1, 29% at level 2…)
  - Minimum fee: 5% (reached at level 26)
- Altar
  - Produces a fixed amount of faith per second per level, without workers assigned (but only while the colony has at least 1 worker)
  - Workers cannot be assigned to this building
  - Produces low amounts of faith
- Temple
  - Workers can be assigned/unassigned to pray
  - Produces medium amounts of faith
- Monument
  - Each level grants a one-time fixed amount of faith (not produced per second)
  - Workers cannot be assigned to this building
  - Some challenges require increasing its level
- Farm
  - Produces food
  - The higher the level
    - The more workers it can have assigned
    - The more resources it produces
- Woodcutter
  - Produces wood
  - The higher the level
    - The more workers it can have assigned
    - The more resources it produces
- Quarry
  - Produces stone
  - The higher the level
    - The more workers it can have assigned
    - The more resources it produces
- Copper Mine
  - Produces copper
  - The higher the level
    - The more workers it can have assigned
    - The more resources it produces
- Iron Mine
  - Produces iron
  - The higher the level
    - The more workers it can have assigned
    - The more resources it produces
- Gold Mine
  - Produces gold
  - The higher the level
    - The more workers it can have assigned
    - The more resources it produces
- Barracks
  - Trains infantry (see Military)
  - The higher the level, the more infantry the colony can have (5 per level)
  - Workers cannot be assigned to this building
- Archery
  - Trains archers (see Military)
  - The higher the level, the more archers the colony can have (5 per level)
  - Workers cannot be assigned to this building
- Stable
  - Trains cavalry (see Military)
  - The higher the level, the more cavalry the colony can have (5 per level)
  - Workers cannot be assigned to this building
- Wall
  - In a raid, absorbs damage before units take losses (100 per level). It is never damaged
  - Workers cannot be assigned to this building
- Tower
  - In a raid, fights as a fixed number of archers (3 per level) that share the hits with the units but never die and get no research bonus. A tower alone can defend
  - Workers cannot be assigned to this building

The five military buildings are not in the downgradable list: punishments, raids and manual downgrades skip them, so the territory they take cannot be freed and unit caps never shrink.

## Military

Raiders from other tribes attack the colony once it grows past a camp. The colony trains an army and builds defenses to repel them, or pays them off. All values below are starting values in `src/js/engine/balancing.js`.

### Units

| Unit | Trained at | Unlocked at | Strong against | Attack | Health | Cost | Upkeep per second |
|---|---|---|---|---|---|---|---|
| Infantry | Barracks | Settlement | Cavalry | 10 | 30 | 40 food, 20 wood | 0.1 food, 0.05 wood |
| Archers | Archery | Village | Infantry | 15 | 20 | 40 wood, 20 copper | 0.1 food, 0.1 wood |
| Cavalry | Stable | Town | Archers | 12 | 30 | 60 food, 25 iron | 0.2 food, 0.05 wood |

- Units are bought instantly and do not use population. Each type is capped at its building's level × 5 (an unbuilt building gives a cap of 0)
- Buying is blocked at the cap or when the colony cannot afford the cost. Dismissing a unit refunds nothing. Ctrl+click buys or dismisses up to 10
- Upkeep is added to colony consumption with the same modifiers as worker upkeep: Food Consumption research lowers food upkeep; Wood Consumption research and the season change wood upkeep. A shortage triggers the usual shortage penalty; units never desert

### Raids

There is at most one raid at a time.

1. While the HQ is a camp, nothing happens. From Settlement on, a raid is scheduled on a hidden timer: the first one 300 s after reaching Settlement, later ones `max(240, 600 − 4 × territoryCap)` seconds after the previous raid ends (territory cap includes blessing bonus slots)
   - Truce: the hidden timer stands still while a challenge countdown runs that is a retry or has the merciful mood, so a struggling colony is not announced a new raid meanwhile. A raid already announced still arrives
2. When the timer ends the raid is announced: an "incoming" event appears under Upcoming (clicking it opens the military window), the alarm sounds, and the first announcement shows a tutorial popup. The raiders arrive after 120 s, lengthened by Warning research
3. Raiders: `floor(3 + 0.15 × territoryCap + 2 × (year − 1))` units, split at random among the unit types the colony can already train. Their exact numbers are shown
4. On arrival the battle is resolved at once, its losses are applied, a "Raid repelled" or "Raid lost" history entry is added, and a result window pauses the game until dismissed
5. Raids keep coming after the final challenge is won. Game speed applies to raid timers

### Battle

A one-step, deterministic strength comparison. The forecast in the military window uses the same calculation, so it always matches the result.

- Each side's power is attack × health (Lanchester square law). The colony's health adds the wall and the tower's archers; its attack adds the tower's archers
- A unit deals up to ×2 attack against the type it beats, scaled by that type's share of the opponent's army. The tower's archers count as archers in the colony's share, so raider cavalry gets its bonus against them
- Attack and Defense research raise unit attack and health by 10% per tier (not the tower or the wall). Raiders get no bonuses
- `ratio = sqrt(colony power / raider power)`. Above 1 is a victory
- **Victory**: the colony loses health `(1 − sqrt(1 − 1/ratio²)) × total health`. The wall absorbs it first; units and the tower's archers share the rest by health, and units lose their share in proportion to their numbers (the tower's archers never die). Nothing else is gained
- **Defeat**: the whole army is lost. With `severity = sqrt(1 − ratio²)` (0 near a tie, 1 with no defense), the colony also loses `severity × 30%` of each stored regular resource, `severity × 10%` of its workers (idle first) and `round(severity × 3)` building levels from the downgradable list (same rules as punishments). Faith and knowledge are never taken

Examples: 10 infantry beat 9 infantry and lose 6 (2 with a level 1 wall). 10 infantry beat 10 cavalry, 10 archers beat 10 infantry, 10 cavalry beat 10 archers. A level 1 tower alone beats 3 infantry. No units and no tower is a full defeat, with or without a wall.

### Tribute

When a raid is announced, it demands tribute worth 25 per raider, split evenly across 2–3 random regular resources the colony has unlocked (amounts weighted by resource value and rounded up to multiples of 5). Both prices are paid in full:

- **Delay**: adds 120 s to the countdown. Each delay costs ×1.5 the previous one; it stops being offered once it would cost more than cancelling (3 delays)
- **Cancel**: ×3 the base demand. The raid is called off ("Raid called off" in the history) and the next one is scheduled normally

### Military window

Opened from the military building cards and from the raid event. Shows the resource stock; the army (count/cap per type, train and dismiss buttons, cost, what each type beats, and total upkeep); the wall and tower effects; and, when a raid is announced, its countdown, the raiders, the forecast (expected victory or defeat, a strength bar and the expected losses) and the tribute options.

## Research

The research system allows the player to unlock permanent bonuses by spending knowledge and other resources at the Academy. Research is accessed via the Research modal in the game UI.

- Research is organized into 5 categories: Colony, Resources, Religion, Military, Disasters
  - Colony (5 subcategories × 5 tiers = 25 researches): Transportation, Construction, Expansion, Storage, Habitation
  - Resources (6 subcategories × 5 tiers = 30 researches): Food Production, Food Consumption, Wood Production, Wood Consumption, Mining, Knowledge Production
  - Religion (1 subcategory × 5 tiers = 5 researches): Faith
  - Military (3 subcategories × 5 tiers = 15 researches): Defense, Attack, Warning (advance notice of enemy raids)
  - Disasters (3 subcategories × 5 tiers = 15 researches): Floods, Health, Earthquakes
  - The Disasters tab is hidden in the research modal until disasters are implemented, so its researches cannot be started *(planned — see [disasters](../todo/disasters.md))*
- Within a subcategory, researches form a linear chain of 5 tiers. Tier N requires tier N-1 to be completed first
- Each research has a resource cost: knowledge plus the two resources of its tier (T1 food + wood, T2 wood + stone, T3 stone + copper, T4 copper + iron, T5 iron + gold). The cost is the tier's base cost times the chain's price band: cheap ×0.75 (Food Production, Food Consumption, Wood Production, Wood Consumption, Knowledge Production, Storage), standard ×1 (Mining, Faith, Construction, all Military and Disasters chains) or premium ×1.5 (Transportation, Expansion, Habitation). Duration is `floor(Cost.toSeconds × RESEARCH_TIME_MULTIPLIER)` (×4, minimum 1 s); Construction research and the Rapid Construction blessing do not shorten it. Starting any research requires academy level ≥ 1 (flat check, not per-research). Bonuses are defined per subcategory (type and value), granted once per completed tier
- Multiple researches can be active simultaneously across different subcategories, but within a subcategory only one can be active (the linear chain prevents starting the next tier before the current one completes)
- Completed bonuses accumulate additively across all completed researches
- At academy level 0, whether from a downgrade or from a punishment or lost raid destroying an upgrading academy, running research pauses: its timer and its Upcoming row freeze, the row shows "Paused", and research resumes with the same remaining time once the academy is back at level 1. Completed bonuses keep applying. When the academy is at level 1 with research running, its downgrade tooltip warns that research will pause

### Bonuses by subcategory

- **Colony**
  - Transportation: +3% resource gathering productivity (bounded resources only)
  - Construction: -10% construction time
  - Expansion: -8% expansion cost
  - Storage: +10% storage capacity
  - Habitation: +1 population per house level
- **Resources**
  - Food Production: +5% food production
  - Food Consumption: -5% food consumption
  - Wood Production: +5% wood production
  - Wood Consumption: -5% wood consumption
  - Mining: +5% stone/copper/iron/gold production
  - Knowledge Production: +10% knowledge production
- **Disasters** *(planned — see [disasters](../todo/disasters.md))*
  - Floods: -10% flood impact
  - Health: -10% disease impact
  - Earthquakes: -10% earthquake impact
- **Religion**
  - Faith: +5% faith production
- **Military**
  - Defense: +10% unit health (not the wall or the tower)
  - Attack: +10% unit attack (not the tower)
  - Warning: +10% raid warning time (delays already paid are not scaled)

## Events

The game displays an event log as a column alongside the building columns. Events inform the player of upcoming threats and past occurrences.

- **Future events** — warn about incoming events: construction, territory expansion, HQ type upgrade, research in progress, the active challenge countdown and an announced raid. Each shows a countdown timer that ticks down in real time (the raid countdown follows the raid itself, so it freezes during Temporary Peace and jumps when a delay is paid; a research countdown follows its research, so it freezes and shows "Paused" while the academy is at level 0). Disasters will also appear here *(planned — see [disasters](../todo/disasters.md))*.
- **Past events** — inform about things that have already happened (e.g. season changed, research completed, resource at storage cap, resource production went negative, idle workers, population or territory limit reached, raid repelled, lost or called off). Displayed in a muted style.
- Past events can be dismissed by the player (close button), or all at once with a "Clear all" button (asks for confirmation). Future events cannot be dismissed.
- Warnings clear themselves when their condition ends: storage cap, negative production, idle workers, population limit and territory limit.
- The challenge countdown row is highlighted while its requirements are currently met. Clicking it opens the challenge detail modal. Clicking the raid row opens the military window.
- Active blessings and punishments are listed in their own sections of the column, each with its remaining time.
- Events are part of the colony data model and are persisted with save data.
- The events column is always visible in the game screen.

## Challenges

The core narrative driver. The gods test the colony's worthiness to pass through the portal by sending 10 sequential challenges. Completing all challenges is the win condition (portal activates, player goes home). A full-screen ending (painting, "A Promise Kept" and a short text) lets the player continue playing the same colony or return to the home screen.

### Lifecycle

1. When the game starts, the first pending challenge is activated immediately
2. **Delay phase**: a hidden timer counts up (`delayElapsed`). The delay is decided when the challenge activates (see Scaling). When it reaches `delay`, the timer, requirements, blessings and punishment of the countdown are decided from the colony and stay fixed until it ends; the challenge transitions to `started`, a non-dismissable future event appears, and the player is notified. Clicking the event opens the challenge detail modal
3. **Timeout phase**: a visible timer counts up (`timeoutElapsed`). The player must meet all requirements before `timeoutElapsed` reaches `timeout`
4. **Resolution**: when the timeout expires, the game checks whether all requirements are met at that moment
   - **Success**: requirements are deducted from the colony (faith, resources, workers sacrificed). A reward modal pauses the game and offers two blessings to choose from. After choosing, the blessing is applied. If more challenges remain, the next one activates. If all 10 are completed, the ending screen appears
   - **Failure**: a punishment modal pauses the game showing the penalty. After acknowledging, the punishment is applied: every punishment takes 50% of stored faith and a fraction of each stored regular resource, and some also sacrifice workers and destroy building levels (see Punishments). The challenge resets (timers back to 0) and the player can retry: the failure is counted, the retry gets a new delay with extra recovery time, and its countdown values are recalculated, easier with each failure and never asking for more of any requirement than the failed attempt

### Requirements

Each challenge specifies a combination of (all optional per challenge). The values in `challenges.json` are base values for a typical colony; when the countdown starts they are fitted to the colony (see Scaling):
- `faith` — consumed on completion
- `altar` / `temple` / `monument` — building level checked (not consumed)
- `resources` — resource amounts consumed on completion
- `workers` — sacrificed on completion: first from idle pool, then randomly unassigned from producer buildings (clamped to available workers). A challenge asks for at most half of the colony's workers at the countdown start (none when that is under one worker)

### Blessings

Rewards earned by completing challenges. The player chooses one of two offered blessings. Each challenge offers distinct blessing types. A harder countdown gives stronger blessings: their strength follows the difficulty within 0.75–1.3× the base value, their duration within 0.9–1.15× (whole minutes). An ongoing blessing's base duration is the next challenge's base delay plus its base timer (the last challenge's keep 2 minutes), so at base values it lasts through the next countdown; a struggling colony's longer delay and timer can outlast it.

#### Instant blessings (applied immediately, no ongoing effect)
- **Gift from the Heavens** — receive a fixed amount of resources (capped at storage)
- **Holy Expansion** — receive a fixed number of territory slots (added to `territoryBonus`)

#### Ongoing blessings (applied continuously for a duration)
- **Fertile Soil** — increases farm productivity
- **Forest Bloom** — increases wood productivity
- **Rich Mines** — increases mining productivity (quarry + all mines)
- **Wisdom of the Gods** — increases knowledge productivity
- **Celestial Prosperity** — increases general productivity (all producers)
- **Rapid Construction** — buildings constructed faster (only affects new constructions, not in-progress ones). Stacks multiplicatively with Construction research: `duration × (1 − research) × (1 − blessing)`, so 50% research + 50% blessing yields 25% of the base duration
- **Favorable Weather** — warm season becomes more productive, cold season becomes less harsh. Formula: the season bonus (`warm` in warm season, `cold` in cold season) is added to the food modifier and subtracted from the wood modifier. Examples with `warm = 0.1, cold = 0.1`: warm food modifier `0.2 + 0.1 = 0.3` (+30% instead of +20%), warm wood modifier `-0.2 - 0.1 = -0.3` (-30% instead of -20%), cold food modifier `-0.2 + 0.1 = -0.1` (-10% instead of -20%), cold wood modifier `0.2 - 0.1 = 0.1` (+10% instead of +20%)
- **Blessed Markets** — trade fee is 0%, overriding market level reduction
- **Temporary Peace** — raid timers freeze: no raid is announced or arrives while it lasts
- **Celestial Fortification** — a lost raid takes no building levels (its effect on disasters is planned with disasters)

### Punishments

Penalties applied when a challenge fails. Every punishment instantly takes 50% of stored faith and a fraction of each stored regular resource. Depending on the challenge, it can also sacrifice workers, destroy building levels, and reduce productivity for a duration. Base values per challenge are in `src/data/challenges.json`; when the countdown starts they are fitted to the colony: a struggling colony gets a milder punishment (strength and duration 0.5–1.15× by colony health), and the workers and building levels lost follow the colony's size against a typical colony at that challenge, capped at 25% of its workers and 10% of its building levels.

- **Crop Failure** — reduces farm productivity. In challenge 1 it also sacrifices workers and destroys building levels
- **Wildfires** — reduces woodcutter productivity
- **Landslide** — reduces mining productivity (quarry + all mines)
- **Plague** — sacrifices workers (instant only, no ongoing productivity reduction)
- **Volcano** — reduces general productivity, sacrifices workers and destroys building levels

Building level downgrades select random buildings from the downgradable list. A building is eligible if its level is > 1, or level == 1 and currently under construction (construction is cancelled and the building is destroyed). Excess workers above new capacity are returned to idle. A destroyed academy pauses its running research until it is rebuilt.

### Scaling

The challenges adapt to the colony (`src/js/engine/challenge_scaling.js`), so the game feels neither too hard nor too easy:

- **Requirements and timer** — fitted so the estimated time to meet them is `CHALLENGE_TARGET_TIME_SHARE` of the timer. The estimate is a straight line from the colony's stock and net rates: it counts the held amounts, the costs of the missing building levels (each building's levels one after another, buildings in parallel), the HQ tier upgrades for locked buildings, HQ expansions when territory is short, houses for extra workers and storehouse levels when an amount does not fit; faith also counts free temple slots idle workers could fill, and a resource whose producers stand idle (made at under 10% of its fully staffed rate) counts at that rate. A colony with time to spare gets every value raised, up to +30%; a struggling one first gets smaller faith and resource amounts (down to 15% of the base), then a longer timer (up to 1.75×) with building levels and workers cut by up to 20%; when even that is not enough, each value is capped at what the colony can reach. Resources the colony has not unlocked are dropped. Each failure lowers the target share and adds 10% to the timer.
- **Delay** — longer for a struggling colony and shorter for a thriving one (0.75–1.5× the base delay), plus 60 s of recovery time per failure.
- **Colony health** — the colony's production, HQ tier, faith rate, army, research and workers against a typical colony at that challenge (`CHALLENGE_REFERENCE_STATS`, generated by the balance simulation), as a weighted geometric mean; 1 is typical. It sets the delay and the punishment.
- **Mood** — each countdown gets one of five moods from its difficulty (merciful, lenient, watchful, stern, demanding); it is decided and saved, and the challenge window shows it as a short line under the title ("The gods are merciful" … "The gods are demanding"), with no numbers. A merciful countdown, like every retry, holds back the next raid (see Raids).

### Design Rules

- **Sequential**: one challenge active at a time
- **No stacking**: two blessings (or punishments) of the same type are never active simultaneously. Granting a type that is already active replaces it, so its duration restarts
- **Ongoing effect timeouts**: only tick while the game is running (paused/modal states excluded)
- **Non-dismissable**: challenge countdown events cannot be dismissed by the player
- **All definitions**: base values stored in `src/data/challenges.json`; the scaling constants in `balancing.js`

## Difficulties
Players have to choose between:
- Balance production chains
  - Overproducing one resource leads to shortages in others
- Grow population
  - More population enables economic growth but consumes more resources to sustain
- Grow military
  - Stronger defenses protect against raids but divert resources from economic growth, and units cost upkeep
- Expand territory
  - More territory enables economic growth
  - It also provokes more frequent and bigger raids
- Research new technologies
  - Unlocking upgrades costs resources and time, delaying other priorities
- Adapt to seasons
  - Seasonal changes affect production rates, requiring players to plan ahead and stockpile accordingly
- Prepare for disasters *(planned — see [disasters](../todo/disasters.md))*
  - Random catastrophic events can destroy buildings or resources, so players must keep reserves without over-hoarding
- Complete the challenges of the gods
  - Divine challenges require specific resources or milestones, forcing players to divert effort from other goals

## Balancing

Tunable numeric constants live in two places:

- `src/js/engine/balancing.js` — the colony economy (buildings, production, workers, seasons, market, storage, territory, research, military). It is consumed by building classes, `constants.js`, `state.js`, `battle.js`, and UI components.
- `src/data/challenges.json` — the challenge economy's base values: requirements, blessing strengths and durations, punishment fractions, workers and building levels lost, and the delay/timeout of each challenge. How they are fitted to the colony is tuned in the "Challenge Scaling" section of `balancing.js` (including the typical colony per challenge, `CHALLENGE_REFERENCE_STATS`), with the balance simulation (`docs/simulation.md`).

When adjusting the game's difficulty or economy, only these two files should need to change.

**Game speed** (`GAME_SPEED_OPTIONS`, `GAME_SPEED_DEFAULT` in `constants.js`) — Available speed multipliers (`[1, 2, 3]`) and the default (1x). Stored in `Meta.gameSpeed`. The game loop multiplies delta time by the speed multiplier, uniformly affecting production, seasons, construction, research, events, challenge timers, raid timers, and blessing/punishment durations. Audio playback is unaffected.

The file contains:

- **Building upgrades** (`BUILDING_UPGRADES`) — Per-building upgrade config with two sub-keys: `cost` (base resource cost) and `multiplier` (exponential scaling factor per level). Build time is derived from the level-up cost via `Cost.toSeconds`.
  - Standard formula (all buildings except HQ): `floor(cost × multiplier^level)` — a level-0 building pays `cost × 1` for its first upgrade.
  - HQ formula: `floor(cost × multiplier^(level-1))` — because HQ starts at level 1 (never level 0), the exponent is shifted by one so the first expansion (level 1 → 2) also pays the base cost (`cost × 1`).
- **HQ upgrade costs** (`HQ_UPGRADE_COSTS`) — Fixed resource costs to upgrade the colony type (Camp → Settlement → Village → Town → City).
- **Production rates** (`PRODUCTION_RATES`) — Base resource output per worker per second for each production building (farms, woodcutters, quarries, mines, academies, temples). Passive buildings (e.g. altar, flagged `passive: true`) produce per level instead of per worker.
- **Population & workers** — House population formula value (`HOUSE_POPULATION_PER_LEVEL`), worker slots per building level (`WORKERS_PER_LEVEL`), worker recruitment cost (`WORKER_RECRUIT_COST`), worker upkeep rates (`WORKER_FOOD_CONSUMPTION`, `WORKER_WOOD_CONSUMPTION`).
- **Resource time weights** (`RESOURCE_TIME_WEIGHTS`, `RESOURCE_TIME_EXPONENT`) — Per-resource time weight in seconds and a sub-linear exponent (0.7), used by `Cost.toSeconds` to derive build and research duration from resource costs: `floor(weightedSum ^ exponent)`.
- **Season constants** (`SEASON_DURATION`, `SEASON_WARM_FOOD_MODIFIER`, `SEASON_COLD_FOOD_MODIFIER`, `SEASON_WARM_WOOD_MODIFIER`, `SEASON_COLD_WOOD_MODIFIER`) — Season duration in seconds and fractional modifiers for food production and wood consumption per season.
- **Market trading** (`MARKET_TRADE_AMOUNT`, `MARKET_BASE_PRICES`, `MARKET_BASE_FEE`, `MARKET_MIN_FEE`, `MARKET_FEE_REDUCTION_PER_LEVEL`, `MARKET_PRICE_SHIFT`, `MARKET_MIN_CURRENT_PRICE`, `MARKET_MAX_CURRENT_PRICE`) — Trade lot size, base gold prices per resource, fee structure, and dynamic price bounds.
- **Monument faith** (`MONUMENT_FAITH_PER_LEVEL`) — One-time faith granted when a monument finishes construction: `value × newLevel`.
- **Storehouse capacity** (`STOREHOUSE_BASE_CAPACITY`, `STOREHOUSE_CAPACITY_MULTIPLIER`) — Storage cap formula: `floor(base × multiplier^level × (1 + storageBonus))`. Base capacity is 500, multiplier is 1.2.
- **Territory capacity** (`HQ_TERRITORY_PER_LEVEL`) — Territory slots per HQ level (10). Cap = `level × HQ_TERRITORY_PER_LEVEL + territoryBonus`.
- **Shortage penalty** (`SHORTAGE_MAX_PENALTY`) — Maximum productivity reduction factor (1 = 100%) when food or wood has negative net production. Penalty scales proportionally to the deficit ratio.
- **Bulk worker amount** (`BULK_WORKER_AMOUNT`) — Number of workers assigned/dismissed, or units trained/dismissed, per Ctrl+click (10).
- **Research definitions** (`RESEARCH_SUBCATEGORY_BONUSES`, `RESEARCH_TIER_COSTS`, `RESEARCH_SUBCATEGORY_COST_MULTIPLIERS`, `RESEARCH_TIME_MULTIPLIER`) — `RESEARCH_SUBCATEGORY_BONUSES` maps each subcategory to `{ type: BONUS_*, value, [flat] }`; fractional values must be whole percents. `RESEARCH_TIER_COSTS` holds the five per-tier base costs (`Cost`, index 0 = T1) of a standard chain, and `RESEARCH_SUBCATEGORY_COST_MULTIPLIERS` maps each subcategory to its price band (0.75 / 1 / 1.5). `RESEARCH_COSTS` (derived in `constants.js`) maps each `RESEARCH_*` key to `tierCost.multiplyFloor(bandMultiplier)`. `RESEARCH_TIME_MULTIPLIER` (4) scales `Cost.toSeconds` for research only. Currently active bonuses in the game loop: worker productivity (bounded resources only), construction time, expansion cost, food/wood production, food/wood consumption, mining, knowledge production, faith production, habitation, storage capacity, unit attack, unit defense, raid warning time. Defined but not yet wired: disaster impacts *(planned)*.
- **Military** (`MILITARY_UNITS_PER_LEVEL`, `UNIT_STATS`, `UNIT_COUNTER_MULTIPLIER`, `WALL_HEALTH_PER_LEVEL`, `TOWER_ARCHERS_PER_LEVEL`, `RAID_GRACE_PERIOD`, `RAID_INTERVAL_BASE` / `_PER_TERRITORY` / `_MIN`, `RAID_WARNING_TIME`, `RAID_UNITS_BASE` / `_PER_TERRITORY` / `_PER_YEAR`, `RAID_DEFEAT_MAX_RESOURCES` / `_WORKERS` / `_LEVELS`, `TRIBUTE_VALUE_PER_UNIT`, `TRIBUTE_RESOURCE_VALUES`, `TRIBUTE_MIN_RESOURCES` / `_MAX_RESOURCES`, `TRIBUTE_DELAY_GROWTH`, `TRIBUTE_CANCEL_MULTIPLIER`, `TRIBUTE_DELAY_SECONDS`, `TRIBUTE_ROUNDING`) — unit cap per building level; per-unit attack, health, cost and upkeep; counter bonus; wall and tower strength; raid timing, size and defeat losses; tribute value, mix and prices (see Military).
