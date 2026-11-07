<script setup>
import {inject, ref, onMounted, onBeforeUnmount, onUnmounted} from 'vue'
import audio, {playTap} from '@/js/engine/audio.js'
import {SND_NOTIFICATION_BLESSING, IMG_BLESSING_MAP} from '@/js/engine/assets.js'
import {t} from '@/js/i18n/localized.js'
import {BLESSING_FERTILE_SOIL, BLESSING_FOREST_BLOOM, BLESSING_GIFT_FROM_THE_HEAVENS,
  BLESSING_HOLY_EXPANSION, BLESSING_RICH_MINES, BLESSING_CELESTIAL_PROSPERITY,
  BLESSING_RAPID_CONSTRUCTION, BLESSING_FAVORABLE_WEATHER, BLESSING_WISDOM_OF_THE_GODS,
  BLESSING_BLESSED_MARKETS, BLESSING_TEMPORARY_PEACE, BLESSING_CELESTIAL_FORTIFICATION} from '@/js/engine/enums.js'
import {formatMinutes, formatNumber} from '@/js/engine/format.js'
import {pushEscapeHandler, removeEscapeHandler} from '@/js/engine/escape_stack.js'
import {pushFocusLayer, removeFocusLayer} from '@/js/engine/focus_stack.js'

const ui = inject('ui')
const actions = inject('actions')
const visible = ref(false)
const overlay = ref(null) // Root element; everything else is inert while this modal is topmost
let rafId = null

/** Returns a human-readable description for a blessing. */
function blessingDescription(blessing) {
  const percentage = blessing.productivity ? Math.round(blessing.productivity * 100) : 0
  const duration = formatMinutes(blessing.timeout ?? 0)
  switch (blessing.type) {
    case BLESSING_FERTILE_SOIL: return t('blessing.fertileSoil.description', percentage, duration)
    case BLESSING_FOREST_BLOOM: return t('blessing.forestBloom.description', percentage, duration)
    case BLESSING_GIFT_FROM_THE_HEAVENS: {
      const resourceLines = Object.entries(blessing.resources ?? {})
        .map(([
          resource,
          amount,
        ]) => `${t('resource.' + resource)}: ${formatNumber(amount)}`)
        .join('\n')
      return t('blessing.giftFromTheHeavens.description') + '\n' + resourceLines
    }
    case BLESSING_HOLY_EXPANSION: return t('blessing.holyExpansion.description', blessing.territory)
    case BLESSING_RICH_MINES: return t('blessing.richMines.description', percentage, duration)
    case BLESSING_CELESTIAL_PROSPERITY: return t('blessing.celestialProsperity.description', percentage, duration)
    case BLESSING_RAPID_CONSTRUCTION: return t('blessing.rapidConstruction.description', Math.round((blessing.construction ?? 0) * 100), duration)
    case BLESSING_FAVORABLE_WEATHER: return t('blessing.favorableWeather.description', Math.round((blessing.warm ?? 0) * 100), Math.round((blessing.cold ?? 0) * 100), duration)
    case BLESSING_WISDOM_OF_THE_GODS: return t('blessing.wisdomOfTheGods.description', percentage, duration)
    case BLESSING_BLESSED_MARKETS: return t('blessing.blessedMarkets.description', duration)
    case BLESSING_TEMPORARY_PEACE: return t('blessing.temporaryPeace.description', duration)
    case BLESSING_CELESTIAL_FORTIFICATION: return t('blessing.celestialFortification.description', duration)
    default: return ''
  }
}

/** Block Escape while topmost — this modal cannot be dismissed with it. */
function handleEscape() {
  // Swallows Escape so modals underneath and the pause toggle never see it
}

onMounted(() => {
  pushFocusLayer(overlay.value)
  pushEscapeHandler(handleEscape)
  audio.playSound(SND_NOTIFICATION_BLESSING)
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
      <h2 class="modal-title modal-title--reward">{{ t('challenge.reward.title') }}</h2>
      <span class="modal-rule modal-rule--reward" />

      <p class="modal-description">{{ t('challenge.reward.description') }}</p>

      <!-- Blessing choices -->
      <div class="blessing-choices">
        <div
          v-for="(blessing, index) in ui.challenges.activeBlessingChoices"
          :key="index"
          class="blessing-card"
          role="button"
          tabindex="0"
          @click="playTap(); actions.selectBlessing(index)"
          @keydown.enter.prevent="playTap(); actions.selectBlessing(index)"
          @keydown.space.prevent="playTap(); actions.selectBlessing(index)"
        >
          <img class="blessing-img" :src="IMG_BLESSING_MAP[blessing.type]" :alt="t('blessing.' + blessing.type)">
          <div class="blessing-name">{{ t('blessing.' + blessing.type) }}</div>
          <p class="blessing-description">{{ blessingDescription(blessing) }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-content {
  padding: 1.75rem 1.75rem 1.5rem;
  min-width: 380px;
  max-width: 520px;
  align-items: center;
}

.modal-title--reward {
  color: rgba(var(--color-accent-rgb), 1);
}

.modal-rule--reward {
  margin: 1rem 0 1.25rem;
}

.modal-description {
  text-align: center;
  margin-bottom: 1.25rem;
}

/* Blessing cards laid out side by side */
.blessing-choices {
  display: flex;
  gap: 0.75rem;
  width: 100%;
}

.blessing-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem 0.75rem;
  border: 2px solid rgba(var(--color-accent-rgb), 0.15);
  background: linear-gradient(
    180deg,
    rgba(var(--color-accent-rgb), 0.04),
    rgba(var(--color-shadow-rgb), 0.08)
  );
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.blessing-card:hover {
  border-color: rgba(var(--color-accent-rgb), 0.35);
  box-shadow: 0 0 12px rgba(var(--color-accent-rgb), 0.08);
}

.blessing-img {
  width: 100%;
  max-width: 200px;
  object-fit: cover;
  margin-bottom: 0.75rem;
  border: 1px solid rgba(var(--color-accent-rgb), 0.15);
  box-shadow: 0 4px 16px rgba(var(--color-shadow-rgb), 0.35);
}

.blessing-name {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 0.95rem;
  color: rgba(var(--color-accent-rgb), 1);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  text-align: center;
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
}

.blessing-description {
  font-family: var(--font-body);
  font-size: 0.9rem;
  font-weight: 300;
  color: rgba(var(--color-text-rgb), 0.65);
  text-align: center;
  line-height: 1.5;
  white-space: pre-line;
  flex: 1;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  margin-bottom: 0;
}
</style>
