<script setup>
import { useRoute } from "vue-router";

const route = useRoute();
</script>

<template>
  <aside class="w-64 bg-gray-800 p-4 h-screen">
    <nav>
      <router-link
        to="/asset-removal"
        class="block py-2 px-3 rounded-md"
        :class="{
          'bg-gray-700 text-white': route.name === 'AssetRemoval',
          'text-gray-400 hover:bg-gray-700 hover:text-white':
            route.name !== 'AssetRemoval',
        }"
      >
        Asset Removal
      </router-link>
      <router-link
        to="/asset-generation"
        class="block py-2 px-3 rounded-md"
        :class="{
          'bg-gray-700 text-white': route.name === 'AssetGeneration',
          'text-gray-400 hover:bg-gray-700 hover:text-white':
            route.name !== 'AssetGeneration',
        }"
      >
        Asset Generation
      </router-link>
      <router-link
        to="/asset-preview"
        class="block py-2 px-3 rounded-md"
        :class="{
          'bg-gray-700 text-white': route.name === 'AssetPreview',
          'text-gray-400 hover:bg-gray-700 hover:text-white':
            route.name !== 'AssetPreview',
        }"
      >
        Asset Preview
      </router-link>
    </nav>
  </aside>
</template>
