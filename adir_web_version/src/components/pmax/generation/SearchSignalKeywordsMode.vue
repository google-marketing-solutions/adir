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
import { useBrandStore } from "@/stores/brandStore";
import { useConfigStore } from "@/stores/config";
import { computed, ref } from "vue";
const errorMessage = ref("");
const showPrompt = ref(false);

const emit = defineEmits(["generation-complete", "update:loading"]);
const KEYWORD_GENERATION_TEXT_PROMPT =
  'You are a prompt engineer and your job is to provide the best short prompt to generate an image for a digital campaign given a set of keywords. Given the following list of keywords, provide the optimal Generative AI prompt to generate a realistic style image to be used in an ad of a digital campaign that will best illustrate the concepts defined by the list of keywords. Please return only the prompt and start the prompt with "a photo of". Here is the list of keywords separated by comma:';

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

const prompt = ref(KEYWORD_GENERATION_TEXT_PROMPT);
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
const isLoading = ref(false);
const configStore = useConfigStore();

const handleGenerate = async () => {
  isLoading.value = true;
  emit("update:loading", true);
  try {
    errorMessage.value = "";
    console.log("Starting image generation...");
    const campaignIds = props.selectedCampaigns.map((c) => c.campaign.id);
    const assetGroups = await fetchAssetGroupsByCampaignIds(
      campaignIds,
      props.showPausedAssetGroups
    );
    console.log("Fetched asset groups:", assetGroups);

    const aspectRatiosToGenerate = aspectRatios.value.filter(
      (ar) => ar.count > 0,
    );
    if (aspectRatiosToGenerate.length === 0) {
      isLoading.value = false;
      emit("update:loading", false);
      return;
    }

    // Prepare groups: fetch keywords and generate prompts in parallel
    const preparedGroups = await Promise.all(
      assetGroups.map(async (group) => {
        try {
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
            return null;
          }

          const keywordsString = keywordList.join(", ");
          let geminiPrompt = `${prompt.value} ${keywordsString}`;
          
          const brandStore = useBrandStore();
          if (brandStore.useGuidelinesInGeneration && brandStore.guidelines) {
            geminiPrompt += `\n\nYou MUST follow these Brand Guidelines when generating the image prompt:\n${brandStore.guidelines}`;
          }

          console.log("Generating prompt with Gemini. Input:", geminiPrompt);
          const imagePrompt = await generateTextFromPrompt(
            geminiPrompt,
            configStore.geminiModel,
          );
          console.log("Final prompt for image generation:", imagePrompt);

          return { group, imagePrompt };
        } catch (e) {
          console.error(
            `Error preparing group ${group.assetGroup.name}:`,
            e,
          );
          return null;
        }
      }),
    );

    const validGroups = preparedGroups.filter((g) => g !== null);

    if (validGroups.length === 0) {
      errorMessage.value =
        "No valid asset groups with keywords found to generate images.";
      return;
    }

    // Create all image generation jobs
    const jobObjects = validGroups.flatMap(({ group, imagePrompt }) => {
      const campaignIdentifier = `${group.campaign.name.replace(/\s+/g, "_")}~${group.campaign.id}`;
      const assetGroupIdentifier = `${group.assetGroup.name.replace(/\s+/g, "_")}~${group.assetGroup.id}`;
      const gcsPath = `${configStore.customerID}/${campaignIdentifier}/${assetGroupIdentifier}/GENERATED/`;

      return aspectRatiosToGenerate.flatMap((ar) =>
        Array.from({ length: ar.count }, (_, i) => ({
          prompt: imagePrompt,
          aspectRatio: ar.ratio,
          sampleCount: 1,
          gcsPath: `${gcsPath}${Date.now()}_${i}_${ar.ratio.replace(":", "-")}_${Math.random().toString(36).slice(2, 7)}.png`,
        })),
      );
    });

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

    const generatedImages = await Promise.all(generationPromises);
    console.log("Generated image URLs:", generatedImages);
    emit("generation-complete", generatedImages);
  } catch (error) {
    errorMessage.value =
      error.message ||
      "An error occurred during image generation. Please try again.";
    console.error("Error in Search Signal Keywords generation:", error);
  } finally {
    isLoading.value = false;
    emit("update:loading", false);
  }
};
</script>

<template>
  <div class="flex flex-col gap-6">
    <button
      @click="showPrompt = !showPrompt"
      class="text-left text-[var(--color-interactive-primary)] hover:text-[var(--color-interactive-hover)] font-bold text-lg border border-[var(--color-interactive-primary)] rounded-md p-2 transition-colors"
    >
      {{ showPrompt ? "Hide" : "Click here to Show/Edit the" }} Search Signal Keywords Prompt
    </button>
    <div class="relative" v-if="showPrompt">
      <textarea
        v-model="prompt"
        placeholder="e.g., A futuristic car driving through a neon-lit city..."
        class="bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] rounded-md p-3 w-full border border-transparent focus:border-[var(--color-interactive-focus)] focus:outline-none"
        rows="5"
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
