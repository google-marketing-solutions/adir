<script setup>
import { useBrandStore } from "@/stores/brandStore";
import { extractBrandGuidelines } from "@/services/vertexAiService";
import { useConfigStore } from "@/stores/config";
import { ref, computed, onMounted, onUnmounted } from "vue";
import { onBeforeRouteLeave } from "vue-router";

const brandStore = useBrandStore();
const configStore = useConfigStore();

const activeTab = ref("upload");
const tabs = {
  upload: "File Upload",
  inference: "Website Inference",
};

const guidelinesText = ref(brandStore.guidelines);

const handleSave = () => {
  brandStore.setGuidelines(guidelinesText.value);
  showNotification("Guidelines saved!", "success");
};

const showLeaveModal = ref(false);
let leaveNext = null;

const isDirty = computed(() => guidelinesText.value !== brandStore.guidelines);

onBeforeRouteLeave((to, from, next) => {
  if (isDirty.value) {
    showLeaveModal.value = true;
    leaveNext = next;
  } else {
    next();
  }
});

const handleBeforeUnload = (e) => {
  if (isDirty.value) {
    e.preventDefault();
    e.returnValue = '';
  }
};

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload);
});

onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload);
});

const confirmLeave = () => {
  showLeaveModal.value = false;
  if (leaveNext) leaveNext();
};

const cancelLeave = () => {
  showLeaveModal.value = false;
  if (leaveNext) leaveNext(false);
};

// File Upload State
const selectedFiles = ref([]);
const handleFileChange = (event) => {
  selectedFiles.value = Array.from(event.target.files);
};

const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = (error) => reject(error);
  });
};

// Grounding State
const groundingQuery = ref("");

// Inference State
const websiteUrl = ref("");

const isProcessing = ref(false);

const notification = ref({ show: false, message: "", type: "info" });
const showNotification = (message, type = "info") => {
  notification.value = { show: true, message, type };
  setTimeout(() => {
    notification.value.show = false;
  }, 3000);
};

const processGuidelines = async () => {
  isProcessing.value = true;
  try {
    const modelId = configStore.geminiModel || "gemini-1.5-flash";
    let result = "";

    if (activeTab.value === "upload") {
      if (selectedFiles.value.length === 0) {
        showNotification("Please select at least one file.", "warning");
        return;
      }
      const file = selectedFiles.value[0];
      const base64Data = await fileToBase64(file);
      const fileData = { mimeType: file.type, data: base64Data };
      const prompt = "Extract brand guidelines from this file. Focus on color palette, typography, and visual style. Do NOT include any introductory or concluding text. Start directly with the guidelines.";
      result = await extractBrandGuidelines(prompt, modelId, false, fileData);
    } else if (activeTab.value === "inference") {
      if (!websiteUrl.value) {
        showNotification("Please enter a website URL.", "warning");
        return;
      }
      const prompt = `Analyze the website ${websiteUrl.value} and infer its brand guidelines. Focus on color palette, typography, tone of voice, and visual style based on the site content. Do NOT include any introductory or concluding text. Start directly with the guidelines.`;
      result = await extractBrandGuidelines(prompt, modelId, true);
    }

    if (result) {
      guidelinesText.value = result;
      brandStore.setGuidelines(result);
      showNotification("Guidelines inferred and saved!", "success");
    } else {
      showNotification("No guidelines could be extracted.", "warning");
    }
  } catch (error) {
    console.error("Error processing guidelines:", error);
    showNotification("Failed to process guidelines.", "error");
  } finally {
    isProcessing.value = false;
  }
};
</script>

<template>
  <div class="p-6 bg-gray-900 text-white min-h-screen">
    <h1 class="text-3xl font-bold mb-6">Brand Guidelines</h1>

    <div class="bg-gray-800 p-6 rounded-lg mb-6">
      <!-- Option Cards -->
      <div class="grid grid-cols-2 gap-6 mb-8">
        <label class="relative cursor-pointer">
          <input type="radio" v-model="activeTab" value="upload" class="sr-only peer" />
          <div class="p-6 rounded-xl bg-gray-700/30 border-2 border-transparent hover:bg-gray-700/50 transition-all duration-300 peer-checked:border-blue-500 peer-checked:bg-blue-600/10 flex flex-col items-center gap-3 group shadow-lg">
            <div class="w-12 h-12 rounded-full bg-gray-700 group-hover:bg-gray-600 flex items-center justify-center transition-colors border border-gray-600">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 0116 6a5 5 0 011 9.9m2.5 3.9a3 3 0 01-3 3H6a3 3 0 01-3-3 3 3 0 013-3h12.5a3 3 0 013 3z" />
              </svg>
            </div>
            <span class="text-lg font-bold text-gray-300 group-hover:text-white transition-colors">File Upload</span>
            <p class="text-xs text-gray-400 text-center">Upload PDF, Images, or Text documents for Gemini to analyze.</p>
          </div>
        </label>

        <label class="relative cursor-pointer">
          <input type="radio" v-model="activeTab" value="inference" class="sr-only peer" />
          <div class="p-6 rounded-xl bg-gray-700/30 border-2 border-transparent hover:bg-gray-700/50 transition-all duration-300 peer-checked:border-blue-500 peer-checked:bg-blue-600/10 flex flex-col items-center gap-3 group shadow-lg">
            <div class="w-12 h-12 rounded-full bg-gray-700 group-hover:bg-gray-600 flex items-center justify-center transition-colors border border-gray-600">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9-9c1.658 0 3 3.582 3 8s-1.342 8-3 8m0-16c-1.658 0-3 3.582-3 8s1.342 8 3 8" />
              </svg>
            </div>
            <span class="text-lg font-bold text-gray-300 group-hover:text-white transition-colors">Website Inference</span>
            <p class="text-xs text-gray-400 text-center">Provide a URL and let Gemini infer the brand identity.</p>
          </div>
        </label>
      </div>

      <!-- Tab Content -->
      <div class="mb-6">
        <!-- File Upload -->
        <div v-if="activeTab === 'upload'">
          <label class="block text-sm font-medium text-gray-300 mb-2">
            Upload Brand Documents (PDF, DOC, Images, etc.)
          </label>
          <input
            type="file"
            multiple
            @change="handleFileChange"
            class="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
          />
          <div v-if="selectedFiles.length > 0" class="mt-2">
            <p class="text-sm text-gray-400">Selected files:</p>
            <ul class="list-disc list-inside text-sm text-gray-300">
              <li v-for="file in selectedFiles" :key="file.name">
                {{ file.name }} ({{ (file.size / 1024 / 1024).toFixed(2) }} MB)
              </li>
            </ul>
          </div>
          <p class="text-xs text-gray-500 mt-2">
            Max 100MB per file. Up to 10 files.
          </p>
        </div>



        <!-- Website Inference -->
        <div v-if="activeTab === 'inference'">
          <label class="block text-sm font-medium text-gray-300 mb-2">
            Customer Website URL
          </label>
          <input
            v-model="websiteUrl"
            type="url"
            placeholder="https://example.com"
            class="w-full p-2 rounded-md bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      <!-- Action Button -->
      <div class="flex justify-end">
        <button
          @click="processGuidelines"
          :disabled="isProcessing"
          class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-md transition-colors duration-200 disabled:opacity-50"
        >
          <span v-if="isProcessing">Processing...</span>
          <span v-else>Process with Gemini</span>
        </button>
      </div>
    </div>

    <!-- Result Text Box -->
    <div class="bg-gray-800 p-6 rounded-lg">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-bold">Resulting Brand Guidelines</h2>
        <button
          @click="handleSave"
          class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-4 rounded-md transition-colors duration-200"
        >
          Save Guidelines
        </button>
      </div>
      
      <!-- Empty State -->
      <div v-if="!guidelinesText" class="flex flex-col items-center justify-center p-12 bg-gray-700/20 rounded-lg border-2 border-dashed border-gray-600 text-center">
        <div class="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 class="text-lg font-bold text-white mb-2">No Brand Guidelines Yet</h3>
        <p class="text-gray-400 text-sm max-w-sm">Upload brand documents or provide a website URL above, then click "Process with Gemini" to generate your brand guidelines.</p>
      </div>
      
      <!-- Ideal State -->
      <textarea
        v-else
        v-model="guidelinesText"
        rows="10"
        class="w-full p-3 rounded-md bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
        placeholder="The inferred brand guidelines will appear here..."
      ></textarea>
    </div>

    <!-- Unsaved Changes Modal -->
    <div v-if="showLeaveModal" class="fixed inset-0 bg-black/80 flex flex-col justify-center items-center z-50">
      <div class="bg-gray-800 p-6 rounded-xl shadow-2xl border border-gray-700 max-w-md w-full mx-4">
        <h3 class="text-xl font-bold mb-2 text-white">Unsaved Changes</h3>
        <p class="text-gray-400 mb-6">You have unsaved changes in your brand guidelines. Are you sure you want to leave? Any unsaved content will be lost.</p>
        <div class="flex justify-end gap-4">
          <button @click="cancelLeave" class="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-md transition-colors">Stay Here</button>
          <button @click="confirmLeave" class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-colors">Leave & Discard</button>
        </div>
      </div>
    </div>

    <!-- Notification Toast -->
    <div v-if="notification.show" class="fixed top-4 right-4 z-50 max-w-sm w-full">
      <div :class="[
        'p-4 rounded-lg shadow-lg text-white font-medium flex items-center justify-between',
        notification.type === 'success' ? 'bg-green-600' : '',
        notification.type === 'error' ? 'bg-red-600' : '',
        notification.type === 'info' ? 'bg-blue-600' : '',
        notification.type === 'warning' ? 'bg-yellow-600' : '',
      ]">
        <span>{{ notification.message }}</span>
        <button @click="notification.show = false" class="ml-4 text-white/80 hover:text-white">&times;</button>
      </div>
    </div>

    <!-- Loading Overlay -->
    <div v-if="isProcessing" class="fixed inset-0 bg-black/80 flex flex-col justify-center items-center z-50">
      <div class="bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-700 flex flex-col items-center max-w-sm mx-4">
        <!-- Premium Spinner -->
        <div class="relative w-24 h-24 mb-6">
          <!-- Outer ring -->
          <div class="absolute inset-0 border-4 border-blue-500/30 rounded-full"></div>
          <!-- Spinning ring -->
          <div class="absolute inset-0 border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
          <!-- Inner glow or pulse -->
          <div class="absolute inset-4 bg-blue-600/20 rounded-full animate-pulse flex items-center justify-center">
            <span class="text-blue-300 font-bold text-sm">AI</span>
          </div>
        </div>
        <h3 class="text-xl font-bold mb-2 text-white text-center">Extracting Brand Essence</h3>
        <p class="text-gray-400 text-center text-sm">Gemini is analyzing the data and distilling guidelines. This takes a moment to ensure quality...</p>
        <!-- Pulsing dots -->
        <div class="flex gap-2 mt-4">
          <div class="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          <div class="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style="animation-delay: 0.2s"></div>
          <div class="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style="animation-delay: 0.4s"></div>
        </div>
      </div>
    </div>
  </div>
</template>
