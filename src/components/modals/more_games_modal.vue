<script setup>
import {ref, onMounted, onBeforeUnmount, onUnmounted} from 'vue'
import {playTap} from '@/js/engine/audio.js'
import {EMIT_CLOSE} from '@/js/engine/enums.js'
import {pushEscapeHandler, removeEscapeHandler} from '@/js/engine/escape_stack.js'
import {pushFocusLayer, removeFocusLayer} from '@/js/engine/focus_stack.js'
import {t} from '@/js/i18n/localized.js'

const emit = defineEmits([EMIT_CLOSE])
const visible = ref(false)
const overlay = ref(null) // Root element; everything else is inert while this modal is topmost
let rafId = null

/** Closes modal on Escape while it is the topmost modal. */
function handleEscape() {
  emit(EMIT_CLOSE)
}

onMounted(() => {
  pushFocusLayer(overlay.value)
  pushEscapeHandler(handleEscape)
  rafId = requestAnimationFrame(() => {
    visible.value = true
  })
})

onBeforeUnmount(() => {
  removeFocusLayer(overlay.value)
})

onUnmounted(() => {
  removeEscapeHandler(handleEscape)
  cancelAnimationFrame(rafId)
})
</script>

<template>
  <div
    ref="overlay"
    class="modal-overlay"
    :class="{ visible }"
    @click.self="emit(EMIT_CLOSE)"
  >
    <div class="modal-content">
      <h2 class="modal-title">{{ t('modal.moreGames.title') }}</h2>
      <span class="modal-rule" />

      <div class="games-list">
        <a
          class="game-link"
          href="https://hextrategic.com"
          target="_blank"
          rel="noopener noreferrer"
          @click="playTap()"
        >
          Hextrategic
        </a>
        <a
          class="game-link"
          href="https://tensiontunnel.com"
          target="_blank"
          rel="noopener noreferrer"
          @click="playTap()"
        >
          Tension Tunnel
        </a>
        <a
          class="game-link"
          href="https://portal-2d.web.app"
          target="_blank"
          rel="noopener noreferrer"
          @click="playTap()"
        >
          Portal 2D
        </a>
        <a
          class="game-link"
          href="https://tensiongrid.com"
          target="_blank"
          rel="noopener noreferrer"
          @click="playTap()"
        >
          Tension Grid
        </a>
        <a
          class="game-link"
          href="https://coliseum-game.web.app"
          target="_blank"
          rel="noopener noreferrer"
          @click="playTap()"
        >
          Coliseum
        </a>
        <a
          class="game-link"
          href="https://meme-iq.web.app"
          target="_blank"
          rel="noopener noreferrer"
          @click="playTap()"
        >
          Meme IQ
        </a>
      </div>

      <button class="btn-gold modal-btn" @click="playTap(); emit(EMIT_CLOSE)">
        {{ t('modal.help.close') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.modal-content {
  padding: 1.75rem 2rem 1.5rem;
  min-width: 340px;
  max-width: 480px;
}

.modal-rule {
  display: block;
  margin: 0.75rem auto 1.25rem;
}

.games-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-self: stretch;
}

/* Game link styled as a bordered block */
.game-link {
  display: block;
  font-family: var(--font-body);
  font-size: 1rem;
  font-weight: 400;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-accent);
  text-decoration: none;
  text-align: center;
  padding: 0.7rem 1.2rem;
  border: 1px solid rgba(var(--color-accent-rgb), 0.2);
  background: rgba(var(--color-accent-rgb), 0.05);
  transition: all 0.25s ease;
}

.game-link:hover {
  border-color: rgba(var(--color-accent-rgb), 0.5);
  background: rgba(var(--color-accent-rgb), 0.12);
  box-shadow: 0 0 12px rgba(var(--color-accent-rgb), 0.08);
}

.modal-btn {
  margin-top: 1.5rem;
  align-self: stretch;
}
</style>
