<script setup>
import { useAssetStore } from "@/stores/assetStore";
import { useBrandStore } from "@/stores/brandStore";
import { useCampaignStore } from "@/stores/campaignStore";
import { ref } from "vue";
import { useRouter } from "vue-router";
import LoadingSpinner from "@/components/LoadingSpinner.vue";
import AssetGroupNameMode from "./generation/AssetGroupNameMode.vue";
import CreativeConceptsMode from "./generation/CreativeConceptsMode.vue";
import ExistingAssetsMode from "./generation/ExistingAssetsMode.vue";
import SearchSignalKeywordsMode from "./generation/SearchSignalKeywordsMode.vue";

const emit = defineEmits(["change-subpage"]);
const campaignStore = useCampaignStore();
const assetStore = useAssetStore();
const brandStore = useBrandStore();
const router = useRouter();

const activeMode = ref("Existing Asset Based Generation 🍌");
const modes = {
  "Existing Asset Based Generation 🍌": ExistingAssetsMode,
  "Asset Group / Ad Group Name": AssetGroupNameMode,
  "Search Signal Keywords": SearchSignalKeywordsMode,
  "Free form": CreativeConceptsMode,
};

const isLoading = ref(false);

const showPausedAssetGroups = ref(false);

const handleGenerationComplete = (imageUrls) => {
  if (imageUrls && imageUrls.length > 0) {
    const newAssets = imageUrls.map((url) => ({
      asset: { imageAsset: { fullSize: { url } } },
    }));
    // assetStore.setAssets(newAssets); // Removed to prevent store pollution with incompatible assets
    assetStore.setNeedsRefresh(true);
    router.push("/asset-preview");
  }
};
</script>

<template>
  <div>
    <h1 class="mb-6">Image Generation</h1>
    <div class="bg-[var(--color-bg-secondary)] p-6 rounded-xl mb-6 border border-[var(--color-bg-tertiary)]">
      <div class="mb-6 flex justify-between items-end">
        <div>
          <label class="label mb-2">
            <span class="label-text text-lg font-bold text-[var(--color-text-primary)]">Generation Mode</span>
          </label>
          <div class="flex rounded-lg bg-[var(--color-bg-tertiary)] p-1">
            <button
              v-for="name in Object.keys(modes)"
              :key="name"
              class="btn flex-1 font-medium py-2 px-4 rounded-md transition-colors duration-200 text-sm"
              :class="[
                {
                  'bg-[var(--color-interactive-primary)] text-[var(--color-text-primary)]': activeMode === name,
                  'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]': activeMode !== name,
                },
                index < Object.keys(modes).length - 1
                  ? 'border-r border-[var(--color-text-dim)]'
                  : '',
              ]"
              @click="activeMode = name"
            >
              {{ name }}
            </button>
          </div>
        </div>
        <div class="flex flex-col items-start gap-2">
          <label
            class="flex items-center cursor-pointer group transition-opacity duration-200"
            :class="{'opacity-40 pointer-events-none': activeMode === 'Free form'}"
          >
            <div class="relative">
              <input
                type="checkbox"
                v-model="showPausedAssetGroups"
                class="sr-only peer"
                :disabled="activeMode === 'Free form'"
              />
              <div class="w-11 h-6 bg-[var(--color-bg-tertiary)] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--color-interactive-focus)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-interactive-primary)]"></div>
            </div>
            <span class="ml-3 text-sm font-medium text-[var(--color-text-muted)] group-hover:text-[var(--color-text-primary)] transition-colors" :class="{'text-[var(--color-text-primary)]': showPausedAssetGroups && activeMode !== 'Free form'}">Use Paused Asset Groups</span>
          </label>
          <label class="flex items-center cursor-pointer group">
            <div class="relative">
              <input type="checkbox" v-model="brandStore.useGuidelinesInGeneration" class="sr-only peer" />
              <div class="w-11 h-6 bg-[var(--color-bg-tertiary)] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--color-interactive-focus)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-interactive-primary)]"></div>
            </div>
            <span class="ml-3 text-sm font-medium text-[var(--color-text-muted)] group-hover:text-[var(--color-text-primary)] transition-colors" :class="{'text-[var(--color-text-primary)]': brandStore.useGuidelinesInGeneration}">Use Brand Guidelines</span>
          </label>
        </div>
      </div>

      <div class="mt-4">
        <component
          :is="modes[activeMode]"
          v-if="modes[activeMode]"
          :key="activeMode + '-' + showPausedAssetGroups"
          :selected-campaigns="campaignStore.selectedCampaigns"
          :show-paused-asset-groups="showPausedAssetGroups"
          @generation-complete="handleGenerationComplete"
          @update:loading="isLoading = $event"
        />
        <div v-else>
          <p class="text-[var(--color-text-muted)]">This mode is not yet implemented.</p>
        </div>
      </div>

      <div v-if="isLoading" class="mt-6 p-4 bg-[var(--color-bg-tertiary)] rounded-lg">
        <LoadingSpinner
          message="Generating images with Gemini..."
        />
      </div>
    </div>
  </div>
</template>


