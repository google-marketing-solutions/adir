<template>
  <div
    v-if="isVisible"
    class="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center"
    @click="emit('close')"
  >
    <div
      class="bg-gray-800 rounded-lg p-6 w-full max-w-lg border border-gray-700 max-h-[80vh] overflow-y-auto"
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
              <input
                v-model="configStore.cloudRegion"
                type="text"
                id="cloud-region"
                class="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-gray-200 focus:ring-cyan-500 focus:border-cyan-500"
              />
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
            <div>
              <label
                for="dev-token"
                class="block text-sm font-medium text-gray-300 mb-1"
                >Ads API Key (Developer Token)</label
              >
              <input
                v-model="configStore.developerToken"
                type="text"
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
                <option>gemini-2.5-pro</option>
                <option>gemini-2.5-flash</option>
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
import { useConfigStore } from "../stores/config";

const configStore = useConfigStore();

defineProps({
  isVisible: Boolean,
});

const emit = defineEmits(["close"]);
</script>
