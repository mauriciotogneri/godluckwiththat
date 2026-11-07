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
        <button v-if="hasSavedGame" class="btn-gold start-button" @click="playTap(); emit(EMIT_START, savedData)">
          {{ t('screen.home.continue') }}
        </button>
        <button v-else class="btn-gold start-button" @click="playTap(); emit(EMIT_START, null)">
          {{ t('screen.home.newGame') }}
        </button>
        <button class="btn-gold start-button" @click="playTap(); emit(EMIT_SETTINGS)">
          {{ t('screen.home.settings') }}
        </button>
        <button class="btn-gold start-button" @click="playTap(); emit(EMIT_ABOUT)">
          {{ t('screen.home.about') }}
        </button>

        <p class="mobile-notice">
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

/* Desktop-only notice, shown instead of the menu on narrow screens */
.mobile-notice {
  display: none;
  max-width: 80vw;
  font-family: var(--font-display);
  font-size: clamp(1.4rem, 6vw, 1.9rem);
  line-height: 1.3;
  color: var(--color-text);
  text-align: center;
  letter-spacing: 0.04em;
  text-wrap: balance;
}

/* Narrow screens (phones): no menu buttons, only the notice */
@media (max-width: 767px) {
  .home-buttons .start-button {
    display: none;
  }

  .mobile-notice {
    display: block;
  }

  /* Full-width dark band behind the notice, fading out above and below, instead of the oval veil */
  .home-buttons::before {
    width: 100vw;
    height: 260%;
    mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 1) 25%, rgba(0, 0, 0, 1) 75%, rgba(0, 0, 0, 0) 100%);
  }
}

</style>
