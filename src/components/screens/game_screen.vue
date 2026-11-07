<script setup>
import {computed, ref, shallowReactive, watch, provide, onMounted, onUnmounted} from 'vue'
import ChallengeFailureModal from '@/components/modals/challenge_failure_modal.vue'
import ChallengeDetailModal from '@/components/modals/challenge_detail_modal.vue'
import ChallengeSuccessModal from '@/components/modals/challenge_success_modal.vue'
import ChallengeWinModal from '@/components/modals/challenge_win_modal.vue'
import ConfirmModal from '@/components/modals/confirm_modal.vue'
import PauseModal from '@/components/modals/pause_modal.vue'
import MarketModal from '@/components/modals/market_modal.vue'
import MilitaryModal from '@/components/modals/military_modal.vue'
import RaidResultModal from '@/components/modals/raid_result_modal.vue'
import ResearchModal from '@/components/modals/research_modal.vue'
import HeadquartersCard from '@/components/buildings/headquarters_card.vue'
import HouseCard from '@/components/buildings/house_card.vue'
import AcademyCard from '@/components/buildings/academy_card.vue'
import StorehouseCard from '@/components/buildings/storehouse_card.vue'
import MarketCard from '@/components/buildings/market_card.vue'
import FarmCard from '@/components/buildings/farm_card.vue'
import WoodcutterCard from '@/components/buildings/woodcutter_card.vue'
import QuarryCard from '@/components/buildings/quarry_card.vue'
import CopperMineCard from '@/components/buildings/copper_mine_card.vue'
import IronMineCard from '@/components/buildings/iron_mine_card.vue'
import GoldMineCard from '@/components/buildings/gold_mine_card.vue'
import AltarCard from '@/components/buildings/altar_card.vue'
import TempleCard from '@/components/buildings/temple_card.vue'
import MonumentCard from '@/components/buildings/monument_card.vue'
import BarracksCard from '@/components/buildings/barracks_card.vue'
import ArcheryCard from '@/components/buildings/archery_card.vue'
import StableCard from '@/components/buildings/stable_card.vue'
import WallCard from '@/components/buildings/wall_card.vue'
import TowerCard from '@/components/buildings/tower_card.vue'
import audio, {playTap} from '@/js/engine/audio.js'
import {formatNumber, formatNumberFull, formatRate, formatTime} from '@/js/engine/format.js'
import State from '@/js/engine/state.js'
import storage from '@/js/engine/storage.js'
import {IMG_BLESSING_MAP, IMG_OTHER_IDLE, IMG_OTHER_LOCK, IMG_OTHER_PRODUCTIVITY, IMG_OTHER_TERRITORY, IMG_PUNISHMENT_MAP, IMG_RESOURCE_MAP, IMG_SEASON_COLD, IMG_SEASON_WARM, IMG_UNIT_WORKER, SND_OPEN_ACADEMY, SND_OPEN_MARKET} from '@/js/engine/assets.js'
import TutorialBanner from '@/components/tutorial/tutorial_banner.vue'
import TutorialModal from '@/components/tutorial/tutorial_modal.vue'
import SettingsModal from '@/components/modals/settings_modal.vue'
import {BUILDING_IMAGE_MAP, BUILDING_GRID, GAME_SPEED_DEFAULT, GAME_SPEED_OPTIONS, HEADER_RESOURCES, HQ_BUILDING_UNLOCKS, HQ_RESOURCE_UNLOCKS, HQ_TYPES, IMG_BUILDING_HEADQUARTERS_MAP, LOCAL_HOSTNAMES, RESEARCH_TREE, SECONDS_PER_MINUTE, TICK_INTERVAL, TRADEABLE_RESOURCES, TUTORIAL_MODALS, TUTORIAL_STEPS, UNBOUNDED_RESOURCES, UNIT_BUILDINGS, UNIT_TYPES} from '@/js/engine/constants.js'
import {BULK_WORKER_AMOUNT, SEASON_DURATION, UNIT_STATS} from '@/js/engine/balancing.js'
import {BONUS_HABITATION, BONUS_STORAGE_CAPACITY, BUILDING_ACADEMY, BUILDING_ALTAR, CHALLENGE_MODAL_FAILURE, CHALLENGE_MODAL_REWARD, CHALLENGE_MODAL_WIN, CHALLENGE_STATUS_STARTED, BUILDING_ARCHERY, BUILDING_BARRACKS, BUILDING_COPPER_MINE, BUILDING_FARM, BUILDING_GOLD_MINE, BUILDING_HEADQUARTERS, BUILDING_HOUSE, BUILDING_IRON_MINE, BUILDING_MARKET, BUILDING_MONUMENT, BUILDING_QUARRY, BUILDING_TEMPLE, BUILDING_STABLE, BUILDING_STOREHOUSE, BUILDING_TOWER, BUILDING_WALL, BUILDING_WOODCUTTER, EMIT_QUIT, EMIT_RESTART, EVENT_TYPE_CHALLENGE_STARTED, HQ_TYPE_CAMP, RAID_PHASE_INCOMING, RESOURCE_COPPER, RESOURCE_FAITH, RESOURCE_FOOD, RESOURCE_GOLD, RESOURCE_IRON, RESOURCE_KNOWLEDGE, RESOURCE_STONE, RESOURCE_WOOD} from '@/js/engine/enums.js'
import {t} from '@/js/i18n/localized.js'

const CARD_COMPONENTS = {
  [BUILDING_HEADQUARTERS]: HeadquartersCard,
  [BUILDING_HOUSE]: HouseCard,
  [BUILDING_ACADEMY]: AcademyCard,
  [BUILDING_STOREHOUSE]: StorehouseCard,
  [BUILDING_MARKET]: MarketCard,
  [BUILDING_FARM]: FarmCard,
  [BUILDING_WOODCUTTER]: WoodcutterCard,
  [BUILDING_QUARRY]: QuarryCard,
  [BUILDING_COPPER_MINE]: CopperMineCard,
  [BUILDING_IRON_MINE]: IronMineCard,
  [BUILDING_GOLD_MINE]: GoldMineCard,
  [BUILDING_ALTAR]: AltarCard,
  [BUILDING_TEMPLE]: TempleCard,
  [BUILDING_MONUMENT]: MonumentCard,
  [BUILDING_BARRACKS]: BarracksCard,
  [BUILDING_ARCHERY]: ArcheryCard,
  [BUILDING_STABLE]: StableCard,
  [BUILDING_WALL]: WallCard,
  [BUILDING_TOWER]: TowerCard,
}

/** Returns the Vue component for a building key.
 * @param {string} key - Building enum key
 * @returns {object} Vue component for the building card
 */
function getCardComponent(key) {
  return CARD_COMPONENTS[key]
}

/** Returns CSS class for production rate coloring (positive, negative, or zero).
 * @param {number} ratePerSecond - Net production rate per second
 * @returns {string} CSS class name
 */
function rateClass(ratePerSecond) {
  const value = Math.round(ratePerSecond * 100) / 100
  if (value > 0) {
    return 'production-rate--positive'
  }
  if (value < 0) {
    return 'production-rate--negative'
  }
  return 'production-rate--zero'
}

/** Whether a resource has a storage cap (is not in the unbounded set).
 * @param {string} resource - Resource key
 * @returns {boolean} True if the resource is capped by storage
 */
function isBounded(resource) {
  return !UNBOUNDED_RESOURCES.includes(resource)
}

/**
 * Returns true when a resource card should show a penalized (red) state:
 * - net production is zero or negative, OR
 * - the resource is storage-bounded and has reached the cap
 */
function isResourcePenalized(resource) {
  return ui.netProduction[resource] <= 0
    || (isBounded(resource) && Math.floor(ui.resources[resource]) >= ui.storageCap)
}

/** Percentage of storage cap filled for a resource (0-100).
 * @param {string} resource - Resource key
 * @returns {number} Fill percentage clamped to 0-100
 */
function resourceFillPercent(resource) {
  const current = ui.resources[resource]
  if (!ui.storageCap) {
    return 0
  }
  return Math.min(100, (current / ui.storageCap) * 100)
}

/** Time estimate until a resource is full or empty, or null if stable.
 * @param {string} resource - Resource key
 * @returns {{label: string, time: string}|null} Label and formatted time, or null
 */
function timeEstimate(resource) {
  const rate = ui.netProduction[resource]
  if (Math.round(rate * SECONDS_PER_MINUTE) === 0) {
    return null
  }
  const current = ui.resources[resource]

  if (isBounded(resource) && rate > 0) {
    if (current >= ui.storageCap) {
      return null
    }
    return {
      label: t('resource.fullIn'),
      time: formatTime((ui.storageCap - current) / rate),
    }
  }

  if (rate < 0 && current > 0) {
    return {
      label: t('resource.emptyIn'),
      time: formatTime(current / Math.abs(rate)),
    }
  }

  return null
}

/** Per-second gross production rate for a resource (before consumption).
 * @param {string} resource - Resource key
 * @returns {number} Production rate per second
 */
function grossProduction(resource) {
  return ui.production[resource]
}

/** Per-second consumption rate for a resource.
 * @param {string} resource - Resource key
 * @returns {number} Consumption rate per second (0 if none)
 */
function resourceConsumption(resource) {
  return ui.consumption[resource] ?? 0
}

/** Whether a resource has any active consumption.
 * @param {string} resource - Resource key
 * @returns {boolean} True if consumption rate is greater than zero
 */
function hasConsumption(resource) {
  return resourceConsumption(resource) > 0
}

/** Production multiplier percentage for a resource (e.g. +20 or -10).
 * Returns 0 when no modifier is active.
 * @param {string} resource - Resource key
 * @returns {number} Rounded percentage modifier
 */
function productionModifierPercent(resource) {
  return Math.round((ui.productionMultipliers[resource] - 1) * 100)
}

/** Consumption multiplier percentage for a resource (e.g. +20 or -10).
 * Returns 0 when no modifier is active (only food and wood have consumption).
 * @param {string} resource - Resource key
 * @returns {number} Rounded percentage modifier
 */
function consumptionModifierPercent(resource) {
  const multiplier = ui.consumptionMultipliers[resource]
  if (multiplier == null) {
    return 0
  }
  return Math.round((multiplier - 1) * 100)
}

/** Season progress as a fraction from 0 to 1. */
const seasonProgress = computed(() => ui.seasonElapsed / SEASON_DURATION)

/** Image path for the current season icon (warm or cold). */
const seasonIcon = computed(() => ui.season.isWarm ? IMG_SEASON_WARM : IMG_SEASON_COLD)

/** Cached time estimates (full-in / empty-in) per resource, or null when stable. */
const timeEstimates = computed(() => {
  const map = {}
  for (const resource of HEADER_RESOURCES) {
    map[resource] = timeEstimate(resource)
  }
  return map
})

// Dismiss idle workers
const canDismiss = computed(() => ui.idleWorkers > 0)
const dismissTooltip = computed(() => canDismiss.value ? t('house.dismissWorker') : t('house.noIdleWorkers'))

function dismissWorker(event) {
  if (!canDismiss.value) {
    return
  }
  playTap()
  const count = event.ctrlKey || event.metaKey ? BULK_WORKER_AMOUNT : 1
  state.dismissWorkers(count)
  syncResources(); syncProduction(); syncEvents(); syncTutorial()
}

/** Building thumbnail path; special-cases HQ to use type-specific image.
 * @param {object} building - Building grid entry with key and img
 * @returns {string} Image asset path for the building
 */
function getBuildingImg(building) {
  if (building.key === BUILDING_HEADQUARTERS) {
    return IMG_BUILDING_HEADQUARTERS_MAP[ui.hqType]
  }
  return building.img
}

/** Set of unlocked building keys based on current HQ type progression. */
const unlockedBuildings = computed(() => {
  const set = new Set([BUILDING_HEADQUARTERS])
  const currentTypeIndex = HQ_TYPES.indexOf(ui.hqType)
  for (let i = 0; i <= currentTypeIndex; i++) {
    for (const key of HQ_BUILDING_UNLOCKS[HQ_TYPES[i]]) {
      set.add(key)
    }
  }
  return set
})

/** Set of visible resource keys based on current HQ type progression. */
const visibleResources = computed(() => {
  const set = new Set()
  const currentTypeIndex = HQ_TYPES.indexOf(ui.hqType)
  for (let i = 0; i <= currentTypeIndex; i++) {
    for (const key of HQ_RESOURCE_UNLOCKS[HQ_TYPES[i]]) {
      set.add(key)
    }
  }
  return set
})

const props = defineProps({
  initialState: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits([
  EMIT_QUIT,
  EMIT_RESTART,
])
const showModal = ref(false)
const state = props.initialState
const showClearConfirm = ref(false)
const showConfirmQuit = ref(false)
const showConfirmRestart = ref(false)
const showConfirmLoad = ref(false)
const showSettingsModal = ref(false)
const showResearchModal = ref(false)
const showMarketModal = ref(false)
const showMilitaryModal = ref(false)
const showChallengeModal = ref(false)
const showSaveIndicator = ref(false)
const saveIndicatorKey = ref('notifications.gameSaved') // i18n key of the save/load result shown
const saveIndicatorFailed = ref(false) // Whether the indicator shows a failure (red styling)
const hasSavedGame = ref(storage.savedGame !== null)
let saveIndicatorTimer = null
let autosaveTimer = null
let autosaveElapsed = 0 // ms of play time already counted toward the next autosave
let autosaveResumedAt = 0 // performance.now() when the running countdown started

const ui = shallowReactive({
  season: {
    currentSeason: '',
    isWarm: true,
    foodModifierPercent: 0,
    woodModifierPercent: 0,
  },
  seasonElapsed: 0,
  year: 1,
  resources: {
    territory: 0,
    workers: 0,
    [RESOURCE_FOOD]: 0,
    [RESOURCE_WOOD]: 0,
    [RESOURCE_STONE]: 0,
    [RESOURCE_COPPER]: 0,
    [RESOURCE_IRON]: 0,
    [RESOURCE_GOLD]: 0,
    [RESOURCE_FAITH]: 0,
    [RESOURCE_KNOWLEDGE]: 0,
  },
  storageCap: 0,
  storageBonus: 0,
  habitationBonus: 0,
  idleWorkers: 0,
  workersCap: 0,
  territoryCap: 0,
  hqType: HQ_TYPE_CAMP,
  production: {
    [RESOURCE_FOOD]: 0,
    [RESOURCE_WOOD]: 0,
    [RESOURCE_STONE]: 0,
    [RESOURCE_COPPER]: 0,
    [RESOURCE_IRON]: 0,
    [RESOURCE_GOLD]: 0,
    [RESOURCE_FAITH]: 0,
    [RESOURCE_KNOWLEDGE]: 0,
  },
  consumption: {
    [RESOURCE_FOOD]: 0,
    [RESOURCE_WOOD]: 0,
  },
  netProduction: {
    [RESOURCE_FOOD]: 0,
    [RESOURCE_WOOD]: 0,
    [RESOURCE_STONE]: 0,
    [RESOURCE_COPPER]: 0,
    [RESOURCE_IRON]: 0,
    [RESOURCE_GOLD]: 0,
    [RESOURCE_FAITH]: 0,
    [RESOURCE_KNOWLEDGE]: 0,
  },
  productionMultipliers: {
    [RESOURCE_FOOD]: 1,
    [RESOURCE_WOOD]: 1,
    [RESOURCE_STONE]: 1,
    [RESOURCE_COPPER]: 1,
    [RESOURCE_IRON]: 1,
    [RESOURCE_GOLD]: 1,
    [RESOURCE_FAITH]: 1,
    [RESOURCE_KNOWLEDGE]: 1,
  },
  consumptionMultipliers: {
    [RESOURCE_FOOD]: 1,
    [RESOURCE_WOOD]: 1,
  },
  armyConsumption: {
    [RESOURCE_FOOD]: 0,
    [RESOURCE_WOOD]: 0,
  },
  productivity: 1,
  gameSpeed: GAME_SPEED_DEFAULT,
  buildings: {},
  hq: {},
  expansionCost: null,
  academy: {
    completed: new Set(),
    activeKeys: new Set(),
    activeTimers: {},
  },
  market: {
    feePercent: 0,
    fee: 0,
    basePrices: {},
  },
  military: {
    units: [],
    wallLevel: 0,
    wallAbsorb: 0,
    towerLevel: 0,
    towerArchers: 0,
    raid: null,
    forecast: null,
  },
  raidReport: null,
  futureEvents: [],
  pastEvents: [],
  challenges: {
    active: null,
    totalCount: 10,
    allCompleted: false,
    activeBlessingChoices: [],
    activePunishment: null,
  },
  challengeModal: null,
  activeBlessings: [],
  activePunishments: [],
  tutorial: {
    stepTextKey: null,
    stepBuilding: null,
    stepBuildingImg: null,
    stepNumber: 0,
    isActive: false,
    activeModal: null,
    activeModalTitle: null,
    activeModalBody: null,
  },
})

/** Maps a Blessing instance to a plain UI snapshot for template rendering.
 * @param {Object} blessing - Blessing model instance
 * @returns {Object} Plain object with type, timeout, effectKey, effectParams
 */
function blessingToUIEntry(blessing) {
  const effectKey = `blessing.${blessing.type}.effect`
  let effectParams = []
  if (blessing.productivity !== null) {
    effectParams = [Math.round(blessing.productivity * 100)]
  } else if (blessing.construction !== null) {
    effectParams = [Math.round(blessing.construction * 100)]
  } else if (blessing.warm !== null && blessing.cold !== null) {
    effectParams = [
      Math.round(blessing.warm * 100),
      Math.round(blessing.cold * 100),
    ]
  }
  return {
    type: blessing.type,
    timeout: blessing.timeout,
    effectKey: effectKey,
    effectParams: effectParams,
  }
}

/**
 * Converts an active punishment into a plain UI entry for the events column.
 * @param {Object} punishment - Punishment model instance
 * @returns {Object} Plain object with type, timeout, icon, effectKey, effectParams
 */
function punishmentToUIEntry(punishment) {
  const effectKey = `punishment.${punishment.type}.effect`
  let effectParams = []
  if (punishment.productivityFarm !== null) {
    effectParams = [Math.round(punishment.productivityFarm * 100)]
  } else if (punishment.productivityWoodcutter !== null) {
    effectParams = [Math.round(punishment.productivityWoodcutter * 100)]
  } else if (punishment.productivityMines !== null) {
    effectParams = [Math.round(punishment.productivityMines * 100)]
  } else if (punishment.productivityGeneral !== null) {
    effectParams = [Math.round(punishment.productivityGeneral * 100)]
  }
  return {
    type: punishment.type,
    timeout: punishment.timeout,
    icon: IMG_PUNISHMENT_MAP[punishment.type],
    effectKey: effectKey,
    effectParams: effectParams,
  }
}

/** Fast-path sync: updates only time-sensitive fields that change every rAF frame
 * (season elapsed, construction/upgrade remaining, research timers, event countdowns).
 */
function syncTimers() {
  const {
    colony,
  } = state
  const {
    buildings, season, events,
  } = colony

  ui.seasonElapsed = season.seasonElapsed

  const seasonMultipliers = state.seasonMultipliers ?? {
    food: 1,
    wood: 1,
  }
  const foodModifierPercent = Math.round((seasonMultipliers.food - 1) * 100)
  const woodModifierPercent = Math.round((seasonMultipliers.wood - 1) * 100)
  if (ui.season.currentSeason !== season.currentSeason
    || ui.season.isWarm !== season.isWarm
    || ui.season.foodModifierPercent !== foodModifierPercent
    || ui.season.woodModifierPercent !== woodModifierPercent) {
    ui.season = {
      currentSeason: season.currentSeason,
      isWarm: season.isWarm,
      foodModifierPercent: foodModifierPercent,
      woodModifierPercent: woodModifierPercent,
    }
  }
  ui.year = colony.year

  // Only rebuild building snapshots if any construction is active
  if (state._constructingKeys.size > 0 || state._hqUpgrading) {
    const buildingSnapshot = {
      ...ui.buildings,
    }
    for (const key of state._constructingKeys) {
      const building = buildings[key]
      buildingSnapshot[key] = {
        ...buildingSnapshot[key],
        constructionRemaining: building.constructionRemaining,
        isConstructing: building.isConstructing,
        level: building.level,
        isUnbuilt: building.isUnbuilt,
      }
    }
    ui.buildings = buildingSnapshot

    if (state._hqUpgrading || buildings.headquarters.isConstructing) {
      const hq = buildings.headquarters
      ui.hq = {
        ...ui.hq,
        constructionRemaining: hq.constructionRemaining,
        isConstructing: hq.isConstructing,
        upgradeRemaining: hq.upgradeRemaining,
        isUpgrading: hq.isUpgrading,
        level: hq.level,
        isUnbuilt: hq.isUnbuilt,
        type: hq.type,
        isMaxType: hq.isMaxType,
        nextType: hq.nextType,
      }
    }
  }

  // Research timers (frozen while the academy is at level 0)
  if (buildings.academy.active.size > 0 && !buildings.academy.isResearchPaused) {
    const activeTimers = {}
    for (const [
      key,
      research,
    ] of buildings.academy.active) {
      activeTimers[key] = {
        remainingSeconds: research.remainingSeconds,
        duration: research.duration,
      }
    }
    ui.academy = {
      ...ui.academy,
      activeTimers: activeTimers,
    }
  }

  // Event countdowns
  if (events.future.length > 0) {
    const researchPaused = buildings.academy.isResearchPaused
    ui.futureEvents = events.sortedFuture.map(event => ({
      id: event.id,
      icon: event.icon,
      textKey: event.textKey,
      params: event.params,
      remainingSeconds: event.remainingSeconds,
      paused: researchPaused && event.researchKey !== null,
      action: event.action,
      requirementsMet: event.type === EVENT_TYPE_CHALLENGE_STARTED && state.areChallengeRequirementsMet(),
    }))
  } else {
    ui.futureEvents = []
  }

  // Blessing countdown timers
  const activeBlessings = state.meta.challenges.activeBlessings
  if (activeBlessings.length > 0) {
    const updatedBlessings = []
    for (const blessing of activeBlessings) {
      if (blessing.timeout !== null && blessing.timeout > 0) {
        const existing = ui.activeBlessings.find(entry => entry.type === blessing.type)
        if (existing) {
          updatedBlessings.push({
            ...existing,
            timeout: blessing.timeout,
          })
        }
      }
    }
    ui.activeBlessings = updatedBlessings
  } else if (ui.activeBlessings.length > 0) {
    ui.activeBlessings = []
  }

  // Punishment countdown timers
  const activePunishments = state.meta.challenges.activePunishments
  if (activePunishments.length > 0) {
    const updatedPunishments = []
    for (const punishment of activePunishments) {
      if (punishment.timeout !== null && punishment.timeout > 0) {
        const existing = ui.activePunishments.find(entry => entry.type === punishment.type)
        if (existing) {
          updatedPunishments.push({
            ...existing,
            timeout: punishment.timeout,
          })
        }
      }
    }
    ui.activePunishments = updatedPunishments
  } else if (ui.activePunishments.length > 0) {
    ui.activePunishments = []
  }

  // Challenge timer (smooth countdown)
  if (ui.challenges.active && state.meta.challenges.active && state.meta.challenges.active.status === CHALLENGE_STATUS_STARTED) {
    const active = state.meta.challenges.active
    ui.challenges = {
      ...ui.challenges,
      active: {
        ...ui.challenges.active,
        timeoutElapsed: active.timeoutElapsed,
      },
    }
  }

  // Raid countdown; a full military sync when the raid was just announced, resolved or called off
  const raid = state.colony.military.raid
  const raidIncoming = raid?.phase === RAID_PHASE_INCOMING
  if (raidIncoming !== (ui.military.raid !== null) || (state.raidReport !== null) !== (ui.raidReport !== null)) {
    syncMilitary()
  } else if (raidIncoming && ui.military.raid.remainingSeconds !== raid.remainingSeconds) {
    ui.military = {
      ...ui.military,
      raid: {
        ...ui.military.raid,
        remainingSeconds: raid.remainingSeconds,
      },
    }
  }

  // Challenge modal state (may have changed from advanceChallenges)
  if (state.challengeModal !== ui.challengeModal) {
    syncChallenges()
  }

  if (state.meta.tutorial.activeModal) {
    syncTutorial()
  }
}

/** Converts a Cost (or null) into a flat array of [resourceKey, amount] pairs for template iteration. */
function costToEntries(cost) {
  return cost ? [...cost.entries] : []
}

/** Syncs season and year. */
function syncSeason() {
  const {
    season,
  } = state.colony
  const seasonMultipliers = state.seasonMultipliers ?? {
    food: 1,
    wood: 1,
  }
  ui.season = {
    currentSeason: season.currentSeason,
    isWarm: season.isWarm,
    foodModifierPercent: Math.round((seasonMultipliers.food - 1) * 100),
    woodModifierPercent: Math.round((seasonMultipliers.wood - 1) * 100),
  }
  ui.seasonElapsed = season.seasonElapsed
  ui.year = state.colony.year
}

/** Syncs resources, storage cap, idle workers, workers cap, territory cap, and HQ type. */
function syncResources() {
  const {
    colony,
  } = state
  const {
    resources, buildings,
  } = colony
  ui.resources = {
    territory: resources.territory,
    workers: resources.workers,
    food: resources.food,
    wood: resources.wood,
    stone: resources.stone,
    copper: resources.copper,
    iron: resources.iron,
    gold: resources.gold,
    faith: resources.faith,
    knowledge: resources.knowledge,
  }
  const bonuses = buildings.academy.completedBonuses(RESEARCH_TREE)
  const storageBonus = bonuses[BONUS_STORAGE_CAPACITY] ?? 0
  ui.storageCap = buildings.storehouse.storageCap(storageBonus)
  ui.storageBonus = storageBonus
  const habitationBonus = bonuses[BONUS_HABITATION] ?? 0
  ui.habitationBonus = habitationBonus
  ui.idleWorkers = colony.idleWorkers
  ui.workersCap = buildings.house.workersCap
  ui.territoryCap = buildings.headquarters.territoryCap + resources.territoryBonus
  ui.hqType = buildings.headquarters.type
}

/** Syncs production, consumption, and net production rates. */
function syncProduction() {
  const {
    production, consumption,
  } = state
  ui.production = {
    [RESOURCE_FOOD]: production[RESOURCE_FOOD],
    [RESOURCE_WOOD]: production[RESOURCE_WOOD],
    [RESOURCE_STONE]: production[RESOURCE_STONE],
    [RESOURCE_COPPER]: production[RESOURCE_COPPER],
    [RESOURCE_IRON]: production[RESOURCE_IRON],
    [RESOURCE_GOLD]: production[RESOURCE_GOLD],
    [RESOURCE_FAITH]: production[RESOURCE_FAITH],
    [RESOURCE_KNOWLEDGE]: production[RESOURCE_KNOWLEDGE],
  }
  ui.consumption = {
    [RESOURCE_FOOD]: consumption[RESOURCE_FOOD],
    [RESOURCE_WOOD]: consumption[RESOURCE_WOOD],
  }
  ui.netProduction = {
    [RESOURCE_FOOD]: state.netProduction(RESOURCE_FOOD),
    [RESOURCE_WOOD]: state.netProduction(RESOURCE_WOOD),
    [RESOURCE_STONE]: state.netProduction(RESOURCE_STONE),
    [RESOURCE_COPPER]: state.netProduction(RESOURCE_COPPER),
    [RESOURCE_IRON]: state.netProduction(RESOURCE_IRON),
    [RESOURCE_GOLD]: state.netProduction(RESOURCE_GOLD),
    [RESOURCE_FAITH]: state.netProduction(RESOURCE_FAITH),
    [RESOURCE_KNOWLEDGE]: state.netProduction(RESOURCE_KNOWLEDGE),
  }
  ui.productionMultipliers = {
    [RESOURCE_FOOD]: state.productionMultipliers[RESOURCE_FOOD],
    [RESOURCE_WOOD]: state.productionMultipliers[RESOURCE_WOOD],
    [RESOURCE_STONE]: state.productionMultipliers[RESOURCE_STONE],
    [RESOURCE_COPPER]: state.productionMultipliers[RESOURCE_COPPER],
    [RESOURCE_IRON]: state.productionMultipliers[RESOURCE_IRON],
    [RESOURCE_GOLD]: state.productionMultipliers[RESOURCE_GOLD],
    [RESOURCE_FAITH]: state.productionMultipliers[RESOURCE_FAITH],
    [RESOURCE_KNOWLEDGE]: state.productionMultipliers[RESOURCE_KNOWLEDGE],
  }
  ui.consumptionMultipliers = {
    [RESOURCE_FOOD]: state.consumptionMultipliers[RESOURCE_FOOD],
    [RESOURCE_WOOD]: state.consumptionMultipliers[RESOURCE_WOOD],
  }
  ui.armyConsumption = {
    [RESOURCE_FOOD]: state.armyConsumption[RESOURCE_FOOD],
    [RESOURCE_WOOD]: state.armyConsumption[RESOURCE_WOOD],
  }
  ui.productivity = state.productivity
  ui.gameSpeed = state.meta.gameSpeed
}

/** Syncs all building snapshots. */
function syncAllBuildings() {
  const {
    buildings,
  } = state.colony
  const buildingSnapshot = {}
  for (const [
    key,
    building,
  ] of Object.entries(buildings)) {
    const cost = building.levelUpCost
    buildingSnapshot[key] = {
      level: building.level,
      isUnbuilt: building.isUnbuilt,
      isConstructing: building.isConstructing,
      constructionRemaining: building.constructionRemaining,
      constructionDuration: building.constructionDuration,
      levelUpCost: cost,
      levelUpCostEntries: costToEntries(cost),
      isProducer: 'workers' in building,
      workers: building.workers ?? 0,
      maxWorkers: building.maxWorkers ?? 0,
      isEmpty: building.isEmpty ?? true,
      isFull: building.isFull ?? false,
    }
  }
  ui.buildings = buildingSnapshot
}

/** Syncs a single building snapshot by key. */
function syncBuilding(key) {
  const building = state.colony.buildings[key]
  const cost = building.levelUpCost
  ui.buildings = {
    ...ui.buildings,
    [key]: {
      level: building.level,
      isUnbuilt: building.isUnbuilt,
      isConstructing: building.isConstructing,
      constructionRemaining: building.constructionRemaining,
      constructionDuration: building.constructionDuration,
      levelUpCost: cost,
      levelUpCostEntries: costToEntries(cost),
      isProducer: 'workers' in building,
      workers: building.workers ?? 0,
      maxWorkers: building.maxWorkers ?? 0,
      isEmpty: building.isEmpty ?? true,
      isFull: building.isFull ?? false,
    },
  }
}

/** Syncs headquarters snapshot and expansion cost. */
function syncHQ() {
  const hq = state.colony.buildings.headquarters
  const hqUpgradeCost = hq.upgradeCost
  const expCost = state.expansionCost
  ui.hq = {
    level: hq.level,
    type: hq.type,
    isUnbuilt: hq.isUnbuilt,
    isConstructing: hq.isConstructing,
    constructionRemaining: hq.constructionRemaining,
    constructionDuration: hq.constructionDuration,
    isUpgrading: hq.isUpgrading,
    upgradeRemaining: hq.upgradeRemaining,
    upgradeDuration: hq.upgradeDuration,
    isMaxType: hq.isMaxType,
    nextType: hq.nextType,
    upgradeCost: hqUpgradeCost,
    upgradeCostEntries: costToEntries(hqUpgradeCost),
    levelUpCost: hq.levelUpCost,
    isProducer: false,
  }
  ui.expansionCost = expCost
  ui.expansionCostEntries = costToEntries(expCost)
}

/** Syncs academy state (completed, active, timers). */
function syncAcademy() {
  const academy = state.colony.buildings.academy
  const activeTimers = {}
  for (const [
    key,
    research,
  ] of academy.active) {
    activeTimers[key] = {
      remainingSeconds: research.remainingSeconds,
      duration: research.duration,
    }
  }
  ui.academy = {
    completed: new Set(academy.completed),
    activeKeys: new Set(academy.active.keys()),
    activeTimers: activeTimers,
  }
}

/** Syncs market prices and fee. */
function syncMarket() {
  const market = state.colony.buildings.market
  const basePrices = {}
  for (const resource of TRADEABLE_RESOURCES) {
    basePrices[resource] = market[resource]
  }
  const fee = market.effectiveTradeFee
  ui.market = {
    feePercent: Math.round(fee * 100),
    fee: fee,
    basePrices: basePrices,
  }
}

/** Syncs the army, defenses, the announced raid with its forecast, and the raid report. */
function syncMilitary() {
  const {
    resources, buildings, military,
  } = state.colony
  const raid = military.raid
  ui.military = {
    units: UNIT_TYPES.map(type => {
      const buildingKey = UNIT_BUILDINGS[type]
      const stats = UNIT_STATS[type]
      return {
        type: type,
        buildingKey: buildingKey,
        count: military.units[type],
        cap: buildings[buildingKey].unitCap,
        unlocked: unlockedBuildings.value.has(buildingKey),
        cost: stats.cost,
        costEntries: costToEntries(stats.cost),
        canAfford: resources.canAfford(stats.cost),
        upkeep: stats.upkeep,
      }
    }),
    wallLevel: buildings.wall.level,
    wallAbsorb: buildings.wall.absorb,
    towerLevel: buildings.tower.level,
    towerArchers: buildings.tower.archers,
    // The waiting timer stays hidden; only an announced raid is shown
    raid: raid?.phase === RAID_PHASE_INCOMING
      ? {
        remainingSeconds: raid.remainingSeconds,
        enemy: {
          ...raid.enemy,
        },
        enemyCount: raid.enemyCount,
        canDelay: raid.canDelay,
        delayCost: raid.delayCost,
        delayCostEntries: costToEntries(raid.delayCost),
        cancelCost: raid.cancelCost,
        cancelCostEntries: costToEntries(raid.cancelCost),
      }
      : null,
    forecast: state._raidForecast,
  }
  ui.raidReport = state.raidReport ? state.raidReport.toJSON() : null
}

/** Syncs future and past events. */
function syncEvents() {
  const {
    events, buildings,
  } = state.colony
  const researchPaused = buildings.academy.isResearchPaused
  ui.futureEvents = events.sortedFuture.map(event => ({
    id: event.id,
    icon: event.icon,
    textKey: event.textKey,
    params: event.params,
    remainingSeconds: event.remainingSeconds,
    paused: researchPaused && event.researchKey !== null,
    action: event.action,
    requirementsMet: event.type === EVENT_TYPE_CHALLENGE_STARTED && state.areChallengeRequirementsMet(),
  }))
  ui.pastEvents = events.sortedPast.map(event => ({
    id: event.id,
    icon: event.icon,
    textKey: event.textKey,
    params: event.params,
  }))
}

/** Syncs tutorial state. */
function syncTutorial() {
  const {
    tutorial,
  } = state.meta
  const step = TUTORIAL_STEPS[tutorial.currentStep]
  const modalConfig = tutorial.activeModal ? TUTORIAL_MODALS[tutorial.activeModal] : null
  ui.tutorial = {
    stepTextKey: step?.textKey ?? null,
    stepHintKey: step?.hintKey ?? null,
    stepBuilding: step?.building ?? null,
    stepBuildingImg: step?.building ? BUILDING_IMAGE_MAP[step.building] : null,
    stepNumber: tutorial.currentStep + 1,
    isActive: tutorial.isActive,
    activeModal: tutorial.activeModal,
    activeModalTitle: modalConfig?.titleKey ?? null,
    activeModalBody: modalConfig?.bodyKey ?? null,
  }
}

/** Syncs challenge state. */
function syncChallenges() {
  const {
    challenges,
  } = state.meta
  const active = challenges.active
  ui.challenges = {
    active: active
      ? {
        index: active.index,
        status: active.status,
        isStarted: active.status === CHALLENGE_STATUS_STARTED,
        timeout: active.timeout,
        timeoutElapsed: active.timeoutElapsed,
        requirements: active.requirements,
        blessings: active.blessings,
        punishment: active.punishment,
        mood: active.mood,
      }
      : null,
    totalCount: challenges.totalCount,
    allCompleted: challenges.allCompleted,
    activeBlessingChoices: active ? active.blessings.map(blessing => ({
      type: blessing.type,
      timeout: blessing.timeout,
      productivity: blessing.productivity,
      resources: blessing.resources,
      territory: blessing.territory,
      construction: blessing.construction,
      warm: blessing.warm,
      cold: blessing.cold,
    })) : [],
    activePunishment: active ? {
      type: active.punishment.type,
      timeout: active.punishment.timeout,
      faith: active.punishment.faith,
      productivityFarm: active.punishment.productivityFarm,
      productivityWoodcutter: active.punishment.productivityWoodcutter,
      productivityMines: active.punishment.productivityMines,
      productivityGeneral: active.punishment.productivityGeneral,
      resources: active.punishment.resources,
      workers: active.punishment.workers,
      levels: active.punishment.levels,
    } : null,
  }
  ui.challengeModal = state.challengeModal
  ui.activeBlessings = state.meta.challenges.activeBlessings
    .filter(blessing => blessing.timeout !== null && blessing.timeout > 0)
    .map(blessingToUIEntry)
  ui.activePunishments = state.meta.challenges.activePunishments
    .filter(punishment => punishment.timeout !== null && punishment.timeout > 0)
    .map(punishmentToUIEntry)
}

/** Full sync: copies all values the templates need from the plain engine state into the reactive ui object. */
function syncUI() {
  syncSeason()
  syncResources()
  syncProduction()
  syncAllBuildings()
  syncHQ()
  syncAcademy()
  syncMarket()
  syncMilitary()
  syncEvents()
  syncChallenges()
  syncTutorial()
}

syncUI()

const actions = {
  levelUpBuilding: (key) => {
    state.levelUpBuilding(key)
    syncResources(); syncProduction(); syncBuilding(key); syncEvents(); syncTutorial()
    if (key === BUILDING_HEADQUARTERS) {
      syncHQ()
    }
  },
  downgradeBuilding: (key) => {
    state.downgradeBuilding(key)
    syncResources(); syncProduction(); syncBuilding(key); syncEvents(); syncTutorial()
  },
  expandTerritory: () => {
    state.expandTerritory()
    syncResources(); syncProduction(); syncHQ(); syncEvents(); syncTutorial()
  },
  upgradeHeadquarters: () => {
    state.upgradeHeadquarters()
    syncResources(); syncProduction(); syncHQ(); syncEvents(); syncTutorial()
  },
  recruitWorker: () => {
    state.recruitWorker()
    syncResources(); syncProduction(); syncEvents(); syncTutorial()
  },
  assignWorkers: (key, count) => {
    state.assignWorkers(key, count)
    syncResources(); syncProduction(); syncBuilding(key); syncEvents(); syncTutorial()
  },
  unassignWorkers: (key, count) => {
    state.unassignWorkers(key, count)
    syncResources(); syncProduction(); syncBuilding(key); syncEvents(); syncTutorial()
  },
  startResearch: (key) => {
    state.startResearch(key)
    syncResources(); syncProduction(); syncAcademy(); syncEvents(); syncTutorial()
  },
  executeTrade: (resource, direction, amount) => {
    state.executeTrade(resource, direction, amount)
    syncResources(); syncProduction(); syncMarket(); syncEvents(); syncTutorial()
  },
  dismissEvent: (id) => {
    state.colony.events.dismiss(id)
    syncEvents()
  },
  dismissAllPast: () => {
    state.colony.events.dismissAllPast()
    syncEvents()
  },
  selectBlessing: (index) => {
    state.selectBlessing(index)
    resumeClocks()
    syncUI()
  },
  acknowledgePunishment: () => {
    state.acknowledgePunishment()
    resumeClocks()
    syncUI()
  },
  buyUnits: (type, count) => {
    state.buyUnits(type, count)
    syncResources(); syncProduction(); syncMilitary(); syncEvents(); syncTutorial()
  },
  dismissUnits: (type, count) => {
    state.dismissUnits(type, count)
    syncResources(); syncProduction(); syncMilitary(); syncEvents(); syncTutorial()
  },
  payTribute: (kind) => {
    state.payTribute(kind)
    syncResources(); syncProduction(); syncMilitary(); syncEvents()
  },
  acknowledgeRaid: () => {
    state.acknowledgeRaid()
    resumeClocks()
    syncUI()
  },
}

provide('ui', ui)
provide('actions', actions)
provide('openResearchModal', () => {
  audio.playSound(SND_OPEN_ACADEMY)
  showResearchModal.value = true
})
provide('openMarketModal', () => {
  audio.playSound(SND_OPEN_MARKET)
  showMarketModal.value = true
})
provide('openChallengeModal', () => {
  showChallengeModal.value = true
})
provide('openMilitaryModal', () => {
  showMilitaryModal.value = true
})

/** Writes the current game state to localStorage and flashes the save result. */
function persistGame() {
  const saved = storage.writeSavedGame(state.toJSON())
  if (saved) {
    hasSavedGame.value = true
  }
  flashSaveIndicator(saved ? 'notifications.gameSaved' : 'notifications.saveFailed', !saved)
}

/** Saves the current game state and closes the pause modal. */
function saveGame() {
  persistGame()
  showModal.value = false
}

/** Shows the save indicator for 1.5 seconds.
 * @param {string} messageKey - i18n key of the save/load result to show
 * @param {boolean} failed - Whether the result is a failure (red styling)
 */
function flashSaveIndicator(messageKey, failed) {
  saveIndicatorKey.value = messageKey
  saveIndicatorFailed.value = failed
  showSaveIndicator.value = true
  clearTimeout(saveIndicatorTimer)
  saveIndicatorTimer = setTimeout(() => {
    showSaveIndicator.value = false
  }, 1500)
}

/** Starts the autosave countdown if autosave is enabled, resuming from the play time already
 * counted toward the next save. Disabling autosave discards that progress.
 */
function startAutosave() {
  stopAutosave()
  if (storage.autosaveEnabled) {
    const interval = storage.autosaveInterval * 60 * 1000
    autosaveResumedAt = performance.now()
    autosaveTimer = setTimeout(runAutosave, Math.max(0, interval - autosaveElapsed))
  } else {
    autosaveElapsed = 0
  }
}

/** Saves the game and starts a fresh autosave countdown. */
function runAutosave() {
  autosaveTimer = null
  autosaveElapsed = 0
  persistGame()
  startAutosave()
}

/** Stops the autosave countdown, keeping the play time already counted toward the next save. */
function stopAutosave() {
  if (autosaveTimer !== null) {
    clearTimeout(autosaveTimer)
    autosaveTimer = null
    autosaveElapsed += performance.now() - autosaveResumedAt
  }
}

/** Handles settings modal close — resumes the autosave countdown with current settings. */
function closeSettings() {
  showSettingsModal.value = false
  if (!showModal.value) {
    startAutosave()
  }
}

/** Shows the confirm load modal from the pause menu. */
function handleLoadRequest() {
  showModal.value = false
  showConfirmLoad.value = true
}

/** Cancels load and returns to the pause modal. */
function cancelLoad() {
  showConfirmLoad.value = false
  showModal.value = true
}

/**
 * Restores the saved game from localStorage and restarts with it. A missing or unreadable save
 * (e.g. overwritten from another tab since the menu opened) keeps the current game, returns to the
 * pause menu, and flashes "Load Failed".
 */
function confirmLoad() {
  const savedData = storage.savedGame
  const restoredState = savedData ? State.fromJSON(savedData) : null
  if (!restoredState) {
    cancelLoad()
    flashSaveIndicator('notifications.loadFailed', true)
    return
  }
  emit(EMIT_RESTART, restoredState)
}

/** Opens the settings modal on top of the pause modal. */
function openSettings() {
  showSettingsModal.value = true
}

/** Shows the confirm restart modal from the pause menu. */
function handleRestartRequest() {
  showModal.value = false
  showConfirmRestart.value = true
}

/** Cancels restart and returns to the pause modal. */
function cancelRestart() {
  showConfirmRestart.value = false
  showModal.value = true
}

/** Restarts the game with a fresh state. */
function confirmRestart() {
  storage.deleteSavedGame()
  hasSavedGame.value = false
  emit(EMIT_RESTART, null)
}

/** Shows the confirm quit modal from the pause menu. */
function handleQuitRequest() {
  showModal.value = false
  showConfirmQuit.value = true
}

/** Cancels quit and returns to the pause modal. */
function cancelQuit() {
  showConfirmQuit.value = false
  showModal.value = true
}

/** Quits to the home screen without saving. */
function confirmQuit() {
  emit(EMIT_QUIT)
}

/** Clears all past events and closes the confirmation modal. */
function clearAllPast() {
  actions.dismissAllPast()
  showClearConfirm.value = false
}

/** Handles clicking a future event with an action. */
function handleEventAction(action) {
  playTap()
  if (action === 'openChallengeModal') {
    showChallengeModal.value = true
  } else if (action === 'openMilitaryModal') {
    showMilitaryModal.value = true
  }
}

/** Handles "Continue Playing" from win modal. Unpauses without creating duplicate loops
 * since the existing setInterval/rAF loops are still alive (they just skip when paused).
 */
function handleWinContinue() {
  state.continueAfterWin()
  resumeClocks()
  syncUI()
}

/** Handles "Return Home" from win modal. */
function handleWinQuit() {
  emit(EMIT_QUIT)
}

/** Dismisses the active tutorial modal, shows any queued explanation, and syncs UI. */
function dismissTutorialModal() {
  if (state.meta.tutorial.activeModal) {
    state.dismissTutorialModal()
    if (!state.paused) {
      resumeClocks()
    }
    syncUI()
  }
}

/** Increases game speed to the next available option. No-op at maximum. */
function speedUp() {
  const idx = GAME_SPEED_OPTIONS.indexOf(state.meta.gameSpeed)
  if (idx < GAME_SPEED_OPTIONS.length - 1) {
    state.meta.gameSpeed = GAME_SPEED_OPTIONS[idx + 1]
    ui.gameSpeed = state.meta.gameSpeed
  }
}

/** Decreases game speed to the previous available option. No-op at minimum. */
function speedDown() {
  const idx = GAME_SPEED_OPTIONS.indexOf(state.meta.gameSpeed)
  if (idx > 0) {
    state.meta.gameSpeed = GAME_SPEED_OPTIONS[idx - 1]
    ui.gameSpeed = state.meta.gameSpeed
  }
}

let tickTimer = null
let lastTickTime = 0
let progressAnimFrame = null
let lastProgressTickTime = 0
const MAX_TICK_DELTA = 5 // Max game-time delta (seconds) per simulation step
const MAX_CATCH_UP_GAP = 300 // Max real-time gap (seconds) credited in full; longer gaps are sleep/wake and credit one step
const MAX_CATCH_UP_DELTA = MAX_CATCH_UP_GAP * Math.max(...GAME_SPEED_OPTIONS) // Max game seconds per catch-up, even if a hand-edited save holds an out-of-range speed
const UI_SYNC_INTERVAL = 50 // ms (~20fps visual updates)
let lastUISyncTime = 0
let pausedAt = null // performance.now() when the current pause began, or null while running

// --- Perf overlay ---
const perfOverlay = ref(null)
const PERF_STALE_GAP = 1000 // ms; a longer real gap between frames (background tab, sleep) discards the perf sample
let perfVisible = LOCAL_HOSTNAMES.includes(window.location.hostname) // Shown by default only when running locally; F3 toggles it
let perfFrameCount = 0
let perfFrameTimeSum = 0
let perfLastFrameTime = 0 // performance.now() of the previous rAF frame, paused frames included
let perfLastSample = 0
let perfSyncUITime = 0
let perfSyncUICount = 0
let perfSyncTimersTime = 0
let perfSyncTimersCount = 0
let perfGameTickTime = 0
let perfGameTickCount = 0
const perfHasMemory = typeof performance !== 'undefined' && !!performance.memory

/**
 * Discards the counters collected so far and starts a new perf sample.
 * @param {number} now - performance.now() timestamp the new sample starts at
 */
function resetPerfSample(now) {
  perfFrameCount = 0
  perfFrameTimeSum = 0
  perfSyncUITime = 0
  perfSyncUICount = 0
  perfSyncTimersTime = 0
  perfSyncTimersCount = 0
  perfGameTickTime = 0
  perfGameTickCount = 0
  perfLastSample = now
}

/**
 * Converts elapsed real time into game seconds to simulate. Gaps up to MAX_CATCH_UP_GAP (e.g. throttled
 * background-tab timers) count in full; longer gaps are sleep/wake and count as a single step.
 * @param {number} elapsedMilliseconds - Real milliseconds since the last tick
 * @returns {number} Game seconds to simulate
 */
function gameDelta(elapsedMilliseconds) {
  const elapsedSeconds = elapsedMilliseconds / 1000
  if (elapsedSeconds > MAX_CATCH_UP_GAP) {
    return MAX_TICK_DELTA
  }
  return Math.min(MAX_CATCH_UP_DELTA, elapsedSeconds * state.meta.gameSpeed)
}

/**
 * Records when the game paused, once per pause, so resuming can skip exactly the paused time.
 * The loop clocks stay frozen while paused, keeping any production earned before the pause.
 * @param {number} now - performance.now() timestamp of the step that saw the pause
 */
function markPauseStart(now) {
  if (state.paused && pausedAt === null) {
    pausedAt = now
  }
}

/**
 * Shifts the loop clocks forward by the paused time once the game runs again, so the next tick
 * and frame credit only running time. No-op while the game is still paused.
 */
function resumeClocks() {
  if (state.paused) {
    return
  }
  const now = performance.now()
  if (pausedAt !== null) {
    const pausedDuration = now - pausedAt
    lastTickTime += pausedDuration
    lastProgressTickTime += pausedDuration
    pausedAt = null
  }
  lastUISyncTime = now
}

/**
 * Advances season, construction, research, challenge, event, and raid timers by one step
 * (the order lives in State.advanceProgress).
 * @param {number} delta - Game seconds to advance
 */
function advanceProgress(delta) {
  state.advanceProgress(delta)
}

/**
 * Simulates the time since the last tick in steps of at most MAX_TICK_DELTA, interleaving production with
 * progress when requested, and stops early if a modal pauses the game mid-gap.
 * @param {number} now - Current performance.now() timestamp
 * @param {boolean} includeProgress - Whether to also advance progress timers (rAF is suspended or behind)
 */
function catchUp(now, includeProgress) {
  let remaining = gameDelta(now - lastTickTime)
  lastTickTime = now
  let progressRemaining = 0
  if (includeProgress) {
    progressRemaining = gameDelta(now - lastProgressTickTime)
    lastProgressTickTime = now
  }
  while ((remaining > 0 || progressRemaining > 0) && !state.paused) {
    const step = Math.min(MAX_TICK_DELTA, remaining)
    const progressStep = Math.min(MAX_TICK_DELTA, progressRemaining)
    remaining -= step
    progressRemaining -= progressStep
    if (step > 0) {
      state.update(step)
      state.checkTutorial()
    }
    if (progressStep > 0) {
      advanceProgress(progressStep)
    }
  }
}

/** Main 1-second game loop: applies production, consumption, and advances visual progress. */
function gameTick() {
  const now = performance.now()
  if (state.paused) {
    markPauseStart(now)
    return
  }
  // Also advance progress when rAF is suspended (background tab) or more than a tick behind (first tick back from one)
  const tickStart = now
  catchUp(now, document.hidden || now - lastProgressTickTime > TICK_INTERVAL)
  markPauseStart(now)
  perfGameTickTime += performance.now() - tickStart
  perfGameTickCount++

  const syncStart = performance.now()
  syncUI()
  perfSyncUITime += performance.now() - syncStart
  perfSyncUICount++
}

/** rAF loop for smooth visual progress (season, construction, research, events). */
function progressTick() {
  if (state.paused) {
    const now = performance.now()
    markPauseStart(now)
    // Paused frames are left out of the perf sample
    perfLastFrameTime = now
    resetPerfSample(now)
    progressAnimFrame = requestAnimationFrame(progressTick)
    return
  }
  const now = performance.now()
  const prevConstructing = state._constructingKeys.size
  const prevHqUpgrading = state._hqUpgrading
  const prevResearchActive = state.colony.buildings.academy.active.size
  const prevBlessingCount = state.meta.challenges.activeBlessings.length
  // First frame back from a background tab (rAF was suspended): catch up production and progress together
  const resumed = now - lastProgressTickTime > TICK_INTERVAL
  const delta = resumed ? 0 : gameDelta(now - lastProgressTickTime)
  if (resumed) {
    catchUp(now, true)
  } else {
    lastProgressTickTime = now
    advanceProgress(delta)
  }
  markPauseStart(now)
  // Full sync after a catch-up, when a construction, upgrade, or research just completed, a blessing expired (e.g. the market fee changes), or a tutorial modal was triggered (always immediate)
  const justCompleted = resumed || state._constructingKeys.size < prevConstructing || (!state._hqUpgrading && prevHqUpgrading) || state.colony.buildings.academy.active.size < prevResearchActive || state.meta.challenges.activeBlessings.length < prevBlessingCount || state.paused
  if (justCompleted) {
    const t0 = performance.now()
    syncUI()
    perfSyncUITime += performance.now() - t0
    perfSyncUICount++
    lastUISyncTime = now
  } else if (now - lastUISyncTime >= UI_SYNC_INTERVAL) {
    const t0 = performance.now()
    syncTimers()
    perfSyncTimersTime += performance.now() - t0
    perfSyncTimersCount++
    lastUISyncTime = now
  }

  // Perf sampling uses real time between frames, unaffected by game speed (discard stale data after a long gap, e.g. a background tab)
  const frameGap = now - perfLastFrameTime
  perfLastFrameTime = now
  if (frameGap > PERF_STALE_GAP) {
    resetPerfSample(now)
  } else {
    perfFrameTimeSum += frameGap
  }
  perfFrameCount++
  if (perfVisible && now - perfLastSample >= 1000) {
    const element = perfOverlay.value
    if (element) {
      const elapsed = (now - perfLastSample) / 1000
      const fps = Math.round(perfFrameCount / elapsed)
      const avgFrame = (Math.floor((perfFrameTimeSum / perfFrameCount) * 10) / 10).toFixed(1)
      const avgSyncUI = perfSyncUICount ? (perfSyncUITime / perfSyncUICount).toFixed(2) : '—'
      const avgSyncTimers = perfSyncTimersCount ? (perfSyncTimersTime / perfSyncTimersCount).toFixed(2) : '—'
      const avgTick = perfGameTickCount ? (perfGameTickTime / perfGameTickCount).toFixed(2) : '—'
      let text = `FPS: ${fps}\nFrame: ${avgFrame}ms\nsyncUI: ${avgSyncUI}ms\nsyncTimers: ${avgSyncTimers}ms\ntick: ${avgTick}ms`
      if (perfHasMemory) {
        const usedBytes = performance.memory.usedJSHeapSize
        const limitBytes = performance.memory.jsHeapSizeLimit
        const usedLabel = usedBytes >= 1073741824 ? `${Math.round(usedBytes / 1073741824)} GB` : `${Math.round(usedBytes / 1048576)} MB`
        const limitLabel = limitBytes >= 1073741824 ? `${Math.round(limitBytes / 1073741824)} GB` : `${Math.round(limitBytes / 1048576)} MB`
        text += `\nHeap: ${usedLabel} / ${limitLabel}`
      }
      element.textContent = text
    }
    resetPerfSample(now)
  }

  progressAnimFrame = requestAnimationFrame(progressTick)
}

/** Toggles the pause modal when Escape is pressed (ignores input fields).
 * @param {KeyboardEvent} event - Keyboard event
 */
function handleKeydown(event) {
  if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
    return
  }
  // Ignore auto-repeat so holding Escape (e.g. to close stacked modals) doesn't flicker the pause menu
  if (event.key === 'Escape' && !event.repeat) {
    showModal.value = !showModal.value
  }
  if (event.key === 'F9') {
    event.preventDefault()
    // Ignore auto-repeat so holding F9 saves once
    if (!event.repeat) {
      persistGame()
    }
  }
  if (event.key === 'F3') {
    event.preventDefault()
    perfVisible = !perfVisible
    if (perfOverlay.value) {
      perfOverlay.value.style.display = perfVisible ? 'block' : 'none'
    }
    if (perfVisible) {
      // Counters kept running while hidden; start a fresh sample
      resetPerfSample(performance.now())
    }
  }
}

watch(showModal, (isOpen) => {
  if (isOpen) {
    state.paused = true
    markPauseStart(performance.now())
    clearInterval(tickTimer)
    tickTimer = null
    cancelAnimationFrame(progressAnimFrame)
    progressAnimFrame = null
    stopAutosave()
  } else if (!showConfirmQuit.value && !showConfirmRestart.value && !showConfirmLoad.value) {
    // A tutorial, challenge or raid result modal still on screen keeps the game paused; dismissing it unpauses.
    // Only values that render a modal count, so a hand-edited save can't leave the game paused with nothing to dismiss
    const challengeModalShown = [
      CHALLENGE_MODAL_REWARD,
      CHALLENGE_MODAL_FAILURE,
      CHALLENGE_MODAL_WIN,
    ].includes(state.challengeModal)
    if (!challengeModalShown && !state.meta.tutorial.activeModal && !state.raidReport) {
      state.paused = false
    }
    resumeClocks()
    const now = performance.now()
    perfLastFrameTime = now
    resetPerfSample(now)
    tickTimer = setInterval(gameTick, TICK_INTERVAL)
    progressAnimFrame = requestAnimationFrame(progressTick)
    startAutosave()
  }
})

// Close the challenge detail modal whenever a result modal appears, whichever loop resolved the challenge
watch(() => ui.challengeModal, (challengeModal) => {
  if (challengeModal) {
    showChallengeModal.value = false
  }
})

// Close the military window when the raid result window appears
watch(() => ui.raidReport, (raidReport) => {
  if (raidReport) {
    showMilitaryModal.value = false
  }
})

// A punishment or a lost raid can drop a mid-upgrade market or academy to level 0, which removes its card button; close its modal too
watch(() => ui.buildings[BUILDING_MARKET]?.level, (level) => {
  if (level < 1) {
    showMarketModal.value = false
  }
})
watch(() => ui.buildings[BUILDING_ACADEMY]?.level, (level) => {
  if (level < 1) {
    showResearchModal.value = false
  }
})

onMounted(() => {
  // Bubble phase: modals register in capture phase so they intercept Escape first
  window.addEventListener('keydown', handleKeydown)
  perfOverlay.value.style.display = perfVisible ? 'block' : 'none'
  const now = performance.now()
  lastTickTime = now
  lastProgressTickTime = now
  lastUISyncTime = now
  tickTimer = setInterval(gameTick, TICK_INTERVAL)
  progressAnimFrame = requestAnimationFrame(progressTick)
  startAutosave()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  clearInterval(tickTimer)
  cancelAnimationFrame(progressAnimFrame)
  clearTimeout(saveIndicatorTimer)
  stopAutosave()
})
</script>

<template>
  <div class="game-screen">
    <pre ref="perfOverlay" class="perf-overlay" />
    <header class="game-header">
      <!-- Season & year indicator -->
      <div class="header-season-group">
        <div class="header-section header-season">
          <div class="season-track" :class="'season-track--' + ui.season.currentSeason">
            <div class="season-fill" :style="{ width: (seasonProgress * 100) + '%' }" />
          </div>
        </div>
        <span class="header-year">
          <img class="season-icon" :src="seasonIcon" alt="">
          {{ t('screen.game.header.year') }} <span class="header-year-num">{{ ui.year }}</span>
        </span>

        <!-- Rich tooltip -->
        <div class="resource-tooltip">
          <span>{{ t('season.' + ui.season.currentSeason + 'Season') }}</span>
          <span class="resource-tooltip-time">{{ t('season.foodProduction') }}: {{ ui.season.foodModifierPercent >= 0 ? '+' : '' }}{{ ui.season.foodModifierPercent }}%</span>
          <span class="resource-tooltip-time">{{ t('season.woodConsumption') }}: {{ ui.season.woodModifierPercent >= 0 ? '+' : '' }}{{ ui.season.woodModifierPercent }}%</span>
        </div>
      </div>

      <!-- Resources -->
      <div class="header-section header-resources">
        <!-- Productivity indicator -->
        <div class="resource-box productivity-box" :class="{ 'productivity-box--penalized': ui.productivity < 1 }">
          <div class="resource-row-top">
            <img class="resource-icon resource-icon--productivity" :src="IMG_OTHER_PRODUCTIVITY" :alt="t('resource.productivity')">
            <span class="resource-value" :class="{ 'resource-value--zero': ui.productivity < 1 }">{{ Math.floor(ui.productivity * 100) }}%</span>
          </div>
          <div class="resource-row-bottom">
            <div class="resource-bar">
              <div
                class="resource-bar-fill"
                :class="ui.productivity < 1 ? 'resource-bar-fill--negative' : 'resource-bar-fill--positive'"
                :style="{ width: (ui.productivity * 100) + '%' }"
              />
            </div>
          </div>
          <div class="resource-tooltip">
            <span>{{ t('resource.productivity') }}</span>
            <span class="resource-tooltip-time">{{ Math.floor(ui.productivity * 100) }}%</span>
            <span v-if="ui.netProduction.food < 0" class="resource-tooltip-deficit">{{ t('resource.foodDeficit') }}</span>
            <span v-if="ui.netProduction.wood < 0" class="resource-tooltip-deficit">{{ t('resource.woodDeficit') }}</span>
          </div>
        </div>

        <template v-for="resource in HEADER_RESOURCES" :key="resource">
          <div v-if="visibleResources.has(resource)" class="resource-box" :class="{ 'resource-box--penalized': isResourcePenalized(resource) }">
            <!-- Row 1: icon + current amount -->
            <div class="resource-row-top">
              <img class="resource-icon" :src="IMG_RESOURCE_MAP[resource]" :alt="t('resource.' + resource)">
              <span class="resource-value" :class="{ 'resource-value--alert': isBounded(resource) && Math.floor(ui.resources[resource]) >= ui.storageCap, 'resource-value--zero': Math.floor(ui.resources[resource]) === 0 }">
                {{ formatNumber(ui.resources[resource]) }}
              </span>
            </div>

            <!-- Row 2: production rate -->
            <span class="production-rate" :class="rateClass(ui.netProduction[resource])">{{ formatRate(ui.netProduction[resource]) }}</span>

            <!-- Row 3: progress bar track (always rendered for alignment; fill bounded only) -->
            <div class="resource-row-bottom">
              <div class="resource-bar" :class="{ 'resource-bar--hidden': !isBounded(resource) }">
                <div
                  v-if="isBounded(resource)"
                  class="resource-bar-fill"
                  :class="ui.netProduction[resource] > 0 ? 'resource-bar-fill--positive' : 'resource-bar-fill--negative'"
                  :style="{ width: resourceFillPercent(resource) + '%' }"
                />
              </div>
            </div>

            <!-- Rich tooltip -->
            <div class="resource-tooltip">
              <span>{{ t('resource.' + resource) }}</span>
              <div class="resource-tooltip-grid">
                <!-- Intentional: toLocaleString() instead of formatNumber() to display all digits -->
                <span class="resource-tooltip-label">{{ t('resource.amount') }}:</span>
                <span class="resource-tooltip-value">{{ formatNumberFull(ui.resources[resource]) }}</span>
                <template v-if="isBounded(resource)">
                  <span class="resource-tooltip-label">{{ t('resource.maxCapacity') }}:</span>
                  <span class="resource-tooltip-value">{{ formatNumber(ui.storageCap) }}</span>
                </template>
                <template v-if="timeEstimates[resource]">
                  <span class="resource-tooltip-label">{{ timeEstimates[resource].label }}:</span>
                  <span class="resource-tooltip-value">{{ timeEstimates[resource].time }}</span>
                </template>
                <template v-if="hasConsumption(resource)">
                  <span class="resource-tooltip-label resource-tooltip-label--spaced">{{ t('resource.producing') }}:</span>
                  <span class="resource-tooltip-value resource-tooltip-value--spaced">{{ +grossProduction(resource).toFixed(2) }}</span>
                </template>
                <template v-if="productionModifierPercent(resource) !== 0">
                  <span class="resource-tooltip-label">{{ t('resource.production') }}:</span>
                  <span class="resource-tooltip-value">{{ productionModifierPercent(resource) > 0 ? '+' : '' }}{{ productionModifierPercent(resource) }}%</span>
                </template>
                <template v-if="hasConsumption(resource)">
                  <span class="resource-tooltip-label resource-tooltip-label--spaced">{{ t('resource.consuming') }}:</span>
                  <span class="resource-tooltip-value resource-tooltip-value--spaced">{{ +resourceConsumption(resource).toFixed(2) }}</span>
                </template>
                <template v-if="ui.armyConsumption[resource] > 0">
                  <span class="resource-tooltip-label">{{ t('resource.army') }}:</span>
                  <span class="resource-tooltip-value">{{ +ui.armyConsumption[resource].toFixed(2) }}</span>
                </template>
                <template v-if="consumptionModifierPercent(resource) !== 0">
                  <span class="resource-tooltip-label">{{ t('resource.consumption') }}:</span>
                  <span class="resource-tooltip-value">{{ consumptionModifierPercent(resource) > 0 ? '+' : '' }}{{ consumptionModifierPercent(resource) }}%</span>
                </template>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- Speed control -->
      <div class="header-speed" :class="{ 'header-speed--fast': ui.gameSpeed > 1 }">
        <button class="speed-btn tooltip tooltip--delayed" :data-tooltip="t('screen.game.header.speedDown')" :disabled="ui.gameSpeed <= GAME_SPEED_OPTIONS[0]" @click="playTap(); speedDown()">&laquo;</button>
        <span class="speed-label tooltip tooltip--delayed" :data-tooltip="t('screen.game.header.gameSpeed')">{{ t('screen.game.header.speed', ui.gameSpeed) }}</span>
        <button class="speed-btn tooltip tooltip--delayed" :data-tooltip="t('screen.game.header.speedUp')" :disabled="ui.gameSpeed >= GAME_SPEED_OPTIONS[GAME_SPEED_OPTIONS.length - 1]" @click="playTap(); speedUp()">&raquo;</button>
      </div>

      <!-- Colony info -->
      <div class="header-section header-colony">
        <div class="resource-box colony-box colony-box--population tooltip" :data-tooltip="t('resource.population')">
          <div class="header-resource">
            <img class="resource-icon resource-icon--worker" :src="IMG_UNIT_WORKER" :alt="t('resource.population')">
            <span class="resource-value" :class="{ 'resource-value--alert': ui.resources.workers >= ui.workersCap, 'resource-value--zero': ui.resources.workers === 0 }">{{ formatNumber(ui.resources.workers) }}/{{ formatNumber(ui.workersCap) }}</span>
          </div>
        </div>
        <div class="resource-box colony-box colony-box--idle">
          <div class="header-resource">
            <div class="tooltip" :data-tooltip="t('resource.idleWorkers')">
              <span class="header-resource-inner">
                <img class="resource-icon" :src="IMG_OTHER_IDLE" :alt="t('resource.idleWorkers')">
                <span class="resource-value resource-value--idle" :class="{ 'resource-value--alert': ui.idleWorkers > 0 }">{{ ui.idleWorkers }}</span>
              </span>
            </div>
            <span class="tooltip tooltip--delayed" :data-tooltip="dismissTooltip">
              <button class="worker-btn worker-btn--minus dismiss-btn" :disabled="!canDismiss" @click="dismissWorker">&minus;</button>
            </span>
          </div>
        </div>
        <div class="resource-box colony-box colony-box--territory tooltip" :data-tooltip="t('resource.territory')">
          <div class="header-resource">
            <img class="resource-icon resource-icon--territory" :src="IMG_OTHER_TERRITORY" :alt="t('resource.territory')">
            <span class="resource-value" :class="{ 'resource-value--alert': ui.resources.territory >= ui.territoryCap }">{{ formatNumber(ui.resources.territory) }}/{{ formatNumber(ui.territoryCap) }}</span>
          </div>
        </div>
      </div>

      <!-- Menu button -->
      <button class="btn-gold header-menu-button" @click="playTap(); showModal = true">
        <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="18" x2="20" y2="18" />
        </svg>
      </button>
    </header>

    <main class="game-content">
      <div v-for="column in BUILDING_GRID" :key="column.headerKey" class="building-column">
        <h2 class="column-header">{{ t(column.headerKey) }}</h2>
        <div class="column-cards">
          <template v-for="building in column.buildings" :key="building.key">
            <component
              :is="getCardComponent(building.key)"
              v-if="unlockedBuildings.has(building.key)"
              :building-key="building.key"
              :img="getBuildingImg(building)"
              :building="ui.buildings[building.key]"
            />
            <div
              v-else
              class="building-card-locked tooltip tooltip--delayed"
              :data-tooltip="t('building.locked')"
            >
              <img class="locked-icon" :src="IMG_OTHER_LOCK" :alt="t('building.locked')">
            </div>
          </template>
        </div>
      </div>

      <!-- Events column -->
      <div class="events-column">
        <h2 class="column-header">{{ t('events.title') }}</h2>

        <!-- Active blessings -->
        <div v-if="ui.activeBlessings.length">
          <h3 class="events-section-label">{{ t('events.blessings') }}</h3>
          <div class="events-list">
            <div
              v-for="blessing in ui.activeBlessings"
              :key="blessing.type"
              class="event-row blessing-row"
            >
              <img class="event-icon" :src="IMG_BLESSING_MAP[blessing.type]" :alt="t(`blessing.${blessing.type}`)">
              <span class="event-text">{{ t(blessing.effectKey, ...blessing.effectParams) }}</span>
              <span class="event-countdown">{{ formatTime(blessing.timeout) }}</span>
            </div>
          </div>
        </div>

        <!-- Active punishments -->
        <div v-if="ui.activePunishments.length">
          <h3 class="events-section-label">{{ t('events.punishments') }}</h3>
          <div class="events-list">
            <div
              v-for="punishment in ui.activePunishments"
              :key="punishment.type"
              class="event-row punishment-row"
            >
              <img class="event-icon" :src="punishment.icon" :alt="t(`punishment.${punishment.type}`)">
              <span class="event-text">{{ t(punishment.effectKey, ...punishment.effectParams) }}</span>
              <span class="event-countdown">{{ formatTime(punishment.timeout) }}</span>
            </div>
          </div>
        </div>

        <!-- Future events -->
        <div v-if="ui.futureEvents.length">
          <h3 class="events-section-label">{{ t('events.future') }}</h3>
          <div class="events-list">
            <div
              v-for="event in ui.futureEvents"
              :key="event.id"
              class="event-row"
              :class="{ 'event-row--clickable': event.action, 'event-row--met': event.requirementsMet }"
              @click="event.action && handleEventAction(event.action)"
            >
              <img class="event-icon" :src="event.icon" :alt="t(event.textKey, ...event.params)">
              <span class="event-text">{{ t(event.textKey, ...event.params) }}</span>
              <span class="event-countdown" :class="{ 'event-countdown--paused': event.paused }">{{ event.paused ? t('events.paused') : formatTime(event.remainingSeconds) }}</span>
              <svg v-if="event.action" class="event-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </div>
        </div>

        <!-- Past events -->
        <div v-if="ui.pastEvents.length">
          <div class="events-section-header">
            <h3 class="events-section-label">{{ t('events.past') }}</h3>
            <button class="events-clear-btn" @click="playTap(); showClearConfirm = true">{{ t('events.clearAll') }}</button>
          </div>
          <div class="events-list">
            <div v-for="event in ui.pastEvents" :key="event.id" class="event-row">
              <img class="event-icon" :src="event.icon" :alt="t(event.textKey, ...event.params)">
              <span class="event-text">{{ t(event.textKey, ...event.params) }}</span>
              <button class="event-dismiss" @click="playTap(); actions.dismissEvent(event.id)">&times;</button>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <p v-if="!ui.activeBlessings.length && !ui.activePunishments.length && !ui.futureEvents.length && !ui.pastEvents.length" class="events-empty">
          {{ t('events.empty') }}
        </p>
      </div>
    </main>

    <PauseModal
      v-if="showModal"
      :has-saved-game="hasSavedGame"
      @close="showModal = false"
      @save="saveGame"
      @load="handleLoadRequest"
      @settings="openSettings"
      @restart="handleRestartRequest"
      @quit="handleQuitRequest"
    />

    <SettingsModal
      v-if="showSettingsModal"
      @close="closeSettings"
    />

    <ConfirmModal
      v-if="showConfirmQuit"
      title-key="modal.confirmQuit.title"
      description-key="modal.confirmQuit.message"
      confirm-key="modal.confirmQuit.quit"
      @close="cancelQuit"
      @confirm="confirmQuit"
    />

    <ConfirmModal
      v-if="showConfirmRestart"
      title-key="modal.confirmRestart.title"
      description-key="modal.confirmRestart.message"
      confirm-key="modal.confirmRestart.restart"
      @confirm="confirmRestart"
      @close="cancelRestart"
    />

    <ConfirmModal
      v-if="showConfirmLoad"
      title-key="modal.confirmLoad.title"
      description-key="modal.confirmLoad.message"
      confirm-key="modal.confirmLoad.load"
      @confirm="confirmLoad"
      @close="cancelLoad"
    />

    <ConfirmModal
      v-if="showClearConfirm"
      title-key="modal.confirmClearEvents.title"
      description-key="modal.confirmClearEvents.message"
      confirm-key="modal.confirmClearEvents.clear"
      @confirm="clearAllPast"
      @close="showClearConfirm = false"
    />

    <ResearchModal
      v-if="showResearchModal"
      @close="showResearchModal = false"
    />

    <MarketModal
      v-if="showMarketModal"
      @close="showMarketModal = false"
    />

    <MilitaryModal
      v-if="showMilitaryModal"
      @close="showMilitaryModal = false"
    />

    <ChallengeDetailModal
      v-if="showChallengeModal"
      @close="showChallengeModal = false"
    />

    <ChallengeSuccessModal
      v-if="ui.challengeModal === CHALLENGE_MODAL_REWARD"
    />

    <ChallengeFailureModal
      v-if="ui.challengeModal === CHALLENGE_MODAL_FAILURE"
    />

    <ChallengeWinModal
      v-if="ui.challengeModal === CHALLENGE_MODAL_WIN"
      @continue="handleWinContinue"
      @quit="handleWinQuit"
    />

    <RaidResultModal
      v-if="ui.raidReport"
    />

    <Transition name="tutorial-banner" mode="out-in">
      <TutorialBanner
        v-if="ui.tutorial.isActive"
        :key="ui.tutorial.stepNumber"
        :text-key="ui.tutorial.stepTextKey"
        :hint-key="ui.tutorial.stepHintKey"
        :building-img="ui.tutorial.stepBuildingImg"
      />
    </Transition>

    <TutorialModal
      v-if="ui.tutorial.activeModal"
      :title-key="ui.tutorial.activeModalTitle"
      :body-key="ui.tutorial.activeModalBody"
      @close="dismissTutorialModal"
    />

    <Transition name="save-indicator">
      <div v-if="showSaveIndicator" class="save-indicator" :class="{ 'save-indicator--failed': saveIndicatorFailed }">{{ t(saveIndicatorKey) }}</div>
    </Transition>
  </div>
</template>

<style scoped>
.perf-overlay {
  position: fixed;
  bottom: 0.8rem;
  left: 1.4rem;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(0, 255, 0, 1);
  font-family: monospace;
  font-size: 0.75rem;
  padding: 0.5rem 0.7rem;
  z-index: 9999;
  pointer-events: none;
  white-space: pre;
  margin: 0;
}

/* Root layout container; fills viewport and stacks header + content vertically */
.game-screen {
  height: 100vh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  background: var(--color-bg);
  color: var(--color-text);
}

/* ---- Header bar ---- */

.game-header {
  display: flex;
  align-items: center;
  padding: 0.45rem clamp(0.4rem, 0.8vw, 1rem);
  gap: clamp(0.25rem, 0.4vw, 0.5rem);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-surface);
  box-shadow: 0 2px 8px rgba(var(--color-shadow-rgb), 0.3);
}

/* ---- Sections ---- */

.header-section {
  display: flex;
  align-items: center;
  gap: clamp(0.4rem, 0.7vw, 1rem);
}

/* Season indicator with icon and progress bar */
.header-season {
  gap: 0.5rem;
  flex-shrink: 0;
}

/* Vertically stacks season indicator and year label */
.header-season-group {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

/* Show rich tooltip on season hover */
.header-season-group:hover .resource-tooltip {
  opacity: 1;
}

/* Left-align season tooltip */
.header-season-group .resource-tooltip {
  left: 0;
  transform: none;
  align-items: flex-start;
}

/* "YEAR" label text in subdued uppercase */
.header-year {
  display: flex;
  align-items: baseline;
  margin-top: 0.3em;
  gap: 0.3rem;
  font-family: var(--font-display);
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(var(--color-text-rgb), 0.55);
}

/* Numeric year value displayed in monospace font */
.header-year-num {
  font-family: var(--font-numeric);
  color: var(--color-text);
  margin-left: 0.5em;
}

/* Centered resource boxes that expand to fill available header space */
.header-resources {
  flex: 1;
  justify-content: center;
  align-items: stretch;
  gap: clamp(0.2rem, 0.4vw, 0.5rem);
  min-width: 0;
}

/* Responsive overrides for header resource boxes */
.header-resources .resource-box {
  padding: 0.3rem clamp(0.2rem, 0.4vw, 0.5rem);
  flex-shrink: 1;
  min-width: 0;
}

.header-resources .resource-icon {
  width: clamp(0.9rem, 1vw, 1.25rem);
  height: clamp(0.9rem, 1vw, 1.25rem);
}

.header-resources .resource-value {
  font-size: clamp(0.65rem, 0.7vw, 0.8rem);
  min-width: 5ch;
}

/* ---- Speed control ---- */

/* Compact speed control group: « 1x » */
.header-speed {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
  padding: 0.35rem clamp(0.2rem, 0.35vw, 0.4rem);
  border-radius: 0.25rem;
  border: 1px solid rgba(var(--color-accent-rgb), 0.12);
  background: linear-gradient(
    180deg,
    rgba(var(--color-accent-rgb), 0.05),
    rgba(var(--color-shadow-rgb), 0.12)
  );
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

/* Subtle gold glow when game is accelerated */
.header-speed--fast {
  border-color: rgba(var(--color-accent-rgb), 0.35);
  box-shadow: 0 0 6px rgba(var(--color-accent-rgb), 0.1);
}

/* Speed value label (e.g. "2x") */
.speed-label {
  font-family: var(--font-numeric);
  font-size: clamp(0.65rem, 0.7vw, 0.8rem);
  min-width: 2.2ch;
  margin-left: clamp(0.1rem, 0.25vw, 0.3rem);
  margin-right: clamp(0.1rem, 0.25vw, 0.3rem);
  text-align: center;
  color: var(--color-text);
  user-select: none;
}

/* Accelerated speed label gets gold tint */
.header-speed--fast .speed-label {
  color: rgba(var(--color-accent-rgb), 1);
}

/* « and » navigation buttons */
.speed-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: clamp(1.4rem, 1.5vw, 1.8rem);
  height: clamp(1.4rem, 1.5vw, 1.8rem);
  padding: 0;
  border-radius: 0.2rem;
  font-size: clamp(0.85rem, 0.9vw, 1.05rem);
  line-height: 1;
  color: rgba(var(--color-accent-rgb), 0.7);
  background: transparent;
  border: 1px solid rgba(var(--color-accent-rgb), 0.15);
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.speed-btn:hover:not(:disabled) {
  background: rgba(var(--color-accent-rgb), 0.12);
  border-color: rgba(var(--color-accent-rgb), 0.5);
  color: rgba(var(--color-accent-rgb), 1);
}

.speed-btn:disabled {
  color: rgba(var(--color-accent-rgb), 0.15);
  border-color: rgba(var(--color-accent-rgb), 0.05);
  cursor: not-allowed;
}

/* Colony stats (population, idle workers, territory) */
.header-colony {
  align-items: stretch;
  gap: clamp(0.25rem, 0.4vw, 0.5rem);
  /* Resist shrinking but allow it under viewport pressure (30% of normal rate) */
  flex-shrink: 0.3;
  white-space: nowrap;
}

/* ---- Resource stat (icon beside value) ---- */

.header-resource {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

/* Inner wrapper to scope the idle-workers tooltip away from the dismiss button */
.header-resource-inner {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

/* Override cqh sizing for dismiss button in header context */
.dismiss-btn {
  width: clamp(1.4rem, 1.5vw, 1.8rem);
  height: clamp(1.4rem, 1.5vw, 1.8rem);
  padding: 0 0 0.15rem;
  font-size: clamp(0.85rem, 0.9vw, 1.1rem);
  margin-left: clamp(0.2rem, 0.4vw, 0.5rem);
}

/* Wider gap between icon and value for worker population display */
.colony-box--population .header-resource {
  gap: 0.6rem;
}

/* Larger icon size for worker population display */
.resource-icon--worker {
  width: clamp(1.1rem, 1.2vw, 1.4rem);
  height: clamp(1.1rem, 1.2vw, 1.4rem);
}

/* Slightly larger icon size for territory display */
.resource-icon--territory {
  width: clamp(1.2rem, 1.3vw, 1.55rem);
  height: clamp(1.2rem, 1.3vw, 1.55rem);
}

/* Slightly larger icon size for productivity display */
.resource-icon--productivity {
  width: clamp(0.9rem, 1vw, 1.2rem);
  height: clamp(0.9rem, 1vw, 1.2rem);
}

/* ---- Season indicator ---- */

.season-icon {
  width: 0.9rem;
  height: 0.9rem;
  align-self: center;
}

/* Thin horizontal bar background for season progress */
.season-track {
  width: clamp(3.5rem, 4vw, 5.5rem);
  height: 4px;
  margin-top: 0.25rem;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 0.125rem;
  overflow: hidden;
}

/* Animated fill bar inside the season track */
.season-fill {
  height: 100%;
  border-radius: 0.125rem;
}

/* Warm season: golden gradient fill with warm glow */
.season-track--warm .season-fill {
  background: linear-gradient(90deg, rgba(184, 148, 62, 1), rgba(212, 168, 67, 1));
  box-shadow: 0 0 6px rgba(184, 148, 62, 0.4);
}

/* Cold season: blue gradient fill with cool glow */
.season-track--cold .season-fill {
  background: linear-gradient(90deg, rgba(91, 143, 185, 1), rgba(126, 200, 227, 1));
  box-shadow: 0 0 6px rgba(126, 200, 227, 0.35);
}

/* ---- Decorative dividers between sections ---- */

/* ---- Menu button ---- */

.header-menu-button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.4rem;
  margin-left: clamp(0.2rem, 0.5vw, 0.7rem);
  line-height: 1;
  flex-shrink: 0;
}

.menu-icon {
  width: 1.1rem;
  height: 1.1rem;
}

/* ---- Main content area ---- */

.game-content {
  flex: 1;
  display: flex;
  align-items: stretch;
  padding: 1rem 1.5rem 0.75rem;
  gap: 1.5rem;
  overflow: hidden;
}

/* ---- Building columns ---- */

.building-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* Column header — matches .header-label pattern */
.column-header {
  font-family: var(--font-display);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  line-height: 1;
  text-transform: uppercase;
  color: rgba(var(--color-accent-rgb), 0.75);
  text-align: center;
  margin-bottom: 0;
}

/* Card stack — 6 equal rows so every card gets 1/6 of available height */
.column-cards {
  flex: 1;
  display: grid;
  grid-template-rows: repeat(6, 1fr);
  gap: 0.5rem;
}

/* Locked building placeholder — mirrors .building-card shell */
.building-card-locked {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.6rem 0.75rem;
  overflow: hidden;
  background: rgba(39, 33, 25, 0.3);
  border: 1px solid var(--color-border);
  border-radius: 0.25rem;
  opacity: 0.4;
}

/* Enable container-query sizing only when supported */
@supports (container-type: size) {
  .building-card-locked {
    container-type: size;
    min-height: 0;
  }
}

.locked-icon {
  width: 2.5rem;
  width: 40cqh;
  height: 2.5rem;
  height: 40cqh;
  object-fit: contain;
  filter: grayscale(1);
  opacity: 0.35;
}

/* ---- Events column ---- */

/* Events column at 3/4 building width; long event text truncates */
.events-column {
  flex: 0.75;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* Row layout for past-events heading with clear-all button aligned right */
.events-section-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding-bottom: 0.35rem;
}

/* Remove bottom padding when label is inside the header row */
.events-section-header .events-section-label {
  padding-bottom: 0;
}

/* Destructive-style text button to clear all past events */
.events-clear-btn {
  font-family: var(--font-display);
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(196, 80, 80, 0.5);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  transition: color 0.2s ease;
}

.events-clear-btn:hover {
  color: rgba(196, 80, 80, 1);
}

/* Subdued uppercase section label for "Future" / "Past" event groups */
.events-section-label {
  font-family: var(--font-display);
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(var(--color-text-rgb), 0.4);
  padding-bottom: 0.35rem;
}

/* Vertical stack of event rows with small gaps */
.events-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

/* Individual event card with accent left border */
.event-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.55rem;
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-left: 2px solid rgba(var(--color-accent-rgb), 0.4);
  border-radius: 0.25rem;
  transition: border-color 0.2s ease;
}

.event-row:hover {
  border-color: rgba(var(--color-accent-rgb), 0.35);
  border-left-color: rgba(var(--color-accent-rgb), 0.7);
}

/* Clickable future events (e.g. challenges) */
.event-row--clickable {
  cursor: pointer;
}

/* Chevron icon indicating clickable event */
.event-chevron {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
  color: rgba(var(--color-accent-rgb), 0.5);
  transition: color 0.2s ease, transform 0.2s ease;
}

.event-row--clickable:hover .event-chevron {
  color: rgba(var(--color-accent-rgb), 0.9);
  transform: translateX(2px);
}

/* Challenge event with all requirements met */
.event-row--met .event-text {
  color: rgba(80, 168, 80, 0.9);
}

/* Small event type icon with drop shadow */
.event-icon {
  width: 1.1rem;
  height: 1.1rem;
  object-fit: contain;
  flex-shrink: 0;
}

/* Event description text, truncated with ellipsis on overflow */
.event-text {
  flex: 1;
  font-family: var(--font-body);
  font-size: 0.85rem;
  font-weight: 400;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

/* Monospace countdown timer for upcoming events */
.event-countdown {
  font-family: var(--font-numeric);
  font-size: 0.8rem;
  font-weight: 400;
  color: var(--color-accent);
  letter-spacing: 0.04em;
  flex-shrink: 0;
}

/* Frozen research countdown while the academy is at level 0 */
.event-countdown--paused {
  font-family: var(--font-body);
  color: rgba(var(--color-text-rgb), 0.4);
  letter-spacing: 0.02em;
}

/* Small close button to dismiss a single past event */
.event-dismiss {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.3rem;
  height: 1.3rem;
  padding: 0 0 1px;
  font-family: var(--font-body);
  font-size: 0.95rem;
  font-weight: 400;
  line-height: 1;
  color: rgba(var(--color-text-rgb), 0.25);
  background: none;
  border: 1px solid rgba(var(--color-text-rgb), 0.08);
  border-radius: 0.1875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.event-dismiss:hover {
  color: rgba(196, 80, 80, 1);
  border-color: rgba(196, 80, 80, 0.4);
  background: rgba(196, 80, 80, 0.1);
}

/* Blessing row with divine golden border */
.blessing-row {
  border-left-color: rgba(212, 175, 55, 0.6);
}

.blessing-row:hover {
  border-left-color: rgba(212, 175, 55, 0.85);
}

/* Punishment row with ominous red border */
.punishment-row {
  border-left-color: rgba(180, 60, 60, 0.6);
}

.punishment-row:hover {
  border-left-color: rgba(180, 60, 60, 0.85);
}

/* Placeholder text shown when no events exist */
.events-empty {
  font-family: var(--font-body);
  font-size: 0.8rem;
  font-weight: 300;
  color: rgba(var(--color-text-rgb), 0.3);
  text-align: center;
  padding: 2rem 0;
  letter-spacing: 0.02em;
}

/* ---- Save indicator ---- */

.save-indicator {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  font-family: var(--font-display);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: rgba(var(--color-accent-rgb), 0.95);
  background:
    linear-gradient(
      135deg,
      rgba(var(--color-accent-rgb), 0.12) 0%,
      rgba(var(--color-accent-rgb), 0.04) 100%
    );
  border: 1px solid rgba(var(--color-accent-rgb), 0.15);
  padding: 0.4rem 1.1rem;
  border-radius: 0.2rem;
  pointer-events: none;
  z-index: 9000;
  box-shadow: 0 2px 12px rgba(var(--color-accent-rgb), 0.1);
  text-shadow: 0 0 8px rgba(var(--color-accent-rgb), 0.3);
}

/* Failed save warning tint */
.save-indicator--failed {
  color: rgba(var(--color-red-rgb), 1);
  background:
    linear-gradient(
      135deg,
      rgba(var(--color-red-rgb), 0.16) 0%,
      rgba(var(--color-red-rgb), 0.06) 100%
    );
  border-color: rgba(var(--color-red-rgb), 0.35);
  box-shadow: 0 2px 12px rgba(var(--color-red-rgb), 0.15);
  text-shadow: 0 0 8px rgba(var(--color-red-rgb), 0.3);
}

.tutorial-banner-enter-active {
  transition: opacity 0.3s ease-out, transform 0.3s ease-out;
}

.tutorial-banner-leave-active {
  transition: opacity 0.2s ease-in, transform 0.2s ease-in;
}

.tutorial-banner-enter-from {
  opacity: 0;
  transform: translateY(2rem);
}

.tutorial-banner-leave-to {
  opacity: 0;
  transform: translateY(1rem);
}

.save-indicator-enter-active {
  transition: opacity 0.2s ease-out, transform 0.2s ease-out;
}

.save-indicator-leave-active {
  transition: opacity 0.8s ease-in, transform 0.8s ease-in;
}

.save-indicator-enter-from {
  opacity: 0;
  transform: translateY(0.5rem);
}

.save-indicator-leave-to {
  opacity: 0;
  transform: translateY(-0.25rem);
}

</style>
