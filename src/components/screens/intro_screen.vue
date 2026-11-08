<script setup>
import {onMounted, ref} from 'vue'
import {IMG_OTHER_INTRO_BACKGROUND} from '@/js/engine/assets.js'
import {playTap} from '@/js/engine/audio.js'
import {EMIT_START} from '@/js/engine/enums.js'
import {t} from '@/js/i18n/localized.js'

const emit = defineEmits([EMIT_START])

const startButton = ref(null) // Focused on open so Enter starts the game
const isBackgroundLoaded = ref(false) // Painting fades in only once loaded, so it never pops in

// Without preventScroll, a short window would open the story column scrolled down to the button
onMounted(() => {
  startButton.value.focus({
    preventScroll: true,
  })
})
</script>

<template>
  <div class="screen-layout story-layout">
    <img
      class="screen-background story-background"
      :class="{'story-background--loaded': isBackgroundLoaded}"
      :src="IMG_OTHER_INTRO_BACKGROUND"
      alt=""
      @load="isBackgroundLoaded = true"
    >

    <div class="screen-content story-content thin-scrollbar">
      <h1 class="story-title">
        {{ t('screen.intro.title') }}
      </h1>

      <div class="story-rule" />

      <p class="story-paragraph">
        {{ t('screen.intro.paragraph1') }}
      </p>
      <p class="story-paragraph">
        {{ t('screen.intro.paragraph2') }}
      </p>
      <p class="story-paragraph">
        {{ t('screen.intro.paragraph3') }}
      </p>

      <button ref="startButton" class="btn-gold start-button intro-start" @click="playTap(); emit(EMIT_START)">
        {{ t('screen.intro.start') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Start button set apart from the story */
.intro-start {
  margin-top: 2.5rem;
}
</style>
