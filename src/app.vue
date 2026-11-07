<script setup>
import {onMounted, ref, shallowRef} from 'vue'
import AboutScreen from '@/components/screens/about_screen.vue'
import GameScreen from '@/components/screens/game_screen.vue'
import HomeScreen from '@/components/screens/home_screen.vue'
import SettingsScreen from '@/components/screens/settings_screen.vue'
import analytics from '@/js/engine/analytics.js'
import {MUS_MUSIC_1, MUS_MUSIC_2, MUS_MUSIC_3, MUS_MUSIC_4, MUS_MUSIC_MAIN_MENU} from '@/js/engine/assets.js'
import audio from '@/js/engine/audio.js'
import {createInitialColony, createInitialMeta, IS_DEV} from '@/js/engine/constants.js'
import {ANALYTICS_GAME_MODE_NEW, ANALYTICS_GAME_MODE_SAVED} from '@/js/engine/enums.js'
import State from '@/js/engine/state.js'
import storage from '@/js/engine/storage.js'

const currentScreen = ref('home')
const gameState = shallowRef(null) // Shallow so Vue never proxies the plain engine State
const gameKey = ref(0)

/** Preloads audio, restores State from save data (or creates a new one), switches to game screen, and starts background music. */
function startGame(savedData) {
  audio.preload()
  launchGame(savedData ? State.fromJSON(savedData) : null)
}

/**
 * Switches to the game screen with the given State, or a new game when null, and starts background music.
 * @param {State|null} restoredState - Game restored from a save, or null for a new game
 */
function launchGame(restoredState) {
  let state = restoredState
  // A corrupt save falls back to a new game, so the mode reflects what actually loaded
  const mode = state ? ANALYTICS_GAME_MODE_SAVED : ANALYTICS_GAME_MODE_NEW
  if (!state) {
    state = new State(createInitialMeta(), createInitialColony())
    if (storage.tutorialCompleted) {
      state.meta.tutorial.completed = true
    }
    state.update(0)
  }
  analytics.logGameStart(mode)
  gameState.value = state
  currentScreen.value = 'game'
  audio.playMusicPlaylist([
    MUS_MUSIC_1,
    MUS_MUSIC_2,
    MUS_MUSIC_3,
    MUS_MUSIC_4,
  ])
}

/**
 * Restarts the game with a State the game screen already restored, or a fresh one when null.
 * @param {State|null} restoredState - Game restored from a save, or null for a new game
 */
function restartGame(restoredState) {
  audio.stopMusic()
  gameState.value = null
  gameKey.value++
  audio.preload()
  launchGame(restoredState)
}

/** Starts the main menu music, which keeps playing across the home, settings, and about screens. */
function playMenuMusic() {
  audio.playMusicPlaylist([MUS_MUSIC_MAIN_MENU])
}

/** Switches to the main menu music and returns to the home screen. */
function quitGame() {
  playMenuMusic()
  gameState.value = null
  currentScreen.value = 'home'
}

/** Returns to the home screen from a sub-screen. */
function goHome() {
  currentScreen.value = 'home'
}

// Dev builds skip the home screen once per page load; returning to it later shows the menu
onMounted(() => {
  if (IS_DEV) {
    startGame(storage.savedGame)
  } else {
    playMenuMusic()
  }
})

</script>

<template>
  <HomeScreen v-if="currentScreen === 'home'" @start="startGame" @settings="currentScreen = 'settings'" @about="currentScreen = 'about'" />
  <GameScreen v-else-if="currentScreen === 'game'" :key="gameKey" :initial-state="gameState" @quit="quitGame" @restart="restartGame" />
  <SettingsScreen v-else-if="currentScreen === 'settings'" @close="goHome" />
  <AboutScreen v-else-if="currentScreen === 'about'" @close="goHome" />
</template>

