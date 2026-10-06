<script setup>
import { ref, computed } from "vue";

const props = defineProps({
  show: {
    type: Boolean,
    required: true,
  },
  images: {
    type: Array,
    required: true,
  },
  instructions: {
    type: String,
    required: true,
  },
  maxImages: {
    type: Number,
    default: 13,
  },
  title: {
    type: String,
    default: "Configure Reference Images",
  },
});

const emit = defineEmits([
  "update:show",
  "update:images",
  "update:instructions",
  "validation-error",
]);

const fileInput = ref(null);

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

const loadFiles = async (files) => {
  const allowedSlots = props.maxImages - props.images.length;
  if (allowedSlots <= 0) {
    emit("validation-error", `Maximum of ${props.maxImages} reference images reached.`);
    return;
  }

  const validFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));
  if (validFiles.length === 0) return;

  let filesToProcess = validFiles;
  if (validFiles.length > allowedSlots) {
    emit("validation-error", `Only loading the first ${allowedSlots} image(s). Maximum of ${props.maxImages} allowed.`);
    filesToProcess = validFiles.slice(0, allowedSlots);
  }

  const fileReaders = filesToProcess.map((file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target?.result || null);
      };
      reader.readAsDataURL(file);
    });
  });

  const base64Results = await Promise.all(fileReaders);
  const filteredResults = base64Results.filter(Boolean);

  if (filteredResults.length > 0) {
    emit("update:images", [...props.images, ...filteredResults]);
  }
};

const removeImage = (index) => {
  const newImages = [...props.images];
  newImages.splice(index, 1);
  emit("update:images", newImages);
};

const localInstructions = computed({
  get() {
    return props.instructions;
  },
  set(value) {
    emit("update:instructions", value);
  },
});
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" @click="emit('update:show', false)">
    <div class="bg-[var(--color-bg-secondary)] rounded-2xl p-6 max-w-2xl w-full flex flex-col gap-4 max-h-[90vh] overflow-y-auto border border-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] shadow-2xl" @click.stop>
      <h2 class="text-xl font-bold text-[var(--color-text-primary)]">{{ title }}</h2>

      <!-- Upload Zone -->
      <div
        @dragover.prevent
        @drop.prevent="handleDrop"
        @click="fileInput.click()"
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
      <div v-if="images.length > 0" class="grid grid-cols-4 gap-4 mt-2">
        <div v-for="(img, idx) in images" :key="idx" class="relative group aspect-square bg-gray-900 rounded-md overflow-hidden border border-gray-700">
          <img :src="img" class="w-full h-full object-cover" />
          <button
            @click="removeImage(idx)"
            class="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity animate-fade-in"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- Context Instructions Text Area -->
      <div class="form-control">
        <label class="label">
          <span class="label-text text-lg font-bold text-gray-200">How should these images be used for context?</span>
        </label>
        <textarea
          v-model="localInstructions"
          placeholder="e.g., Use the style and color palette of Image 1, but use the composition and layout of Image 2."
          class="bg-gray-700 rounded-md p-2 w-full text-white border border-gray-600 focus:border-cyan-400 focus:outline-none"
          rows="4"
        ></textarea>
      </div>

      <!-- Action Buttons -->
      <div class="flex justify-end gap-4 mt-4">
        <button @click="emit('update:show', false)" class="bg-cyan-600 text-white px-6 py-2 rounded-md hover:bg-cyan-700 font-bold transition-colors">
          Save & Close
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import "./CreativeConceptsMode.css";
</style>
