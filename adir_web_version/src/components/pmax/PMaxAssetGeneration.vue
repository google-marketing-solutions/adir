<script setup>
import { useAssetStore } from "@/stores/assetStore";
import { useCampaignStore } from "@/stores/campaignStore";
import { ref } from "vue";
import { useRouter } from "vue-router";
import AssetGroupNameMode from "./generation/AssetGroupNameMode.vue";
import CreativeConceptsMode from "./generation/CreativeConceptsMode.vue";
import SearchSignalKeywordsMode from "./generation/SearchSignalKeywordsMode.vue";

const emit = defineEmits(["change-subpage"]);
const campaignStore = useCampaignStore();
const assetStore = useAssetStore();
const router = useRouter();

const activeMode = ref("Creative Concepts");
const modes = {
  "Creative Concepts": CreativeConceptsMode,
  "Asset Group / Ad Group Name": AssetGroupNameMode,
  "Search Signal Keywords": SearchSignalKeywordsMode,
};

const isLoading = ref(false);

const handleGenerationComplete = (imageUrls) => {
  if (imageUrls && imageUrls.length > 0) {
    const newAssets = imageUrls.map((url) => ({
      asset: { imageAsset: { fullSize: { url } } },
    }));
    assetStore.setAssets(newAssets);
    assetStore.setNeedsRefresh(true);
    router.push("/asset-preview");
  }
};
</script>

<template>
  <div>
    <h2 class="text-2xl font-bold mb-4">Image Generation</h2>
    <div class="bg-gray-800 p-8 rounded-lg">
      <div class="mb-6">
        <label class="label mb-2">
          <span class="label-text text-lg font-bold text-gray-200"
            >Generation Mode</span
          >
        </label>
        <div class="flex rounded-lg bg-gray-700 p-1">
          <button
            v-for="(name, index) in Object.keys(modes)"
            :key="name"
            class="btn flex-1 font-bold"
            :class="[
              {
                'bg-blue-600 text-white': activeMode === name,
                'bg-gray-700 text-gray-300 hover:bg-gray-600':
                  activeMode !== name,
              },
              index < Object.keys(modes).length - 1
                ? 'border-r border-gray-500'
                : '',
            ]"
            @click="activeMode = name"
          >
            {{ name }}
          </button>
        </div>
      </div>

      <div class="mt-4">
        <component
          :is="modes[activeMode]"
          v-if="modes[activeMode]"
          :selected-campaigns="campaignStore.selectedCampaigns"
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
    </div>
  </div>
</template>
