<script setup>
import { useRoute } from "vue-router";

const route = useRoute();
</script>

<template>
  <aside class="w-64 bg-gray-800 p-4 h-screen">
    <nav>
      <router-link
        to="/pmax"
        class="block py-2 px-3 rounded-md"
        :class="{
          'bg-gray-700 text-white': route.name === 'PMax',
          'text-gray-400 hover:bg-gray-700 hover:text-white':
            route.name !== 'PMax',
        }"
      >
        PMax
      </router-link>
      <router-link
        to="/demand-gen"
        class="block py-2 px-3 rounded-md"
        :class="{
          'bg-gray-700 text-white': route.name === 'DemandGen',
          'text-gray-400 hover:bg-gray-700 hover:text-white':
            route.name !== 'DemandGen',
        }"
      >
        Demand Gen
      </router-link>
      <router-link
        to="/custom-input"
        class="block py-2 px-3 rounded-md"
        :class="{
          'bg-gray-700 text-white': route.name === 'CustomInput',
          'text-gray-400 hover:bg-gray-700 hover:text-white':
            route.name !== 'CustomInput',
        }"
      >
        Custom Input
      </router-link>
    </nav>
  </aside>
</template>
