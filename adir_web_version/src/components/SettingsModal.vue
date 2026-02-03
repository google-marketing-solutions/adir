<template>
  <div
    v-if="isVisible"
    class="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[100]"
    @click="emit('close')"
  >
    <div
      class="bg-gray-800 rounded-lg p-6 w-full max-w-2xl border border-gray-700 max-h-[80vh] overflow-y-auto overflow-x-hidden"
      @click.stop
    >
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-bold">Settings</h2>
        <button
          @click="emit('close')"
          class="text-gray-400 hover:text-white text-2xl"
        >
          &times;
        </button>
      </div>
      <form class="space-y-6">
        <fieldset class="border border-gray-700 rounded-md p-4">
          <legend class="text-lg font-semibold px-2">Google Cloud</legend>
          <div class="grid grid-cols-1 gap-4">
            <div>
              <label
                for="cloud-project-id"
                class="block text-sm font-medium text-gray-300 mb-1"
                >Cloud Project ID</label
              >
              <input
                v-model="configStore.cloudProjectID"
                type="text"
                id="cloud-project-id"
                class="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-gray-200 focus:ring-cyan-500 focus:border-cyan-500"
              />
            </div>
            <div>
              <label
                for="cloud-region"
                class="block text-sm font-medium text-gray-300 mb-1"
                >Cloud Region</label
              >
              <div v-if="!isCustomRegion" class="flex gap-2">
                <select
                  v-model="configStore.cloudRegion"
                  id="cloud-region"
                  class="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-gray-200 focus:ring-cyan-500 focus:border-cyan-500"
                  @change="handleRegionChange"
                >
                  <option value="us-central1">us-central1</option>
                  <option value="us-east1">us-east1</option>
                  <option value="europe-west1">europe-west1</option>
                  <option value="asia-northeast1">asia-northeast1</option>
                  <option value="custom">Custom...</option>
                </select>
              </div>
              <div v-else class="flex gap-2">
                <input
                  v-model="configStore.cloudRegion"
                  type="text"
                  id="cloud-region-custom"
                  class="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-gray-200 focus:ring-cyan-500 focus:border-cyan-500"
                  placeholder="Enter region (e.g., us-west1)"
                />
                <button
                  type="button"
                  @click="isCustomRegion = false; configStore.cloudRegion = 'us-central1'"
                  class="bg-gray-600 hover:bg-gray-500 text-white px-3 rounded-md"
                >
                  Reset
                </button>
              </div>
            </div>
            <div>
              <label
                for="gcs-bucket-name"
                class="block text-sm font-medium text-gray-300 mb-1"
                >GCS Bucket Name</label
              >
              <input
                v-model="configStore.gcsBucketName"
                type="text"
                id="gcs-bucket-name"
                class="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-gray-200 focus:ring-cyan-500 focus:border-cyan-500"
              />
            </div>
          </div>
        </fieldset>
        <fieldset class="border border-gray-700 rounded-md p-4">
          <legend class="text-lg font-semibold px-2">Google Ads</legend>
          <div class="grid grid-cols-1 gap-4">
            <div>
              <label
                for="mcc-id"
                class="block text-sm font-medium text-gray-300 mb-1"
                >MCC ID</label
              >
              <input
                v-model="configStore.mccID"
                type="text"
                id="mcc-id"
                class="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-gray-200 focus:ring-cyan-500 focus:border-cyan-500"
              />
            </div>
            <div>
              <label
                for="customer-id"
                class="block text-sm font-medium text-gray-300 mb-1"
                >Customer ID</label
              >
              <input
                v-model="configStore.customerID"
                type="text"
                id="customer-id"
                class="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-gray-200 focus:ring-cyan-500 focus:border-cyan-500"
              />
            </div>
            <div class="flex items-start gap-2">
              <input
                v-model="configStore.useSecretManager"
                type="checkbox"
                id="use-secret-manager"
                class="mt-1 w-4 h-4 text-cyan-600 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500 flex-shrink-0"
              />
              <div class="flex flex-col gap-2 w-full">
                <label for="use-secret-manager" class="text-sm font-medium text-gray-300 flex items-center gap-2 flex-wrap">
                  Use Google Cloud Secret Manager for Developer Token
                  <div
                    class="relative group inline-block"
                    @mouseenter="showTooltip"
                    @mouseleave="hideTooltip"
                    ref="infoIconRef"
                  >
                    <!-- Info Icon -->
                    <span class="material-symbols-outlined text-gray-400 cursor-help hover:text-white transition-colors duration-200 text-2xl">info</span>
                    <!-- Tooltip using Teleport -->
                    <Teleport to="body">
                      <div
                        v-if="tooltipVisible"
                        :style="tooltipStyle"
                        class="fixed z-[9999] w-72 p-3 bg-gray-900 border border-gray-700 text-white text-sm rounded-lg shadow-xl pointer-events-none leading-relaxed"
                      >
                        Check this box if you are reading secrets that are saved in GCP Secret Manager. The key should be named <span class="font-mono text-cyan-300">google_ads_developer_token</span> and saved in the same project as the one associated with the Google Client ID. You need to be granted the role <span class="font-bold">Secret Manager Secret Accessor</span> in IAM.
                      </div>
                    </Teleport>
                  </div>
                </label>
              </div>
            </div>

            <div v-if="!configStore.useSecretManager">
              <label
                for="dev-token"
                class="block text-sm font-medium text-gray-300 mb-1"
                >Ads API Key (Developer Token)</label
              >
              <input
                v-model="configStore.developerToken"
                type="password"
                id="dev-token"
                class="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-gray-200 focus:ring-cyan-500 focus:border-cyan-500"
              />
            </div>
          </div>
        </fieldset>
        <fieldset class="border border-gray-700 rounded-md p-4">
          <legend class="text-lg font-semibold px-2">Default Models</legend>
          <div class="grid grid-cols-1 gap-4">
            <div>
              <label
                for="gemini-model"
                class="block text-sm font-medium text-gray-300 mb-1"
                >Gemini Model</label
              >
              <select
                v-model="configStore.geminiModel"
                id="gemini-model"
                class="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-gray-200 focus:ring-cyan-500 focus:border-cyan-500"
              >
                <option>gemini-3-pro-preview</option>
                <option>gemini-3-flash-preview</option>
                <option>gemini-2.5-pro</option>
                <option>gemini-2.5-flash</option>
                <option>gemini-2.5-flash-lite</option>
              </select>
            </div>
            <div>
              <label
                for="image-generation-model"
                class="block text-sm font-medium text-gray-300 mb-1"
                >Image Generation Model</label
              >
              <select
                v-model="configStore.imageGenModel"
                id="image-generation-model"
                class="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-gray-200 focus:ring-cyan-500 focus:border-cyan-500"
              >
                <option>Imagen-4.0-generate-001</option>
                <option>Imagen-4.0-ultra-generate-001</option>
                <option>Imagen-4.0-fast-generate-001</option>
                <option>Imagen-3.0-generate-002</option>
              </select>
            </div>
          </div>
        </fieldset>

        <div class="flex justify-end">
          <button
            @click="emit('close')"
            type="button"
            class="py-2 px-4 bg-cyan-600 rounded-md hover:bg-cyan-500 text-white font-semibold"
          >
            Save Settings
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from "vue";
import { useConfigStore } from "../stores/config";

const configStore = useConfigStore();
const isCustomRegion = ref(false);

// Tooltip Logic
const tooltipVisible = ref(false);
const tooltipStyle = ref({});
const infoIconRef = ref(null);

const showTooltip = () => {
  if (infoIconRef.value) {
    const rect = infoIconRef.value.getBoundingClientRect();
    tooltipStyle.value = {
      top: `${rect.top - 10}px`, // Slightly above
      left: `${rect.left + rect.width / 2}px`, // Center horizontally relative to icon
      transform: 'translate(-50%, -100%)', // Move up by 100% of own height and left by 50%
    };
    tooltipVisible.value = true;
  }
};

const hideTooltip = () => {
  tooltipVisible.value = false;
};

const handleRegionChange = (event) => {
  if (event.target.value === "custom") {
    isCustomRegion.value = true;
    configStore.cloudRegion = ""; // Clear to allow custom input
  }
};

// Check initial state
if (configStore.cloudRegion && !["us-central1", "us-east1", "europe-west1", "asia-northeast1"].includes(configStore.cloudRegion)) {
  isCustomRegion.value = true;
}

defineProps({
  isVisible: Boolean,
});

const emit = defineEmits(["close"]);
</script>
