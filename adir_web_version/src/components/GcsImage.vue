<template>
  <img v-if="imageDataUrl" :src="imageDataUrl" />
  <div
    v-else
    class="flex justify-center items-center bg-gray-700 rounded-lg w-full"
    :style="aspectRatioStyle"
  >
    <span class="loading loading-spinner loading-sm"></span>
  </div>
</template>

<script setup>
import { downloadFileAsBase64 } from "@/services/gcsService";
import { useAssetStore } from "@/stores/assetStore";
import { onMounted, ref, watch, computed } from "vue";

const props = defineProps({
  gcsUri: {
    type: String,
    required: true,
  },
  aspectRatio: {
    type: String,
    default: "",
  },
});

const imageDataUrl = ref(null);
const assetStore = useAssetStore();

const aspectRatioStyle = computed(() => {
  if (!props.aspectRatio) return { height: "200px" }; // Fallback height if no ratio
  const [w, h] = props.aspectRatio.split(":");
  if (!w || !h) return { height: "200px" };
  return { aspectRatio: `${w} / ${h}` };
});

const loadImage = async () => {
  if (!props.gcsUri) {
    imageDataUrl.value = null;
    return;
  }

  const cachedImage = assetStore.getImageData(props.gcsUri);
  if (cachedImage) {
    imageDataUrl.value = cachedImage;
    return;
  }

  try {
    const base64Data = await downloadFileAsBase64(props.gcsUri);
    const dataUrl = `data:image/png;base64,${base64Data}`;
    assetStore.cacheImageData({ uri: props.gcsUri, dataUrl });
    imageDataUrl.value = dataUrl;
  } catch (error) {
    console.error("Failed to load GCS image:", error);
    imageDataUrl.value = null;
  }
};

onMounted(loadImage);
watch(() => props.gcsUri, loadImage);
</script>
