<script setup>
import { uploadBase64Image } from "@/services/gcsService";
import {
  fetchPMaxAssets,
  fetchDemandGenAssets,
} from "@/services/googleAdsService";
import { editImageWithNanoBanana } from "@/services/nanoBananaService";
import { useBrandStore } from "@/stores/brandStore";
import { useConfigStore } from "@/stores/config";
import { ref, computed } from "vue";

const emit = defineEmits(["generation-complete", "update:loading"]);

const props = defineProps({
  selectedCampaigns: {
    type: Array,
    required: true,
  },
  showPausedAssetGroups: {
    type: Boolean,
    default: false,
  },
});

const prompt = ref(
  `Crop or outpaint the provided image to the requested aspect ratio.
RESTRICTION: DO NOT modify, rotate, reposition, or alter any existing objects, people, or text in the original image. The original content must remain exactly as it is.
ACTION: Extend the image PURELY with environmental background (e.g., sky, walls, floors, empty space) to fill the new aspect ratio. Maintain the same style, lighting, and tone.
CRITICAL: NO NEW ADDITIONS. Do not add any new icons, symbols, writing, or objects. The new areas must be completely empty.`
);
const numTopImages = ref(5);
const selectedMetric = ref("ctr");
const aspectRatios = computed(() => configStore.aspectRatios);

const availableToSelectRatios = computed(() => {
  return configStore.allAllowedAspectRatios.filter(
    (allowed) => !aspectRatios.value.some((selected) => selected.ratio === allowed.ratio)
  );
});

const selectedAllowedRatio = ref("");

const addNewRatio = () => {
  if (selectedAllowedRatio.value) {
    const ratioObj = configStore.allAllowedAspectRatios.find(
      (r) => r.ratio === selectedAllowedRatio.value
    );
    if (ratioObj) {
      configStore.addAspectRatio(ratioObj.label, ratioObj.ratio);
      selectedAllowedRatio.value = "";
    }
  }
};

const metricsOptions = [
  { label: "CTR", value: "ctr" },
  { label: "Impressions", value: "impressions" },
  { label: "Clicks", value: "clicks" },
  { label: "Cost", value: "costMicros" },
  { label: "Conversions", value: "conversions" },
  { label: "Average CPC", value: "averageCpc" },
  { label: "Conversion Value", value: "conversionsValue" },
  { label: "CPA", value: "costPerConversion" },
  { label: "Conv. Value / Cost", value: "conversionsValuePerCost" },
  { label: "Performance Label (PMax only)", value: "performanceLabel" },
];

const performanceLabelMap = {
  BEST: 5,
  GOOD: 4,
  LOW: 3,
  LEARNING: 2,
  PENDING: 1,
  UNSPECIFIED: 0,
  UNKNOWN: 0,
};

const isLoading = ref(false);
const configStore = useConfigStore();
const errorMessage = ref("");
const warnings = ref([]);
const debugInfo = ref("");

const handleGenerate = async () => {
  isLoading.value = true;
  emit("update:loading", true);
  errorMessage.value = "";
  warnings.value = [];
  try {
    const pmaxCampaignIds = props.selectedCampaigns
      .filter((c) => c.campaign.advertisingChannelType === "PERFORMANCE_MAX")
      .map((c) => c.campaign.id);
    const demandGenCampaignIds = props.selectedCampaigns
      .filter((c) => c.campaign.advertisingChannelType === "DEMAND_GEN")
      .map((c) => c.campaign.id);



    let allAssets = [];
    const dateRange = "LAST_30_DAYS"; // Default date range for performance data

    if (pmaxCampaignIds.length > 0) {
      const pmaxAssets = await fetchPMaxAssets(
        [],
        dateRange,
        pmaxCampaignIds,
        props.showPausedAssetGroups
      );
      allAssets = allAssets.concat(pmaxAssets);
    }
    if (demandGenCampaignIds.length > 0) {
      const dgAssets = await fetchDemandGenAssets(
        [],
        dateRange,
        demandGenCampaignIds,
        props.showPausedAssetGroups
      );
      allAssets = allAssets.concat(dgAssets);
    }

    if (allAssets.length === 0) {
      errorMessage.value = "No assets found in selected campaigns.";
      return;
    }

    // Explicitly filter by selected campaign IDs to be safe, with robust type handling
    const selectedCampaignIds = new Set();
    const selectedCampaignNames = props.selectedCampaigns.map(
      (c) => c.campaign.name
    );
    pmaxCampaignIds.forEach((id) => {
      if (id) selectedCampaignIds.add(String(id).trim());
    });
    demandGenCampaignIds.forEach((id) => {
      if (id) selectedCampaignIds.add(String(id).trim());
    });

    if (selectedCampaignIds.size > 0) {
      allAssets = allAssets.filter((row) => {
        const campaignId = row.campaign?.id;
        return campaignId && selectedCampaignIds.has(String(campaignId).trim());
      });
    }
    debugInfo.value = `Selected: ${selectedCampaignNames.join(", ")} | Found Assets: ${allAssets.length}`;

    if (allAssets.length === 0) {
      errorMessage.value =
        "No assets found for the selected campaigns. Please check if the selected campaigns have assets.";
      return;
    }

    // Group assets by Ad Group / Asset Group to check for metrics
    const assetsByGroup = {};
    allAssets.forEach((row) => {
      const groupName =
        row.assetGroup?.name ||
        row.asset_group?.name ||
        row.adGroup?.name ||
        row.ad_group?.name ||
        "Unknown Group";
      const campaignName = row.campaign?.name || "Unknown Campaign";
      const key = `${campaignName} - ${groupName}`;
      if (!assetsByGroup[key]) {
        assetsByGroup[key] = [];
      }
      assetsByGroup[key].push(row);
    });

    const aspectRatiosToGenerate = aspectRatios.value.filter(
      (ar) => ar.count > 0
    );

    const jobObjects = [];

    for (const [groupKey, assets] of Object.entries(assetsByGroup)) {
      let selectedAssets;
      const metricToUse = selectedMetric.value;

      // Sort assets based on selected metric
      const sortedAssets = [...assets].sort((a, b) => {
        let valA, valB;

        if (metricToUse === "performanceLabel") {
          valA = performanceLabelMap[a.assetGroupAsset?.performanceLabel] || 0;
          valB = performanceLabelMap[b.assetGroupAsset?.performanceLabel] || 0;
        } else {
          valA = a.metrics ? a.metrics[metricToUse] : 0;
          valB = b.metrics ? b.metrics[metricToUse] : 0;
        }

        // Handle undefined/null values
        valA = valA !== undefined && valA !== null ? valA : 0;
        valB = valB !== undefined && valB !== null ? valB : 0;

        return valB - valA; // Descending order
      });

      // Check if the top assets actually have the selected metric (not just 0/default)
      // For performance label, 0 means UNKNOWN/UNSPECIFIED which is also a valid fallback state if none have labels.
      const hasMetricData = sortedAssets.some((a) => {
        if (metricToUse === "performanceLabel") {
          return (
            a.assetGroupAsset?.performanceLabel &&
            a.assetGroupAsset.performanceLabel !== "UNKNOWN" &&
            a.assetGroupAsset.performanceLabel !== "UNSPECIFIED"
          );
        }
        return a.metrics && a.metrics[metricToUse] > 0;
      });

      if (hasMetricData) {
        selectedAssets = sortedAssets.slice(0, numTopImages.value);
      } else {
        warnings.value.push(
          `Ad group/Asset group "${groupKey}" doesn't have ${metricToUse} data, choosing first ${numTopImages.value} images randomly.`
        );
        selectedAssets = assets.slice(0, numTopImages.value); // Use original order (random-ish) or already sorted but it doesn't matter if all are 0
      }

      if (selectedAssets.length === 0) continue;

      aspectRatiosToGenerate.forEach((ar) => {
        for (let i = 0; i < ar.count; i++) {
          const imageInfos = selectedAssets
            .map((row) => {
              const imageUrl = row.asset?.imageAsset?.fullSize?.url;
              return imageUrl ? { url: imageUrl, row } : null;
            })
            .filter((img) => img !== null);

          if (imageInfos.length === 0) continue;

          // Use the first image's campaign/group info for the path, or the group's general info
          const firstRow = imageInfos[0].row;
          const groupName = firstRow.assetGroup?.name || firstRow.adGroup?.name || "Unknown";
          const campaignName = firstRow.campaign?.name || "Unknown";
          const groupId = firstRow.assetGroup?.id || firstRow.adGroup?.id || "Unknown";
          const campaignId = firstRow.campaign?.id || "UnknownId";

          const campaignIdentifier = `${campaignName.replace(/\s+/g, "_")}~${campaignId}`;
          const groupIdentifier = `${groupName.replace(/\s+/g, "_")}~${groupId}`;
          const gcsPath = `${configStore.customerID}/${campaignIdentifier}/${groupIdentifier}/GENERATED/`;

          const brandStore = useBrandStore();
          let finalPrompt = prompt.value;
          if (brandStore.useGuidelinesInGeneration && brandStore.guidelines) {
            finalPrompt += `\n\nYou MUST follow these Brand Guidelines:\n${brandStore.guidelines}`;
          }

          jobObjects.push({
            imageUrls: imageInfos.map((img) => img.url),
            prompt: finalPrompt,
            aspectRatio: ar.ratio,
            gcsPath: `${gcsPath}${Date.now()}_${i}_${Math.random().toString(36).slice(2, 7)}.png`,
          });
        }
      });
    }



    const generationPromises = jobObjects.map(async (job) => {
      try {
        // Fetch all images and convert to base64
        const base64Images = await Promise.all(
          job.imageUrls.map(async (url) => {
            const response = await fetch(url);
            const blob = await response.blob();
            return new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
          })
        );

        const generatedBase64 = await editImageWithNanoBanana(
          base64Images,
          job.prompt,
          job.aspectRatio
        );
        const dataUrl = "data:image/png;base64," + generatedBase64;
        return uploadBase64Image(job.gcsPath, dataUrl);
      } catch (e) {
        console.error("Error generating image for job:", job, e);

        return null;
      }
    });

    const generatedImages = (await Promise.all(generationPromises)).filter(
      (img) => img !== null
    );
    if (generatedImages.length === 0) {
      errorMessage.value =
        "Failed to generate any images. Please check console for details.";
    } else {
      emit("generation-complete", generatedImages);
    }
  } catch (error) {
    errorMessage.value =
      error.message ||
      "An error occurred during image generation. Please try again.";
    console.error("Error in Existing Assets generation:", error);
  } finally {
    isLoading.value = false;
    emit("update:loading", false);
  }
};
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="form-control">
      <label class="label">
        <span class="label-text text-lg font-bold text-[var(--color-text-primary)]">Number of top performing images to use</span>
      </label>
      <select
        v-model.number="numTopImages"
        class="bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] rounded-md p-2 w-full max-w-xs border border-transparent focus:border-[var(--color-interactive-focus)] focus:outline-none"
      >
        <option v-for="i in 14" :key="i" :value="i">
          {{ i }}
        </option>
      </select>
    </div>

    <div class="form-control">
      <label class="label">
        <span class="label-text text-lg font-bold text-[var(--color-text-primary)]">Prioritize images by</span>
      </label>
      <select
        v-model="selectedMetric"
        class="bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] rounded-md p-2 w-full max-w-xs border border-transparent focus:border-[var(--color-interactive-focus)] focus:outline-none"
      >
        <option
          v-for="metric in metricsOptions"
          :key="metric.value"
          :value="metric.value"
        >
          {{ metric.label }}
        </option>
      </select>
      <label class="label">
        <span class="label-text-alt text-[var(--color-text-muted)]">If the chosen metric is unavailable for an ad group, images will be selected randomly.</span>
      </label>
    </div>

    <div class="relative">
      <label class="label">
        <span class="label-text text-lg font-bold text-[var(--color-text-primary)]">Prompt for Nano Banana</span>
      </label>
      <textarea
        v-model="prompt"
        placeholder="Enter your prompt for image generation..."
        class="bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] rounded-md p-3 w-full custom-placeholder border border-transparent focus:border-[var(--color-interactive-focus)] focus:outline-none"
        rows="3"
      ></textarea>
    </div>

    <div>
      <h3 class="font-bold text-[var(--color-text-primary)]">Number of images for each aspect ratio:</h3>
      <div class="flex gap-4 mt-2 flex-wrap">
        <div v-for="ar in aspectRatios" :key="ar.ratio" class="form-control">
          <label class="label">
            <span class="label-text text-[var(--color-text-muted)]">{{ ar.label }}</span>
          </label>
          <select v-model.number="ar.count" class="bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] rounded-md p-2 border border-transparent focus:border-[var(--color-interactive-focus)] focus:outline-none">
            <option v-for="i in 5" :key="i - 1" :value="i - 1">
              {{ i - 1 }}
            </option>
          </select>
        </div>
      </div>
      
      <!-- Add Custom Ratio Form -->
      <div class="flex gap-2 mt-4 items-end border-t border-gray-700 pt-4">
        <div class="form-control">
          <label class="label"><span class="label-text text-xs">Add Aspect Ratio</span></label>
          <select v-model="selectedAllowedRatio" class="bg-gray-700 rounded-md p-2 text-sm w-48">
            <option value="" disabled>Select ratio...</option>
            <option v-for="r in availableToSelectRatios" :key="r.ratio" :value="r.ratio">
              {{ r.label }}
            </option>
          </select>
        </div>
        <button @click="addNewRatio" class="bg-green-600 text-white font-bold py-2 px-4 rounded-md hover:bg-green-700 text-sm h-10">
          Add
        </button>
        <button @click="configStore.resetAspectRatios" class="bg-red-600 text-white font-bold py-2 px-4 rounded-md hover:bg-red-700 text-sm h-10">
          Reset
        </button>
      </div>
    </div>

    <button
      @click="handleGenerate"
      class="bg-[var(--color-interactive-primary)] text-[var(--color-text-primary)] font-bold py-2 px-6 rounded-md hover:bg-[var(--color-interactive-hover)] self-start transition-colors disabled:opacity-50"
      :disabled="isLoading"
    >
      <span v-if="isLoading" class="loading loading-spinner mr-2"></span>
      {{ isLoading ? "Generating..." : "Generate Images" }}
    </button>

    <div
      v-if="warnings.length > 0"
      class="bg-[var(--color-status-warning)]/10 border border-[var(--color-status-warning)] text-[var(--color-status-warning)] p-4 rounded-lg mt-2"
    >
      <p class="font-bold mb-1">Warnings:</p>
      <ul class="list-disc list-inside text-sm">
        <li v-for="(warning, index) in warnings" :key="index">{{ warning }}</li>
      </ul>
    </div>

    <div v-if="errorMessage" class="text-[var(--color-status-error)] mt-4 font-bold">
      {{ errorMessage }}
    </div>

    <div
      v-if="debugInfo"
      class="mt-4 p-3 bg-[var(--color-bg-secondary)] text-xs text-[var(--color-text-muted)] rounded-lg border border-[var(--color-bg-tertiary)]"
    >
      <span class="font-bold text-[var(--color-text-primary)]">Debug Info:</span> {{ debugInfo }}
    </div>
  </div>
</template>

<style scoped>
.custom-placeholder::placeholder {
  color: #9ca3af; /* gray-400 */
  font-style: italic;
}
</style>
