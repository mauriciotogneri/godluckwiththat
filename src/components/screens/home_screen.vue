<script setup>
import {computed, ref} from 'vue'
import {IMG_OTHER_HOME_BACKGROUND, IMG_OTHER_HOME_TITLE} from '@/js/engine/assets.js'
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
    <img class="screen-background" :src="IMG_OTHER_HOME_BACKGROUND" alt="">

    <div class="screen-content home-content">
      <h1 class="title screen-veil">
        <img class="title-image" :src="IMG_OTHER_HOME_TITLE" width="1200" height="458" :alt="t('screen.home.title.line1') + ' ' + t('screen.home.title.line2')">
      </h1>

      <div class="home-buttons screen-veil">
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
  </div>
</template>

<style scoped>
/* Title and buttons sit slightly above center */
.home-content {
  margin-bottom: 10vh;
}

/* Game title heading */
.title {
  margin-bottom: 3.5rem;
  line-height: 0;
}

/* Title artwork, shrinking on narrow or short windows */
.title-image {
  width: clamp(18rem, 30vw, 32rem);
  max-width: min(85vw, 60vh);
  height: auto;
}

/* Menu button stack */
.home-buttons {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

/* Rounder veil around the title artwork */
.title::before {
  width: 160%;
  height: 160%;
}

/* Menu button — dark bronze plate in a gold frame */
.start-button {
  font-size: 1.25rem;
  letter-spacing: 0.22em;
  text-indent: 0.22em;
  padding: 0.65rem 2rem;
  width: 19rem;
  max-width: 90vw;
  color: var(--color-text);
  background: linear-gradient(180deg, rgba(70, 57, 39, 0.95) 0%, rgba(45, 39, 29, 0.95) 45%, rgba(48, 41, 30, 0.95) 100%);
  border: 2px solid rgba(206, 160, 88, 1);
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.35), 0 2px 10px rgba(0, 0, 0, 0.5);
}

/* Brighter frame and warm glow on hover */
.start-button:hover {
  color: rgba(232, 190, 120, 1);
  background: linear-gradient(180deg, rgba(84, 68, 45, 0.95) 0%, rgba(54, 46, 34, 0.95) 45%, rgba(57, 48, 35, 0.95) 100%);
  border-color: rgba(232, 190, 120, 1);
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.35), 0 2px 10px rgba(0, 0, 0, 0.5), 0 0 20px rgba(var(--color-accent-rgb), 0.3);
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
