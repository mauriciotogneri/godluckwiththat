<script setup>
import {ref} from 'vue'
import {IMG_OTHER_HOME_BACKGROUND} from '@/js/engine/assets.js'
import {playTap} from '@/js/engine/audio.js'
import {EMIT_CLOSE} from '@/js/engine/enums.js'
import {t} from '@/js/i18n/localized.js'
import ChangelogModal from '@/components/modals/changelog_modal.vue'
import MoreGamesModal from '@/components/modals/more_games_modal.vue'

const emit = defineEmits([EMIT_CLOSE])

const showChangelogModal = ref(false)
const showMoreGamesModal = ref(false)

const appVersion = __APP_VERSION__
</script>

<template>
  <div class="screen-layout">
    <img class="screen-background screen-background--muted" :src="IMG_OTHER_HOME_BACKGROUND" alt="">

    <div class="screen-content">
      <h1 class="screen-title">
        {{ t('screen.about.title') }}
      </h1>

      <div class="about-actions">
        <button class="btn-gold screen-btn-small" @click="playTap(); showChangelogModal = true">
          {{ t('screen.about.changelog') }}
        </button>

        <button class="btn-gold screen-btn-small" @click="playTap(); showMoreGamesModal = true">
          {{ t('screen.about.moreGames') }}
        </button>

        <a
          class="btn-gold screen-btn-small about-link"
          href="mailto:contact@atomicinstinct.com"
          @click="playTap()"
        >
          {{ t('screen.about.feedback') }}
        </a>

        <span class="about-version">
          {{ t('screen.about.version', appVersion) }}
        </span>
      </div>

      <button class="btn-gold screen-btn-small" @click="playTap(); emit(EMIT_CLOSE)">
        {{ t('screen.about.back') }}
      </button>
    </div>

    <ChangelogModal v-if="showChangelogModal" @close="showChangelogModal = false" />
    <MoreGamesModal v-if="showMoreGamesModal" @close="showMoreGamesModal = false" />
  </div>
</template>

<style scoped>
.about-actions {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: min(200px, 85vw);
  gap: 1.5rem;
  margin-top: 5rem;
  margin-bottom: 5rem;
}

/* Mailto link styled as button */
.about-link {
  display: inline-block;
  text-align: center;
  text-decoration: none;
}

.about-version {
  font-family: var(--font-body);
  font-size: 0.8rem;
  font-weight: 300;
  letter-spacing: 0.1em;
  color: rgba(var(--color-text-rgb), 0.4);
  align-self: center;
}
</style>
