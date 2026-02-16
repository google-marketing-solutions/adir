<template>
  <div
    v-if="isVisible"
    class="fixed inset-0 bg-black/60 backdrop-grayscale flex justify-center items-center z-[100]"
    @click="emit('close')"
  >
    <div
      class="bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-700 shadow-xl"
      @click.stop
    >
      <h2 class="text-xl font-bold mb-4 text-white">{{ title }}</h2>
      <p class="text-gray-300 mb-6">{{ message }}</p>

      <div class="flex justify-end gap-3">
        <button
          @click="emit('close')"
          class="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-md font-semibold transition-colors"
          :disabled="isProcessing"
        >
          {{ cancelText }}
        </button>
        <button
          @click="emit('confirm')"
          class="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-md font-semibold flex items-center gap-2 transition-colors"
          :disabled="isProcessing"
        >
          <span
            v-if="isProcessing"
            class="loading loading-spinner loading-xs"
          ></span>
          {{ confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  isVisible: {
    type: Boolean,
    required: true,
  },
  title: {
    type: String,
    default: "Confirm Action",
  },
  message: {
    type: String,
    required: true,
  },
  confirmText: {
    type: String,
    default: "Confirm",
  },
  cancelText: {
    type: String,
    default: "Cancel",
  },
  isProcessing: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["close", "confirm"]);
</script>
