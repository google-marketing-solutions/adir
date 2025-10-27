<script setup>
import { ref } from "vue";
import AssetGroupNameMode from "./generation/AssetGroupNameMode.vue";
import CreativeConceptsMode from "./generation/CreativeConceptsMode.vue";
import SearchSignalKeywordsMode from "./generation/SearchSignalKeywordsMode.vue";

const emit = defineEmits(["change-subpage"]);

const props = defineProps({
  selectedCampaigns: {
    type: Array,
    required: true,
  },
});

const activeMode = ref("Creative Concepts");
const modes = {
  "Creative Concepts": CreativeConceptsMode,
  "Asset Group Name": AssetGroupNameMode,
  "Search Signal Keywords": SearchSignalKeywordsMode,
};

const isLoading = ref(false);
const generatedImages = ref([]);

const handleGenerationComplete = (imageUrls) => {
  generatedImages.value.push(...imageUrls);
  if (imageUrls.length > 0) {
    emit("change-subpage", "preview");
  }
};
</script>

<template>
  <div class="bg-gray-800 p-8 rounded-lg">
    <h2 class="text-xl font-bold mb-4">Image Generation</h2>

    <div class="form-control w-full">
      <label class="label">
        <span class="label-text">Generation Mode</span>
      </label>
      <select v-model="activeMode" class="bg-gray-700 rounded-md p-2">
        <option v-for="name in Object.keys(modes)" :key="name" :value="name">
          {{ name }}
        </option>
      </select>
    </div>

    <div class="mt-4">
      <component
        :is="modes[activeMode]"
        v-if="modes[activeMode]"
        :selected-campaigns="selectedCampaigns"
        @generation-complete="handleGenerationComplete"
        @update:loading="isLoading = $event"
      />
      <div v-else>
        <p>This mode is not yet implemented.</p>
      </div>
    </div>

    <div v-if="isLoading" class="flex justify-center items-center mt-4">
      <span class="loading loading-spinner loading-lg"></span>
      <p class="ml-4">Generating images...</p>
    </div>

    <div v-if="generatedImages.length > 0" class="mt-4">
      <h3 class="text-lg font-bold mb-2">Generated Images:</h3>
      <div class="grid grid-cols-4 gap-4">
        <div v-for="url in generatedImages" :key="url">
          <img :src="url" class="w-full h-auto rounded-md" />
        </div>
      </div>
    </div>
  </div>
</template>
