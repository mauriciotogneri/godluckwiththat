// Singleton audio manager — sound effects and background music playback.

import {SND_BUTTON_TAP} from '@/js/engine/assets.js'
import {AUDIO_CONFIG} from '@/js/engine/constants.js'
import storage from '@/js/engine/storage.js'

/**
 * Manages sound effects and background music playback.
 * Persists enabled/disabled preferences via storage.
 */
class Audio {
  /** Initializes audio state from persisted preferences and sets up visibility change listener. */
  constructor() {
    this._musicEnabled = storage.musicEnabled // Whether music is on (persisted)
    this._soundEnabled = storage.soundEnabled // Whether sounds are on (persisted)
    this._music = null // Current HTMLAudioElement for music
    this._playlist = [] // Ordered list of music asset paths
    this._playlistIndex = 0 // Current index in the playlist
    this._cache = new Map() // Preloaded HTMLAudioElements keyed by asset path
    this._activeSounds = new Map() // Currently playing sound elements keyed by asset path
    this._soundCleanup = new Map() // Cleanup handlers for active sound listeners keyed by asset path
    this._gamePaused = false // Whether music was paused by game logic (not the browser)

    // Resume music after iOS Safari suspends audio in background tabs
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this._musicEnabled && !this._gamePaused) {
        this.resumeMusic()
      }
    })
  }

  /**
   * Preloads all audio files from AUDIO_CONFIG into the cache.
   * Call once at app startup so playback is instant.
   */
  preload() {
    for (const assetPath of Object.keys(AUDIO_CONFIG)) {
      const element = new window.Audio(assetPath)
      element.preload = 'auto'
      element.load()
      this._cache.set(assetPath, element)
    }
  }

  /**
   * Plays a one-shot sound effect.
   * @param {string} assetPath - Asset path constant from assets.js
   */
  playSound(assetPath) {
    if (!this._soundEnabled) {
      return
    }
    let element = this._activeSounds.get(assetPath)
    if (element) {
      element.pause()
      element.currentTime = 0
      const previousCleanup = this._soundCleanup.get(assetPath)
      if (previousCleanup) {
        element.removeEventListener('ended', previousCleanup)
        element.removeEventListener('error', previousCleanup)
      }
    } else {
      const cached = this._cache.get(assetPath)
      element = cached ? /** @type {HTMLAudioElement} */ (cached.cloneNode()) : new window.Audio(assetPath)
      this._activeSounds.set(assetPath, element)
    }
    const cleanup = () => {
      element.removeEventListener('ended', cleanup)
      element.removeEventListener('error', cleanup)
      // A stale cleanup (e.g. the aborted play() of a re-triggered sound) must not clear the newer entry
      if (this._soundCleanup.get(assetPath) === cleanup) {
        this._activeSounds.delete(assetPath)
        this._soundCleanup.delete(assetPath)
      }
    }
    this._soundCleanup.set(assetPath, cleanup)
    element.addEventListener('ended', cleanup, {
      once: true,
    })
    element.addEventListener('error', cleanup, {
      once: true,
    })
    element.volume = this._volume(assetPath)
    element.play().catch(cleanup)
  }

  /**
   * Starts sequential music playback. Tracks play in order, cycling back to the first after the last.
   * @param {string[]} tracks - Ordered array of asset path constants from assets.js
   */
  playMusicPlaylist(tracks) {
    this.stopMusic()
    this._playlist = tracks
    this._playlistIndex = 0
    if (!this._musicEnabled) {
      return
    }
    this._playTrack(0)
  }

  /**
   * Plays the track at the given playlist index and advances on end.
   * @param {number} index - Index into this._playlist
   */
  _playTrack(index) {
    if (!this._playlist.length) {
      return
    }
    this._playlistIndex = index
    const assetPath = this._playlist[index]
    const cached = this._cache.get(assetPath)
    this._music = cached ? /** @type {HTMLAudioElement} */ (cached.cloneNode()) : new window.Audio(assetPath)
    this._music.volume = this._volume(assetPath)
    this._music.addEventListener('ended', () => {
      const next = (this._playlistIndex + 1) % this._playlist.length
      this._playTrack(next)
    }, {
      once: true,
    })
    this._startMusic(this._music)
  }

  /**
   * Starts a music element, retrying on the next click or key press when the browser blocks autoplay.
   * @param {HTMLAudioElement} music - Music element to play
   */
  _startMusic(music) {
    music.play().catch(error => {
      if (error.name === 'NotAllowedError') {
        this._retryOnInteraction(music)
      } else if (import.meta.env.DEV) {
        console.warn('Audio play failed:', error)
      }
    })
  }

  /**
   * Retries a blocked music element on the next click or key press.
   * Does nothing if that element was stopped, replaced, or paused by game logic in the meantime.
   * @param {HTMLAudioElement} music - Music element whose playback was blocked
   */
  _retryOnInteraction(music) {
    const retry = () => {
      document.removeEventListener('click', retry)
      document.removeEventListener('keydown', retry)
      if (this._music === music && !this._gamePaused) {
        this._startMusic(music)
      }
    }
    document.addEventListener('click', retry)
    document.addEventListener('keydown', retry)
  }

  /**
   * Stops music and resets playback position.
   */
  stopMusic() {
    if (!this._music) {
      return
    }
    this._music.pause()
    this._music.currentTime = 0
    this._music = null
  }

  /**
   * Pauses the current music track without resetting position.
   */
  pauseMusic() {
    if (!this._music) {
      return
    }
    this._gamePaused = true
    this._music.pause()
  }

  /**
   * Resumes a previously paused music track.
   */
  resumeMusic() {
    if (!this._music) {
      return
    }
    this._gamePaused = false
    this._music.play().catch(error => import.meta.env.DEV && console.warn('Audio play failed:', error))
  }

  /** @returns {boolean} Whether music is currently enabled */
  get musicEnabled() {
    return this._musicEnabled
  }

  /** @returns {boolean} Whether sound effects are currently enabled */
  get soundEnabled() {
    return this._soundEnabled
  }

  /**
   * Toggles music on or off. Persists the preference and starts/stops playback accordingly.
   * @param {boolean} enabled - Whether music should be enabled
   */
  setMusicEnabled(enabled) {
    this._musicEnabled = enabled
    storage.musicEnabled = enabled
    if (enabled && this._playlist.length && !this._music) {
      this._playTrack(this._playlistIndex)
    }
    if (!enabled) {
      this.stopMusic()
    }
  }

  /**
   * Toggles sound effects on or off. Persists the preference.
   * @param {boolean} enabled - Whether sound effects should be enabled
   */
  setSoundEnabled(enabled) {
    this._soundEnabled = enabled
    storage.soundEnabled = enabled
  }

  /**
   * Resolves volume for an asset from AUDIO_CONFIG, defaulting to 1.0.
   * @param {string} assetPath - Asset path to look up
   * @returns {number} Volume level between 0 and 1
   */
  _volume(assetPath) {
    const config = AUDIO_CONFIG[assetPath]
    return config ? config.volume : 1.0
  }
}

const audio = new Audio()
export default audio

/**
 * Plays the button tap sound effect.
 */
export function playTap() {
  audio.playSound(SND_BUTTON_TAP)
}
