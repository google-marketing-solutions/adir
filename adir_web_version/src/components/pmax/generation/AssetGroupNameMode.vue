<script setup>
import { uploadBase64Image } from "@/services/gcsService";
import {
  fetchAdGroupsByCampaignIds,
  fetchAssetGroupsByCampaignIds,
} from "@/services/googleAdsService";
import { generateImagesFromPrompt } from "@/services/vertexAiService";
import { useConfigStore } from "@/stores/config";
import { ref } from "vue";

const emit = defineEmits(["generation-complete", "update:loading"]);

const props = defineProps({
  selectedCampaigns: {
    type: Array,
    required: true,
  },
});

const prompt = ref("");
const aspectRatios = ref([
  { label: "Square (1:1)", ratio: "1:1", count: 1 },
  { label: "Portrait (9:16)", ratio: "9:16", count: 0 },
  { label: "Landscape (16:9)", ratio: "16:9", count: 0 },
]);
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
  const generatedImages = [];
  try {
    errorMessage.value = "";
    const campaignIds = props.selectedCampaigns.map((c) => c.campaign.id);
    const assetGroups = await fetchAssetGroupsByCampaignIds(campaignIds);
    const pmaxCampaignIds = props.selectedCampaigns
      .filter((c) => c.campaign.advertisingChannelType === "PERFORMANCE_MAX")
      .map((c) => c.campaign.id);
    const demandGenCampaignIds = props.selectedCampaigns
      .filter((c) => c.campaign.advertisingChannelType === "DEMAND_GEN")
      .map((c) => c.campaign.id);

    let groups = [];
    if (pmaxCampaignIds.length > 0) {
      const assetGroups = await fetchAssetGroupsByCampaignIds(pmaxCampaignIds);
      groups = groups.concat(assetGroups);
    }
    if (demandGenCampaignIds.length > 0) {
      const adGroups = await fetchAdGroupsByCampaignIds(demandGenCampaignIds);
      groups = groups.concat(adGroups);
    }

    for (const ar of aspectRatios.value) {
      if (ar.count > 0) {
        const jobObjects = groups.flatMap((group) => {
          const isDemandGen =
            group.campaign.advertisingChannelType === "DEMAND_GEN";
          const groupName = isDemandGen
            ? group.adGroup.name
            : group.assetGroup.name;
          const groupId = isDemandGen ? group.adGroup.id : group.assetGroup.id;

          const finalPrompt = prompt.value.replace(
            /\[Asset Group \/ Ad Group Name\]/g,
            groupName,
          );
          const campaignIdentifier = `${group.campaign.name.replace(/\s+/g, "_")}~${group.campaign.id}`;
          const groupIdentifier = `${groupName.replace(/\s+/g, "_")}~${groupId}`;
          const gcsPath = `${configStore.customerID}/${campaignIdentifier}/${groupIdentifier}/GENERATED/`;

          return Array.from({ length: ar.count }, (_, i) => ({
            prompt: finalPrompt,
            aspectRatio: ar.ratio,
            sampleCount: 1,
            gcsPath: `${gcsPath}${Date.now()}_${i}.png`,
          }));
        });

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

        const uploadedImageUrls = await Promise.all(generationPromises);
        generatedImages.push(...uploadedImageUrls);
      }
    }
    emit("generation-complete", generatedImages);
  } catch (error) {
    errorMessage.value = "An error occurred during image generation. Please try again.";
    console.error("Error in AssetGroup Name generation:", error);
  } finally {
    isLoading.value = false;
    emit("update:loading", false);
  }
};
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="relative">
      <textarea
        ref="promptTextarea"
        v-model="prompt"
        placeholder="e.g., A futuristic car driving through a neon-lit city with [Asset Group / Ad Group Name] in the background"
        class="bg-gray-700 rounded-md p-2 w-full pr-36 custom-placeholder"
        rows="3"
      ></textarea>
      <button
        @click="insertPlaceholder"
        class="absolute top-2 right-2 bg-cyan-600 text-white font-bold py-1 px-3 rounded-md hover:bg-cyan-700 text-sm"
      >
        Insert Placeholder
      </button>
    </div>
    <label class="label -mt-2">
      <span class="label-text-alt"
        >Use
        <code v-pre class="bg-gray-800 p-1 rounded-md"
          >[Asset Group / Ad Group Name]</code
        >
        as a placeholder for the asset group or ad group name.</span
      >
    </label>

    <div>
      <h3 class="font-bold">Number of images for each aspect ratio:</h3>
      <div class="flex gap-4 mt-2">
        <div v-for="ar in aspectRatios" :key="ar.ratio" class="form-control">
          <label class="label">
            <span class="label-text">{{ ar.label }}</span>
          </label>
          <select v-model.number="ar.count" class="bg-gray-700 rounded-md p-2">
            <option v-for="i in 5" :key="i - 1" :value="i - 1">
              {{ i - 1 }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <button
      @click="handleGenerate"
      class="bg-cyan-600 text-white font-bold py-2 px-6 rounded-md hover:bg-cyan-700"
      :disabled="isLoading"
    >
      <span v-if="isLoading" class="loading loading-spinner"></span>
      {{ isLoading ? "Generating..." : "Generate Images" }}
    </button>
    <div v-if="errorMessage" class="text-yellow-500 mt-4">
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
