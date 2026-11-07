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
    <img class="home-background" :src="IMG_OTHER_HOME_BACKGROUND" alt="">
    <div class="home-veil" />

    <div class="screen-content home-content">
      <h1 class="title">
        <img class="title-image" :src="IMG_OTHER_HOME_TITLE" width="1200" height="458" :alt="t('screen.home.title.line1') + ' ' + t('screen.home.title.line2')">
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
/* Painted landscape filling the screen */
.home-background {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  pointer-events: none;
}

/* Dark blurred oval behind title and buttons, fading into the painting */
.home-veil {
  position: absolute;
  top: 40%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: clamp(36rem, 50vw, 60rem);
  height: 130vh;
  background: rgba(0, 0, 0, 0.65);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  mask-image: radial-gradient(closest-side, rgba(0, 0, 0, 1) 55%, rgba(0, 0, 0, 0.5) 80%, rgba(0, 0, 0, 0) 100%);
  pointer-events: none;
}

/* Title and buttons sit slightly above center */
.home-content {
  margin-bottom: 10vh;
}

/* Game title heading */
.title {
  margin-bottom: 2.5rem;
  line-height: 0;
}

/* Title artwork, shrinking on narrow or short windows */
.title-image {
  width: clamp(18rem, 30vw, 32rem);
  max-width: min(85vw, 60vh);
  height: auto;
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
