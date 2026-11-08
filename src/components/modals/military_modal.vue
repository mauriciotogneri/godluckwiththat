<script setup>
import {computed, ref, inject, onMounted, onBeforeUnmount, onUnmounted} from 'vue'
import {playTap} from '@/js/engine/audio.js'
import {formatMinutes, formatNumber, formatNumberFull, formatTime} from '@/js/engine/format.js'
import {BOUNDED_RESOURCES, BUILDING_IMAGE_MAP, HQ_BUILDING_UNLOCKS, HQ_RESOURCE_UNLOCKS, HQ_TYPES, UNIT_BUILDINGS, UNIT_COUNTERS, UNIT_TYPES} from '@/js/engine/constants.js'
import {BULK_WORKER_AMOUNT, MILITARY_UNITS_PER_LEVEL, TOWER_ARCHERS_PER_LEVEL, TRIBUTE_DELAY_SECONDS, UNIT_COUNTER_MULTIPLIER, UNIT_STATS, WALL_HEALTH_PER_LEVEL} from '@/js/engine/balancing.js'
import {IMG_OTHER_LOCK, IMG_RESOURCE_MAP} from '@/js/engine/assets.js'
import {BUILDING_TOWER, BUILDING_WALL, EMIT_CLOSE, RESOURCE_FOOD, RESOURCE_WOOD, TRIBUTE_CANCEL, TRIBUTE_DELAY} from '@/js/engine/enums.js'
import {canAffordCost} from '@/js/engine/utils.js'
import {pushEscapeHandler, removeEscapeHandler} from '@/js/engine/escape_stack.js'
import {pushFocusLayer, removeFocusLayer} from '@/js/engine/focus_stack.js'
import {t} from '@/js/i18n/localized.js'
import ModalHelpModal from '@/components/modals/help_modal.vue'

const URGENT_RAID_SECONDS = 30 // Countdown turns red below this

const emit = defineEmits([EMIT_CLOSE])
const ui = inject('ui')
const actions = inject('actions')
const visible = ref(false)
const overlay = ref(null) // Root element; everything else is inert while this modal is topmost
const showHelp = ref(false)
let rafId = null

/** Bounded resources shown in the header for the current HQ type (units and tribute only use these). */
const visibleResources = computed(() => {
  const typeIndex = HQ_TYPES.indexOf(ui.hqType)
  const unlocked = HQ_TYPES.slice(0, typeIndex + 1).flatMap(type => HQ_RESOURCE_UNLOCKS[type])
  return BOUNDED_RESOURCES.filter(resource => unlocked.includes(resource))
})

// ── Army ───────────────────────────────────────────────────

/** Localized name of the HQ type that unlocks a building.
 * @param {string} buildingKey - Building key
 * @returns {string} HQ type name (e.g. "Town")
 */
function unlockTypeName(buildingKey) {
  const type = HQ_TYPES.find(hqType => HQ_BUILDING_UNLOCKS[hqType].includes(buildingKey))
  return t('building.headquarters.' + type)
}

/** Line under the unit name: what it beats, or when it unlocks.
 * @param {Object} unit - Unit snapshot from ui.military.units
 * @returns {string} Localized subtitle
 */
function unitSubtitle(unit) {
  if (!unit.unlocked) {
    return t('military.unlocksAt', unlockTypeName(unit.buildingKey))
  }
  return t('military.strongAgainst', t('unit.' + UNIT_COUNTERS[unit.type]).toLowerCase())
}

/** Stats and upkeep tooltip for a unit (empty while locked), with research bonuses and consumption multipliers applied.
 * @param {Object} unit - Unit snapshot from ui.military.units
 * @returns {string} Multi-line tooltip text
 */
function unitTooltip(unit) {
  if (!unit.unlocked) {
    return ''
  }
  const stats = UNIT_STATS[unit.type]
  const attack = +(stats.attack * (1 + ui.unitBonuses.attack)).toFixed(2)
  const health = +(stats.health * (1 + ui.unitBonuses.defense)).toFixed(2)
  const upkeepFood = +(unit.upkeep.food * ui.consumptionMultipliers[RESOURCE_FOOD]).toFixed(2)
  const upkeepWood = +(unit.upkeep.wood * ui.consumptionMultipliers[RESOURCE_WOOD]).toFixed(2)
  return t('military.unitStats', attack, health) + '\n'
    + t('military.unitUpkeep', upkeepFood, upkeepWood)
}

/** Whether one more unit of this type can be trained.
 * @param {Object} unit - Unit snapshot from ui.military.units
 * @returns {boolean} True when below the cap and affordable
 */
function canTrain(unit) {
  return unit.count < unit.cap && unit.canAfford
}

/** Tooltip for the train button, or the reason it is disabled.
 * @param {Object} unit - Unit snapshot from ui.military.units
 * @returns {string} Localized tooltip
 */
function trainTooltip(unit) {
  const buildingName = t('building.' + unit.buildingKey).toLowerCase()
  if (unit.cap === 0) {
    return t('military.buildingRequired', buildingName)
  }
  if (unit.count >= unit.cap) {
    return t('military.unitCapReached', buildingName)
  }
  if (!unit.canAfford) {
    return t('building.insufficientResources')
  }
  return t('military.train')
}

/** Trains one unit, or up to BULK_WORKER_AMOUNT with Ctrl/Cmd+click.
 * @param {Object} unit - Unit snapshot from ui.military.units
 * @param {MouseEvent} event - Click event
 */
function train(unit, event) {
  if (!canTrain(unit)) {
    return
  }
  playTap()
  actions.buyUnits(unit.type, event.ctrlKey || event.metaKey ? BULK_WORKER_AMOUNT : 1)
}

/** Dismisses one unit, or up to BULK_WORKER_AMOUNT with Ctrl/Cmd+click. Nothing is refunded.
 * @param {Object} unit - Unit snapshot from ui.military.units
 * @param {MouseEvent} event - Click event
 */
function dismiss(unit, event) {
  if (unit.count === 0) {
    return
  }
  playTap()
  actions.dismissUnits(unit.type, event.ctrlKey || event.metaKey ? BULK_WORKER_AMOUNT : 1)
}

// ── Raid ───────────────────────────────────────────────────

/** Unit types present in the announced raid. */
const raiderTypes = computed(() => UNIT_TYPES.filter(type => (ui.military.raid?.enemy[type] ?? 0) > 0))

/** Colony share of the strength bar: 0.5 is an even fight. */
const strengthShare = computed(() => {
  const ratio = ui.military.forecast?.ratio ?? 0
  return Number.isFinite(ratio) ? ratio / (1 + ratio) : 1
})

/** Unit types the colony is expected to lose in a won battle. */
const expectedLossTypes = computed(() => UNIT_TYPES.filter(type => (ui.military.forecast?.unitsLost[type] ?? 0) > 0))

/** Whether the colony has any units before the battle. */
const hasArmy = computed(() => ui.military.units.some(unit => unit.count > 0))

const canAffordDelay = computed(() => Boolean(ui.military.raid?.delayCost) && canAffordCost(ui.resources, ui.military.raid.delayCost))
const canAffordCancel = computed(() => Boolean(ui.military.raid?.cancelCost) && canAffordCost(ui.resources, ui.military.raid.cancelCost))

/** Pays the delay tribute. */
function payDelay() {
  if (!canAffordDelay.value) {
    return
  }
  playTap()
  actions.payTribute(TRIBUTE_DELAY)
}

/** Pays the cancel tribute. */
function payCancel() {
  if (!canAffordCancel.value) {
    return
  }
  playTap()
  actions.payTribute(TRIBUTE_CANCEL)
}

/** Closes modal on Escape while it is the topmost modal (the help overlay, when open, sits above it). */
function handleEscape() {
  emit(EMIT_CLOSE)
}

onMounted(() => {
  pushFocusLayer(overlay.value)
  pushEscapeHandler(handleEscape)
  rafId = requestAnimationFrame(() => {
    visible.value = true
  })
})

onBeforeUnmount(() => {
  removeFocusLayer(overlay.value)
})

onUnmounted(() => {
  removeEscapeHandler(handleEscape)
  cancelAnimationFrame(rafId)
})
</script>

<template>
  <div
    ref="overlay"
    class="modal-overlay"
    :class="{ visible }"
    @click.self="emit(EMIT_CLOSE)"
  >
    <div class="military-modal">
      <button class="modal-help-btn" @click="playTap(); showHelp = true">?</button>
      <button class="modal-close-x" @click="playTap(); emit(EMIT_CLOSE)">&#10005;</button>
      <h2 class="modal-title">{{ t('military.title') }}</h2>

      <!-- Resource summary -->
      <div class="military-resources">
        <div
          v-for="resource in visibleResources"
          :key="resource"
          class="resource-box tooltip"
          :data-tooltip="t('resource.' + resource) + ': ' + formatNumberFull(ui.resources[resource])"
        >
          <div class="resource-row-top">
            <img class="resource-icon" :src="IMG_RESOURCE_MAP[resource]" :alt="t('resource.' + resource)">
            <span class="resource-value">{{ formatNumber(ui.resources[resource]) }}</span>
          </div>
        </div>
      </div>

      <div class="military-scroll thin-scrollbar">
        <!-- Army -->
        <section class="military-section">
          <div class="section-header">
            <h3 class="section-label">{{ t('military.army') }}</h3>
            <span class="army-upkeep" :class="{ 'army-upkeep--hidden': ui.armyConsumption[RESOURCE_FOOD] === 0 && ui.armyConsumption[RESOURCE_WOOD] === 0 }">
              {{ t('military.upkeep') }}
              <span v-for="resource in [RESOURCE_FOOD, RESOURCE_WOOD]" :key="resource" class="cost-item">
                <img class="cost-icon" :src="IMG_RESOURCE_MAP[resource]" :alt="t('resource.' + resource)">
                <span class="cost-amount">{{ +ui.armyConsumption[resource].toFixed(2) }}{{ t('resource.perSecond') }}</span>
              </span>
            </span>
          </div>

          <div
            v-for="unit in ui.military.units"
            :key="unit.type"
            class="army-row"
            :class="{ 'army-row--locked': !unit.unlocked }"
          >
            <div class="army-unit tooltip tooltip--multiline tooltip--delayed" :data-tooltip="unitTooltip(unit)">
              <img class="army-unit-img" :src="BUILDING_IMAGE_MAP[unit.buildingKey]" alt="">
              <div class="army-unit-text">
                <span class="army-unit-name">{{ t('unit.' + unit.type) }}</span>
                <span class="army-unit-subtitle">{{ unitSubtitle(unit) }}</span>
              </div>
            </div>

            <template v-if="unit.unlocked">
              <div class="army-controls">
                <span class="tooltip tooltip--delayed" :data-tooltip="unit.count > 0 ? t('military.dismiss') : t('military.noUnitsToDismiss')">
                  <button class="worker-btn worker-btn--minus army-btn" :disabled="unit.count === 0" @click="dismiss(unit, $event)">&minus;</button>
                </span>
                <span class="army-count" :class="{ 'army-count--zero': unit.count === 0 }">{{ unit.count }}/{{ unit.cap }}</span>
                <span class="tooltip" :class="{ 'tooltip--delayed': canTrain(unit) }" :data-tooltip="trainTooltip(unit)">
                  <button class="worker-btn worker-btn--plus army-btn" :disabled="!canTrain(unit)" @click="train(unit, $event)">+</button>
                </span>
              </div>
              <span class="army-cost">
                <span v-for="[key, amount] in unit.costEntries" :key="key" class="cost-item">
                  <img class="cost-icon" :src="IMG_RESOURCE_MAP[key]" :alt="t('resource.' + key)">
                  <span class="cost-amount" :class="{ 'cost-amount--short': ui.resources[key] < amount }">{{ formatNumber(amount) }}</span>
                </span>
              </span>
            </template>
            <img v-else class="army-lock" :src="IMG_OTHER_LOCK" :alt="unitSubtitle(unit)">
          </div>
        </section>

        <!-- Defenses -->
        <section class="military-section">
          <h3 class="section-label">{{ t('military.defenses') }}</h3>
          <div class="defense-tiles">
            <div class="defense-tile" :class="{ 'defense-tile--unbuilt': ui.military.wallLevel === 0 }">
              <img class="defense-img" :src="BUILDING_IMAGE_MAP[BUILDING_WALL]" alt="">
              <div class="defense-text">
                <span class="defense-name">{{ t('building.wall') }}</span>
                <span class="defense-value">{{ ui.military.wallLevel > 0 ? t('military.wallAbsorb', formatNumber(ui.military.wallAbsorb)) : t('military.notBuilt') }}</span>
              </div>
            </div>
            <div class="defense-tile" :class="{ 'defense-tile--unbuilt': ui.military.towerLevel === 0 }">
              <img class="defense-img" :src="BUILDING_IMAGE_MAP[BUILDING_TOWER]" alt="">
              <div class="defense-text">
                <span class="defense-name">{{ t('building.tower') }}</span>
                <span class="defense-value">{{ ui.military.towerLevel > 0 ? t('military.towerArchers', formatNumber(ui.military.towerArchers)) : t('military.notBuilt') }}</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Raid -->
        <section class="military-section">
          <h3 class="section-label">{{ t('military.raid') }}</h3>

          <p v-if="!ui.military.raid" class="raid-none">{{ t('military.noRaid') }}</p>

          <div v-else class="raid-panel">
            <!-- Countdown and raiders -->
            <div class="raid-header">
              <span class="raid-arrives">{{ t('military.raidArrivesIn') }}</span>
              <span class="raid-countdown" :class="{ 'raid-countdown--urgent': ui.military.raid.remainingSeconds < URGENT_RAID_SECONDS }">{{ formatTime(ui.military.raid.remainingSeconds) }}</span>
            </div>
            <div class="raiders">
              <span v-for="type in raiderTypes" :key="type" class="raider-chip">
                <img class="raider-img" :src="BUILDING_IMAGE_MAP[UNIT_BUILDINGS[type]]" alt="">
                <span class="raider-name">{{ t('unit.' + type) }}</span>
                <span class="raider-count">{{ ui.military.raid.enemy[type] }}</span>
              </span>
            </div>

            <!-- Forecast -->
            <div v-if="ui.military.forecast" class="forecast">
              <div class="strength-labels">
                <span class="strength-label strength-label--colony">{{ t('military.yourArmy') }}</span>
                <span class="forecast-verdict" :class="ui.military.forecast.victory ? 'forecast-verdict--victory' : 'forecast-verdict--defeat'">
                  {{ ui.military.forecast.victory ? t('military.victoryExpected') : t('military.defeatExpected') }}
                </span>
                <span class="strength-label strength-label--raiders">{{ t('military.raiders') }}</span>
              </div>
              <div class="strength-bar" role="img" :aria-label="ui.military.forecast.victory ? t('military.victoryExpected') : t('military.defeatExpected')">
                <div class="strength-fill" :style="{ width: (strengthShare * 100) + '%' }" />
                <span class="strength-tie" />
              </div>

              <ul class="forecast-losses">
                <template v-if="ui.military.forecast.victory">
                  <li v-if="expectedLossTypes.length === 0" class="forecast-loss forecast-loss--none">{{ t('military.noLosses') }}</li>
                  <li v-else class="forecast-loss">
                    {{ t('military.expectedLosses') }}:
                    <span v-for="type in expectedLossTypes" :key="type" class="forecast-loss-unit">{{ t('unit.' + type) }} &minus;{{ ui.military.forecast.unitsLost[type] }}</span>
                  </li>
                </template>
                <template v-else>
                  <li v-if="hasArmy" class="forecast-loss">{{ t('military.armyLost') }}</li>
                  <li v-if="ui.military.forecast.resourceShare > 0" class="forecast-loss">&minus;{{ t('military.resourceLoss', Math.round(ui.military.forecast.resourceShare * 100)) }}</li>
                  <li v-if="ui.military.forecast.workersLost > 0" class="forecast-loss">&minus;{{ t('military.workerLoss', ui.military.forecast.workersLost) }}</li>
                  <li v-if="ui.military.forecast.levelsLost > 0" class="forecast-loss">&minus;{{ t('military.levelLoss', ui.military.forecast.levelsLost) }}</li>
                </template>
              </ul>
            </div>

            <!-- Tribute -->
            <div class="tribute">
              <h4 class="tribute-label">{{ t('military.tribute') }}</h4>
              <div v-if="ui.military.raid.canDelay" class="tribute-row">
                <span class="tribute-name">{{ t('military.delay') }}</span>
                <span class="tribute-cost">
                  <span v-for="[key, amount] in ui.military.raid.delayCostEntries" :key="key" class="cost-item">
                    <img class="cost-icon" :src="IMG_RESOURCE_MAP[key]" :alt="t('resource.' + key)">
                    <span class="cost-amount" :class="{ 'cost-amount--short': ui.resources[key] < amount }">{{ formatNumber(amount) }}</span>
                  </span>
                </span>
                <span class="tooltip" :class="{ 'tooltip--delayed': canAffordDelay }" :data-tooltip="canAffordDelay ? t('military.delayTooltip', formatMinutes(TRIBUTE_DELAY_SECONDS)) : t('building.insufficientResources')">
                  <button class="btn-gold tribute-btn tribute-btn--time" :disabled="!canAffordDelay" @click="payDelay">+{{ formatTime(TRIBUTE_DELAY_SECONDS) }}</button>
                </span>
              </div>
              <div class="tribute-row">
                <span class="tribute-name">{{ t('military.cancel') }}</span>
                <span class="tribute-cost">
                  <span v-for="[key, amount] in ui.military.raid.cancelCostEntries" :key="key" class="cost-item">
                    <img class="cost-icon" :src="IMG_RESOURCE_MAP[key]" :alt="t('resource.' + key)">
                    <span class="cost-amount" :class="{ 'cost-amount--short': ui.resources[key] < amount }">{{ formatNumber(amount) }}</span>
                  </span>
                </span>
                <span class="tooltip" :class="{ 'tooltip--delayed': canAffordCancel }" :data-tooltip="canAffordCancel ? t('military.cancelTooltip') : t('building.insufficientResources')">
                  <button class="btn-gold tribute-btn" :disabled="!canAffordCancel" @click="payCancel">{{ t('military.cancelButton') }}</button>
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>

    <ModalHelpModal
      v-if="showHelp"
      :title="t('modal.militaryHelp.title')"
      :body="t('modal.militaryHelp.body', MILITARY_UNITS_PER_LEVEL, UNIT_COUNTER_MULTIPLIER, WALL_HEALTH_PER_LEVEL, TOWER_ARCHERS_PER_LEVEL)"
      @close="showHelp = false"
    />
  </div>
</template>

<style scoped>
/* ── Modal container ─────────────────────────────────────── */

.military-modal {
  position: relative;
  background: var(--color-bg-raised);
  border: 1px solid rgba(var(--color-accent-rgb), 0.2);
  box-shadow:
    0 4px 24px rgba(var(--color-shadow-rgb), 0.4),
    inset 0 1px 0 rgba(var(--color-accent-rgb), 0.06);
  padding: 1.25rem 1.75rem 1.5rem;
  width: 92vw;
  max-width: 520px;
  max-height: 89vh;
  display: flex;
  flex-direction: column;
  transform: translateY(8px);
  transition: transform 0.25s ease;
}

/* Slide-up entrance transition when overlay becomes visible */
.modal-overlay.visible .military-modal {
  transform: translateY(0);
}

.modal-title {
  font-size: 1rem;
  margin-bottom: 0.75rem;
}

/* ── Resource summary ────────────────────────────────────── */

.military-resources {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
  padding-top: 1rem;
  margin-bottom: 1rem;
}

.military-resources .resource-box {
  flex: 1;
}

.military-resources .resource-value {
  flex: 1;
}

/* ── Scrollable sections ─────────────────────────────────── */

.military-scroll {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  overflow-x: hidden;
  overflow-y: auto;
  min-height: 0;
  padding-right: 0.25rem;
}

/* Tooltips near the right edge open leftward so the scroll area does not clip them */
.army-controls .tooltip:last-child::after,
.tribute-row .tooltip::after {
  left: auto;
  right: 0;
  transform: none;
}

/* Tribute tooltips open upward, away from the bottom of the scroll area */
.tribute-row .tooltip::after {
  top: auto;
  bottom: calc(100% + 0.5rem);
}

.military-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.section-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
}

.section-label {
  font-family: var(--font-display);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(var(--color-text-rgb), 0.5);
  margin: 0;
}

/* Army upkeep summary beside the section label */
.army-upkeep {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-family: var(--font-body);
  font-size: 0.7rem;
  color: rgba(var(--color-text-rgb), 0.5);
}

/* Keeps its space while there is no army, so the window does not shift when the first unit is trained */
.army-upkeep--hidden {
  visibility: hidden;
}

/* ── Cost items (rem-sized; the card versions scale with the card) ── */

.cost-item {
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
}

.cost-icon {
  width: 0.8rem;
  height: 0.8rem;
  object-fit: contain;
}

.cost-amount {
  font-family: var(--font-numeric);
  font-size: 0.7rem;
  color: rgba(var(--color-text-rgb), 0.8);
  letter-spacing: 0.02em;
}

/* Red when the colony is short of this resource */
.cost-amount--short {
  color: var(--color-red);
}

/* ── Army rows ───────────────────────────────────────────── */

.army-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: rgba(var(--color-accent-rgb), 0.03);
  border: 1px solid rgba(var(--color-accent-rgb), 0.1);
  border-radius: 0.25rem;
}

/* Locked unit type — dimmed, no controls */
.army-row--locked {
  opacity: 0.45;
}

.army-unit {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex: 1;
  min-width: 0;
}

.army-unit-img {
  width: 2.4rem;
  height: 2.4rem;
  object-fit: cover;
  border-radius: 0.2rem;
  border: 1px solid rgba(var(--color-accent-rgb), 0.15);
  flex-shrink: 0;
}

/* Grayscale image for locked unit types */
.army-row--locked .army-unit-img {
  filter: grayscale(1);
}

.army-unit-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.army-unit-name {
  font-family: var(--font-body);
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-text);
}

.army-unit-subtitle {
  font-family: var(--font-body);
  font-size: 0.7rem;
  font-weight: 300;
  color: rgba(var(--color-text-rgb), 0.55);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.army-controls {
  display: flex;
  align-items: center;
  gap: 0.15rem;
}

/* Modal-sized version of the card's worker +/- buttons */
.army-btn {
  width: 1.6rem;
  height: 1.6rem;
  padding: 0 0 0.12rem;
  font-size: 1rem;
}

.army-count {
  font-family: var(--font-numeric);
  font-size: 0.75rem;
  color: rgba(var(--color-text-rgb), 0.85);
  min-width: 3.4rem;
  text-align: center;
}

/* Red when the colony has no units of this type */
.army-count--zero {
  color: var(--color-red);
}

.army-cost {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  min-width: 5.5rem;
}

.army-lock {
  width: 1rem;
  height: 1rem;
  object-fit: contain;
  filter: grayscale(1);
  opacity: 0.7;
}

/* ── Defenses ────────────────────────────────────────────── */

.defense-tiles {
  display: flex;
  gap: 0.5rem;
}

.defense-tile {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 0.75rem;
  background: rgba(var(--color-accent-rgb), 0.03);
  border: 1px solid rgba(var(--color-accent-rgb), 0.1);
  border-radius: 0.25rem;
}

.defense-img {
  width: 2rem;
  height: 2rem;
  object-fit: cover;
  border-radius: 0.2rem;
  border: 1px solid rgba(var(--color-accent-rgb), 0.15);
}

/* Grayscale image while the defense is not built */
.defense-tile--unbuilt .defense-img {
  filter: grayscale(1);
}

.defense-text {
  display: flex;
  flex-direction: column;
}

.defense-name {
  font-family: var(--font-body);
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--color-text);
}

.defense-value {
  font-family: var(--font-body);
  font-size: 0.7rem;
  font-weight: 300;
  color: rgba(var(--color-text-rgb), 0.6);
}

/* ── Raid ────────────────────────────────────────────────── */

.raid-none {
  font-family: var(--font-body);
  font-size: 0.8rem;
  font-weight: 300;
  color: rgba(var(--color-text-rgb), 0.5);
  padding: 0.6rem 0.75rem;
  border: 1px dashed rgba(var(--color-accent-rgb), 0.12);
  border-radius: 0.25rem;
  margin: 0;
}

/* Announced raid — red-tinted panel */
.raid-panel {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.75rem 0.85rem 0.85rem;
  background: rgba(var(--color-red-rgb), 0.04);
  border: 1px solid rgba(var(--color-red-rgb), 0.3);
  border-radius: 0.25rem;
}

.raid-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.raid-arrives {
  font-family: var(--font-body);
  font-size: 0.85rem;
  color: rgba(var(--color-text-rgb), 0.75);
}

.raid-countdown {
  font-family: var(--font-numeric);
  font-size: 1.4rem;
  font-weight: 500;
  color: var(--color-accent);
  letter-spacing: 0.04em;
}

/* Arrival is close */
.raid-countdown--urgent {
  color: var(--color-red);
}

.raiders {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.raider-chip {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem 0.5rem 0.2rem 0.2rem;
  border: 1px solid rgba(var(--color-red-rgb), 0.25);
  border-radius: 0.25rem;
  background: rgba(var(--color-red-rgb), 0.06);
}

.raider-img {
  width: 1.4rem;
  height: 1.4rem;
  object-fit: cover;
  border-radius: 0.15rem;
}

.raider-name {
  font-family: var(--font-body);
  font-size: 0.75rem;
  color: rgba(var(--color-text-rgb), 0.8);
}

.raider-count {
  font-family: var(--font-numeric);
  font-size: 0.75rem;
  color: var(--color-red);
}

/* ── Forecast: colony vs raiders strength ────────────────── */

.forecast {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.strength-labels {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
}

.strength-label {
  font-family: var(--font-body);
  font-size: 0.7rem;
  color: rgba(var(--color-text-rgb), 0.55);
}

.strength-label--colony {
  color: rgba(var(--color-green-rgb), 0.85);
}

.strength-label--raiders {
  color: rgba(var(--color-red-rgb), 0.85);
}

.forecast-verdict {
  font-family: var(--font-display);
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.06em;
}

.forecast-verdict--victory {
  color: var(--color-green);
}

.forecast-verdict--defeat {
  color: var(--color-red);
}

/* Tug-of-war bar: the colony's share grows from the left, raiders fill the rest */
.strength-bar {
  position: relative;
  height: 0.6rem;
  border-radius: 0.3rem;
  background: linear-gradient(
    90deg,
    rgba(var(--color-red-rgb), 0.55),
    rgba(var(--color-red-rgb), 0.85)
  );
  overflow: hidden;
  box-shadow: inset 0 1px 2px rgba(var(--color-shadow-rgb), 0.5);
}

.strength-fill {
  height: 100%;
  background: linear-gradient(
    90deg,
    rgba(var(--color-green-rgb), 0.85),
    rgba(var(--color-green-rgb), 0.6)
  );
  transition: width 0.4s ease;
}

/* Center mark — an even fight */
.strength-tie {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 2px;
  transform: translateX(-50%);
  background: rgba(var(--color-text-rgb), 0.85);
  box-shadow: 0 0 3px rgba(var(--color-shadow-rgb), 0.8);
}

.forecast-losses {
  list-style: none;
  margin: 0.2rem 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.forecast-loss {
  font-family: var(--font-body);
  font-size: 0.75rem;
  font-weight: 300;
  color: rgba(var(--color-text-rgb), 0.7);
}

.forecast-loss--none {
  color: rgba(var(--color-green-rgb), 0.85);
}

.forecast-loss-unit {
  margin-left: 0.4rem;
  font-family: var(--font-numeric);
  font-size: 0.7rem;
  color: var(--color-red);
}

@media (prefers-reduced-motion: reduce) {
  .strength-fill {
    transition: none;
  }
}

/* ── Tribute ─────────────────────────────────────────────── */

.tribute {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding-top: 0.65rem;
  border-top: 1px solid rgba(var(--color-red-rgb), 0.15);
}

.tribute-label {
  font-family: var(--font-display);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(var(--color-text-rgb), 0.45);
  margin: 0;
}

.tribute-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.tribute-name {
  font-family: var(--font-body);
  font-size: 0.8rem;
  color: var(--color-text);
  flex: 1;
}

.tribute-cost {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.tribute-btn {
  min-width: 5.5rem;
  padding: 0.35rem 0.6rem;
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  border-radius: 0.1875rem;
}

/* Delay button shows the added time */
.tribute-btn--time {
  font-family: var(--font-numeric);
  letter-spacing: 0.04em;
}
</style>
