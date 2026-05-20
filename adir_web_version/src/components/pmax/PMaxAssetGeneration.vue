<script setup>
import { useAssetStore } from "@/stores/assetStore";
import { useBrandStore } from "@/stores/brandStore";
import { useCampaignStore } from "@/stores/campaignStore";
import { ref } from "vue";
import { useRouter } from "vue-router";
import LoadingSpinner from "@/components/LoadingSpinner.vue";
import { extractBrandGuidelines } from "@/services/vertexAiService";
import { useConfigStore } from "@/stores/config";
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
const showGuidelinesModal = ref(false);
const configStore = useConfigStore();

const activeGuidelinesTab = ref("manual");
const guidelinesUrl = ref("");
const guidelinesFiles = ref([]);
const isProcessingGuidelines = ref(false);

const handleGuidelinesFileUpload = (e) => {
  guidelinesFiles.value = Array.from(e.target.files);
};

const processGuidelinesFiles = async () => {
  isProcessingGuidelines.value = true;
  try {
    const fileDataPromises = guidelinesFiles.value.map(async (file) => {
      const base64 = await fileToBase64(file);
      return {
        inlineData: {
          data: base64.split(',')[1],
          mimeType: file.type
        }
      };
    });
    const contents = await Promise.all(fileDataPromises);
    
    const promptText = "Extract brand guidelines from the attached files. Identify color palette, style, tone, and any specific rules.";
    const guidelines = await extractBrandGuidelines(promptText, configStore.geminiModel, false, contents.map(c => c.inlineData));
    brandStore.setGuidelines(guidelines);
  } catch (error) {
    console.error("Failed to process files", error);
  } finally {
    isProcessingGuidelines.value = false;
  }
};

const processGuidelinesUrl = async () => {
  if (!guidelinesUrl.value) return;
  isProcessingGuidelines.value = true;
  try {
    const promptText = `Extract brand guidelines from this website: ${guidelinesUrl.value}. Identify color palette, style, tone, and any specific rules.`;
    const guidelines = await extractBrandGuidelines(promptText, configStore.geminiModel, true);
    brandStore.setGuidelines(guidelines);
  } catch (error) {
    console.error("Failed to process URL", error);
  } finally {
    isProcessingGuidelines.value = false;
  }
};

const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

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
        <div class="flex items-end gap-4">
          <div>
            <label class="label mb-2">
              <span class="label-text text-lg font-bold text-[var(--color-text-primary)]">Generation Mode</span>
            </label>
            <div class="flex rounded-lg bg-[var(--color-bg-tertiary)] p-1">
              <button
                v-for="(name, index) in Object.keys(modes)"
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

          <!-- Brand Guidelines Split Button -->
          <div class="flex flex-col">
            <label class="label mb-2">
              <span class="label-text text-sm font-bold text-[var(--color-text-muted)]">Brand Guidelines</span>
            </label>
            <div class="flex rounded-lg bg-[var(--color-bg-tertiary)] p-1">
              <button
                @click="showGuidelinesModal = true"
                class="btn font-medium py-2 px-4 rounded-l-md text-sm transition-colors text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] flex items-center gap-2"
              >
                <span>Configure</span>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <button
                @click="brandStore.useGuidelinesInGeneration = !brandStore.useGuidelinesInGeneration"
                class="btn font-medium py-2 px-3 rounded-r-md text-sm transition-colors ml-0.5"
                :class="brandStore.useGuidelinesInGeneration ? 'bg-[var(--color-interactive-primary)] text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'"
              >
                {{ brandStore.useGuidelinesInGeneration ? 'ON' : 'OFF' }}
              </button>
            </div>
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

    <!-- Brand Guidelines Modal -->
    <div v-if="showGuidelinesModal" class="fixed inset-0 bg-black/80 flex flex-col justify-center items-center z-50">
      <div class="bg-[var(--color-bg-secondary)] p-6 rounded-xl shadow-2xl border border-[var(--color-bg-tertiary)] max-w-2xl w-full mx-4">
        <h3 class="text-xl font-bold mb-4 text-[var(--color-text-primary)]">Configure Brand Guidelines</h3>
        
        <!-- Option Cards (Tabs) -->
        <div class="grid grid-cols-3 gap-4 mb-6">
          <label class="relative cursor-pointer">
            <input type="radio" v-model="activeGuidelinesTab" value="manual" class="sr-only peer" />
            <div class="p-4 rounded-lg bg-[var(--color-bg-tertiary)] border-2 border-transparent hover:bg-[var(--color-bg-secondary)] transition-all duration-300 peer-checked:border-[var(--color-interactive-primary)] peer-checked:bg-[var(--color-interactive-primary)]/10 flex flex-col items-center gap-2 text-center h-full">
              <span class="text-sm font-bold text-[var(--color-text-primary)]">Manual Input</span>
              <span class="text-xs text-[var(--color-text-muted)]">Type manually</span>
            </div>
          </label>
          <label class="relative cursor-pointer">
            <input type="radio" v-model="activeGuidelinesTab" value="upload" class="sr-only peer" />
            <div class="p-4 rounded-lg bg-[var(--color-bg-tertiary)] border-2 border-transparent hover:bg-[var(--color-bg-secondary)] transition-all duration-300 peer-checked:border-[var(--color-interactive-primary)] peer-checked:bg-[var(--color-interactive-primary)]/10 flex flex-col items-center gap-2 text-center h-full">
              <span class="text-sm font-bold text-[var(--color-text-primary)]">Import Files</span>
              <span class="text-xs text-[var(--color-text-muted)]">PDF, Docs, Images</span>
            </div>
          </label>
          <label class="relative cursor-pointer">
            <input type="radio" v-model="activeGuidelinesTab" value="url" class="sr-only peer" />
            <div class="p-4 rounded-lg bg-[var(--color-bg-tertiary)] border-2 border-transparent hover:bg-[var(--color-bg-secondary)] transition-all duration-300 peer-checked:border-[var(--color-interactive-primary)] peer-checked:bg-[var(--color-interactive-primary)]/10 flex flex-col items-center gap-2 text-center h-full">
              <span class="text-sm font-bold text-[var(--color-text-primary)]">Website</span>
              <span class="text-xs text-[var(--color-text-muted)]">Extract from URL</span>
            </div>
          </label>
        </div>

        <!-- Manual Input Content -->
        <div v-if="activeGuidelinesTab === 'manual'">
          <textarea
            v-model="brandStore.guidelines"
            class="w-full bg-[var(--color-bg-tertiary)] border border-[var(--color-bg-tertiary)] rounded-md p-3 text-[var(--color-text-primary)] mb-4 focus:border-[var(--color-interactive-focus)] focus:outline-none"
            rows="8"
            placeholder="e.g., Colors: #0f172a, #1e293b. Style: Minimalist. Tone: Professional."
          ></textarea>
        </div>

        <!-- File Upload Content -->
        <div v-if="activeGuidelinesTab === 'upload'" class="mb-4">
          <div class="border-2 border-dashed border-[var(--color-bg-tertiary)] rounded-lg p-6 text-center cursor-pointer hover:border-[var(--color-interactive-primary)] transition-colors" @click="$refs.guidelinesFileInput.click()">
            <p class="text-[var(--color-text-muted)]">Click to upload documents or images</p>
            <input type="file" ref="guidelinesFileInput" class="hidden" multiple accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpeg,.webp,.heic,.heif,.gif" @change="handleGuidelinesFileUpload" />
          </div>
          <!-- List of files -->
          <div v-if="guidelinesFiles.length > 0" class="mt-2">
            <p class="text-xs text-[var(--color-text-muted)] mb-1">Selected files:</p>
            <ul class="text-sm text-[var(--color-text-primary)]">
              <li v-for="file in guidelinesFiles" :key="file.name">{{ file.name }}</li>
            </ul>
            <button @click="processGuidelinesFiles" class="mt-2 bg-[var(--color-interactive-primary)] text-[var(--color-text-primary)] px-4 py-2 rounded-md hover:bg-[var(--color-interactive-hover)] text-sm">Process with Gemini</button>
          </div>
        </div>

        <!-- Website Inference Content -->
        <div v-if="activeGuidelinesTab === 'url'" class="mb-4">
          <input
            v-model="guidelinesUrl"
            type="url"
            placeholder="https://example.com"
            class="w-full bg-[var(--color-bg-tertiary)] border border-[var(--color-bg-tertiary)] rounded-md p-3 text-[var(--color-text-primary)] mb-2 focus:border-[var(--color-interactive-focus)] focus:outline-none"
          />
          <button @click="processGuidelinesUrl" class="bg-[var(--color-interactive-primary)] text-[var(--color-text-primary)] px-4 py-2 rounded-md hover:bg-[var(--color-interactive-hover)] text-sm">Extract with Gemini</button>
        </div>

        <!-- Processing State -->
        <div v-if="isProcessingGuidelines" class="flex items-center gap-2 mb-4 text-[var(--color-interactive-primary)]">
          <span class="loading loading-spinner loading-sm"></span>
          <span>Processing data with Gemini...</span>
        </div>

        <!-- Result Preview -->
        <div v-if="activeGuidelinesTab !== 'manual' && brandStore.guidelines" class="mt-4">
          <label class="text-caption mb-1">Generated Guidelines Preview</label>
          <textarea
            v-model="brandStore.guidelines"
            class="w-full bg-[var(--color-bg-tertiary)] border border-[var(--color-bg-tertiary)] rounded-md p-3 text-[var(--color-text-primary)] mb-4 focus:border-[var(--color-interactive-focus)] focus:outline-none"
            rows="5"
          ></textarea>
        </div>

        <div class="flex justify-end gap-4">
          <button @click="showGuidelinesModal = false" class="bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] px-4 py-2 rounded-md hover:bg-[var(--color-bg-secondary)] border border-[var(--color-bg-tertiary)]">Close</button>
        </div>
      </div>
    </div>
  </div>
</template>



