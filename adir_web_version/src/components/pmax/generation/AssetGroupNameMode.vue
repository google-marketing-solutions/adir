<script setup>
import { uploadBase64Image } from "@/services/gcsService";
import {
  fetchAdGroupsByCampaignIds,
  fetchAssetGroupsByCampaignIds,
} from "@/services/googleAdsService";
import { generateImagesFromPrompt, generateTextFromPrompt } from "@/services/vertexAiService";
import { useConfigStore } from "@/stores/config";
import { useBrandStore } from "@/stores/brandStore";
import { computed, onMounted, ref, watch } from "vue";

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

const prompt = ref("");
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
const promptTextarea = ref(null);
const isLoading = ref(false);
const configStore = useConfigStore();
const errorMessage = ref("");

const insertPlaceholder = () => {
  const textarea = promptTextarea.value;
  if (textarea) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = prompt.value;
    const newText =
      text.substring(0, start) +
      "[Asset Group / Ad Group Name]" +
      text.substring(end);
    prompt.value = newText;
    textarea.focus();
    const newPos = start + "[Asset Group / Ad Group Name]".length;
    textarea.setSelectionRange(start, newPos);
  }
};

const handleGenerate = async () => {
  isLoading.value = true;
  emit("update:loading", true);
  try {
    errorMessage.value = "";
    const pmaxCampaignIds = props.selectedCampaigns
      .filter((c) => c.campaign.advertisingChannelType === "PERFORMANCE_MAX")
      .map((c) => c.campaign.id);
    const demandGenCampaignIds = props.selectedCampaigns
      .filter((c) => c.campaign.advertisingChannelType === "DEMAND_GEN")
      .map((c) => c.campaign.id);

    let groups = [];
    if (pmaxCampaignIds.length > 0) {
      const assetGroups = await fetchAssetGroupsByCampaignIds(
        pmaxCampaignIds,
        props.showPausedAssetGroups
      );
      groups = groups.concat(assetGroups);
    }
    if (demandGenCampaignIds.length > 0) {
      const adGroups = await fetchAdGroupsByCampaignIds(
        demandGenCampaignIds,
        props.showPausedAssetGroups
      );
      groups = groups.concat(adGroups);
    }

    const aspectRatiosToGenerate = aspectRatios.value.filter(
      (ar) => ar.count > 0,
    );

    const brandStore = useBrandStore();
    
    const jobObjectsPromises = groups.map(async (group) => {
      const isDemandGen =
        group.campaign.advertisingChannelType === "DEMAND_GEN";
      const groupName = isDemandGen ? group.adGroup.name : group.assetGroup.name;
      const groupId = isDemandGen ? group.adGroup.id : group.assetGroup.id;

      let finalPrompt = prompt.value.replace(
        /\[Asset Group \/ Ad Group Name\]/g,
        groupName,
      );

      if (brandStore.useGuidelinesInGeneration && brandStore.guidelines) {
        emit("update:loading-message", `Refining prompt for group ${groupName}...`);
        const geminiPrompt = `You are an expert advertising copywriter and image prompt engineer.
Your task is to refine the following image generation prompt based on the Brand Guidelines.

Base Prompt: ${finalPrompt}

Brand Guidelines:
${brandStore.guidelines}

Instructions:
1. Incorporate the color palette, style, and tone from the guidelines into the prompt.
2. Keep the prompt concise and effective for an image generator (Imagen).
3. Return ONLY the refined prompt text.`;

        finalPrompt = await generateTextFromPrompt(
          geminiPrompt,
          configStore.geminiModel,
        );
      }

      const campaignIdentifier = `${group.campaign.name.replace(/\s+/g, "_")}~${group.campaign.id}`;
      const groupIdentifier = `${groupName.replace(/\s+/g, "_")}~${groupId}`;
      const gcsPath = `${configStore.customerID}/${campaignIdentifier}/${groupIdentifier}/GENERATED/`;

      return aspectRatiosToGenerate.flatMap((ar) =>
        Array.from({ length: ar.count }, (_, i) => ({
          prompt: finalPrompt,
          aspectRatio: ar.ratio,
          sampleCount: 1,
          gcsPath: `${gcsPath}${Date.now()}_${i}_${ar.ratio.replace(":", "-")}_${Math.random().toString(36).slice(2, 7)}.png`,
        })),
      );
    });

    const jobObjectsNested = await Promise.all(jobObjectsPromises);
    const jobObjects = jobObjectsNested.flat();

    const generationPromises = jobObjects.map(async (job) => {
      const base64Images = await generateImagesFromPrompt(
        job.prompt,
        job.aspectRatio,
        job.sampleCount,
        configStore.imageGenModel,
      );
      const dataUrl = "data:image/png;base64," + base64Images[0];
      return uploadBase64Image(job.gcsPath, dataUrl);
    });

    const generatedImages = await Promise.all(generationPromises);
    emit("generation-complete", generatedImages);
  } catch (error) {
    errorMessage.value =
      error.message ||
      "An error occurred during image generation. Please try again.";
    console.error("Error in AssetGroup Name generation:", error);
  } finally {
    isLoading.value = false;
    emit("update:loading", false);
  }
};
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="relative">
      <textarea
        ref="promptTextarea"
        v-model="prompt"
        placeholder="e.g., A futuristic car driving through a neon-lit city with [Asset Group / Ad Group Name] in the background"
        class="bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] rounded-md p-3 w-full pr-36 custom-placeholder border border-transparent focus:border-[var(--color-interactive-focus)] focus:outline-none"
        rows="3"
      ></textarea>
      <button
        @click="insertPlaceholder"
        class="absolute top-2 right-2 bg-[var(--color-interactive-primary)] text-[var(--color-text-primary)] font-bold py-1 px-3 rounded-md hover:bg-[var(--color-interactive-hover)] text-sm transition-colors"
      >
        Insert Placeholder
      </button>
    </div>
    <label class="label -mt-2">
      <span class="label-text-alt text-[var(--color-text-muted)]"
        >Use
        <code v-pre class="bg-[var(--color-bg-secondary)] p-1 rounded-md text-[var(--color-text-primary)]"
          >[Asset Group / Ad Group Name]</code
        >
        as a placeholder for the asset group or ad group name.</span
      >
    </label>

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
    
    <div v-if="errorMessage" class="text-[var(--color-status-error)] mt-4">
      {{ errorMessage }}
    </div>
  </div>
</template>

<style scoped>
.custom-placeholder::placeholder {
  color: #9ca3af; /* gray-400 */
  font-style: italic;
}
</style>
