## [0.13.0] - 2026-11-07

* Feat: Challenges now adapt to your colony, easing off when it struggles
* Feat: Retrying a failed challenge is easier and gives more time to recover
* Feat: Challenge window shows the mood of the gods, from merciful to demanding
* Feat: No new raids are announced during challenge retries or merciful countdowns
* Feat: Research pauses while the academy is at level 0 and resumes when rebuilt
* Feat: Loading a game from the pause menu now asks for confirmation
* Feat: New main menu with a painted landscape, title artwork and music
* Feat: New artwork for the barracks, archery, stable, tower and wall
* Feat: Added more games to the More Games list
* Feat: New story intro on your first new game
* Feat: New ending screen when the portal opens
* Feat: Every blessing now has its own artwork
* Feat: Walls and towers lose levels in raids, shown in the raid forecast and result
* Feat: Unit tooltips show stats and upkeep with your research bonuses applied
* Fix: Singular wording for a single worker or building level lost
* Balance: Raiders gain 5% attack and health for every year after the first
* Balance: Retuned challenge requirements so the last challenges are within reach
* Balance: Longer waits between challenges and longer challenge timers
* Balance: Timed blessings last much longer and are stronger when the gods are more demanding
* Balance: Punishments are milder for a struggling colony and take at most 25% of workers
* Balance: Challenges ask for at most half of your workers

## [0.12.0] - 2026-03-29
* Feat: Display building bonus before upgrade
* Feat: Display workers cost
* Feat: Improve UI to show challenge events are clickable

## [0.11.0] - 2026-03-29

* Feat: Added challenges
* Feat: Showing production rates in season indicator
* Feat: Showing production rates in resource indicators
* Fix: Reduced construction cost
* Fix: Problem skipping ticks when tab is inactive

## [0.10.1] - 2026-03-28

* Balance: Tuned shortage penalty scaling for food and wood deficits
* Balance: Adjusted bulk worker assign and dismiss amount to 10 per Ctrl+click
* Feat: Added game speed options (1x, 2x, 3x)
* Fix: Fixed game speed not affecting construction and research timers

## [0.10.0] - 2026-03-26

* Feat: Added blessings system with 10 reward types (instant and ongoing)
* Feat: Added punishments system with 5 penalty types
* Feat: Reward modal pauses game and offers two blessings to choose from
* Fix: Fixed ongoing blessing and punishment timers ticking while game is paused

## [0.9.1] - 2026-03-24

* Feat: Added 10 sequential divine challenges as the core progression system
* Feat: Challenge lifecycle with delay, countdown, and timeout phases
* Feat: Requirements system supporting faith, building levels, resources, and worker sacrifices
* Feat: Challenge failure resets timers and applies punishment, allowing retry

## [0.9.0] - 2026-03-22

* Feat: Added event log column alongside building columns
* Feat: Future events show countdown timers for incoming threats
* Feat: Past events display in muted style with dismiss button
* Fix: Fixed events not persisting across save and load

## [0.8.1] - 2026-03-20

* Feat: Added Market building with buy and sell trading in lots of 100
* Feat: Dynamic pricing with price shifts per trade
* Feat: Trade fee decreases with market level, minimum 5%
* Balance: Set base gold prices per 100 units: Food 100, Wood 110, Stone 120, Copper 130, Iron 140

## [0.8.0] - 2026-03-19

* Feat: Added City colony type unlocking Market, Gold Mine, Workshop, Tower
* Feat: Added Gold Mine building producing gold resource
* Feat: Added Workshop building
* Feat: Gold resource visible in header bar at City level

## [0.7.1] - 2026-03-17

* Feat: Added Stable building
* Feat: Added Wall building
* Feat: Added Tower building

## [0.7.0] - 2026-03-16

* Feat: Added Town colony type unlocking Monument, Iron Mine, Stable, Wall
* Feat: Added Iron Mine building producing iron resource
* Feat: Added Barracks building
* Feat: Added Archery building

## [0.6.1] - 2026-03-14

* Feat: Added Monument building granting one-time faith per level upgrade
* Balance: Monument faith grant scales with new level
* Fix: Fixed monument faith not being granted when construction completes

## [0.6.0] - 2026-03-13

* Feat: Added research system with 5 categories and 90 total researches
* Feat: Research organized into subcategories with 5-tier linear chains
* Feat: Research bonuses accumulate additively across completed tiers
* Feat: Multiple researches can be active simultaneously across subcategories

## [0.5.1] - 2026-03-11

* Feat: Added Village colony type unlocking Academy, Copper Mine, Archery
* Feat: Added Academy building producing knowledge
* Feat: Added Copper Mine building producing copper
* Feat: Knowledge and Copper resources visible in header bar at Village level

## [0.5.0] - 2026-03-10

* Feat: Added Altar building with passive faith production per level
* Feat: Added Faith resource displayed in header bar
* Feat: Added Temple building with worker-based faith production
* Fix: Fixed passive production not scaling correctly with building level

## [0.4.1] - 2026-03-08

* Feat: Added Settlement colony type unlocking Storehouse, Temple, Quarry, Barracks
* Feat: Added Storehouse building increasing resource storage capacity
* Feat: Added Stone resource and Quarry building
* Balance: Storage capacity formula set to base 500 with 1.2x multiplier per level

## [0.4.0] - 2026-03-07

* Feat: Added construction timers for building upgrades
* Feat: Build time derived from upgrade cost via resource time weights
* Feat: Buildings continue producing at current level during construction
* Fix: Fixed territory not being reserved immediately for buildings under construction

## [0.3.1] - 2026-03-05

* Feat: Added warm and cold season cycle
* Balance: Warm season grants 20% food production bonus and 20% wood consumption reduction
* Balance: Cold season applies 20% food production penalty and 20% wood consumption increase
* Feat: Year counter increments when cold season ends and new warm season begins

## [0.3.0] - 2026-03-04

* Feat: Added House building determining maximum population
* Feat: Workers consume food and wood each tick
* Feat: Idle workers can be permanently dismissed to reduce consumption
* Fix: Fixed worker consumption continuing after all resources depleted

## [0.2.1] - 2026-03-02

* Feat: Added worker recruitment by spending food
* Feat: Workers can be assigned to and unassigned from production buildings
* Feat: Worker slots per building scale with building level
* Fix: Fixed workers not returning to idle when unassigned from a building

## [0.2.0] - 2026-03-01

* Feat: Added Food and Wood as core resources with header bar display
* Feat: Added Farm building producing food
* Feat: Added Woodcutter building producing wood
* Balance: Set base production rates per worker per second

## [0.1.1] - 2026-02-28

* Feat: Added colony with Headquarters building
* Feat: Added territory system with slots per HQ level
* Feat: Colony type upgrade path from Camp through City
* Feat: Camp colony type unlocks House, Altar, Farm, Woodcutter

## [0.1.0] - 2026-02-27

* Feat: Core game engine with tick-based game loop
* Feat: Save and load game state to local storage
* Feat: Basic UI with game screen and building cards
* Feat: Exponential building upgrade cost formula
