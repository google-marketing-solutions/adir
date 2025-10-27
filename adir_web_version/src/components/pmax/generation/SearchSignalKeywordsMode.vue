<script setup>
import { uploadBase64Image } from "@/services/gcsService";
import {
  fetchAssetGroupsByCampaignIds,
  getSearchSignalKeywordsForAdGroup,
} from "@/services/googleAdsService";
import {
  generateImagesFromPrompt,
  generateTextFromPrompt,
} from "@/services/vertexAiService";
import { useConfigStore } from "@/stores/config";
import { ref } from "vue";

const emit = defineEmits(["generation-complete", "update:loading"]);
const KEYWORD_GENERATION_TEXT_PROMPT =
  'You are a prompt engineer and your job is to provide the best short prompt to generate an image for a digital campaign given a set of keywords. Given the following list of keywords, provide the optimal Generative AI prompt to generate a realistic style image to be used in an ad of a digital campaign that will best illustrate the concepts defined by the list of keywords. Please return only the prompt and start the prompt with "a photo of". Here is the list of keywords separated by comma:';

const props = defineProps({
  selectedCampaigns: {
    type: Array,
    required: true,
  },
});

const prompt = ref(KEYWORD_GENERATION_TEXT_PROMPT);
const aspectRatios = ref([
  { label: "Square (1:1)", ratio: "1:1", count: 1 },
  { label: "Portrait (9:16)", ratio: "9:16", count: 0 },
  { label: "Landscape (16:9)", ratio: "16:9", count: 0 },
]);
const isLoading = ref(false);
const configStore = useConfigStore();

const handleGenerate = async () => {
  isLoading.value = true;
  emit("update:loading", true);
  const generatedImages = [];
  try {
    console.log("Starting image generation...");
    const campaignIds = props.selectedCampaigns.map((c) => c.id);
    const assetGroups = await fetchAssetGroupsByCampaignIds(campaignIds);
    console.log("Fetched asset groups:", assetGroups);

    for (const ar of aspectRatios.value) {
      if (ar.count > 0) {
        const jobObjects = [];
        for (const group of assetGroups) {
          const keywords = await getSearchSignalKeywordsForAdGroup(
            group.assetGroup.id,
          );
          console.log(
            `Keywords for asset group ${group.assetGroup.id}:`,
            keywords,
          );
          const keywordList = [
            ...new Set(
              (keywords || [])
                .map((k) => k.assetGroupSignal.searchTheme.text)
                .filter((k) => !!k),
            ),
          ];
          if (!keywordList.length) {
            console.log(
              `No search signal keywords for Asset Group ${group.assetGroup.id}, skipping`,
            );
            continue;
          }
          const keywordsString = keywordList.join(", ");
          const geminiPrompt = `${prompt.value} ${keywordsString}`;
          console.log("Generating prompt with Gemini. Input:", geminiPrompt);
          const imagePrompt = await generateTextFromPrompt(
            geminiPrompt,
            configStore.geminiModel,
          );
          console.log("Final prompt for image generation:", imagePrompt);
          const campaignIdentifier = `${group.campaign.name.replace(/\s+/g, "_")}~${group.campaign.id}`;
          const assetGroupIdentifier = `${group.assetGroup.name.replace(/\s+/g, "_")}~${group.assetGroup.id}`;
          const gcsPath = `${configStore.customerID}/${campaignIdentifier}/${assetGroupIdentifier}/GENERATED/`;

          jobObjects.push(
            ...Array.from({ length: ar.count }, (_, i) => ({
              prompt: imagePrompt,
              aspectRatio: ar.ratio,
              sampleCount: 1,
              gcsPath: `${gcsPath}${Date.now()}_${i}.png`,
            })),
          );
        }

        console.log("Job objects:", jobObjects);

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
        console.log("Generated image URLs:", uploadedImageUrls);
        generatedImages.push(...uploadedImageUrls);
      }
    }
    emit("generation-complete", generatedImages);
  } catch (error) {
    console.error("Error in Search Signal Keywords generation:", error);
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
        v-model="prompt"
        placeholder="e.g., A futuristic car driving through a neon-lit city..."
        class="bg-gray-700 rounded-md p-2 w-full custom-placeholder"
        rows="3"
      ></textarea>
    </div>

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
  </div>
</template>

<style scoped>
.custom-placeholder::placeholder {
  color: #9ca3af; /* gray-400 */
  font-style: italic;
}
</style>
