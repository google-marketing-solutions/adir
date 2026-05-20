<script setup>
import { uploadBase64Image } from "@/services/gcsService";
import { editImageWithNanoBanana } from "@/services/nanoBananaService";
import { useBrandStore } from "@/stores/brandStore";
import {
  generateTextFromPrompt,
  createCreativeConceptPrompt,
  getCreativeConceptsInstruction,
} from "@/services/vertexAiService";
import { evaluateImage, generateEvaluationRules } from "@/services/evaluationService";
import { useConfigStore } from "@/stores/config";
import { onMounted, ref, watch, computed } from "vue";
const showPrompt = ref(false);

const emit = defineEmits(["generation-complete", "update:loading"]);

const brandStore = useBrandStore();

// Reference Images State
const referenceImages = ref([]); // Array of base64 Data URLs
const imageContextInstructions = ref("");
const showImageModal = ref(false);

const prompt = ref(
  getCreativeConceptsInstruction(
    brandStore.useGuidelinesInGeneration ? brandStore.guidelines : undefined,
    referenceImages.value,
    imageContextInstructions.value
  )
);

watch(
  [
    () => brandStore.guidelines,
    () => brandStore.useGuidelinesInGeneration,
    referenceImages,
    imageContextInstructions,
  ],
  ([newGuidelines, useGuidelines, newImages, newInstructions]) => {
    prompt.value = getCreativeConceptsInstruction(
      useGuidelines ? newGuidelines : undefined,
      newImages,
      newInstructions
    );
  },
  { deep: true }
);

const useGemini = ref(true);
const creativeConcepts = ref([{ name: "", description: "" }]);
const customerId = useConfigStore().customerID;
const storageKey = `creativeConcepts_${customerId}`;

const handleFileSelect = (event) => {
  const files = event.target.files;
  if (!files) return;
  loadFiles(files);
};

const handleDrop = (event) => {
  const files = event.dataTransfer.files;
  if (!files) return;
  loadFiles(files);
};

const loadFiles = (files) => {
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!file.type.startsWith("image/")) continue;

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        referenceImages.value.push(e.target.result);
      }
    };
    reader.readAsDataURL(file);
  }
};

const removeImage = (index) => {
  referenceImages.value.splice(index, 1);
};

onMounted(() => {
  const savedConcepts = localStorage.getItem(storageKey);
  if (savedConcepts) {
    creativeConcepts.value = JSON.parse(savedConcepts);
  }
});

watch(
  creativeConcepts,
  (newConcepts) => {
    localStorage.setItem(storageKey, JSON.stringify(newConcepts));
  },
  { deep: true }
);
const aspectRatios = ref([
  { label: "Square (1:1)", ratio: "1:1", count: 1 },
  { label: "Portrait (9:16)", ratio: "9:16", count: 0 },
  { label: "Landscape (16:9)", ratio: "16:9", count: 0 },
]);
const isLoading = ref(false);
const loadingStatus = ref("");
const isGeneratingRules = ref(false);
const rulesErrorMessage = ref("");
const configStore = useConfigStore();
const errorMessage = ref("");

const generationLogs = ref([]);
const showDetailedLogs = ref(false);

const uniqueLogIds = computed(() => {
  return [...new Set(generationLogs.value.map((log) => log.id))];
});

const getLogsForId = (id) => {
  return generationLogs.value.filter((log) => log.id === id);
};

const getStatusColorClass = (status) => {
  switch (status) {
    case "generating":
      return "bg-blue-900/50 text-blue-300 border border-blue-800/50";
    case "evaluating":
      return "bg-yellow-900/50 text-yellow-300 border border-yellow-800/50";
    case "approved":
      return "bg-green-900/50 text-green-300 border border-green-800/50";
    case "rejected":
      return "bg-orange-900/50 text-orange-300 border border-orange-800/50";
    case "failed":
      return "bg-red-900/50 text-red-300 border border-red-800/50";
    default:
      return "bg-gray-800 text-gray-300";
  }
};

const addCreativeConcept = () => {
  creativeConcepts.value.push({ name: "", description: "" });
};

const removeCreativeConcept = (index) => {
  creativeConcepts.value.splice(index, 1);
};

const handlePaste = (event, index) => {
  const pastedText = event.clipboardData.getData("text");
  const lines = pastedText.split("\n").filter((line) => line.trim() !== "");

  // Only intervene if multiple lines are pasted
  if (lines.length > 1) {
    event.preventDefault();

    const pastedConcepts = lines.map((line) => {
      const tabIndex = line.indexOf("\t");
      if (tabIndex !== -1) {
        return {
          name: line.substring(0, tabIndex),
          description: line.substring(tabIndex + 1),
        };
      }
      return { name: "", description: line };
    });

    // Replace the current empty concept if it's the only one
    if (
      creativeConcepts.value.length === 1 &&
      !creativeConcepts.value[0].name &&
      !creativeConcepts.value[0].description
    ) {
      creativeConcepts.value = pastedConcepts;
    } else {
      // Update the current row with the first line of pasted data
      const firstPasted = pastedConcepts.shift();
      creativeConcepts.value[index].name = firstPasted.name;
      creativeConcepts.value[index].description = firstPasted.description;

      // Insert the rest of the pasted concepts as new rows
      if (pastedConcepts.length > 0) {
        creativeConcepts.value.splice(index + 1, 0, ...pastedConcepts);
      }
    }
  }
  // If only one line is pasted, do nothing and let the default paste behavior occur.
};

const generateRules = async () => {
  isGeneratingRules.value = true;
  rulesErrorMessage.value = "";
  try {
    // Combine base prompt and all concept descriptions to give full context for rule generation
    const conceptsText = creativeConcepts.value
      .map((c) => `${c.name ? c.name + ': ' : ''}${c.description}`)
      .filter(Boolean)
      .join("\n");
    
    const fullPromptContext = `${prompt.value}\n\nCreative Concepts:\n${conceptsText}`;
    
    const generated = await generateEvaluationRules(
      fullPromptContext,
      configStore.brandGuidelines
    );
    configStore.evaluationRules = generated;
  } catch (error) {
    rulesErrorMessage.value =
      error.message || "Failed to generate evaluation rules. Please try again.";
    console.error("Error generating rules:", error);
  } finally {
    isGeneratingRules.value = false;
  }
};

const handleGenerate = async () => {
  isLoading.value = true;
  loadingStatus.value = "Starting generation...";
  generationLogs.value = []; // Clear previous logs
  showDetailedLogs.value = false; // Reset collapse state
  emit("update:loading", true);

  try {
    errorMessage.value = "";

    const conceptPromises = creativeConcepts.value.map(async (concept) => {
      let imagePrompt = prompt.value;

      if (useGemini.value) {
        imagePrompt = await createCreativeConceptPrompt(
          prompt.value,
          concept.description,
          configStore.geminiModel,
          referenceImages.value,
          brandStore.useGuidelinesInGeneration ? brandStore.guidelines : undefined
        );
      } else if (concept.description) {
        // If not using Gemini, at least append the concept description to the base prompt
        imagePrompt = `${prompt.value}\n\nCreative Concept: ${concept.description}`;
      }

      // Append context instructions if reference images are used
      if (referenceImages.value.length > 0 && imageContextInstructions.value) {
        imagePrompt += `\n\nInstructions for using the attached reference images:\n${imageContextInstructions.value}`;
      }

      const arPromises = aspectRatios.value.map(async (ar) => {
        if (ar.count <= 0) return [];

        const generationPromises = [];
        for (let i = 0; i < ar.count; i++) {
          const imageId = `${concept.name || "Default"}: AR ${ar.ratio} (#${i + 1})`;
          // Append aspect ratio to prompt to guide Nano Banana
          const promptWithAr = `${imagePrompt}\n\nGenerate the image with an aspect ratio of ${ar.ratio}.`;

          const genPromise = (async () => {
            try {
              let currentPrompt = promptWithAr;
              let approved = false;
              let attempts = 0;
              const maxRetries = configStore.enableEvaluation ? configStore.maxEvaluationRetries : 1;
              let generatedBase64 = "";
              let evaluationFeedback = "";

              const addLog = (status, message, feedback) => {
                generationLogs.value.push({
                  id: imageId,
                  attempt: attempts,
                  status,
                  message,
                  feedback
                });
              };

              while (attempts < maxRetries && !approved) {
                attempts++;
                if (configStore.enableEvaluation) {
                  loadingStatus.value = `Generating images (Attempt ${attempts}/${maxRetries})...`;
                  addLog('generating', `Generating image...`);
                } else {
                  loadingStatus.value = "Generating images...";
                  addLog('generating', "Generating image...");
                }

                // Refine prompt if we have feedback
                if (evaluationFeedback) {
                  currentPrompt = `${promptWithAr}\n\nRefinement Feedback from previous attempt: ${evaluationFeedback}`;
                  console.log(`[Evaluation] Refining prompt for attempt ${attempts} with feedback: ${evaluationFeedback}`);
                }

                generatedBase64 = await editImageWithNanoBanana(
                  referenceImages.value,
                  currentPrompt
                );

                if (configStore.enableEvaluation) {
                  addLog('evaluating', `Evaluating image...`);
                  
                  const evalResult = await evaluateImage(
                    generatedBase64,
                    currentPrompt,
                    configStore.brandGuidelines,
                    configStore.evaluationRules
                  );

                  approved = evalResult.approved;
                  evaluationFeedback = evalResult.feedback;

                  if (approved) {
                    addLog('approved', `Image approved!`, evaluationFeedback || "Meets all guidelines.");
                  } else {
                    addLog('rejected', `Image rejected (Attempt ${attempts}/${maxRetries})`, evaluationFeedback);
                  }
                } else {
                  approved = true; // If evaluation is disabled, we just approve it immediately
                  addLog('approved', `Image generated successfully.`);
                }
              }

              if (configStore.enableEvaluation && !approved) {
                addLog('failed', `Failed to generate approved image after ${maxRetries} attempts. Using last generation.`, evaluationFeedback);
              }

              const dataUrl = "data:image/png;base64," + generatedBase64;
              const gcsPath = concept.name
                ? `${configStore.customerID}/Creative Concepts/${concept.name}/GENERATED/`
                : `${configStore.customerID}/Creative Concepts/GENERATED/`;
              const gcsFileName = `${gcsPath}${Date.now()}_${i}_${Math.random().toString(36).slice(2, 7)}.png`;
              return await uploadBase64Image(gcsFileName, dataUrl);
            } catch (e) {
              console.error("Error in image generation/evaluation loop:", e);
              throw e;
            }
          })();
          generationPromises.push(genPromise);
        }

        return await Promise.all(generationPromises);
      });

      const imagesFromConcept = await Promise.all(arPromises);
      return imagesFromConcept.flat();
    });

    const results = await Promise.all(conceptPromises);
    const generatedImages = results.flat();

    emit("generation-complete", generatedImages);
  } catch (error) {
    errorMessage.value =
      error.message ||
      "An error occurred during image generation. Please try again.";
    console.error("Error generating images:", error);
  } finally {
    isLoading.value = false;
    loadingStatus.value = "";
    emit("update:loading", false);
  }
};
</script>

<template>
  <div class="flex flex-col gap-4">
    <button
      @click="showPrompt = !showPrompt"
      class="text-left text-cyan-400 hover:text-cyan-500 font-bold text-lg border border-cyan-400 rounded-md p-2"
    >
      {{ showPrompt ? "Hide" : "Click here to Show/Edit the" }} Creative Concepts
      Prompt
    </button>
    <textarea
      v-if="showPrompt"
      v-model="prompt"
      placeholder="The default prompt is set. Add your creative vision description here."
      class="bg-gray-700 rounded-md p-2 w-full"
      rows="3"
    ></textarea>

    <div class="form-control">
      <label class="label">
        <span class="label-text font-bold"
          >Add your creative concepts here. Creative concepts will be added at
          the end of the prompt</span
        >
      </label>
    </div>
    <div
      v-for="(concept, index) in creativeConcepts"
      :key="index"
      class="flex gap-4 items-center"
    >
      <button
        @click="removeCreativeConcept(index)"
        class="text-red-500 hover:text-red-700 font-bold w-6"
        :disabled="index === 0"
        :class="{ 'opacity-0 cursor-default': index === 0 }"
      >
        X
      </button>
      <input
        v-model="concept.name"
        placeholder="Creative Concept Name"
        class="bg-gray-700 rounded-md p-2 w-1/2"
      />
      <textarea
        v-model="concept.description"
        @paste="handlePaste($event, index)"
        placeholder="Creative Concept Description"
        class="bg-gray-700 rounded-md p-2 w-1/2"
        rows="1"
      ></textarea>
    </div>

    <div class="flex gap-4">
      <button
        @click="addCreativeConcept"
        class="bg-cyan-600 text-white font-bold py-2 px-6 rounded-md hover:bg-cyan-700 self-start"
      >
        + Add Creative Concept
      </button>
      <button
        @click="showImageModal = true"
        class="bg-gray-700 text-white font-bold py-2 px-6 rounded-md hover:bg-gray-600 border border-gray-600 self-start flex items-center gap-2"
      >
        <span class="material-symbols-outlined text-sm">image</span>
        Configure Reference Images
        <span v-if="referenceImages.length > 0" class="bg-cyan-600 text-white text-xs rounded-full px-2 py-0.5">
          {{ referenceImages.length }}
        </span>
      </button>
    </div>

    <div class="form-control">
      <label class="label cursor-pointer">
        <span class="label-text">Use Gemini to improve prompt</span>
        <input type="checkbox" v-model="useGemini" class="checkbox" />
      </label>
    </div>

    <!-- Evaluation Rules Section -->
    <div v-if="configStore.enableEvaluation" class="border border-gray-700 rounded-md p-4 flex flex-col gap-4 bg-gray-800/30">
      <div class="flex justify-between items-center">
        <h3 class="font-bold text-lg text-gray-200">Evaluation Rules</h3>
        <button
          @click="generateRules"
          type="button"
          class="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-1 px-3 rounded text-sm flex items-center gap-1"
          :disabled="isGeneratingRules"
        >
          <span v-if="isGeneratingRules" class="loading loading-spinner loading-xs"></span>
          {{ isGeneratingRules ? "Generating..." : "Auto-generate Rules 🪄" }}
        </button>
      </div>
      <p class="text-xs text-gray-400">
        These rules will be used by the AI Auditor to evaluate generated images. You can edit them below.
      </p>
      <textarea
        v-model="configStore.evaluationRules"
        placeholder="Click 'Auto-generate Rules' or write your own rules here..."
        class="bg-gray-700 rounded-md p-2 w-full text-white border border-gray-600 focus:border-cyan-400 focus:outline-none"
        rows="4"
      ></textarea>
      <div v-if="rulesErrorMessage" class="text-yellow-500 text-xs">
        {{ rulesErrorMessage }}
      </div>
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

    <!-- Consolidated Loading Status Box (Above the button) -->
    <div v-if="isLoading" class="bg-gray-800/50 border border-gray-700 rounded-md p-4 flex flex-col gap-3">
      <div class="flex justify-between items-center">
        <div class="flex items-center gap-3 text-cyan-400 font-semibold">
          <span class="loading loading-spinner loading-sm"></span>
          <span>{{ loadingStatus || "Generating images..." }}</span>
        </div>
        <button
          v-if="generationLogs.length > 0"
          @click="showDetailedLogs = !showDetailedLogs"
          type="button"
          class="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded border border-gray-600 transition-colors"
        >
          {{ showDetailedLogs ? "Hide Details ▴" : "Show Details ▾" }}
        </button>
      </div>

      <!-- Detailed Logs Timeline -->
      <div v-if="showDetailedLogs" class="mt-2 border-t border-gray-700 pt-3 max-h-60 overflow-y-auto flex flex-col gap-4 text-xs text-gray-300">
        <div v-for="id in uniqueLogIds" :key="id" class="border border-gray-800 rounded p-2 bg-gray-900/50">
          <h4 class="font-bold text-cyan-300 mb-2">{{ id }}</h4>
          <div class="flex flex-col gap-2 pl-2 border-l-2 border-gray-700">
            <div v-for="(log, idx) in getLogsForId(id)" :key="idx" class="flex flex-col gap-1">
              <div class="flex items-center gap-2 flex-wrap">
                <span :class="getStatusColorClass(log.status)" class="font-semibold uppercase text-[9px] px-1.5 py-0.5 rounded">
                  {{ log.status }}
                </span>
                <span class="text-gray-400 font-medium">Attempt {{ log.attempt }}:</span>
                <span>{{ log.message }}</span>
              </div>
              <div v-if="log.feedback" class="mt-1 ml-6 p-2 bg-gray-800 rounded text-gray-400 font-mono whitespace-pre-wrap text-[10px] border border-gray-700/50 leading-relaxed">
                <strong>Feedback:</strong> {{ log.feedback }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <button
      @click="handleGenerate"
      class="bg-cyan-600 text-white font-bold py-2 px-6 rounded-md hover:bg-cyan-700 disabled:bg-gray-800 disabled:text-gray-500 disabled:border-gray-700 disabled:cursor-not-allowed border border-transparent transition-all duration-200"
      :disabled="isLoading"
    >
      Generate Images
    </button>
    <div v-if="errorMessage" class="text-yellow-500 mt-4">
      {{ errorMessage }}
    </div>

    <!-- Reference Images Modal -->
    <div v-if="showImageModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div class="bg-gray-900 rounded-lg p-6 max-w-2xl w-full flex flex-col gap-4 max-h-[90vh] overflow-y-auto border border-gray-700 text-white">
        <h2 class="text-xl font-bold">Configure Reference Images</h2>

        <!-- Upload Zone -->
        <div
          @dragover.prevent
          @drop.prevent="handleDrop"
          @click="$refs.fileInput.click()"
          class="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-cyan-400 transition-colors bg-gray-800/50"
        >
          <p class="text-gray-400">Drag & drop images here or click to browse</p>
          <input
            type="file"
            ref="fileInput"
            multiple
            accept="image/*"
            class="hidden"
            @change="handleFileSelect"
          />
        </div>

        <!-- Thumbnail Preview Grid -->
        <div v-if="referenceImages.length > 0" class="grid grid-cols-4 gap-4 mt-2">
          <div v-for="(img, idx) in referenceImages" :key="idx" class="relative group aspect-square bg-gray-900 rounded-md overflow-hidden border border-gray-700">
            <img :src="img" class="w-full h-full object-cover" />
            <button
              @click="removeImage(idx)"
              class="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity"
            >
              X
            </button>
          </div>
        </div>

        <!-- Context Instructions Text Area -->
        <div class="form-control">
          <label class="label">
            <span class="label-text text-lg font-bold text-gray-200">How should these images be used for context?</span>
          </label>
          <textarea
            v-model="imageContextInstructions"
            placeholder="e.g., Use the style and color palette of Image 1, but use the composition and layout of Image 2."
            class="bg-gray-700 rounded-md p-2 w-full text-white border border-gray-600 focus:border-cyan-400 focus:outline-none"
            rows="4"
          ></textarea>
        </div>

        <!-- Action Buttons -->
        <div class="flex justify-end gap-4 mt-4">
          <button @click="showImageModal = false" class="bg-cyan-600 text-white px-6 py-2 rounded-md hover:bg-cyan-700 font-bold">
            Save & Close
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
