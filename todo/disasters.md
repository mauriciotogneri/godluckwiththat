# Natural Disasters

* As the game progresses, random natural disasters (not sent by the gods) will appear and affect the colony
* Some technologies can prevent/alleviate these catastrophes

## Current state

* No random disasters yet: a season transition only changes the season/year
* Floods, Health and Earthquakes researches exist, but the Disasters tab is hidden in the research modal so they cannot be started, and their bonuses are not used yet
* No Watchtower or Apothecary building, and no herbs resource ("Medicinal Herbs" is only a Health research name)
* Challenge punishments (sent by the gods) already have similar effects: Plague kills workers (like Disease), Crop Failure cuts farm output (like Floods), Volcano destroys building levels (like Earthquakes). Disaster research does not reduce them

- Implement random disasters (see Spreadsheet)
- Make disaster research bonuses take effect (`BONUS_FLOOD_IMPACT`, `BONUS_DISEASE_IMPACT`, `BONUS_EARTHQUAKE_IMPACT`)
- Then show the Disasters tab in the research modal again (it is filtered out of `RESEARCH_MODAL_TREE` in `constants.js`)

### 2. Disaster System

Builds on the existing Disaster research tree (Floods, Health, Earthquakes), whose bonuses are not used yet.

**Timing and Frequency**
- First disaster possible after Year 3 (gives player time to establish). A season lasts 5 minutes, so Year 3 starts after 20 minutes at 1x speed
- Check every season transition: 15% base chance, +5% per year after Year 3 (caps at 60%)
- Only one disaster active at a time
- Watchtower provides advance warning (event appears in Events column with countdown timer). The building does not exist yet

**Disaster Types**

- **Floods**:
  * 50% warm / 20% cold
  * Destroys 10-30% of food + wood stockpile, reduces Farm output by 50% 
  * 60 seconds
- **Disease**:
  * 30% either season
  * 20-40% of workers become sick (produce nothing, still consume upkeep)
  * 120 seconds (halved with Apothecary + herbs, neither exists yet)
- **Earthquakes**:
  * 20% warm / 50% cold
  * Random building loses 1 level (min 1), territory reduced by 10%
  * 60 seconds

## Future Blessings (not yet implemented)

* `DIVINE_PROTECTION`: No natural disasters