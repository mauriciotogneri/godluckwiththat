<script setup>
import {computed, inject, ref, onMounted, onBeforeUnmount, onUnmounted} from 'vue'
import {playTap} from '@/js/engine/audio.js'
import {IMG_BUILDING_WALL, IMG_RESOURCE_MAP, IMG_UNIT_WORKER} from '@/js/engine/assets.js'
import {BOUNDED_RESOURCES, BUILDING_IMAGE_MAP, UNIT_BUILDINGS, UNIT_TYPES} from '@/js/engine/constants.js'
import {formatNumber} from '@/js/engine/format.js'
import {pushEscapeHandler, removeEscapeHandler} from '@/js/engine/escape_stack.js'
import {pushFocusLayer, removeFocusLayer} from '@/js/engine/focus_stack.js'
import {t} from '@/js/i18n/localized.js'

const ui = inject('ui')
const actions = inject('actions')
const visible = ref(false)
const overlay = ref(null) // Root element; everything else is inert while this modal is topmost
let rafId = null

const report = computed(() => ui.raidReport)

/** Unit types the colony had before the battle. */
const armyTypes = computed(() => UNIT_TYPES.filter(type => report.value.army[type] > 0))

/** Unit types the raiders brought. */
const enemyTypes = computed(() => UNIT_TYPES.filter(type => report.value.enemy[type] > 0))

/** Resources lost, as [resource, amount] pairs (whole units only). */
const resourcesLost = computed(() => BOUNDED_RESOURCES
  .filter(resource => Math.floor(report.value.resourcesLost[resource] ?? 0) > 0)
  .map(resource => [
    resource,
    report.value.resourcesLost[resource],
  ]))

/** Buildings that lost levels, grouped by building with the number of levels lost. */
const buildingsLost = computed(() => {
  const counts = new Map()
  for (const key of report.value.buildingsLost) {
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()]
})

const hasLosses = computed(() => resourcesLost.value.length > 0 || report.value.workersLost > 0 || buildingsLost.value.length > 0)

/** Block Escape while topmost — this modal cannot be dismissed with it. */
function handleEscape() {
  // Swallows Escape so modals underneath and the pause toggle never see it
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
  <div ref="overlay" class="modal-overlay" :class="{ visible }">
    <div class="modal-content" :class="report.victory ? 'raid-result--victory' : 'raid-result--defeat'">
      <h2 class="modal-title raid-title">{{ report.victory ? t('raid.result.victoryTitle') : t('raid.result.defeatTitle') }}</h2>
      <span class="modal-rule raid-rule" />

      <p class="modal-description">{{ report.victory ? t('raid.result.victoryDescription') : t('raid.result.defeatDescription') }}</p>

      <img class="raid-img" :src="IMG_BUILDING_WALL" alt="">

      <!-- Both sides -->
      <div class="raid-sides">
        <div class="raid-side">
          <h3 class="raid-side-title raid-side-title--colony">{{ t('raid.result.yourArmy') }}</h3>
          <ul class="raid-units">
            <li v-for="type in armyTypes" :key="type" class="raid-unit">
              <img class="raid-unit-img" :src="BUILDING_IMAGE_MAP[UNIT_BUILDINGS[type]]" alt="">
              <span class="raid-unit-name">{{ t('unit.' + type) }}</span>
              <span class="raid-unit-count">{{ report.army[type] }}</span>
              <span v-if="report.unitsLost[type] > 0" class="raid-unit-loss">&minus;{{ report.unitsLost[type] }}</span>
            </li>
            <li v-if="armyTypes.length === 0" class="raid-unit raid-unit--none">{{ t('raid.result.noUnits') }}</li>
          </ul>
        </div>
        <div class="raid-side">
          <h3 class="raid-side-title raid-side-title--raiders">{{ t('raid.result.raiders') }}</h3>
          <ul class="raid-units">
            <li v-for="type in enemyTypes" :key="type" class="raid-unit">
              <img class="raid-unit-img" :src="BUILDING_IMAGE_MAP[UNIT_BUILDINGS[type]]" alt="">
              <span class="raid-unit-name">{{ t('unit.' + type) }}</span>
              <span class="raid-unit-count">{{ report.enemy[type] }}</span>
            </li>
          </ul>
        </div>
      </div>

      <!-- Plunder on defeat; the building levels lost in either outcome -->
      <dl v-if="hasLosses" class="raid-losses">
        <template v-if="resourcesLost.length > 0">
          <dt class="raid-loss-label">{{ t('raid.result.resourcesLost') }}</dt>
          <dd class="raid-loss-value">
            <span v-for="[resource, amount] in resourcesLost" :key="resource" class="raid-loss-item">
              <img class="raid-loss-icon" :src="IMG_RESOURCE_MAP[resource]" :alt="t('resource.' + resource)">
              {{ formatNumber(amount) }}
            </span>
          </dd>
        </template>
        <template v-if="report.workersLost > 0">
          <dt class="raid-loss-label">{{ t('raid.result.workersLost') }}</dt>
          <dd class="raid-loss-value">
            <span class="raid-loss-item">
              <img class="raid-loss-icon" :src="IMG_UNIT_WORKER" :alt="t('resource.population')">
              {{ report.workersLost }}
            </span>
          </dd>
        </template>
        <template v-if="buildingsLost.length > 0">
          <dt class="raid-loss-label">{{ t('raid.result.buildingsLost') }}</dt>
          <dd class="raid-loss-value">
            <span v-for="[key, levels] in buildingsLost" :key="key" class="raid-loss-item raid-loss-item--building">
              {{ t('building.' + key) }}<template v-if="levels > 1"> &times;{{ levels }}</template>
            </span>
          </dd>
        </template>
      </dl>

      <button class="btn-gold modal-btn" :class="{ 'modal-btn--danger': !report.victory }" @click="playTap(); actions.acknowledgeRaid()">
        {{ t('raid.result.continue') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.modal-content {
  padding: 1.75rem 2.25rem 1.5rem;
  min-width: 360px;
  max-width: 460px;
  align-items: center;
}

.raid-result--victory .raid-title {
  color: rgba(var(--color-accent-rgb), 1);
}

.raid-result--defeat .raid-title {
  color: var(--color-red);
}

.raid-rule {
  margin: 1rem 0 1.25rem;
}

/* Red divider on defeat */
.raid-result--defeat .raid-rule {
  background: linear-gradient(
    90deg,
    rgba(var(--color-red-rgb), 0),
    rgba(var(--color-red-rgb), 0.45),
    rgba(var(--color-red-rgb), 0)
  );
}

.modal-description {
  text-align: center;
  margin-bottom: 1rem;
}

.raid-img {
  width: 100%;
  max-width: 360px;
  max-height: 9rem;
  object-fit: cover;
  margin-bottom: 1rem;
  border: 1px solid rgba(var(--color-accent-rgb), 0.2);
  box-shadow: 0 4px 16px rgba(var(--color-shadow-rgb), 0.35);
}

/* Desaturated, red-edged image on defeat */
.raid-result--defeat .raid-img {
  border-color: rgba(var(--color-red-rgb), 0.3);
  filter: saturate(0.6);
}

/* ── Both sides ──────────────────────────────────────────── */

.raid-sides {
  display: flex;
  gap: 0.75rem;
  width: 100%;
  margin-bottom: 1rem;
}

.raid-side {
  flex: 1;
  min-width: 0;
  padding: 0.6rem 0.7rem;
  background: rgba(var(--color-accent-rgb), 0.03);
  border: 1px solid rgba(var(--color-accent-rgb), 0.1);
  border-radius: 0.25rem;
}

.raid-side-title {
  font-family: var(--font-display);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin: 0 0 0.45rem;
}

.raid-side-title--colony {
  color: rgba(var(--color-green-rgb), 0.85);
}

.raid-side-title--raiders {
  color: rgba(var(--color-red-rgb), 0.85);
}

.raid-units {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.raid-unit {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-family: var(--font-body);
  font-size: 0.8rem;
  color: rgba(var(--color-text-rgb), 0.8);
}

.raid-unit--none {
  font-weight: 300;
  color: rgba(var(--color-text-rgb), 0.5);
}

.raid-unit-img {
  width: 1.3rem;
  height: 1.3rem;
  object-fit: cover;
  border-radius: 0.15rem;
}

.raid-unit-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.raid-unit-count {
  font-family: var(--font-numeric);
  font-size: 0.75rem;
}

.raid-unit-loss {
  font-family: var(--font-numeric);
  font-size: 0.75rem;
  color: var(--color-red);
}

/* ── Losses ──────────────────────────────────────────────── */

.raid-losses {
  display: grid;
  grid-template-columns: auto 1fr;
  column-gap: 0.75rem;
  row-gap: 0.4rem;
  width: 100%;
  margin: 0 0 1.5rem;
  padding: 0.6rem 0.7rem;
  border: 1px solid rgba(var(--color-red-rgb), 0.2);
  background: rgba(var(--color-red-rgb), 0.04);
  border-radius: 0.25rem;
}

.raid-loss-label {
  font-family: var(--font-body);
  font-size: 0.8rem;
  font-weight: 300;
  color: rgba(var(--color-text-rgb), 0.6);
}

.raid-loss-value {
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem 0.7rem;
  font-family: var(--font-body);
  font-size: 0.8rem;
  color: var(--color-red);
}

.raid-loss-item {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  font-family: var(--font-numeric);
  font-size: 0.75rem;
}

/* Building names read as text, not numbers */
.raid-loss-item--building {
  font-family: var(--font-body);
  font-size: 0.8rem;
}

.raid-loss-icon {
  width: 0.85rem;
  height: 0.85rem;
  object-fit: contain;
}

.modal-btn {
  align-self: stretch;
}
</style>
