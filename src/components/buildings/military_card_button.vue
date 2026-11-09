<script setup>
import {inject} from 'vue'
import {IMG_OTHER_MILITARY} from '@/js/engine/assets.js'
import {playTap} from '@/js/engine/audio.js'
import {t} from '@/js/i18n/localized.js'

const openMilitaryModal = inject('openMilitaryModal')
</script>

<template>
  <button class="btn-gold card-modal-btn tooltip" :data-tooltip="t('military.title')" @click="playTap(); openMilitaryModal()">
    <img class="card-modal-btn-icon" :src="IMG_OTHER_MILITARY" :alt="t('military.title')">
  </button>
</template>
