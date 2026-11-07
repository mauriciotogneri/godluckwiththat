<script setup>
import {ref} from 'vue'
import {IMG_OTHER_HOME_BACKGROUND} from '@/js/engine/assets.js'
import audio, {playTap} from '@/js/engine/audio.js'
import {AUTOSAVE_MAX_INTERVAL, AUTOSAVE_MIN_INTERVAL} from '@/js/engine/constants.js'
import {EMIT_CLOSE} from '@/js/engine/enums.js'
import storage from '@/js/engine/storage.js'
import {t} from '@/js/i18n/localized.js'

const emit = defineEmits([EMIT_CLOSE])
const musicEnabled = ref(audio.musicEnabled)
const soundEnabled = ref(audio.soundEnabled)
const autosaveEnabled = ref(storage.autosaveEnabled)
const autosaveInterval = ref(storage.autosaveInterval)

/** Toggles background music on/off. */
function toggleMusic() {
  playTap()
  musicEnabled.value = !musicEnabled.value
  audio.setMusicEnabled(musicEnabled.value)
}

/** Toggles sound effects on/off. */
function toggleSound() {
  soundEnabled.value = !soundEnabled.value
  audio.setSoundEnabled(soundEnabled.value)
  playTap()
}

/** Toggles autosave on/off and persists to storage. */
function toggleAutosave() {
  playTap()
  autosaveEnabled.value = !autosaveEnabled.value
  storage.autosaveEnabled = autosaveEnabled.value
}

/** Decrements the autosave interval by 1 minute (clamped to minimum). */
function decrementInterval() {
  playTap()
  if (autosaveInterval.value > AUTOSAVE_MIN_INTERVAL) {
    autosaveInterval.value--
    storage.autosaveInterval = autosaveInterval.value
  }
}

/** Increments the autosave interval by 1 minute (clamped to maximum). */
function incrementInterval() {
  playTap()
  if (autosaveInterval.value < AUTOSAVE_MAX_INTERVAL) {
    autosaveInterval.value++
    storage.autosaveInterval = autosaveInterval.value
  }
}
</script>

<template>
  <div class="screen-layout">
    <img class="screen-background screen-background--muted" :src="IMG_OTHER_HOME_BACKGROUND" alt="">

    <div class="screen-content">
      <h1 class="screen-title">
        {{ t('screen.settings.title') }}
      </h1>

      <div class="settings-panel">
        <div class="toggle-group">
          <div class="toggle-row">
            <span class="toggle-label">{{ t('screen.settings.music') }}</span>
            <button
              class="toggle-switch"
              :class="{ active: musicEnabled }"
              @click="toggleMusic"
            >
              <span class="toggle-knob" />
            </button>
          </div>
          <div class="toggle-row">
            <span class="toggle-label">{{ t('screen.settings.sound') }}</span>
            <button
              class="toggle-switch"
              :class="{ active: soundEnabled }"
              @click="toggleSound"
            >
              <span class="toggle-knob" />
            </button>
          </div>

          <span class="settings-divider" />

          <div class="toggle-row">
            <span class="toggle-label">{{ t('screen.settings.autosave') }}</span>
            <button
              class="toggle-switch"
              :class="{ active: autosaveEnabled }"
              @click="toggleAutosave"
            >
              <span class="toggle-knob" />
            </button>
          </div>
          <div class="interval-row" :class="{ disabled: !autosaveEnabled }">
            <button
              class="interval-btn"
              :disabled="!autosaveEnabled || autosaveInterval <= AUTOSAVE_MIN_INTERVAL"
              @click="decrementInterval"
            >
              &minus;
            </button>
            <span class="interval-value">
              {{ t('screen.settings.autosaveInterval', autosaveInterval) }}
            </span>
            <button
              class="interval-btn"
              :disabled="!autosaveEnabled || autosaveInterval >= AUTOSAVE_MAX_INTERVAL"
              @click="incrementInterval"
            >
              +
            </button>
          </div>
        </div>
      </div>

      <button class="btn-gold screen-btn-small" @click="playTap(); emit(EMIT_CLOSE)">
        {{ t('screen.settings.back') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
/* ---- Settings panel ---- */

.settings-panel {
  width: min(380px, 85vw);
  margin-block: 5rem;
}

/* ---- Toggle rows ---- */

.toggle-group {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.toggle-label {
  font-family: var(--font-body);
  font-size: 1rem;
  font-weight: 400;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(var(--color-text-rgb), 0.6);
}

/* Toggle switch — pill-shaped on/off control */
.toggle-switch {
  position: relative;
  width: 3.2rem;
  height: 1.7rem;
  border-radius: 0.85rem;
  border: 1px solid rgba(var(--color-accent-rgb), 0.15);
  background: rgba(var(--color-accent-rgb), 0.06);
  cursor: pointer;
  transition: all 0.25s ease;
  padding: 0;
}

/* Active state */
.toggle-switch.active {
  background: rgba(var(--color-accent-rgb), 0.25);
  border-color: rgba(var(--color-accent-rgb), 0.5);
}

/* Sliding knob inside toggle */
.toggle-knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: calc(1.7rem - 8px);
  height: calc(1.7rem - 8px);
  border-radius: 50%;
  background: rgba(var(--color-text-rgb), 0.3);
  transition: all 0.25s ease;
}

/* Active knob — slides right, accent color */
.toggle-switch.active .toggle-knob {
  left: calc(100% - 1.7rem + 5px);
  background: var(--color-accent);
  box-shadow: 0 0 8px rgba(var(--color-accent-rgb), 0.4);
}

/* ---- Section divider ---- */

.settings-divider {
  display: block;
  width: 60%;
  height: 1px;
  margin: 0.2rem auto;
  background: linear-gradient(
    90deg,
    rgba(var(--color-accent-rgb), 0) 0%,
    rgba(var(--color-accent-rgb), 0.25) 50%,
    rgba(var(--color-accent-rgb), 0) 100%
  );
}

/* ---- Interval selector ---- */

.interval-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding-top: 0.2rem;
  transition: opacity 0.25s ease;
}

.interval-row.disabled {
  opacity: 0.3;
}

.interval-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 0.35rem;
  border: 1px solid rgba(var(--color-accent-rgb), 0.25);
  background: rgba(var(--color-accent-rgb), 0.08);
  color: rgba(var(--color-text-rgb), 0.7);
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0;
  line-height: 1;
}

.interval-btn:hover:not(:disabled) {
  background: rgba(var(--color-accent-rgb), 0.2);
  border-color: rgba(var(--color-accent-rgb), 0.5);
  color: var(--color-accent);
}

.interval-btn:disabled {
  opacity: 0.3;
  cursor: default;
}

.interval-value {
  font-family: var(--font-body);
  font-size: 1rem;
  font-weight: 400;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(var(--color-text-rgb), 0.6);
  min-width: 4rem;
  text-align: center;
}
</style>
