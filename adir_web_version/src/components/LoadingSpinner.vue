<template>
  <div :class="[
    fullscreen ? 'fixed inset-0 bg-black/80 flex flex-col justify-center items-center z-50' : 'flex justify-center items-center p-4'
  ]">
    <div :class="[
      fullscreen ? 'bg-[var(--color-bg-secondary)] p-8 rounded-2xl shadow-2xl border border-[var(--color-bg-tertiary)] flex flex-col items-center max-w-sm mx-4' : 'flex items-center gap-4'
    ]">
      <!-- Spinner -->
      <div class="relative" :class="fullscreen ? 'w-24 h-24 mb-6' : 'w-8 h-8'">
        <!-- Outer ring -->
        <div class="absolute inset-0 border-4 border-blue-500/30 rounded-full"></div>
        <!-- Spinning ring -->
        <div class="absolute inset-0 border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
        <!-- Inner glow or pulse -->
        <div v-if="fullscreen" class="absolute inset-4 bg-blue-600/20 rounded-full animate-pulse flex items-center justify-center">
          <span class="text-blue-300 font-bold text-sm">AI</span>
        </div>
      </div>
      
      <!-- Text -->
      <div :class="fullscreen ? 'text-center' : ''">
        <h3 v-if="title" class="text-xl font-bold mb-2 text-[var(--color-text-primary)]" :class="fullscreen ? 'text-center' : ''">{{ title }}</h3>
        <p class="text-[var(--color-text-muted)] text-sm" :class="fullscreen ? 'text-center' : ''">{{ message }}</p>
      </div>

      <!-- Pulsing dots -->
      <div v-if="fullscreen" class="flex gap-2 mt-4">
        <div class="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
        <div class="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style="animation-delay: 0.2s"></div>
        <div class="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style="animation-delay: 0.4s"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  fullscreen: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: ''
  },
  message: {
    type: String,
    default: 'Loading...'
  }
});
</script>
