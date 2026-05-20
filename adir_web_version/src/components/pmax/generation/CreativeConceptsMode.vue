<script setup>
import { uploadBase64Image } from "@/services/gcsService";
import { editImageWithNanoBanana } from "@/services/nanoBananaService";
import { useBrandStore } from "@/stores/brandStore";
import {
  generateTextFromPrompt,
  createCreativeConceptPrompt,
  getCreativeConceptsInstruction,
} from "@/services/vertexAiService";
import { useConfigStore } from "@/stores/config";
import { onMounted, ref, watch } from "vue";
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
const configStore = useConfigStore();
const errorMessage = ref("");

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

const handleGenerate = async () => {
  isLoading.value = true;
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
          // Append aspect ratio to prompt to guide Nano Banana
          const promptWithAr = `${imagePrompt}\n\nGenerate the image with an aspect ratio of ${ar.ratio}.`;

          const genPromise = (async () => {
            try {
              const generatedBase64 = await editImageWithNanoBanana(
                referenceImages.value,
                promptWithAr
              );

              const dataUrl = "data:image/png;base64," + generatedBase64;
              const gcsPath = concept.name
                ? `${configStore.customerID}/Creative Concepts/${concept.name}/GENERATED/`
                : `${configStore.customerID}/Creative Concepts/GENERATED/`;
              const gcsFileName = `${gcsPath}${Date.now()}_${i}_${Math.random().toString(36).slice(2, 7)}.png`;
              return await uploadBase64Image(gcsFileName, dataUrl);
            } catch (e) {
              console.error("Error generating image with Nano Banana:", e);
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
