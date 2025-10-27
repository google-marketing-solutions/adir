<template>
  <img v-if="imageDataUrl" :src="imageDataUrl" />
  <div
    v-else
    class="flex justify-center items-center h-full bg-gray-700 rounded-lg"
  >
    <span class="loading loading-spinner loading-sm"></span>
  </div>
</template>

<script setup>
import { downloadFileAsBase64 } from "@/services/gcsService";
import { onMounted, ref, watch } from "vue";

const props = defineProps({
  gcsUri: {
    type: String,
    required: true,
  },
});

const imageDataUrl = ref(null);

const loadImage = async () => {
  if (!props.gcsUri) {
    imageDataUrl.value = null;
    return;
  }
  try {
    const base64Data = await downloadFileAsBase64(props.gcsUri);
    imageDataUrl.value = `data:image/png;base64,${base64Data}`;
  } catch (error) {
    console.error("Failed to load GCS image:", error);
    imageDataUrl.value = null;
  }
};

onMounted(loadImage);
watch(() => props.gcsUri, loadImage);
</script>
