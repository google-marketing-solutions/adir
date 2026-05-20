<script setup>
import { useRoute } from "vue-router";

const route = useRoute();
</script>

<template>
  <aside class="w-64 bg-[var(--color-bg-secondary)] p-4 h-screen">
    <nav>
      <router-link
        to="/asset-removal"
        class="block py-2 px-3 rounded-md font-medium transition-colors duration-300 text-sm"
        :class="{
          'bg-[var(--color-bg-tertiary)] text-[var(--color-interactive-primary)]': route.name === 'AssetRemoval',
          'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]':
            route.name !== 'AssetRemoval',
        }"
      >
        Asset Removal
      </router-link>
      <router-link
        to="/asset-generation"
        class="block py-2 px-3 rounded-md font-medium transition-colors duration-300 text-sm"
        :class="{
          'bg-[var(--color-bg-tertiary)] text-[var(--color-interactive-primary)]': route.name === 'AssetGeneration',
          'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]':
            route.name !== 'AssetGeneration',
        }"
      >
        Asset Generation
      </router-link>
      <router-link
        to="/asset-preview"
        class="block py-2 px-3 rounded-md font-medium transition-colors duration-300 text-sm"
        :class="{
          'bg-[var(--color-bg-tertiary)] text-[var(--color-interactive-primary)]': route.name === 'AssetPreview',
          'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]':
            route.name !== 'AssetPreview',
        }"
      >
        Asset Preview & Edit
      </router-link>
    </nav>
  </aside>
</template>
