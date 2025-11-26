<script setup>
import { useRoute } from "vue-router";

const route = useRoute();
</script>

<template>
  <aside class="w-64 bg-gray-800 p-4 h-screen">
    <nav>
      <router-link
        to="/asset-removal"
        class="block py-2 px-3 rounded-md font-bold transition-colors duration-300"
        :class="{
          'bg-gray-700 text-blue-300': route.name === 'AssetRemoval',
          'text-gray-400 hover:bg-gray-600 hover:text-white':
            route.name !== 'AssetRemoval',
        }"
      >
        Asset Removal
      </router-link>
      <router-link
        to="/asset-generation"
        class="block py-2 px-3 rounded-md font-bold transition-colors duration-300"
        :class="{
          'bg-gray-700 text-blue-300': route.name === 'AssetGeneration',
          'text-gray-400 hover:bg-gray-600 hover:text-white':
            route.name !== 'AssetGeneration',
        }"
      >
        Asset Generation
      </router-link>
      <router-link
        to="/asset-preview"
        class="block py-2 px-3 rounded-md font-bold transition-colors duration-300"
        :class="{
          'bg-gray-700 text-blue-300': route.name === 'AssetPreview',
          'text-gray-400 hover:bg-gray-600 hover:text-white':
            route.name !== 'AssetPreview',
        }"
      >
        Asset Preview & Edit
      </router-link>
    </nav>
  </aside>
</template>
