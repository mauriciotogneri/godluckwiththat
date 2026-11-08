<script setup>
import {onBeforeUnmount, onMounted, onUnmounted, ref} from 'vue'
import {IMG_OTHER_ENDING_BACKGROUND} from '@/js/engine/assets.js'
import {playTap} from '@/js/engine/audio.js'
import {EMIT_CONTINUE, EMIT_QUIT} from '@/js/engine/enums.js'
import {pushEscapeHandler, removeEscapeHandler} from '@/js/engine/escape_stack.js'
import {pushFocusLayer, removeFocusLayer} from '@/js/engine/focus_stack.js'
import {t} from '@/js/i18n/localized.js'

const emit = defineEmits([
  EMIT_CONTINUE,
  EMIT_QUIT,
])

const overlay = ref(null) // Root element; everything else is inert while the ending is shown
const continueButton = ref(null) // Focused on open so Enter keeps playing
const isBackgroundLoaded = ref(false) // Painting fades in only once loaded, so it never pops in

/** Block Escape while shown — the ending cannot be dismissed with it. */
function handleEscape() {
  // Swallows Escape so the pause toggle never sees it
}

// Without preventScroll, a short window would open the story column scrolled down to the buttons
onMounted(() => {
  pushFocusLayer(overlay.value)
  pushEscapeHandler(handleEscape)
  continueButton.value.focus({
    preventScroll: true,
  })
})

onBeforeUnmount(() => {
  removeFocusLayer(overlay.value)
})

onUnmounted(() => {
  removeEscapeHandler(handleEscape)
})
</script>

<template>
  <div ref="overlay" class="screen-layout story-layout ending-layout">
    <img
      class="screen-background story-background"
      :class="{'story-background--loaded': isBackgroundLoaded}"
      :src="IMG_OTHER_ENDING_BACKGROUND"
      alt=""
      @load="isBackgroundLoaded = true"
    >

    <div class="screen-content story-content ending-content thin-scrollbar">
      <h1 class="story-title">
        {{ t('screen.ending.title') }}
      </h1>

      <div class="story-rule" />

      <p class="story-paragraph">
        {{ t('screen.ending.description') }}
      </p>

      <div class="ending-actions">
        <button ref="continueButton" class="btn-gold start-button" @click="playTap(); emit(EMIT_CONTINUE)">
          {{ t('screen.ending.continue') }}
        </button>
        <button class="btn-gold start-button" @click="playTap(); emit(EMIT_QUIT)">
          {{ t('screen.ending.quit') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Covers the paused game, above its modals */
.ending-layout {
  position: fixed;
  inset: 0;
  z-index: 200;
}

/* Extra space below lifts the centered column a little above the middle */
.ending-content {
  padding-bottom: calc(2rem + 32vh);
}

/* Buttons stacked below the story, set apart from it */
.ending-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-width: 19rem;
  margin-top: 2.5rem;
}

/* Both buttons as wide as the longer label, so it stays on one line */
.ending-actions .start-button {
  width: auto;
}
</style>
