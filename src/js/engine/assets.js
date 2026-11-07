// Asset path constants — centralized references to all public image, sound, and music files.

// Resources
export const IMG_RESOURCE_COPPER = '/img/resources/copper.png'
export const IMG_RESOURCE_FAITH = '/img/resources/faith.png'
export const IMG_RESOURCE_FOOD = '/img/resources/food.png'
export const IMG_RESOURCE_GOLD = '/img/resources/gold.png'
export const IMG_RESOURCE_IRON = '/img/resources/iron.png'
export const IMG_RESOURCE_KNOWLEDGE = '/img/resources/knowledge.png'
export const IMG_RESOURCE_STONE = '/img/resources/stone.png'
export const IMG_RESOURCE_WOOD = '/img/resources/wood.png'

// Buildings — misc
export const IMG_BUILDING_ACADEMY = '/img/buildings/misc/academy.webp'
export const IMG_BUILDING_HEADQUARTERS_CAMP = '/img/buildings/misc/headquarters_camp.webp'
export const IMG_BUILDING_HEADQUARTERS_CITY = '/img/buildings/misc/headquarters_city.webp'
export const IMG_BUILDING_HEADQUARTERS_SETTLEMENT = '/img/buildings/misc/headquarters_settlement.webp'
export const IMG_BUILDING_HEADQUARTERS_TOWN = '/img/buildings/misc/headquarters_town.webp'
export const IMG_BUILDING_HEADQUARTERS_VILLAGE = '/img/buildings/misc/headquarters_village.webp'
export const IMG_BUILDING_HOUSE = '/img/buildings/misc/house.webp'
export const IMG_BUILDING_MARKET = '/img/buildings/misc/market.webp'
export const IMG_BUILDING_STOREHOUSE = '/img/buildings/misc/storehouse.webp'

// Buildings — religious
export const IMG_BUILDING_ALTAR = '/img/buildings/religious/altar.webp'
export const IMG_BUILDING_MONUMENT = '/img/buildings/religious/monument.webp'
export const IMG_BUILDING_TEMPLE = '/img/buildings/religious/temple.webp'

// Buildings — resources
export const IMG_BUILDING_COPPER_MINE = '/img/buildings/resources/copper_mine.webp'
export const IMG_BUILDING_FARM = '/img/buildings/resources/farm.webp'
export const IMG_BUILDING_GOLD_MINE = '/img/buildings/resources/gold_mine.webp'
export const IMG_BUILDING_IRON_MINE = '/img/buildings/resources/iron_mine.webp'
export const IMG_BUILDING_QUARRY = '/img/buildings/resources/quarry.webp'
export const IMG_BUILDING_WOODCUTTER = '/img/buildings/resources/woodcutter.webp'

// Buildings — military
export const IMG_BUILDING_ARCHERY = '/img/buildings/military/archery.webp'
export const IMG_BUILDING_BARRACKS = '/img/buildings/military/barracks.webp'
export const IMG_BUILDING_STABLE = '/img/buildings/military/stable.webp'
export const IMG_BUILDING_TOWER = '/img/buildings/military/tower.webp'
export const IMG_BUILDING_WALL = '/img/buildings/military/wall.webp'

// Units
export const IMG_UNIT_WORKER = '/img/units/worker.png'

// Icons
export const IMG_ICO_FAVICON = '/img/ico/favicon.ico'

// Other
export const IMG_OTHER_BALANCE = '/img/other/balance.png'
export const IMG_OTHER_BUILD = '/img/other/build.png'
export const IMG_OTHER_COMPLETED = '/img/other/completed.png'
export const IMG_OTHER_HOME_BACKGROUND = '/img/other/home_background.webp'
export const IMG_OTHER_HOME_TITLE = '/img/other/home_title.webp'
export const IMG_OTHER_IDLE = '/img/other/idle.png'
export const IMG_OTHER_INTRO_BACKGROUND = '/img/other/intro_background.webp'
export const IMG_OTHER_LOCK = '/img/other/lock.png'
export const IMG_OTHER_PORTAL = '/img/other/portal.webp'
export const IMG_OTHER_PRODUCTIVITY = '/img/other/productivity.png'
export const IMG_OTHER_TERRITORY = '/img/other/territory.png'
export const IMG_OTHER_UPGRADE = '/img/other/upgrade.png'

// Punishments
export const IMG_PUNISHMENT_CROP_FAILURE = '/img/punishments/crop_failure.webp'
export const IMG_PUNISHMENT_LANDSLIDE = '/img/punishments/landslide.webp'
export const IMG_PUNISHMENT_PLAGUE = '/img/punishments/plague.webp'
export const IMG_PUNISHMENT_VOLCANO = '/img/punishments/volcano.webp'
export const IMG_PUNISHMENT_WILDFIRES = '/img/punishments/wildfires.webp'

// Blessings
export const IMG_BLESSING_BLESSING = '/img/blessings/blessing.webp'
export const IMG_BLESSING_FERTILE_SOIL = '/img/blessings/fertile_soil.webp'
export const IMG_BLESSING_GIFT_FROM_THE_HEAVENS = '/img/blessings/gift_from_the_heavens.webp'
export const IMG_BLESSING_HOLY_EXPANSION = '/img/blessings/holy_expansion.webp'

// Seasons
export const IMG_SEASON_COLD = '/img/seasons/cold.png'
export const IMG_SEASON_WARM = '/img/seasons/warm.png'

// Resource image lookup by key (for dynamic :src bindings)
export const IMG_RESOURCE_MAP = {
  copper: IMG_RESOURCE_COPPER,
  faith: IMG_RESOURCE_FAITH,
  food: IMG_RESOURCE_FOOD,
  gold: IMG_RESOURCE_GOLD,
  iron: IMG_RESOURCE_IRON,
  knowledge: IMG_RESOURCE_KNOWLEDGE,
  stone: IMG_RESOURCE_STONE,
  wood: IMG_RESOURCE_WOOD,
}

// Punishment image lookup by key (for dynamic :src bindings)
export const IMG_PUNISHMENT_MAP = {
  cropFailure: IMG_PUNISHMENT_CROP_FAILURE,
  landslide: IMG_PUNISHMENT_LANDSLIDE,
  plague: IMG_PUNISHMENT_PLAGUE,
  volcano: IMG_PUNISHMENT_VOLCANO,
  wildfires: IMG_PUNISHMENT_WILDFIRES,
}

// Sounds
export const SND_BUILDING_CREATED = '/audio/sound/building_created.mp3'
export const SND_BUTTON_TAP = '/audio/sound/button_tap.mp3'
export const SND_HEADQUARTERS_UPGRADED = '/audio/sound/headquarters_upgraded.mp3'
export const SND_MARKET_EXCHANGE = '/audio/sound/market_exchange.mp3'
export const SND_NOTIFICATION_ALERT = '/audio/sound/notification_alert.mp3'
export const SND_NOTIFICATION_BLESSING = '/audio/sound/notification_blessing.mp3'
export const SND_NOTIFICATION_DISASTER = '/audio/sound/notification_disaster.mp3'
export const SND_NOTIFICATION_SEASON = '/audio/sound/notification_season.mp3'
export const SND_OPEN_ACADEMY = '/audio/sound/open_academy.mp3'
export const SND_OPEN_MARKET = '/audio/sound/open_market.mp3'
export const SND_RESEARCH_COMPLETED = '/audio/sound/research_completed.mp3'
export const SND_TERRITORY_EXPANDED = '/audio/sound/territory_expanded.mp3'
export const SND_UNDER_ATTACK = '/audio/sound/under_attack.mp3'
export const SND_WORKER_ACADEMY = '/audio/sound/worker_academy.mp3'
export const SND_WORKER_CREATED = '/audio/sound/worker_created.mp3'
export const SND_WORKER_FARM = '/audio/sound/worker_farm.mp3'
export const SND_WORKER_MINE = '/audio/sound/worker_mine.mp3'
export const SND_WORKER_TEMPLE = '/audio/sound/worker_temple.mp3'
export const SND_WORKER_WOODCUTTER = '/audio/sound/worker_woodcutter.mp3'

// Music
export const MUS_MUSIC_1 = '/audio/music/music_1.mp3'
export const MUS_MUSIC_2 = '/audio/music/music_2.mp3'
export const MUS_MUSIC_3 = '/audio/music/music_3.mp3'
export const MUS_MUSIC_4 = '/audio/music/music_4.mp3'
export const MUS_MUSIC_MAIN_MENU = '/audio/music/music_main_menu.mp3'
