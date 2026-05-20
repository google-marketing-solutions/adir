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
import ImageReview from "./generation/ImageReview.vue";
import { removeImages } from "@/services/gcsService";

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
const loadingMessage = ref("Generating images...");

const showPausedAssetGroups = ref(false);

// Step Management
const step = ref("configure"); // 'configure' | 'review'
const generatedImages = ref([]);
const activeModeComponent = ref(null);

const handleGenerationComplete = (images) => {
  if (images && images.length > 0) {
    // Check if the first item is a rich object or just a string (GCS URI)
    // If it's a string, we might need to wrap it, but we updated CreativeConceptsMode to return rich objects.
    // Other modes still return strings, so we should normalize them here for backward compatibility.
    const normalizedImages = images.map((img, index) => {
      if (typeof img === "string") {
        return {
          id: `gen-${index}-${Date.now()}`,
          gcsUri: img,
          conceptName: "Generated Image",
          conceptDescription: "Generated via " + activeMode.value,
          prompt: "",
          aspectRatio: "Unknown",
          status: "pending",
          feedback: "",
          attempt: 1,
        };
      }
      return img;
    });

    generatedImages.value = normalizedImages;
    step.value = "review";
  }
};

const handleRegenerate = async (rejectedImages) => {
  if (!activeModeComponent.value?.regenerateImages) {
    console.warn("Regeneration is not supported in this mode yet.");
    return;
  }

  try {
    const newImages = await activeModeComponent.value.regenerateImages(rejectedImages);
    
    // Delete the old rejected images from GCS
    const oldUris = rejectedImages.map((img) => img.gcsUri);
    removeImages(oldUris).catch((err) =>
      console.error("Failed to delete old images from GCS:", err)
    );

    // Update the generatedImages list
    generatedImages.value = generatedImages.value.map((img) => {
      const regenerated = newImages.find((r) => r.id === img.id);
      return regenerated || img;
    });
  } catch (error) {
    console.error("Regeneration failed:", error);
  }
};

const handleFinish = async (approvedImages) => {
  // Delete any remaining rejected images
  const rejectedImages = generatedImages.value.filter((img) => img.status === "rejected");
  if (rejectedImages.length > 0) {
    const rejectedUris = rejectedImages.map((img) => img.gcsUri);
    try {
      await removeImages(rejectedUris);
    } catch (err) {
      console.error("Failed to delete rejected images on finish:", err);
    }
  }

  // Reset generation state to allow creating new assets on next visit
  step.value = "configure";
  generatedImages.value = [];

  assetStore.setNeedsRefresh(true);
  router.push("/asset-preview");
};
</script>

<template>
  <div>
    <h1 class="mb-6">Image Generation</h1>
    
    <!-- Workflow Stepper -->
    <div class="flex items-center justify-between mb-8 max-w-2xl mx-auto">
      <!-- Step 1 -->
      <div class="flex flex-col items-center gap-2">
        <div
          class="w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors duration-300"
          :class="step === 'configure' && !isLoading ? 'bg-[var(--color-interactive-primary)] text-[var(--color-text-primary)]' : 'bg-green-600 text-white'"
        >
          <span v-if="step !== 'configure' || isLoading">✓</span>
          <span v-else>1</span>
        </div>
        <span class="text-sm font-medium" :class="step === 'configure' && !isLoading ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)]'">Configure</span>
      </div>
      <!-- Line 1 -->
      <div
        class="flex-1 h-1 transition-colors duration-300 mx-4"
        :class="isLoading || step === 'review' ? 'bg-green-600' : 'bg-[var(--color-bg-tertiary)]'"
      ></div>
      <!-- Step 2 -->
      <div class="flex flex-col items-center gap-2">
        <div
          class="w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors duration-300"
          :class="[
            isLoading
              ? 'bg-[var(--color-interactive-primary)] text-[var(--color-text-primary)] animate-pulse'
              : (step === 'review' ? 'bg-green-600 text-white' : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]')
          ]"
        >
          <span v-if="step === 'review'">✓</span>
          <span v-else>2</span>
        </div>
        <span class="text-sm font-medium" :class="isLoading ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)]'">Generate</span>
      </div>
      <!-- Line 2 -->
      <div
        class="flex-1 h-1 transition-colors duration-300 mx-4"
        :class="step === 'review' ? 'bg-green-600' : 'bg-[var(--color-bg-tertiary)]'"
      ></div>
      <!-- Step 3 -->
      <div class="flex flex-col items-center gap-2">
        <div
          class="w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors duration-300"
          :class="step === 'review' ? 'bg-[var(--color-interactive-primary)] text-[var(--color-text-primary)]' : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]'"
        >
          3
        </div>
        <span class="text-sm font-medium" :class="step === 'review' ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)]'">Review</span>
      </div>
    </div>

    <!-- Step 1: Configure -->
    <div v-show="step === 'configure'" class="bg-[var(--color-bg-secondary)] p-6 rounded-xl mb-6 border border-[var(--color-bg-tertiary)]">
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
          ref="activeModeComponent"
          :key="activeMode + '-' + showPausedAssetGroups"
          :selected-campaigns="campaignStore.selectedCampaigns"
          :show-paused-asset-groups="showPausedAssetGroups"
          @generation-complete="handleGenerationComplete"
          @update:loading="isLoading = $event"
          @update:loading-message="loadingMessage = $event"
        />
        <div v-else>
          <p class="text-[var(--color-text-muted)]">This mode is not yet implemented.</p>
        </div>
      </div>

      <div v-if="isLoading && activeMode !== 'Free form'" class="mt-6 p-4 bg-[var(--color-bg-tertiary)] rounded-lg">
        <LoadingSpinner
          :message="loadingMessage"
        />
      </div>
    </div>

    <!-- Step 3: Review -->
    <div v-show="step === 'review'" class="bg-[var(--color-bg-secondary)] p-6 rounded-xl mb-6 border border-[var(--color-bg-tertiary)]">
      <ImageReview
        :images="generatedImages"
        @regenerate="handleRegenerate"
        @finish="handleFinish"
        @approve-all="handleFinish(generatedImages)"
        @update:images="generatedImages = $event"
      />
    </div>
  </div>
</template>



