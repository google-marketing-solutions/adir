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
  "Asset Group Name": AssetGroupNameMode,
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
</template>
