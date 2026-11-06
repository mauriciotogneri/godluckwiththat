// Pure string enums — zero dependencies.
// Imported by balancing.js, constants.js, state.js, building classes, and Vue components.

// Resource names
export const RESOURCE_FOOD = 'food'
export const RESOURCE_WOOD = 'wood'
export const RESOURCE_STONE = 'stone'
export const RESOURCE_COPPER = 'copper'
export const RESOURCE_IRON = 'iron'
export const RESOURCE_GOLD = 'gold'
export const RESOURCE_KNOWLEDGE = 'knowledge'
export const RESOURCE_FAITH = 'faith'

// Headquarters progression types
export const HQ_TYPE_CAMP = 'camp'
export const HQ_TYPE_SETTLEMENT = 'settlement'
export const HQ_TYPE_VILLAGE = 'village'
export const HQ_TYPE_TOWN = 'town'
export const HQ_TYPE_CITY = 'city'

// Season identifiers
export const SEASON_WARM = 'warm'
export const SEASON_COLD = 'cold'

// Building keys
export const BUILDING_HEADQUARTERS = 'headquarters'
export const BUILDING_HOUSE = 'house'
export const BUILDING_ACADEMY = 'academy'
export const BUILDING_STOREHOUSE = 'storehouse'
export const BUILDING_MARKET = 'market'
export const BUILDING_FARM = 'farm'
export const BUILDING_WOODCUTTER = 'woodcutter'
export const BUILDING_QUARRY = 'quarry'
export const BUILDING_COPPER_MINE = 'copperMine'
export const BUILDING_IRON_MINE = 'ironMine'
export const BUILDING_GOLD_MINE = 'goldMine'
export const BUILDING_ALTAR = 'altar'
export const BUILDING_TEMPLE = 'temple'
export const BUILDING_MONUMENT = 'monument'
export const BUILDING_BARRACKS = 'barracks'
export const BUILDING_ARCHERY = 'archery'
export const BUILDING_STABLE = 'stable'
export const BUILDING_WALL = 'wall'
export const BUILDING_TOWER = 'tower'

// Military unit types
export const UNIT_INFANTRY = 'infantry'
export const UNIT_ARCHER = 'archer'
export const UNIT_CAVALRY = 'cavalry'

// Raid phases: waiting (hidden timer until the announcement) and incoming (announced countdown)
export const RAID_PHASE_WAITING = 'waiting'
export const RAID_PHASE_INCOMING = 'incoming'

// Tribute kinds paid to raiders
export const TRIBUTE_DELAY = 'delay'
export const TRIBUTE_CANCEL = 'cancel'

// Trade directions
export const TRADE_BUY = 'buy'
export const TRADE_SELL = 'sell'

// Event types
export const EVENT_TYPE_SEASON_CHANGED = 'season_changed'
export const EVENT_TYPE_POPULATION_LIMIT_REACHED = 'population_limit_reached'
export const EVENT_TYPE_TERRITORY_LIMIT_REACHED = 'territory_limit_reached'
export const EVENT_TYPE_RESOURCE_LIMIT_REACHED = 'resource_limit_reached'
export const EVENT_TYPE_RESOURCE_NEGATIVE_PRODUCTION = 'resource_negative_production'
export const EVENT_TYPE_BUILDING_UPGRADE = 'building_upgrade'
export const EVENT_TYPE_RESEARCH_COMPLETE = 'research_complete'
export const EVENT_TYPE_IDLE_WORKERS = 'idle_workers'
export const EVENT_TYPE_RAID_INCOMING = 'raid_incoming'
export const EVENT_TYPE_RAID_RESULT = 'raid_result'

// Research categories
export const RESEARCH_CATEGORY_COLONY = 'colony'
export const RESEARCH_CATEGORY_RESOURCES = 'resources'
export const RESEARCH_CATEGORY_RELIGION = 'religion'
export const RESEARCH_CATEGORY_MILITARY = 'military'
export const RESEARCH_CATEGORY_DISASTERS = 'disasters'

// Research subcategories
export const RESEARCH_SUBCATEGORY_TRANSPORTATION = 'transportation'
export const RESEARCH_SUBCATEGORY_CONSTRUCTION = 'construction'
export const RESEARCH_SUBCATEGORY_EXPANSION = 'expansion'
export const RESEARCH_SUBCATEGORY_FLOODS = 'floods'
export const RESEARCH_SUBCATEGORY_HEALTH = 'health'
export const RESEARCH_SUBCATEGORY_EARTHQUAKES = 'earthquakes'
export const RESEARCH_SUBCATEGORY_FOOD_PRODUCTION = 'foodProduction'
export const RESEARCH_SUBCATEGORY_FOOD_CONSUMPTION = 'foodConsumption'
export const RESEARCH_SUBCATEGORY_WOOD_PRODUCTION = 'woodProduction'
export const RESEARCH_SUBCATEGORY_WOOD_CONSUMPTION = 'woodConsumption'
export const RESEARCH_SUBCATEGORY_MINING = 'mining'
export const RESEARCH_SUBCATEGORY_KNOWLEDGE_PRODUCTION = 'knowledgeProduction'
export const RESEARCH_SUBCATEGORY_STORAGE = 'storage'
export const RESEARCH_SUBCATEGORY_HABITATION = 'habitation'
export const RESEARCH_SUBCATEGORY_FAITH = 'faith'
export const RESEARCH_SUBCATEGORY_DEFENSE = 'defense'
export const RESEARCH_SUBCATEGORY_ATTACK = 'attack'
export const RESEARCH_SUBCATEGORY_WARNING = 'warning'

// Research keys — General
export const RESEARCH_TRANSPORTATION_1 = 'transportation1'
export const RESEARCH_TRANSPORTATION_2 = 'transportation2'
export const RESEARCH_TRANSPORTATION_3 = 'transportation3'
export const RESEARCH_TRANSPORTATION_4 = 'transportation4'
export const RESEARCH_TRANSPORTATION_5 = 'transportation5'
export const RESEARCH_CONSTRUCTION_1 = 'construction1'
export const RESEARCH_CONSTRUCTION_2 = 'construction2'
export const RESEARCH_CONSTRUCTION_3 = 'construction3'
export const RESEARCH_CONSTRUCTION_4 = 'construction4'
export const RESEARCH_CONSTRUCTION_5 = 'construction5'
export const RESEARCH_EXPANSION_1 = 'expansion1'
export const RESEARCH_EXPANSION_2 = 'expansion2'
export const RESEARCH_EXPANSION_3 = 'expansion3'
export const RESEARCH_EXPANSION_4 = 'expansion4'
export const RESEARCH_EXPANSION_5 = 'expansion5'
export const RESEARCH_HABITATION_1 = 'habitation1'
export const RESEARCH_HABITATION_2 = 'habitation2'
export const RESEARCH_HABITATION_3 = 'habitation3'
export const RESEARCH_HABITATION_4 = 'habitation4'
export const RESEARCH_HABITATION_5 = 'habitation5'
// Research keys — Disasters
export const RESEARCH_FLOODS_1 = 'floods1'
export const RESEARCH_FLOODS_2 = 'floods2'
export const RESEARCH_FLOODS_3 = 'floods3'
export const RESEARCH_FLOODS_4 = 'floods4'
export const RESEARCH_FLOODS_5 = 'floods5'
export const RESEARCH_HEALTH_1 = 'health1'
export const RESEARCH_HEALTH_2 = 'health2'
export const RESEARCH_HEALTH_3 = 'health3'
export const RESEARCH_HEALTH_4 = 'health4'
export const RESEARCH_HEALTH_5 = 'health5'
export const RESEARCH_EARTHQUAKES_1 = 'earthquakes1'
export const RESEARCH_EARTHQUAKES_2 = 'earthquakes2'
export const RESEARCH_EARTHQUAKES_3 = 'earthquakes3'
export const RESEARCH_EARTHQUAKES_4 = 'earthquakes4'
export const RESEARCH_EARTHQUAKES_5 = 'earthquakes5'

// Research keys — Resources
export const RESEARCH_FOOD_PRODUCTION_1 = 'foodProduction1'
export const RESEARCH_FOOD_PRODUCTION_2 = 'foodProduction2'
export const RESEARCH_FOOD_PRODUCTION_3 = 'foodProduction3'
export const RESEARCH_FOOD_PRODUCTION_4 = 'foodProduction4'
export const RESEARCH_FOOD_PRODUCTION_5 = 'foodProduction5'
export const RESEARCH_FOOD_CONSUMPTION_1 = 'foodConsumption1'
export const RESEARCH_FOOD_CONSUMPTION_2 = 'foodConsumption2'
export const RESEARCH_FOOD_CONSUMPTION_3 = 'foodConsumption3'
export const RESEARCH_FOOD_CONSUMPTION_4 = 'foodConsumption4'
export const RESEARCH_FOOD_CONSUMPTION_5 = 'foodConsumption5'
export const RESEARCH_WOOD_PRODUCTION_1 = 'woodProduction1'
export const RESEARCH_WOOD_PRODUCTION_2 = 'woodProduction2'
export const RESEARCH_WOOD_PRODUCTION_3 = 'woodProduction3'
export const RESEARCH_WOOD_PRODUCTION_4 = 'woodProduction4'
export const RESEARCH_WOOD_PRODUCTION_5 = 'woodProduction5'
export const RESEARCH_WOOD_CONSUMPTION_1 = 'woodConsumption1'
export const RESEARCH_WOOD_CONSUMPTION_2 = 'woodConsumption2'
export const RESEARCH_WOOD_CONSUMPTION_3 = 'woodConsumption3'
export const RESEARCH_WOOD_CONSUMPTION_4 = 'woodConsumption4'
export const RESEARCH_WOOD_CONSUMPTION_5 = 'woodConsumption5'
export const RESEARCH_MINING_1 = 'mining1'
export const RESEARCH_MINING_2 = 'mining2'
export const RESEARCH_MINING_3 = 'mining3'
export const RESEARCH_MINING_4 = 'mining4'
export const RESEARCH_MINING_5 = 'mining5'
export const RESEARCH_KNOWLEDGE_PRODUCTION_1 = 'knowledgeProduction1'
export const RESEARCH_KNOWLEDGE_PRODUCTION_2 = 'knowledgeProduction2'
export const RESEARCH_KNOWLEDGE_PRODUCTION_3 = 'knowledgeProduction3'
export const RESEARCH_KNOWLEDGE_PRODUCTION_4 = 'knowledgeProduction4'
export const RESEARCH_KNOWLEDGE_PRODUCTION_5 = 'knowledgeProduction5'
// Research keys — General (Storage, placed here for historical ordering)
export const RESEARCH_STORAGE_1 = 'storage1'
export const RESEARCH_STORAGE_2 = 'storage2'
export const RESEARCH_STORAGE_3 = 'storage3'
export const RESEARCH_STORAGE_4 = 'storage4'
export const RESEARCH_STORAGE_5 = 'storage5'

// Research keys — Religion
export const RESEARCH_FAITH_1 = 'faith1'
export const RESEARCH_FAITH_2 = 'faith2'
export const RESEARCH_FAITH_3 = 'faith3'
export const RESEARCH_FAITH_4 = 'faith4'
export const RESEARCH_FAITH_5 = 'faith5'

// Research keys — Military
export const RESEARCH_DEFENSE_1 = 'defense1'
export const RESEARCH_DEFENSE_2 = 'defense2'
export const RESEARCH_DEFENSE_3 = 'defense3'
export const RESEARCH_DEFENSE_4 = 'defense4'
export const RESEARCH_DEFENSE_5 = 'defense5'
export const RESEARCH_ATTACK_1 = 'attack1'
export const RESEARCH_ATTACK_2 = 'attack2'
export const RESEARCH_ATTACK_3 = 'attack3'
export const RESEARCH_ATTACK_4 = 'attack4'
export const RESEARCH_ATTACK_5 = 'attack5'
export const RESEARCH_WARNING_1 = 'warning1'
export const RESEARCH_WARNING_2 = 'warning2'
export const RESEARCH_WARNING_3 = 'warning3'
export const RESEARCH_WARNING_4 = 'warning4'
export const RESEARCH_WARNING_5 = 'warning5'

// Bonus types (applied by completed researches)

// General bonuses
export const BONUS_WORKER_PRODUCTIVITY = 'workerProductivity'
export const BONUS_CONSTRUCTION_TIME = 'constructionTime'
export const BONUS_EXPANSION_COST = 'expansionCost'
export const BONUS_STORAGE_CAPACITY = 'storageCapacity'
export const BONUS_HABITATION = 'habitation'

// Resource bonuses
export const BONUS_FOOD_PRODUCTION = 'foodProduction'
export const BONUS_FOOD_CONSUMPTION = 'foodConsumption'
export const BONUS_WOOD_PRODUCTION = 'woodProduction'
export const BONUS_WOOD_CONSUMPTION = 'woodConsumption'
export const BONUS_MINING_PRODUCTION = 'miningProduction'
export const BONUS_KNOWLEDGE_PRODUCTION = 'knowledgeProduction'

// Disaster bonuses
export const BONUS_FLOOD_IMPACT = 'floodImpact'
export const BONUS_DISEASE_IMPACT = 'diseaseImpact'
export const BONUS_EARTHQUAKE_IMPACT = 'earthquakeImpact'

// Religion bonuses
export const BONUS_FAITH_PRODUCTION = 'faithProduction'

// Military bonuses
export const BONUS_UNIT_DEFENSE = 'unitDefense'
export const BONUS_UNIT_ATTACK = 'unitAttack'
export const BONUS_WARNING_TIME = 'warningTime'

// Tutorial modal keys
export const TUTORIAL_MODAL_SEASON_CHANGED = 'seasonChanged'
export const TUTORIAL_MODAL_NEGATIVE_PRODUCTION = 'negativeProduction'
export const TUTORIAL_MODAL_HQ_UPGRADE = 'hqUpgrade'
export const TUTORIAL_MODAL_CHALLENGE_STARTED = 'challengeStarted'
export const TUTORIAL_MODAL_RAID_INCOMING = 'raidIncoming'

// Emit events
export const EMIT_CLOSE = 'close'
export const EMIT_START = 'start'
export const EMIT_QUIT = 'quit'
export const EMIT_SAVE = 'save'
export const EMIT_CONFIRM = 'confirm'
export const EMIT_LOAD = 'load'
export const EMIT_SETTINGS = 'settings'
export const EMIT_RESTART = 'restart'
export const EMIT_CONTINUE = 'continue'
export const EMIT_ABOUT = 'about'

// Challenge status
export const CHALLENGE_STATUS_PENDING = 'pending'
export const CHALLENGE_STATUS_ACTIVATED = 'activated'
export const CHALLENGE_STATUS_STARTED = 'started'
export const CHALLENGE_STATUS_COMPLETED = 'completed'

// Challenge keys
export const CHALLENGE_1 = 'challenge1'
export const CHALLENGE_2 = 'challenge2'
export const CHALLENGE_3 = 'challenge3'
export const CHALLENGE_4 = 'challenge4'
export const CHALLENGE_5 = 'challenge5'
export const CHALLENGE_6 = 'challenge6'
export const CHALLENGE_7 = 'challenge7'
export const CHALLENGE_8 = 'challenge8'
export const CHALLENGE_9 = 'challenge9'
export const CHALLENGE_10 = 'challenge10'

// Challenge modal states
export const CHALLENGE_MODAL_REWARD = 'reward'
export const CHALLENGE_MODAL_FAILURE = 'failure'
export const CHALLENGE_MODAL_WIN = 'win'

// Challenge moods: how demanding the gods are for the current attempt (shown in the challenge popup)
export const CHALLENGE_MOOD_MERCIFUL = 'merciful'
export const CHALLENGE_MOOD_LENIENT = 'lenient'
export const CHALLENGE_MOOD_WATCHFUL = 'watchful'
export const CHALLENGE_MOOD_STERN = 'stern'
export const CHALLENGE_MOOD_DEMANDING = 'demanding'

// Blessing types
export const BLESSING_FERTILE_SOIL = 'fertileSoil'
export const BLESSING_FOREST_BLOOM = 'forestBloom'
export const BLESSING_GIFT_FROM_THE_HEAVENS = 'giftFromTheHeavens'
export const BLESSING_HOLY_EXPANSION = 'holyExpansion'
export const BLESSING_RICH_MINES = 'richMines'
export const BLESSING_CELESTIAL_PROSPERITY = 'celestialProsperity'
export const BLESSING_RAPID_CONSTRUCTION = 'rapidConstruction'
export const BLESSING_FAVORABLE_WEATHER = 'favorableWeather'
export const BLESSING_WISDOM_OF_THE_GODS = 'wisdomOfTheGods'
export const BLESSING_BLESSED_MARKETS = 'blessedMarkets'
export const BLESSING_TEMPORARY_PEACE = 'temporaryPeace'
export const BLESSING_CELESTIAL_FORTIFICATION = 'celestialFortification'

// Punishment types
export const PUNISHMENT_CROP_FAILURE = 'cropFailure'
export const PUNISHMENT_WILDFIRES = 'wildfires'
export const PUNISHMENT_LANDSLIDE = 'landslide'
export const PUNISHMENT_PLAGUE = 'plague'
export const PUNISHMENT_VOLCANO = 'volcano'

// Challenge event types
export const EVENT_TYPE_CHALLENGE_STARTED = 'challenge_started'

// Unicode symbols
export const SYMBOL_CHECK = '✓'
export const SYMBOL_CROSS = '✕'

// Research node statuses
export const RESEARCH_STATUS_COMPLETED = 'completed'
export const RESEARCH_STATUS_ACTIVE = 'active'
export const RESEARCH_STATUS_LOCKED = 'locked'
export const RESEARCH_STATUS_AVAILABLE = 'available'

// Storage keys (localStorage)
export const STORAGE_MUSIC_ENABLED = 'musicEnabled'
export const STORAGE_SOUND_ENABLED = 'soundEnabled'
export const STORAGE_SAVED_GAME = 'savedGame'
export const STORAGE_AUTOSAVE_ENABLED = 'autosaveEnabled'
export const STORAGE_AUTOSAVE_INTERVAL = 'autosaveInterval'
export const STORAGE_TUTORIAL_COMPLETED = 'tutorialCompleted'
export const STORAGE_TRADE_AMOUNT = 'tradeAmount'

// Analytics event names
export const ANALYTICS_EVENT_GAME_START = 'game_start'
export const ANALYTICS_EVENT_TUTORIAL_COMPLETE = 'tutorial_complete'

// Analytics game start modes
export const ANALYTICS_GAME_MODE_NEW = 'new'
export const ANALYTICS_GAME_MODE_SAVED = 'saved'
