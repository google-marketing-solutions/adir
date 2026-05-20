<script setup>
import { uploadBase64Image } from "@/services/gcsService";
import { editImageWithNanoBanana } from "@/services/nanoBananaService";
import { useBrandStore } from "@/stores/brandStore";
import {
  generateTextFromPrompt,
  createCreativeConceptPrompt,
  getCreativeConceptsInstruction,
  extractBrandGuidelines,
  generateCharacterPrompts,
} from "@/services/vertexAiService";
import { evaluateImage, generateEvaluationRules } from "@/services/evaluationService";
import { useConfigStore } from "@/stores/config";
import { onMounted, ref, watch, computed, nextTick } from "vue";
import LoadingSpinner from "@/components/LoadingSpinner.vue";
const showPrompt = ref(false);

const emit = defineEmits(["generation-complete", "update:loading"]);

const brandStore = useBrandStore();

// Reference Images State
const referenceImages = ref([]); // Array of base64 Data URLs
const imageContextInstructions = ref("");
const showImageModal = ref(false);

// Brand Guidelines Modal State
const showBrandGuidelinesModal = ref(false);
const guidelinesActiveTab = ref("upload");
const guidelinesText = ref(brandStore.guidelines);
const selectedBrandFiles = ref([]);
const websiteUrl = ref("");
const isProcessingGuidelines = ref(false);
const brandNotification = ref({ show: false, message: "", type: "info" });

// Sync guidelines textarea when modal opens
watch(showBrandGuidelinesModal, (isOpen) => {
  if (isOpen) {
    guidelinesText.value = brandStore.guidelines;
  }
});

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
const uniqueId = () => Math.random().toString(36).substring(2, 9);
const creativeConcepts = ref([{ id: uniqueId(), name: "", description: "" }]);
const isGeneratingCharacters = ref(false);
const customerId = useConfigStore().customerID;
const storageKey = `creativeConcepts_${customerId}`;
const namingTimers = {};

const adjustAllTextareas = () => {
  nextTick(() => {
    const textareas = document.querySelectorAll(".concept-textarea");
    textareas.forEach((textarea) => {
      if (textarea) {
        textarea.style.height = "auto";
        textarea.style.height = textarea.scrollHeight + "px";
      }
    });
  });
};

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
    try {
      const parsed = JSON.parse(savedConcepts);
      if (Array.isArray(parsed) && parsed.length > 0) {
        creativeConcepts.value = parsed.map((c) => ({
          id: c.id || uniqueId(),
          name: c.name || "",
          description: c.description || "",
        }));

        // Ensure there is at least one concept, and the last one is empty
        const lastConcept = creativeConcepts.value[creativeConcepts.value.length - 1];
        if (lastConcept.description.trim() !== "") {
          creativeConcepts.value.push({ id: uniqueId(), name: "", description: "" });
        }
        adjustAllTextareas();
        return;
      }
    } catch (e) {
      console.error("Failed to parse saved creative concepts:", e);
    }
  }
  creativeConcepts.value = [{ id: uniqueId(), name: "", description: "" }];
  adjustAllTextareas();
});

watch(
  creativeConcepts,
  (newConcepts) => {
    localStorage.setItem(storageKey, JSON.stringify(newConcepts));
  },
  { deep: true }
);
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

const generateConceptName = async (concept) => {
  const modelId = configStore.geminiModel || "gemini-1.5-flash";
  const promptText = `Based on the following description of a creative concept, generate a very concise, descriptive, and catchy name.
The name must be at most 3 words.
Do not use any punctuation, quotation marks, or extra text.
Return ONLY the name itself, nothing else.

Description: "${concept.description}"`;

  try {
    const generatedName = await generateTextFromPrompt(promptText, modelId);
    if (concept.description.trim() !== "") {
      if (generatedName) {
        concept.name = generatedName.trim().replace(/["']/g, "");
      } else {
        concept.name = "Concept";
      }
    }
  } catch (error) {
    console.error("Error generating concept name:", error);
    if (concept.description.trim() !== "") {
      concept.name = "Concept";
    }
  }
};

const triggerAutoNaming = (concept) => {
  if (namingTimers[concept.id]) {
    clearTimeout(namingTimers[concept.id]);
    delete namingTimers[concept.id];
  }

  if (!concept.description.trim()) {
    concept.name = "";
    return;
  }

  namingTimers[concept.id] = setTimeout(async () => {
    await generateConceptName(concept);
  }, 5000);
};

const onDescriptionInput = (event, index) => {
  const concept = creativeConcepts.value[index];

  // Auto-expand the target textarea height
  if (event?.target) {
    event.target.style.height = "auto";
    event.target.style.height = event.target.scrollHeight + "px";
  }

  // 1. If we are typing in the last concept, auto-append a new empty one
  if (index === creativeConcepts.value.length - 1 && concept.description.trim() !== "") {
    creativeConcepts.value.push({
      id: uniqueId(),
      name: "",
      description: "",
    });
  }

  // Immediately update concept name if description is not empty
  if (concept.description.trim() !== "") {
    concept.name = "[generating a name for you...]";
  } else {
    concept.name = "";
  }

  // 2. Handle debounced AI concept naming
  triggerAutoNaming(concept);
};

const removeCreativeConcept = (index) => {
  const concept = creativeConcepts.value[index];
  if (namingTimers[concept.id]) {
    clearTimeout(namingTimers[concept.id]);
    delete namingTimers[concept.id];
  }
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
      let name = "";
      let description = line;
      if (tabIndex !== -1) {
        name = line.substring(0, tabIndex);
        description = line.substring(tabIndex + 1);
      }
      return { id: uniqueId(), name, description };
    });

    // Replace the current empty concept if it's the only one
    if (
      creativeConcepts.value.length === 1 &&
      !creativeConcepts.value[0].name &&
      !creativeConcepts.value[0].description
    ) {
      creativeConcepts.value = [...pastedConcepts, { id: uniqueId(), name: "", description: "" }];
    } else {
      // Update the current row with the first line of pasted data
      const firstPasted = pastedConcepts.shift();
      creativeConcepts.value[index].name = firstPasted.name;
      creativeConcepts.value[index].description = firstPasted.description;

      // Insert the rest of the pasted concepts as new rows
      if (pastedConcepts.length > 0) {
        creativeConcepts.value.splice(index + 1, 0, ...pastedConcepts);
      }

      // If the last one is now non-empty, ensure we have a trailing empty concept
      const lastConcept = creativeConcepts.value[creativeConcepts.value.length - 1];
      if (lastConcept.description.trim() !== "") {
        creativeConcepts.value.push({ id: uniqueId(), name: "", description: "" });
      }
    }

    // Trigger auto-naming for newly pasted empty-name concepts
    creativeConcepts.value.forEach((c) => {
      if (!c.name && c.description.trim()) {
        c.name = "[generating a name for you...]";
        triggerAutoNaming(c);
      }
    });

    adjustAllTextareas();
  }
};

const handleBrandFileChange = (event) => {
  selectedBrandFiles.value = Array.from(event.target.files);
};

const brandFileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = (error) => reject(error);
  });
};

const showBrandNotification = (message, type = "info") => {
  brandNotification.value = { show: true, message, type };
  setTimeout(() => {
    brandNotification.value.show = false;
  }, 3000);
};

const processGuidelines = async () => {
  isProcessingGuidelines.value = true;
  try {
    const modelId = configStore.geminiModel || "gemini-1.5-flash";
    let result = "";

    if (guidelinesActiveTab.value === "upload") {
      if (selectedBrandFiles.value.length === 0) {
        showBrandNotification("Please select at least one file.", "warning");
        return;
      }
      const file = selectedBrandFiles.value[0];
      const base64Data = await brandFileToBase64(file);
      const fileData = { mimeType: file.type, data: base64Data };
      const prompt = "Extract brand guidelines from this file. Focus on color palette, typography, and visual style. Do NOT include any introductory or concluding text. Start directly with the guidelines.";
      result = await extractBrandGuidelines(prompt, modelId, false, fileData);
    } else if (guidelinesActiveTab.value === "inference") {
      if (!websiteUrl.value) {
        showBrandNotification("Please enter a website URL.", "warning");
        return;
      }
      const prompt = `Analyze the website ${websiteUrl.value} and infer its brand guidelines. Focus on color palette, typography, tone of voice, and visual style based on the site content. Do NOT include any introductory or concluding text. Start directly with the guidelines.`;
      result = await extractBrandGuidelines(prompt, modelId, true);
    }

    if (result) {
      guidelinesText.value = result;
      brandStore.setGuidelines(result);
      showBrandNotification("Guidelines inferred and saved!", "success");
    } else {
      showBrandNotification("No guidelines could be extracted.", "warning");
    }
  } catch (error) {
    console.error("Error processing guidelines:", error);
    showBrandNotification("Failed to process guidelines.", "error");
  } finally {
    isProcessingGuidelines.value = false;
  }
};

const handleSaveGuidelines = () => {
  brandStore.setGuidelines(guidelinesText.value);
  showBrandNotification("Guidelines saved!", "success");
};

const generateRules = async () => {
  isGeneratingRules.value = true;
  rulesErrorMessage.value = "";
  try {
    // Filter for non-empty concepts
    const activeConcepts = creativeConcepts.value.filter((c) => c.description.trim() !== "");
    const conceptsText = activeConcepts
      .map((c) => `${c.name ? c.name + ': ' : ''}${c.description}`)
      .join("\n");

    const fullPromptContext = `${prompt.value}\n\nCreative Concepts:\n${conceptsText}`;

    const generated = await generateEvaluationRules(
      fullPromptContext,
      brandStore.guidelines,
      referenceImages.value,
      imageContextInstructions.value
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

const handleGenerateCharacters = async () => {
  isGeneratingCharacters.value = true;
  isLoading.value = true;
  emit("update:loading", true);
  emit("update:loading-message", "Ideating 3 distinct character concepts with Gemini...");

  try {
    errorMessage.value = "";

    const charPrompts = await generateCharacterPrompts(
      prompt.value,
      configStore.geminiModel,
      brandStore.useGuidelinesInGeneration ? brandStore.guidelines : undefined
    );

    emit("update:loading-message", "Generating character reference images with Imagen...");
    for (let i = 0; i < charPrompts.length; i++) {
      emit("update:loading-message", `Generating character portrait #${i + 1} of 3...`);
      const generatedBase64 = await editImageWithNanoBanana(
        [],
        charPrompts[i],
        "1:1"
      );
      const dataUrl = "data:image/png;base64," + generatedBase64;
      referenceImages.value.push(dataUrl);

      const gcsFileName = `${configStore.customerID}/Creative Concepts/Characters/char_${Date.now()}_${i}.png`;
      await uploadBase64Image(gcsFileName, dataUrl);
    }

    // Tell Gemini to use these newly generated reference images
    const instructionPrompt = "Ensure the main campaign assets feature the generated character reference portraits consistently.";
    if (!imageContextInstructions.value.includes(instructionPrompt)) {
      imageContextInstructions.value = imageContextInstructions.value
        ? `${imageContextInstructions.value.trim()}\n\n${instructionPrompt}`
        : instructionPrompt;
    }

    // Automatically open the Reference Images modal to let the user review
    showImageModal.value = true;
  } catch (error) {
    errorMessage.value = error.message || "Failed to generate characters.";
    console.error("Error generating characters:", error);
  } finally {
    isLoading.value = false;
    isGeneratingCharacters.value = false;
    emit("update:loading", false);
  }
};

const handleGenerate = async () => {
  const activeConcepts = creativeConcepts.value.filter((c) => c.description.trim() !== "");
  if (activeConcepts.length === 0) {
    errorMessage.value = "Please describe at least one concept before generating.";
    return;
  }

  isLoading.value = true;
  loadingStatus.value = "Starting generation...";
  generationLogs.value = []; // Clear previous logs
  showDetailedLogs.value = false; // Reset collapse state
  emit("update:loading", true);
  emit("update:loading-message", "Analyzing concepts with Gemini...");

  try {
    errorMessage.value = "";

    const conceptPromises = activeConcepts.map(async (concept) => {
      let imagePrompt = prompt.value;

      if (useGemini.value) {
        emit("update:loading-message", "Generating detailed image prompt with Gemini...");
        imagePrompt = await createCreativeConceptPrompt(
          prompt.value,
          concept.description,
          configStore.geminiModel,
          referenceImages.value,
          brandStore.useGuidelinesInGeneration ? brandStore.guidelines : undefined
        );
      } else if (concept.description) {
        imagePrompt = `${prompt.value}\n\nCreative Concept: ${concept.description}`;
      }

      if (referenceImages.value.length > 0 && imageContextInstructions.value) {
        imagePrompt += `\n\nInstructions for using the attached reference images:\n${imageContextInstructions.value}`;
      }

      emit("update:loading-message", "Generating images with Imagen...");
      const arPromises = aspectRatios.value.map(async (ar) => {
        if (ar.count <= 0) return [];

        const generationPromises = [];
        for (let i = 0; i < ar.count; i++) {
          const imageId = `${concept.name || "Default"}: AR ${ar.ratio} (#${i + 1})`;

          const genPromise = (async () => {
            try {
              let currentPrompt = imagePrompt;
              let approved = false;
              let attempts = 0;
              const maxRetries = configStore.enableEvaluation ? configStore.maxEvaluationRetries : 1;
              let generatedBase64 = "";
              let evaluationFeedback = "";

              const addLog = (status, message, feedback, imageBase64 = "") => {
                generationLogs.value.push({
                  id: imageId,
                  attempt: attempts,
                  status,
                  message,
                  feedback,
                  imageBase64
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
                  currentPrompt = `${imagePrompt}\n\nRefinement Feedback from previous attempt: ${evaluationFeedback}`;
                  console.log(`[Evaluation] Refining prompt for attempt ${attempts} with feedback: ${evaluationFeedback}`);
                }

                let finalPrompt = currentPrompt;
                if (brandStore.useGuidelinesInGeneration && brandStore.guidelines) {
                  finalPrompt += `\n\nYou MUST strictly follow these Brand Guidelines:\n${brandStore.guidelines}`;
                }
                if (configStore.enableEvaluation && configStore.evaluationRules) {
                  finalPrompt += `\n\nYou MUST strictly adhere to these Image Constraints/Rules:\n${configStore.evaluationRules}`;
                }

                generatedBase64 = await editImageWithNanoBanana(
                  referenceImages.value,
                  finalPrompt,
                  ar.ratio
                );

                if (configStore.enableEvaluation) {
                  addLog('evaluating', `Evaluating image...`);

                  const evalResult = await evaluateImage(
                    generatedBase64,
                    currentPrompt,
                    brandStore.guidelines,
                    configStore.evaluationRules
                  );

                  approved = evalResult.approved;
                  evaluationFeedback = evalResult.feedback;

                  if (approved) {
                    addLog('approved', `Image approved!`, evaluationFeedback || "Meets all guidelines.", generatedBase64);
                  } else {
                    addLog('rejected', `Image rejected (Attempt ${attempts}/${maxRetries})`, evaluationFeedback, generatedBase64);
                  }
                } else {
                  approved = true; // If evaluation is disabled, we just approve it immediately
                  addLog('approved', `Image generated successfully.`, "", generatedBase64);
                }
              }

              if (configStore.enableEvaluation && !approved) {
                addLog('failed', `Failed to generate approved image after ${maxRetries} attempts. Using last generation.`, evaluationFeedback, generatedBase64);
              }

              const gcsFileName = `${gcsPath}${Date.now()}_${i}_${ar.ratio.replace(":", "-")}_${Math.random().toString(36).slice(2, 7)}.png`;
              const gcsUri = await uploadBase64Image(gcsFileName, dataUrl);

              return {
                id: `${concept.id}_${ar.ratio}_${i}_${Date.now()}`,
                gcsUri,
                conceptId: concept.id,
                conceptName: concept.name || "Concept",
                conceptDescription: concept.description,
                prompt: currentPrompt,
                aspectRatio: ar.ratio,
                status: "pending",
                feedback: "",
                attempt: attempts,
              };
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

const regenerateImages = async (rejectedImages) => {
  isLoading.value = true;
  loadingStatus.value = "Regenerating rejected images...";
  generationLogs.value = []; // Clear previous logs
  showDetailedLogs.value = false;
  emit("update:loading", true);
  emit("update:loading-message", "Regenerating rejected images...");

  try {
    errorMessage.value = "";

    const regenerationPromises = rejectedImages.map(async (img) => {
      const concept = creativeConcepts.value.find((c) => c.id === img.conceptId) || {
        id: img.conceptId,
        name: img.conceptName,
        description: img.conceptDescription
      };

      const refinedPrompt = img.feedback?.trim()
        ? `${img.prompt}\n\nUser Rejection Feedback: ${img.feedback}`
        : img.prompt;
      const imageId = `${img.conceptName || "Default"}: AR ${img.aspectRatio} (Regen #${img.attempt + 1})`;

      const addLog = (status, message, feedback, imageBase64 = "") => {
        generationLogs.value.push({
          id: imageId,
          attempt: img.attempt + 1,
          status,
          message,
          feedback,
          imageBase64
        });
      };

      addLog('generating', `Regenerating image with feedback: ${img.feedback}`);

      let finalPrompt = refinedPrompt;
      if (brandStore.useGuidelinesInGeneration && brandStore.guidelines) {
        finalPrompt += `\n\nYou MUST strictly follow these Brand Guidelines:\n${brandStore.guidelines}`;
      }
      if (configStore.enableEvaluation && configStore.evaluationRules) {
        finalPrompt += `\n\nYou MUST strictly adhere to these Image Constraints/Rules:\n${configStore.evaluationRules}`;
      }

      const generatedBase64 = await editImageWithNanoBanana(
        referenceImages.value,
        finalPrompt,
        img.aspectRatio
      );

      addLog('approved', `Image regenerated successfully.`, "", generatedBase64);

      const dataUrl = "data:image/png;base64," + generatedBase64;
      const gcsPath = concept.name
        ? `${configStore.customerID}/Creative Concepts/${concept.name}/GENERATED/`
        : `${configStore.customerID}/Creative Concepts/GENERATED/`;
      const gcsFileName = `${gcsPath}${Date.now()}_regen_${Math.random().toString(36).slice(2, 7)}.png`;
      const gcsUri = await uploadBase64Image(gcsFileName, dataUrl);

      return {
        ...img,
        gcsUri,
        prompt: refinedPrompt,
        status: "pending",
        feedback: "",
        attempt: img.attempt + 1,
      };
    });

    const regeneratedImages = await Promise.all(regenerationPromises);
    return regeneratedImages;
  } catch (error) {
    errorMessage.value =
      error.message ||
      "An error occurred during image regeneration. Please try again.";
    console.error("Error regenerating images:", error);
    throw error;
  } finally {
    isLoading.value = false;
    loadingStatus.value = "";
    emit("update:loading", false);
  }
};

defineExpose({ regenerateImages });

</script>

<template>
  <div class="flex flex-col gap-6">
    <button
      @click="showPrompt = !showPrompt"
      class="text-left text-[var(--color-interactive-primary)] hover:text-[var(--color-interactive-hover)] font-bold text-lg border border-[var(--color-interactive-primary)] rounded-md p-2 transition-colors"
    >
      {{ showPrompt ? "Hide" : "Click here to Show/Edit the" }} Creative Concepts Prompt
    </button>
    <textarea
      v-if="showPrompt"
      v-model="prompt"
      placeholder="The default prompt is set. Add your creative vision description here."
      class="bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] rounded-md p-3 w-full border border-transparent focus:border-[var(--color-interactive-focus)] focus:outline-none"
      rows="5"
    ></textarea>

    <div class="form-control">
      <label class="label">
        <span class="label-text font-bold text-[var(--color-text-primary)]"
          >Add your creative concepts here. Creative concepts will be added at
          the end of the prompt</span
        >
      </label>
    </div>

    <div class="flex flex-col gap-6">
      <div
        v-for="(concept, index) in creativeConcepts"
        :key="concept.id"
        class="group relative flex items-start bg-[var(--color-bg-secondary)] p-4 rounded-lg border border-[var(--color-bg-tertiary)] transition-all focus-within:border-[var(--color-interactive-focus)] focus-within:shadow-md"
      >
        <textarea
          v-model="concept.description"
          @input="onDescriptionInput($event, index)"
          @paste="handlePaste($event, index)"
          :placeholder="index === 0 ? 'Describe what you want to see...' : 'Describe another concept...'"
          class="concept-textarea text-[var(--color-text-primary)] w-full resize-none overflow-hidden pr-8"
          rows="1"
        ></textarea>

        <!-- Outline-merged label -->
        <label
          class="absolute -top-2.5 left-4 bg-[var(--color-bg-secondary)] px-2 text-xs font-bold text-[var(--color-text-muted)] group-focus-within:text-[var(--color-interactive-focus)] transition-colors pointer-events-none"
        >
          {{ concept.name || 'New concept' }}
        </label>

        <!-- Delete Button -->
        <button
          v-if="index < creativeConcepts.length - 1"
          @click="removeCreativeConcept(index)"
          class="absolute top-2 right-2 text-[var(--color-text-muted)] hover:text-[var(--color-status-error)] transition-colors font-bold w-6 h-6 flex items-center justify-center rounded-full hover:bg-[var(--color-bg-tertiary)]"
          title="Remove concept"
        >
          ✕
        </button>
      </div>
    </div>

    <div class="flex gap-4">
      <button
        @click="showImageModal = true"
        class="bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] font-bold py-2 px-6 rounded-md hover:bg-gray-600 border border-[var(--color-text-dim)] self-start flex items-center gap-2 transition-colors"
      >
        <span class="material-symbols-outlined text-sm">image</span>
        Configure Reference Images
        <span v-if="referenceImages.length > 0" class="bg-[var(--color-interactive-primary)] text-[var(--color-text-primary)] text-xs rounded-full px-2 py-0.5">
          {{ referenceImages.length }}
        </span>
      </button>
      <button
        @click="handleGenerateCharacters"
        :disabled="isLoading"
        class="bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] font-bold py-2 px-6 rounded-md hover:bg-gray-600 border border-[var(--color-text-dim)] self-start flex items-center gap-2 transition-colors disabled:opacity-50"
      >
        <span v-if="isGeneratingCharacters" class="loading loading-spinner loading-xs"></span>
        <span v-else class="material-symbols-outlined text-sm">person</span>
        {{ isGeneratingCharacters ? "Loading..." : "Generate Characters" }}
      </button>
      <button
        @click="showBrandGuidelinesModal = true"
        class="bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] font-bold py-2 px-6 rounded-md hover:bg-gray-600 border border-[var(--color-text-dim)] self-start flex items-center gap-2 transition-colors"
      >
        <span class="material-symbols-outlined text-sm">menu_book</span>
        Configure Brand Guidelines
        <span v-if="brandStore.guidelines" class="bg-[var(--color-interactive-primary)] text-[var(--color-text-primary)] text-xs rounded-full px-2 py-0.5">
          Configured
        </span>
      </button>
    </div>

    <div class="form-control max-w-xs">
      <label class="flex items-center cursor-pointer group">
        <div class="relative">
          <input type="checkbox" v-model="useGemini" class="sr-only peer" />
          <div class="w-11 h-6 bg-[var(--color-bg-tertiary)] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--color-interactive-focus)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-interactive-primary)]"></div>
        </div>
        <span class="ml-3 text-sm font-medium text-[var(--color-text-muted)] group-hover:text-[var(--color-text-primary)] transition-colors" :class="{'text-[var(--color-text-primary)]': useGemini}">Use Gemini to improve prompt</span>
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
              <div v-if="log.imageBase64" class="mt-2 ml-6 flex flex-col gap-1">
                <span class="text-gray-500 text-[9px] uppercase font-semibold tracking-wider">Image Preview:</span>
                <div class="relative inline-block border border-gray-800 rounded overflow-hidden shadow-lg bg-gray-950/50 max-w-[200px]">
                  <img
                    :src="'data:image/png;base64,' + log.imageBase64"
                    class="max-h-36 max-w-full object-contain"
                    alt="Generated Preview"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <button
      @click="handleGenerate"
      class="bg-[var(--color-interactive-primary)] text-[var(--color-text-primary)] font-bold py-2 px-6 rounded-md hover:bg-[var(--color-interactive-hover)] self-start transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      :disabled="isLoading"
    >
      Generate Images
    </button>
    <div v-if="errorMessage" class="text-yellow-500 mt-4">
      {{ errorMessage }}
    </div>

    <!-- Reference Images Modal -->
    <div v-if="showImageModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div class="bg-[var(--color-bg-secondary)] rounded-2xl p-6 max-w-2xl w-full flex flex-col gap-4 max-h-[90vh] overflow-y-auto border border-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] shadow-2xl">
        <h2 class="text-xl font-bold text-[var(--color-text-primary)]">Configure Reference Images</h2>

        <!-- Upload Zone -->
        <div
          @dragover.prevent
          @drop.prevent="handleDrop"
          @click="$refs.fileInput.click()"
          class="border-2 border-dashed border-[var(--color-text-dim)] rounded-lg p-8 text-center cursor-pointer hover:border-[var(--color-interactive-primary)] transition-colors bg-[var(--color-bg-tertiary)]/50"
        >
          <p class="text-[var(--color-text-muted)]">Drag & drop images here or click to browse</p>
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

<style scoped>
@import "./CreativeConceptsMode.css";
</style>

