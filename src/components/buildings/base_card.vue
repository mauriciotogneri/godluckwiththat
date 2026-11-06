<script setup>
import {computed, inject, ref} from 'vue'
import BuildingHelpModal from '@/components/modals/building_help_modal.vue'
import WorkerAssignmentRow from '@/components/buildings/worker_assignment_row.vue'
import {IMG_OTHER_BUILD, IMG_OTHER_UPGRADE, IMG_RESOURCE_MAP} from '@/js/engine/assets.js'
import {playTap} from '@/js/engine/audio.js'
import {formatNumber, formatNumberFull, formatTime} from '@/js/engine/format.js'
import {BUILDING_CLASS_MAP, DOWNGRADABLE_BUILDINGS} from '@/js/engine/constants.js'
import {HOUSE_POPULATION_PER_LEVEL, MILITARY_UNITS_PER_LEVEL, MONUMENT_FAITH_PER_LEVEL, PRODUCTION_RATES, TOWER_ARCHERS_PER_LEVEL, WALL_HEALTH_PER_LEVEL, WORKERS_PER_LEVEL} from '@/js/engine/balancing.js'
import {BUILDING_ACADEMY, BUILDING_ALTAR, BUILDING_ARCHERY, BUILDING_BARRACKS, BUILDING_COPPER_MINE, BUILDING_FARM, BUILDING_GOLD_MINE, BUILDING_HOUSE, BUILDING_IRON_MINE, BUILDING_MARKET, BUILDING_MONUMENT, BUILDING_QUARRY, BUILDING_STABLE, BUILDING_STOREHOUSE, BUILDING_TEMPLE, BUILDING_TOWER, BUILDING_WALL, BUILDING_WOODCUTTER} from '@/js/engine/enums.js'
import {canAffordCost, marketFeePercent, storageCapacity} from '@/js/engine/utils.js'
import {t} from '@/js/i18n/localized.js'

const props = defineProps({
  buildingKey: {
    type: String,
    required: true,
  },
  img: {
    type: String,
    required: true,
  },
  building: {
    type: Object,
    required: true,
  },
  nameKey: {
    type: String,
    default: '',
  },
  showBuildAction: {
    type: Boolean,
    default: true,
  },
  showLevel: {
    type: Boolean,
    default: true,
  },
})

const ui = inject('ui')
const actions = inject('actions')

const displayNameKey = computed(() => props.nameKey || `building.${props.buildingKey}`)
const showHelp = ref(false)

// Build / level-up action
const hasAction = computed(() => props.showBuildAction && props.buildingKey in BUILDING_CLASS_MAP)
const isBuildable = computed(() => hasAction.value && props.building.isUnbuilt)
const actionCost = computed(() =>
  hasAction.value ? props.building.levelUpCost : null,
)
const territoryFull = computed(() => ui.resources.territory >= ui.territoryCap)
const isConstructing = computed(() => props.building.isConstructing)
const canActBase = computed(() =>
  actionCost.value !== null
  && !isConstructing.value,
)
const canAfford = computed(() =>
  actionCost.value !== null
  && canAffordCost(ui.resources, actionCost.value),
)
const canAct = computed(() => canActBase.value && !territoryFull.value && canAfford.value)

const actionTooltip = computed(() => {
  if (isConstructing.value) {
    return ''
  }
  if (canActBase.value && territoryFull.value) {
    return t('building.maxTerritoryReached')
  }
  if (canActBase.value && !canAfford.value) {
    return t('building.insufficientResources')
  }
  const baseText = isBuildable.value
    ? t('building.build') + ' ' + t(displayNameKey.value).toLowerCase()
    : t('building.levelUp')
  // Append bonus info for storehouse and monument
  if (props.buildingKey === BUILDING_STOREHOUSE) {
    const level = props.building.level
    const bonus = ui.storageBonus
    const currentCap = storageCapacity(level, bonus)
    const nextCap = storageCapacity(level + 1, bonus)
    return baseText + '\n' + t('building.levelUpBonus.capacity', formatNumber(nextCap - currentCap))
  }
  if (props.buildingKey === BUILDING_MONUMENT) {
    const faith = MONUMENT_FAITH_PER_LEVEL * (props.building.level + 1)
    return baseText + '\n' + t('building.levelUpBonus.faith', formatNumber(faith))
  }
  if (props.buildingKey === BUILDING_HOUSE) {
    const population = HOUSE_POPULATION_PER_LEVEL + ui.habitationBonus
    return baseText + '\n' + t('building.levelUpBonus.population', formatNumber(population))
  }
  // Worker-based buildings: show worker capacity bonus
  const workerBuildings = [
    BUILDING_ACADEMY,
    BUILDING_FARM,
    BUILDING_WOODCUTTER,
    BUILDING_QUARRY,
    BUILDING_COPPER_MINE,
    BUILDING_IRON_MINE,
    BUILDING_GOLD_MINE,
    BUILDING_TEMPLE,
  ]
  if (workerBuildings.includes(props.buildingKey)) {
    return baseText + '\n' + t('building.levelUpBonus.workerCapacity', formatNumber(WORKERS_PER_LEVEL))
  }
  // Market: show fee reduction, omitted when the next level does not lower the fee (build, minimum fee reached)
  if (props.buildingKey === BUILDING_MARKET) {
    const level = props.building.level
    const feeReduction = marketFeePercent(level) - marketFeePercent(level + 1)
    return feeReduction > 0
      ? baseText + '\n' + t('building.levelUpBonus.marketFee', formatNumber(feeReduction))
      : baseText
  }
  if (props.buildingKey === BUILDING_ALTAR) {
    const faithRate = PRODUCTION_RATES[BUILDING_ALTAR].rate.toFixed(1)
    return baseText + '\n' + t('building.levelUpBonus.faithRate', faithRate)
  }
  // Military buildings: unit cap, wall absorption, tower archers
  if ([
    BUILDING_BARRACKS,
    BUILDING_ARCHERY,
    BUILDING_STABLE,
  ].includes(props.buildingKey)) {
    return baseText + '\n' + t('building.levelUpBonus.units', formatNumber(MILITARY_UNITS_PER_LEVEL))
  }
  if (props.buildingKey === BUILDING_WALL) {
    return baseText + '\n' + t('building.levelUpBonus.wallAbsorb', formatNumber(WALL_HEALTH_PER_LEVEL))
  }
  if (props.buildingKey === BUILDING_TOWER) {
    return baseText + '\n' + t('building.levelUpBonus.towerArchers', formatNumber(TOWER_ARCHERS_PER_LEVEL))
  }
  return baseText
})
const actionCostEntries = computed(() => props.building.levelUpCostEntries ?? [])
const hasMultilineTooltip = computed(() => actionTooltip.value.includes('\n'))
const isWorkerAssignable = computed(() => props.building.isProducer)

const constructionProgress = computed(() => {
  if (!isConstructing.value || props.building.constructionDuration === 0) {
    return 0
  }
  return 1 - props.building.constructionRemaining / props.building.constructionDuration
})

// Downgrade action (only visible when territory is full and expansion cost exceeds storage)
const isDowngradable = computed(() => DOWNGRADABLE_BUILDINGS.has(props.buildingKey))
const expansionExceedsCap = computed(() =>
  ui.expansionCost
    ? Math.max(...ui.expansionCost.entries.values()) > ui.storageCap
    : false,
)
const canDowngrade = computed(() =>
  isDowngradable.value && territoryFull.value
  && expansionExceedsCap.value
  && props.building.level > 0 && !isConstructing.value,
)
// Downgrading a level-1 academy to 0 pauses its running researches; warn on a second line
const downgradeTooltip = computed(() =>
  props.buildingKey === BUILDING_ACADEMY && props.building.level === 1 && ui.academy.activeKeys.size > 0
    ? t('building.downgrade') + '\n' + t('building.downgradePausesResearch')
    : t('building.downgrade'),
)
const hasMultilineDowngradeTooltip = computed(() => downgradeTooltip.value.includes('\n'))

/** Builds or levels up this building. */
function act() {
  if (!canAct.value) {
    return
  }
  playTap()
  actions.levelUpBuilding(props.buildingKey)
}

/** Downgrades this building by one level to free a territory slot. */
function downgrade() {
  if (!canDowngrade.value) {
    return
  }
  playTap()
  actions.downgradeBuilding(props.buildingKey)
}
</script>

<template>
  <div class="building-card" :class="{ 'building-card--constructing': isConstructing }">
    <button
      class="help-btn tooltip tooltip--delayed"
      :data-tooltip="t('modal.buildingHelp.tooltip')"
      @click="playTap(); showHelp = true"
    >
      ?
    </button>

    <div class="building-thumb-wrapper">
      <img class="building-thumb" :class="{ 'building-thumb-unbuilt': building.isUnbuilt }" :src="img" :alt="t(displayNameKey)">
      <span v-if="showLevel" class="building-level-badge">{{ building.level }}</span>
    </div>
    <div class="building-info">
      <span class="building-name">{{ t(displayNameKey) }}</span>
      <div class="slot-actions">
        <div v-if="hasAction" class="action-row" :class="{ 'action-row--disabled': !canAct }">
          <span class="tooltip" :class="{ 'tooltip--delayed': canAct, 'tooltip--multiline': hasMultilineTooltip }" :data-tooltip="actionTooltip">
            <button
              class="btn-gold action-btn"
              :class="{ 'action-btn--constructing': isConstructing }"
              :style="isConstructing ? { '--progress': (constructionProgress * 100) + '%' } : undefined"
              :disabled="!canAct"
              @click="act"
            >
              <img v-if="!isConstructing" class="action-btn-icon" :src="isBuildable ? IMG_OTHER_BUILD : IMG_OTHER_UPGRADE" :alt="isBuildable ? t('building.build') : t('building.levelUp')">
              <span v-else class="action-btn-time">{{ formatTime(building.constructionRemaining) }}</span>
            </button>
          </span>
          <span v-if="canDowngrade && !isBuildable" class="tooltip tooltip--delayed" :class="{ 'tooltip--multiline': hasMultilineDowngradeTooltip }" :data-tooltip="downgradeTooltip">
            <button
              class="btn-gold action-btn"
              @click="downgrade"
            >
              <img class="action-btn-icon action-btn-icon--downgrade" :src="IMG_OTHER_UPGRADE" :alt="t('building.downgrade')">
            </button>
          </span>
          <span v-if="!isConstructing" class="action-cost">
            <span v-for="[key, amount] in actionCostEntries" :key="key" class="action-cost-item">
              <img class="action-cost-icon" :src="IMG_RESOURCE_MAP[key]" :alt="t(`resource.${key}`)">
              <span class="action-cost-amount" :class="{ 'action-cost-short': ui.resources[key] < amount }">{{ formatNumber(amount) }}</span>
            </span>
            <div class="action-cost-tooltip">
              <template v-for="[key, amount] in actionCostEntries" :key="key">
                <span>{{ t(`resource.${key}`) }}:</span>
                <span class="action-cost-tooltip-amount">{{ formatNumberFull(amount) }}</span>
              </template>
            </div>
          </span>
          <slot v-if="!isBuildable" />
        </div>
        <slot v-if="hasAction && !isWorkerAssignable && !isBuildable" name="below-action" />
        <div v-if="isWorkerAssignable && !isBuildable" class="worker-slot-row">
          <WorkerAssignmentRow :building-key="buildingKey" />
        </div>
        <slot v-if="!hasAction && !isBuildable" />
      </div>
    </div>

    <BuildingHelpModal
      v-if="showHelp"
      :name-key="displayNameKey"
      :building-key="buildingKey"
      :img="img"
      @close="showHelp = false"
    />
  </div>
</template>

<style scoped>
/* Card container — flex row with thumbnail and info */
.building-card {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.6rem 0.75rem;
  min-height: 0;
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: 0.25rem;
}

/* Enable container-query sizing only when supported */
@supports (container-type: size) {
  .building-card {
    container-type: size;
  }
}

/* Intensified border during construction */
.building-card--constructing {
  border-color: rgba(var(--color-accent-rgb), 0.25);
}

/* Help icon — top-right corner */
.help-btn {
  position: absolute;
  top: 0.5rem;
  top: 8cqh;
  right: 0.5rem;
  right: 8cqh;
  width: 1.1rem;
  width: 18cqh;
  height: 1.1rem;
  height: 18cqh;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-body);
  font-size: 0.55rem;
  font-size: 9cqh;
  font-weight: 500;
  line-height: 1;
  color: rgba(var(--color-accent-rgb), 0.65);
  background: none;
  border: 1px solid rgba(var(--color-accent-rgb), 0.3);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0;
  z-index: 1;
}

.help-btn:hover {
  color: var(--color-accent);
  border-color: rgba(var(--color-accent-rgb), 0.5);
  background: rgba(var(--color-accent-rgb), 0.08);
}

/* Thumbnail wrapper — anchors level badge */
.building-thumb-wrapper {
  position: relative;
  flex-shrink: 0;
}

/* Building thumbnail image */
.building-thumb {
  display: block;
  width: 6.25rem;
  width: 100cqh;
  height: 6.25rem;
  height: 100cqh;
  object-fit: contain;
}

/* Grayscale filter for unbuilt buildings */
.building-thumb-unbuilt {
  filter: grayscale(1);
}

/* Level number overlay at bottom-right of thumbnail */
.building-level-badge {
  position: absolute;
  bottom: 0;
  right: 0;
  font-family: var(--font-numeric);
  font-size: 0.7rem;
  font-size: 11cqh;
  font-weight: 500;
  line-height: 1;
  color: var(--color-text);
  background: rgba(var(--color-shadow-rgb), 0.6);
  padding: 0.25rem 0.375rem;
  padding: 4cqh 6cqh;
}

/* Info column — name, actions, worker row */
.building-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  gap: 2cqh;
  min-width: 0;
  align-self: stretch;
}

/* Rotated upgrade icon for downgrade action */
.action-btn-icon--downgrade {
  transform: rotate(180deg);
}

/* Worker row + slot content side-by-side */
.worker-slot-row {
  display: flex;
  align-items: center;
}

/* Building display name */
.building-name {
  font-family: var(--font-body);
  font-size: 1rem;
  font-size: 16cqh;
  font-weight: 400;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
