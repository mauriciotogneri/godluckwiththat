<script setup>
import {inject, ref, onMounted, onBeforeUnmount, onUnmounted} from 'vue'
import audio, {playTap} from '@/js/engine/audio.js'
import {SND_NOTIFICATION_DISASTER, IMG_PUNISHMENT_MAP} from '@/js/engine/assets.js'
import {t} from '@/js/i18n/localized.js'
import {formatMinutes} from '@/js/engine/format.js'
import {pushEscapeHandler, removeEscapeHandler} from '@/js/engine/escape_stack.js'
import {pushFocusLayer, removeFocusLayer} from '@/js/engine/focus_stack.js'

const ui = inject('ui')
const actions = inject('actions')
const visible = ref(false)
const overlay = ref(null) // Root element; everything else is inert while this modal is topmost
let rafId = null

/** Block Escape while topmost — this modal cannot be dismissed with it. */
function handleEscape() {
  // Swallows Escape so modals underneath and the pause toggle never see it
}

onMounted(() => {
  pushFocusLayer(overlay.value)
  pushEscapeHandler(handleEscape)
  audio.playSound(SND_NOTIFICATION_DISASTER)
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
    <div class="modal-content">
      <h2 class="modal-title modal-title--failure">{{ t('challenge.failure.title') }}</h2>
      <span class="modal-rule modal-rule--failure" />

      <p class="modal-description">{{ t('challenge.failure.description') }}</p>

      <template v-if="ui.challenges.activePunishment">
        <!-- Punishment name -->
        <div class="punishment-name">{{ t('punishment.' + ui.challenges.activePunishment.type) }}</div>

        <!-- Punishment image -->
        <img
          class="punishment-img"
          :src="IMG_PUNISHMENT_MAP[ui.challenges.activePunishment.type]"
          :alt="t('punishment.' + ui.challenges.activePunishment.type)"
        >

        <!-- Punishment effects list -->
        <ul class="punishment-list">
          <li v-if="ui.challenges.activePunishment.faith" class="punishment-item">
            {{ t('punishment.faithLoss', Math.round(ui.challenges.activePunishment.faith * 100)) }}
          </li>
          <li v-if="ui.challenges.activePunishment.resources" class="punishment-item">
            {{ t('punishment.resourceLoss', Math.round(ui.challenges.activePunishment.resources * 100)) }}
          </li>
          <li v-if="ui.challenges.activePunishment.workers" class="punishment-item">
            {{ t(ui.challenges.activePunishment.workers === 1 ? 'punishment.workerLossSingular' : 'punishment.workerLoss', ui.challenges.activePunishment.workers) }}
          </li>
          <li v-if="ui.challenges.activePunishment.levels" class="punishment-item">
            {{ t(ui.challenges.activePunishment.levels === 1 ? 'punishment.buildingLossSingular' : 'punishment.buildingLoss', ui.challenges.activePunishment.levels) }}
          </li>
          <li v-if="ui.challenges.activePunishment.productivityFarm" class="punishment-item">
            {{ t('punishment.productivityFarmLoss', Math.round(ui.challenges.activePunishment.productivityFarm * 100), formatMinutes(ui.challenges.activePunishment.timeout ?? 0)) }}
          </li>
          <li v-if="ui.challenges.activePunishment.productivityWoodcutter" class="punishment-item">
            {{ t('punishment.productivityWoodcutterLoss', Math.round(ui.challenges.activePunishment.productivityWoodcutter * 100), formatMinutes(ui.challenges.activePunishment.timeout ?? 0)) }}
          </li>
          <li v-if="ui.challenges.activePunishment.productivityMines" class="punishment-item">
            {{ t('punishment.productivityMinesLoss', Math.round(ui.challenges.activePunishment.productivityMines * 100), formatMinutes(ui.challenges.activePunishment.timeout ?? 0)) }}
          </li>
          <li v-if="ui.challenges.activePunishment.productivityGeneral" class="punishment-item">
            {{ t('punishment.productivityGeneralLoss', Math.round(ui.challenges.activePunishment.productivityGeneral * 100), formatMinutes(ui.challenges.activePunishment.timeout ?? 0)) }}
          </li>
        </ul>

        <button class="btn-gold modal-btn modal-btn--danger" @click="playTap(); actions.acknowledgePunishment()">
          {{ t('challenge.failure.acknowledge') }}
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.modal-content {
  padding: 1.75rem 2.5rem 1.5rem;
  min-width: 340px;
  max-width: 420px;
  align-items: center;
}

.modal-title--failure {
  color: rgba(196, 80, 80, 1);
}

.modal-rule--failure {
  margin: 1rem 0 1.25rem;
  background: linear-gradient(
    90deg,
    rgba(196, 80, 80, 0),
    rgba(196, 80, 80, 0.45),
    rgba(196, 80, 80, 0)
  );
}

.modal-description {
  text-align: center;
  margin-bottom: 1rem;
}

.punishment-name {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 1.1rem;
  color: rgba(196, 80, 80, 1);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 0.75rem;
}

.punishment-img {
  width: 100%;
  max-width: 400px;
  object-fit: cover;
  margin-bottom: 1rem;
  border: 1px solid rgba(196, 80, 80, 0.25);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
}

.punishment-list {
  list-style: none;
  padding: 0;
  margin: 0 0 1.5rem;
  width: 100%;
}

.punishment-item {
  font-family: var(--font-body);
  font-size: 0.9rem;
  font-weight: 300;
  color: rgba(var(--color-text-rgb), 0.7);
  padding: 0.35rem 0;
  border-bottom: 1px solid rgba(var(--color-accent-rgb), 0.06);
  text-align: center;
}

.punishment-item:last-child {
  border-bottom: none;
}

.modal-btn {
  align-self: stretch;
}
</style>
