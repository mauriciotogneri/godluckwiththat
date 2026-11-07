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
  <div class="screen-layout intro-layout">
    <img
      class="screen-background intro-background"
      :class="{'intro-background--loaded': isBackgroundLoaded}"
      :src="IMG_OTHER_INTRO_BACKGROUND"
      alt=""
      @load="isBackgroundLoaded = true"
    >

    <div class="screen-content intro-content thin-scrollbar">
      <h1 class="intro-title">
        {{ t('screen.intro.title') }}
      </h1>

      <div class="intro-rule" />

      <p class="intro-paragraph">
        {{ t('screen.intro.paragraph1') }}
      </p>
      <p class="intro-paragraph">
        {{ t('screen.intro.paragraph2') }}
      </p>
      <p class="intro-paragraph">
        {{ t('screen.intro.paragraph3') }}
      </p>

      <button ref="startButton" class="btn-gold start-button intro-start" @click="playTap(); emit(EMIT_START)">
        {{ t('screen.intro.start') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Story column pinned to the dark right side of the painting */
.intro-layout {
  align-items: flex-end;
}

/* Dark wash behind the story, for windows that crop the painting's empty side */
.intro-layout::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    rgba(var(--color-shadow-rgb), 0) 45%,
    rgba(var(--color-shadow-rgb), 0.35) 70%,
    rgba(var(--color-shadow-rgb), 0.45) 100%
  );
  pointer-events: none;
}

/* Narrower windows push the story onto the painted cliffs, so the wash darkens sooner */
@media (max-aspect-ratio: 3/2) {
  .intro-layout::after {
    background: linear-gradient(
      90deg,
      rgba(var(--color-shadow-rgb), 0) 30%,
      rgba(var(--color-shadow-rgb), 0.55) 55%,
      rgba(var(--color-shadow-rgb), 0.65) 100%
    );
  }
}

/* Painting hidden until loaded, then faded in */
.intro-background {
  opacity: 0;
  transition: opacity 0.8s ease-out;
}

.intro-background--loaded {
  opacity: 1;
}

/* Left-aligned story column, scrollable on very short windows */
.intro-content {
  align-items: flex-start;
  gap: 0;
  width: clamp(20rem, 36vw, 34rem);
  max-height: 100%;
  margin-right: clamp(2rem, 7vw, 8rem);
  padding-block: 2rem;
  overflow-y: auto;
  animation: intro-fade 0.8s ease-out both;
}

@keyframes intro-fade {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

/* Story heading */
.intro-title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: clamp(1.75rem, 2.6vw, 2.5rem);
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--color-text);
  text-shadow: 0 2px 8px rgba(var(--color-shadow-rgb), 0.6);
}

/* Bronze stroke under the heading, kept when a short window squeezes the column */
.intro-rule {
  flex-shrink: 0;
  width: 4rem;
  height: 1px;
  margin: 1.25rem 0 1.75rem;
  background: linear-gradient(90deg, rgba(var(--color-accent-rgb), 0.8), rgba(var(--color-accent-rgb), 0));
}

/* Story text */
.intro-paragraph {
  font-family: var(--font-body);
  font-weight: 300;
  font-size: clamp(1rem, 1.05vw, 1.2rem);
  line-height: 1.75;
  color: rgba(var(--color-text-rgb), 0.88);
  text-shadow: 0 1px 3px rgba(var(--color-shadow-rgb), 0.6);
}

.intro-paragraph + .intro-paragraph {
  margin-top: 1em;
}

/* Start button set apart from the story */
.intro-start {
  margin-top: 2.5rem;
}

/* No fades for players who reduce motion */
@media (prefers-reduced-motion: reduce) {
  .intro-content {
    animation: none;
  }

  .intro-background {
    transition: none;
  }
}
</style>
