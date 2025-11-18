<script setup>
import { uploadBase64Image } from "@/services/gcsService";
import {
  generateImagesFromPrompt,
  generateTextFromPrompt,
} from "@/services/vertexAiService";
import { useConfigStore } from "@/stores/config";
import { onMounted, ref, watch } from "vue";
const showPrompt = ref(false);

const emit = defineEmits(["generation-complete", "update:loading"]);

const prompt = ref(` # ROLE & GOAL
You are a technical art director and expert prompt engineer. Your specialty is translating a creative director's written vision into a precise, highly-detailed, and technically optimized prompt for advanced AI image generation models like Imagen.Your task is to read the following creative vision description and translate it into a single, comprehensive image generation prompt.
You must meticulously extract all the key details from the description: the subject, setting, action, mood, lighting style, and color palette. Synthesize these details into a keyword-rich, comma-separated string optimized for a photorealistic output.
Your generated prompt must also contain a clear negative constraint to ensure that no brand logos, identifiable brand marks, or website URLs appear in the image. The image should by realistic, looking like it was taken in real life.
A critical part of your task involves handling the text overlay conditionally:
If you find a line at the end of the description that starts with Text:, you must incorporate that exact text into your prompt as a clean, modern, and prominent overlay on the image. The text can have a colored background.
If there is no line that starts with Text:, do not include any instructions for adding text. The final visual should be completely text-free.  **Make sure to follow these guidlines: ** 1.Make the product the primary focal point of the image.
2. Generate a single, cohesive scene; do not create a collage.
3. The background must be simple and uncluttered to avoid distraction.
4. Place any text in empty space, not on top of the main subject.
5. Use lighting that is natural for the environment and clearly illuminates the subject.
6. The setting should be directly relevant to the product's use or target audience.
*Your entire output must be ONLY the final image generation prompt. Do not add any conversational text, titles, or explanations.*
Here is the creative vision description:
`);
const useGemini = ref(true);
const creativeConcepts = ref([{ name: "", description: "" }]);
const customerId = useConfigStore().customerID;
const storageKey = `creativeConcepts_${customerId}`;

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
  const generatedImages = [];
  try {
    errorMessage.value = "";
    for (const concept of creativeConcepts.value) {
      let imagePrompt = prompt.value;
      if (useGemini.value) {
        const geminiPrompt = `You are a prompt engineer and your job is to provide the best short prompt to generate an image for a digital campaign. Given the following text, provide the optimal Generative AI prompt to generate a realistic style image to be used in an ad of a digital campaign that will best illustrate the concepts defined by the text. Please return only the prompt and start the prompt with "a photo of". Here is the text: ${prompt.value} ${concept.description ? "and the creative concept: " + concept.description : ""}`;
        imagePrompt = await generateTextFromPrompt(
          geminiPrompt,
          configStore.geminiModel,
        );
      }

      for (const ar of aspectRatios.value) {
        if (ar.count > 0) {
          const base64Images = await generateImagesFromPrompt(
            imagePrompt,
            ar.ratio,
            ar.count,
            configStore.imageGenModel,
          );

          const uploadPromises = base64Images.map((base64String) => {
            const dataUrl = "data:image/png;base64," + base64String;
            const gcsPath = concept.name
              ? `${configStore.customerID}/Creative Concepts/${concept.name}/GENERATED/`
              : `${configStore.customerID}/Creative Concepts/GENERATED/`;
            const gcsFileName = `${gcsPath}${Date.now()}.png`;
            return uploadBase64Image(gcsFileName, dataUrl);
          });

          const uploadedImageUris = await Promise.all(uploadPromises);
          generatedImages.push(...uploadedImageUris);
        }
      }
    }
    emit("generation-complete", generatedImages);
  } catch (error) {
    errorMessage.value = "An error occurred during image generation. Please try again.";
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

    <button
      @click="addCreativeConcept"
      class="bg-cyan-600 text-white font-bold py-2 px-6 rounded-md hover:bg-cyan-700 self-start"
    >
      + Add Creative Concept
    </button>

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
  </div>
</template>
