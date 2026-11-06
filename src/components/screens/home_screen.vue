<script setup>
import {computed, ref} from 'vue'
import {playTap} from '@/js/engine/audio.js'
import {EMIT_ABOUT, EMIT_SETTINGS, EMIT_START} from '@/js/engine/enums.js'
import storage from '@/js/engine/storage.js'
import {t} from '@/js/i18n/localized.js'

const emit = defineEmits([
  EMIT_START,
  EMIT_SETTINGS,
  EMIT_ABOUT,
])

const isMobile = ref(window.matchMedia('(pointer: coarse)').matches)
const savedData = ref(storage.savedGame)
const hasSavedGame = computed(() => savedData.value !== null)
</script>

<template>
  <div class="screen-layout">
    <div class="screen-glow" />

    <div class="screen-content">
      <h1 class="title">
        <span class="title-line">{{ t('screen.home.title.line1').toUpperCase() }}</span>
        <span class="title-line">{{ t('screen.home.title.line2').toUpperCase() }}</span>
      </h1>

      <button v-if="!isMobile && hasSavedGame" class="btn-gold start-button" @click="playTap(); emit(EMIT_START, savedData)">
        {{ t('screen.home.continue') }}
      </button>
      <button v-else-if="!isMobile" class="btn-gold start-button" @click="playTap(); emit(EMIT_START, null)">
        {{ t('screen.home.newGame') }}
      </button>
      <button class="btn-gold start-button" @click="playTap(); emit(EMIT_SETTINGS)">
        {{ t('screen.home.settings') }}
      </button>
      <button class="btn-gold start-button" @click="playTap(); emit(EMIT_ABOUT)">
        {{ t('screen.home.about') }}
      </button>

      <p v-if="isMobile" class="mobile-notice">
        {{ t('screen.home.mobileUnavailable') }}
      </p>
    </div>
  </div>
</template>

<style scoped>
/* Game title heading */
.title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: clamp(2.8rem, 8vw, 5.5rem);
  line-height: 1.1;
  text-align: center;
  color: var(--color-text);
  letter-spacing: 0.02em;
  margin-bottom: 5rem;
}

.title-line {
  display: block;
}

/* Second line — accent color */
.title-line:nth-child(2) {
  color: rgba(var(--color-accent-rgb), 0.85);
}

/* Play button */
.start-button {
  font-size: 1rem;
  letter-spacing: 0.2em;
  padding: 0.9rem 2.8rem;
  width: 16rem;
}

.start-button:hover {
  box-shadow: 0 0 30px rgba(var(--color-accent-rgb), 0.1);
}

.start-button:active {
  transform: scale(0.97);
}

/* Desktop-only notice for mobile visitors */
.mobile-notice {
  font-family: var(--font-display);
  font-size: 0.95rem;
  color: var(--color-text);
  text-align: center;
  letter-spacing: 0.04em;
}

</style>
