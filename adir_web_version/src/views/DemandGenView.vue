<script setup>
import { ref } from "vue";

const activeSubPage = ref("removal");
</script>

<template>
  <div>
    <nav class="flex gap-4 border-b border-gray-700 mb-6">
      <button
        @click="activeSubPage = 'removal'"
        :class="{
          'text-cyan-400 font-semibold border-b-2 border-cyan-400':
            activeSubPage === 'removal',
          'text-gray-500 hover:text-gray-300': activeSubPage !== 'removal',
        }"
      >
        Asset Removal
      </button>
      <button
        @click="activeSubPage = 'generation'"
        :class="{
          'text-cyan-400 font-semibold border-b-2 border-cyan-400':
            activeSubPage === 'generation',
          'text-gray-500 hover:text-gray-300': activeSubPage !== 'generation',
        }"
      >
        Asset Generation
      </button>
      <button
        @click="activeSubPage = 'preview'"
        :class="{
          'text-cyan-400 font-semibold border-b-2 border-cyan-400':
            activeSubPage === 'preview',
          'text-gray-500 hover:text-gray-300': activeSubPage !== 'preview',
        }"
      >
        Asset Preview
      </button>
    </nav>
    <div v-if="activeSubPage === 'removal'">Asset Removal Content</div>
    <div v-else-if="activeSubPage === 'generation'">
      Asset Generation Content
    </div>
    <div v-else>Asset Preview Content</div>
  </div>
</template>
