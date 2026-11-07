## TO DO LATER (THIS SECTION SHOULD BE IGNORED BY AGENTS)

- Improve challenges
  - Add images on each blessing card (all blessings share `blessing.jpg`; punishments already have one image per type)

- Implement story intro

## Dynamic challenges: open issues

Game:

- Retry timer after a backstop: when a first attempt hits the backstop (e.g. a 0-worker Camp asked for Altar 9 gets Altar 1 and the longest timer, 510 s), the retry is capped at that Altar 1, needs no backstop and gets a normal 300 × 1.1 = 330 s timer: shorter than the failed attempt, though still far more than needed.
- Empty requirements: when the backstop drops every requirement (e.g. Temple 10 with the temple still locked at the Camp), the challenge is a free win; the challenge window shows "None this time" (`challenge.noRequirements`). Seen only with the version 1 `activated` save fixture, not in real play or the simulation.
- Soft-lock: a colony with 0 workers and under 50 food can never recruit again (13 of 20 strong baseline runs ended this way after challenge 10's punishment, before scaling). Size-based punishment losses should remove this trigger; check whether a general safety net is still needed.
- Possible bug (not verified): `selectBlessing` and `acknowledgePunishment` always unpause, even if a tutorial popup is still open; the raid window re-checks.
- Raid truce not shown: the player is not told that no new raid is announced during a retry or a merciful countdown (left out on purpose for now).

Simulation:

- Strong bot blessing values (not verified): the strong bot values productivity, construction and weather blessings by their duration but Temporary Peace, Celestial Fortification and Blessed Markets at a flat amount, so the longer blessing durations may have shifted its choices; compare its chosen blessing per challenge before and after.
- Report mood counts: moods and backstops count every countdown that started, including one cut off by the time cap, so they can exceed the finished attempts.
- Review nits: duplicated constants and formulas in the bots (raid size, blessing-to-resource mapping, producer list, `SECONDS_PER_MINUTE`), unused exports and fields, milestone snapshots taken on a cold→warm step, the report file name ignoring `SIM_MAX_HOURS` and `SIM_STEP`.
