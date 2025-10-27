<script setup>
import { ref, watchEffect } from "vue";

const props = defineProps({
  src: {
    type: String,
    required: true,
  },
});

const displaySrc = ref(null);

watchEffect(async () => {
  if (props.src) {
    try {
      const response = await fetch(props.src, {
        referrerPolicy: "no-referrer",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      displaySrc.value = URL.createObjectURL(blob);
    } catch (error) {
      console.error("Error fetching proxied image:", error);
      displaySrc.value = null;
    }
  }
});
</script>

<template>
  <div>
    <img v-if="displaySrc" :src="displaySrc" alt="Proxied Image" />
    <div v-else>Loading...</div>
  </div>
</template>
