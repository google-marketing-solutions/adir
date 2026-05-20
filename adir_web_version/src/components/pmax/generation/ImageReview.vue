<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import GcsImage from "@/components/GcsImage.vue";

const props = defineProps({
  images: {
    type: Array,
    required: true,
  },
});

const emit = defineEmits(["approve-all", "regenerate", "finish", "update:images"]);

const reviewMode = ref("swipe"); // 'swipe' | 'grid'
const currentIndex = ref(0);
const localImages = ref(props.images.map(img => ({ ...img })));

watch(
  () => props.images,
  (newImages) => {
    localImages.value = newImages.map((img) => ({ ...img }));
    
    // If in swipe mode and currently have no active image, reset to first pending
    if (reviewMode.value === "swipe" && !activeImage.value) {
      const firstPending = localImages.value.findIndex((img) => img.status === "pending");
      if (firstPending !== -1) {
        currentIndex.value = firstPending;
      }
    }
  },
  { deep: true }
);

// Rejection Feedback State
const showFeedbackModal = ref(false);
const feedbackText = ref("");
const imageToReject = ref(null);

// Swipe Gesture State
const isDragging = ref(false);
const startX = ref(0);
const currentX = ref(0);
const swipeContainer = ref(null);

const activeImage = computed(() => {
  if (currentIndex.value < localImages.value.length) {
    return localImages.value[currentIndex.value];
  }
  return null;
});

const nextPendingImage = computed(() => {
  if (reviewMode.value !== "swipe" || currentIndex.value >= localImages.value.length) {
    return null;
  }
  // Search forward from currentIndex + 1 for a pending image
  let nextIdx = currentIndex.value + 1;
  while (nextIdx < localImages.value.length) {
    if (localImages.value[nextIdx].status === "pending") {
      return {
        image: localImages.value[nextIdx],
        index: nextIdx
      };
    }
    nextIdx++;
  }
  
  // If not found, wrap around and search from 0 to currentIndex - 1
  let prevIdx = 0;
  while (prevIdx < currentIndex.value) {
    if (localImages.value[prevIdx].status === "pending") {
      return {
        image: localImages.value[prevIdx],
        index: prevIdx
      };
    }
    prevIdx++;
  }
  
  return null;
});

const dragProgress = computed(() => {
  if (!isDragging.value) return 0;
  const diff = currentX.value - startX.value;
  return Math.min(Math.abs(diff) / 150, 1); // clamp between 0 and 1
});

const backCardStyle = computed(() => {
  const progress = dragProgress.value;
  const scale = 0.9 + progress * 0.1; // goes from 0.9 to 1.0
  const opacity = 0.6 + progress * 0.4; // goes from 0.6 to 1.0
  const translateY = 12 - progress * 12; // goes from 12px down to 0px for a lifting effect
  
  return {
    transform: `scale(${scale}) translateY(${translateY}px)`,
    opacity: opacity,
    zIndex: 5,
    pointerEvents: "none",
    transition: isDragging.value ? "none" : "transform 0.3s ease, opacity 0.3s ease",
  };
});

const pendingImagesCount = computed(() => {
  return localImages.value.filter((img) => img.status === "pending").length;
});

const stats = computed(() => {
  const total = localImages.value.length;
  const approved = localImages.value.filter((img) => img.status === "approved").length;
  const rejected = localImages.value.filter((img) => img.status === "rejected").length;
  const pending = localImages.value.filter((img) => img.status === "pending").length;
  const regenerating = localImages.value.filter((img) => img.status === "regenerating").length;
  return { total, approved, rejected, pending, regenerating };
});

const allReviewed = computed(() => stats.value.pending === 0 && stats.value.regenerating === 0);

const approveImage = (index) => {
  localImages.value[index].status = "approved";
  localImages.value[index].feedback = "";
  emit("update:images", localImages.value);
  nextImage();
};

const rejectImage = (index) => {
  imageToReject.value = index;
  feedbackText.value = localImages.value[index].feedback || "";
  showFeedbackModal.value = true;
};

const confirmRejection = () => {
  if (imageToReject.value !== null) {
    const img = localImages.value[imageToReject.value];
    img.status = "regenerating";
    img.feedback = feedbackText.value;
    
    emit("update:images", localImages.value);
    emit("regenerate", [img]); // Trigger immediate auto-regeneration
    
    showFeedbackModal.value = false;
    imageToReject.value = null;
    feedbackText.value = "";
    nextImage();
  }
};

const nextImage = () => {
  if (reviewMode.value === "swipe") {
    // 1. Search forward from currentIndex + 1
    let nextIdx = currentIndex.value + 1;
    while (nextIdx < localImages.value.length) {
      if (localImages.value[nextIdx].status === "pending") {
        currentIndex.value = nextIdx;
        return;
      }
      nextIdx++;
    }
    
    // 2. If not found, wrap around and search from 0 to currentIndex
    let prevIdx = 0;
    while (prevIdx < currentIndex.value) {
      if (localImages.value[prevIdx].status === "pending") {
        currentIndex.value = prevIdx;
        return;
      }
      prevIdx++;
    }
    
    // 3. If still no pending images found, set to out of bounds to show all reviewed screen
    currentIndex.value = localImages.value.length;
  }
};

const prevImage = () => {
  if (reviewMode.value === "swipe" && currentIndex.value > 0) {
    let prevIdx = currentIndex.value - 1;
    while (prevIdx >= 0 && localImages.value[prevIdx].status !== "pending") {
      prevIdx--;
    }
    if (prevIdx >= 0) {
      currentIndex.value = prevIdx;
    }
  }
};

const approveAll = () => {
  localImages.value.forEach((img) => {
    if (img.status === "pending") {
      img.status = "approved";
    }
  });
  emit("update:images", localImages.value);
  emit("approve-all");
};

const handleFinish = () => {
  const approved = localImages.value.filter((img) => img.status === "approved");
  emit("finish", approved);
};

// Swipe gesture handlers
const handleStart = (e) => {
  if (reviewMode.value !== "swipe" || !activeImage.value) return;
  isDragging.value = true;
  startX.value = e.type.includes("touch") ? e.touches[0].clientX : e.clientX;
  currentX.value = startX.value;
};

const handleMove = (e) => {
  if (!isDragging.value) return;
  currentX.value = e.type.includes("touch") ? e.touches[0].clientX : e.clientX;
};

const handleEnd = () => {
  if (!isDragging.value) return;
  isDragging.value = false;
  const diff = currentX.value - startX.value;
  const threshold = 100; // px

  if (diff > threshold) {
    approveImage(currentIndex.value);
  } else if (diff < -threshold) {
    rejectImage(currentIndex.value);
  }
  
  // Reset position
  currentX.value = startX.value;
};

const cardStyle = computed(() => {
  if (!isDragging.value) return { transition: "transform 0.3s ease", zIndex: 10 };
  const diff = currentX.value - startX.value;
  const rotation = diff / 20;
  return {
    transform: `translateX(${diff}px) rotate(${rotation}deg)`,
    cursor: "grabbing",
    zIndex: 10,
  };
});

// Keyboard navigation
const handleKeyDown = (e) => {
  if (showFeedbackModal.value) return;
  if (reviewMode.value === "swipe" && activeImage.value) {
    if (e.key === "ArrowRight") {
      approveImage(currentIndex.value);
    } else if (e.key === "ArrowLeft") {
      rejectImage(currentIndex.value);
    }
  }
};

onMounted(() => {
  window.addEventListener("keydown", handleKeyDown);
  // Reset currentIndex to first pending
  const firstPending = localImages.value.findIndex((img) => img.status === "pending");
  if (firstPending !== -1) {
    currentIndex.value = firstPending;
  }
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeyDown);
});
</script>

<template>
  <div class="flex flex-col gap-6 min-h-[600px] text-[var(--color-text-primary)]">
    <!-- Header / Controls -->
    <div class="flex justify-between items-center bg-[var(--color-bg-secondary)] p-4 rounded-xl border border-[var(--color-bg-tertiary)]">
      <div class="flex items-center gap-4">
        <h2 class="text-xl font-bold">Review Generated Images</h2>
        <div class="text-sm text-[var(--color-text-muted)]">
          Approved: {{ stats.approved }}
          <span v-if="stats.regenerating > 0">| Regenerating: {{ stats.regenerating }}</span>
          | Pending: {{ stats.pending }}
        </div>
      </div>
      
      <div class="flex gap-2">
        <button
          @click="reviewMode = 'swipe'"
          class="btn py-1 px-3 rounded text-sm"
          :class="reviewMode === 'swipe' ? 'bg-[var(--color-interactive-primary)] text-white' : 'bg-[var(--color-bg-tertiary)]'"
        >
          Swipe Mode
        </button>
        <button
          @click="reviewMode = 'grid'"
          class="btn py-1 px-3 rounded text-sm"
          :class="reviewMode === 'grid' ? 'bg-[var(--color-interactive-primary)] text-white' : 'bg-[var(--color-bg-tertiary)]'"
        >
          Grid Mode
        </button>
        <button
          @click="approveAll"
          class="bg-green-600 hover:bg-green-700 text-white font-semibold py-1 px-3 rounded text-sm transition-colors"
        >
          Approve All
        </button>
      </div>
    </div>

    <!-- Main Content Area -->
    <div class="flex-1 flex justify-center items-center relative min-h-[450px]">
      <!-- Swipe Mode -->
      <div
        v-if="reviewMode === 'swipe'"
        class="w-full max-w-md flex flex-col items-center gap-6"
      >
        <!-- Stack Container -->
        <div class="relative w-full aspect-square">
          <!-- Back Card (Next Pending Image) -->
          <div
            v-if="nextPendingImage"
            class="absolute inset-0 bg-[var(--color-bg-secondary)] rounded-2xl shadow-lg border border-[var(--color-bg-tertiary)] overflow-hidden select-none pointer-events-none"
            :style="backCardStyle"
          >
            <div class="w-full h-full">
              <GcsImage :gcs-uri="nextPendingImage.image.gcsUri" class="w-full h-full object-contain" />
            </div>
            
            <!-- Metadata overlay at bottom -->
            <div class="absolute bottom-0 left-0 right-0 bg-black/60 p-4 text-white backdrop-blur-sm">
              <div class="font-bold text-lg">{{ nextPendingImage.image.conceptName || 'Concept' }}</div>
              <p class="text-xs text-gray-300 line-clamp-2 mt-1">{{ nextPendingImage.image.conceptDescription }}</p>
              <div class="flex justify-between items-center mt-2 text-[10px] text-gray-400">
                <span>AR: {{ nextPendingImage.image.aspectRatio }}</span>
                <span>Attempt: {{ nextPendingImage.image.attempt }}</span>
              </div>
            </div>
          </div>

          <!-- Front Card (Active Draggable Image) -->
          <div
            v-if="activeImage"
            ref="swipeContainer"
            class="absolute inset-0 bg-[var(--color-bg-secondary)] rounded-2xl shadow-2xl border border-[var(--color-bg-tertiary)] overflow-hidden touch-none select-none cursor-grab"
            :style="cardStyle"
            @mousedown="handleStart"
            @mousemove="handleMove"
            @mouseup="handleEnd"
            @mouseleave="handleEnd"
            @touchstart="handleStart"
            @touchmove="handleMove"
            @touchend="handleEnd"
          >
            <!-- GcsImage Wrapper to prevent drag default -->
            <div class="w-full h-full pointer-events-none">
              <GcsImage :gcs-uri="activeImage.gcsUri" class="w-full h-full object-contain" />
            </div>

            <!-- Overlay indicators -->
            <div
              v-if="isDragging && currentX - startX > 20"
              class="absolute top-6 left-6 border-4 border-green-500 text-green-500 font-bold uppercase px-4 py-2 rounded-md rotate-[-12deg] text-2xl bg-green-500/10"
            >
              Approve
            </div>
            <div
              v-if="isDragging && currentX - startX < -20"
              class="absolute top-6 right-6 border-4 border-red-500 text-red-500 font-bold uppercase px-4 py-2 rounded-md rotate-[12deg] text-2xl bg-red-500/10"
            >
              Reject
            </div>

            <!-- Metadata overlay at bottom -->
            <div class="absolute bottom-0 left-0 right-0 bg-black/60 p-4 text-white backdrop-blur-sm">
              <div class="font-bold text-lg">{{ activeImage.conceptName || 'Concept' }}</div>
              <p class="text-xs text-gray-300 line-clamp-2 mt-1">{{ activeImage.conceptDescription }}</p>
              <div class="flex justify-between items-center mt-2 text-[10px] text-gray-400">
                <span>AR: {{ activeImage.aspectRatio }}</span>
                <span>Attempt: {{ activeImage.attempt }}</span>
              </div>
            </div>
          </div>

          <!-- Empty state when no active image left -->
          <div
            v-else
            class="absolute inset-0 flex flex-col items-center justify-center text-center py-12 bg-[var(--color-bg-secondary)] rounded-2xl border border-[var(--color-bg-tertiary)] shadow-md"
          >
            <span class="material-symbols-outlined text-6xl text-[var(--color-text-muted)]">task_alt</span>
            <h3 class="text-xl font-bold mt-4">All Images Reviewed!</h3>
            <p class="text-[var(--color-text-muted)] mt-2">You can now regenerate rejected images or finish review.</p>
          </div>
        </div>

        <!-- Action Buttons for Swipe Mode -->
        <div v-if="activeImage" class="flex gap-6 justify-center w-full">
          <button
            @click="rejectImage(currentIndex)"
            class="w-14 h-14 rounded-full bg-red-500/10 hover:bg-red-500/20 border-2 border-red-500 text-red-500 flex items-center justify-center transition-colors shadow-lg"
            title="Reject (Left Arrow)"
          >
            <span class="material-symbols-outlined text-3xl">close</span>
          </button>
          <button
            @click="approveImage(currentIndex)"
            class="w-14 h-14 rounded-full bg-green-500/10 hover:bg-green-500/20 border-2 border-green-500 text-green-500 flex items-center justify-center transition-colors shadow-lg"
            title="Approve (Right Arrow)"
          >
            <span class="material-symbols-outlined text-3xl">done</span>
          </button>
        </div>
      </div>

      <!-- Grid Mode (Masonry) -->
      <div
        v-else-if="reviewMode === 'grid'"
        class="w-full columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-6 p-2 max-h-[600px] overflow-y-auto"
      >
        <div
          v-for="(image, index) in localImages"
          :key="image.id"
          class="break-inside-avoid mb-6 inline-block w-full flex flex-col bg-[var(--color-bg-secondary)] rounded-xl border overflow-hidden shadow transition-all hover:shadow-md"
          :class="{
            'border-green-500 ring-2 ring-green-500/20': image.status === 'approved',
            'border-red-500 ring-2 ring-red-500/20': image.status === 'rejected',
            'border-cyan-500 ring-2 ring-cyan-500/20': image.status === 'regenerating',
            'border-[var(--color-bg-tertiary)]': image.status === 'pending'
          }"
        >
          <div class="relative bg-[var(--color-bg-tertiary)] flex items-center justify-center overflow-hidden">
            <GcsImage :gcs-uri="image.gcsUri" class="w-full h-auto object-contain" :class="{'opacity-40': image.status === 'regenerating'}" />
            
            <!-- Status badge -->
            <div
              v-if="image.status !== 'pending'"
              class="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase shadow"
              :class="{
                'bg-green-600 text-white': image.status === 'approved',
                'bg-red-600 text-white': image.status === 'rejected',
                'bg-cyan-600 text-white': image.status === 'regenerating'
              }"
            >
              {{ image.status }}
            </div>

            <!-- Loading spinner overlay for regenerating -->
            <div v-if="image.status === 'regenerating'" class="absolute inset-0 flex items-center justify-center bg-black/55 backdrop-blur-[1px]">
              <span class="loading loading-spinner loading-md text-cyan-400"></span>
            </div>
          </div>

          <div class="p-3 flex-1 flex flex-col justify-between gap-2">
            <div>
              <h4 class="font-bold text-sm line-clamp-1">{{ image.conceptName || 'Concept' }}</h4>
              <p class="text-[10px] text-[var(--color-text-muted)] mt-1">AR: {{ image.aspectRatio }} | Attempt: {{ image.attempt }}</p>
              <p v-if="image.feedback" class="text-xs text-red-400 mt-1 font-mono italic bg-red-500/5 p-1.5 rounded border border-red-500/10">
                <strong>Feedback:</strong> {{ image.feedback }}
              </p>
            </div>

            <div class="flex gap-2 mt-2">
              <button
                @click="approveImage(index)"
                class="flex-1 py-1 px-2 rounded text-xs font-semibold transition-colors border"
                :class="image.status === 'approved' ? 'bg-green-600/20 border-green-500 text-green-400' : 'bg-[var(--color-bg-tertiary)] border-transparent hover:bg-green-500/10 hover:text-green-400'"
                :disabled="image.status === 'regenerating'"
              >
                Approve
              </button>
              <button
                @click="rejectImage(index)"
                class="flex-1 py-1 px-2 rounded text-xs font-semibold transition-colors border"
                :class="image.status === 'rejected' ? 'bg-red-600/20 border-red-500 text-red-400' : 'bg-[var(--color-bg-tertiary)] border-transparent hover:bg-red-500/10 hover:text-red-400'"
                :disabled="image.status === 'regenerating'"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer Actions -->
    <div class="flex justify-end items-center border-t border-[var(--color-bg-tertiary)] pt-4 bg-[var(--color-bg-secondary)] p-4 rounded-xl">
      <button
        @click="handleFinish"
        class="bg-[var(--color-interactive-primary)] text-[var(--color-text-primary)] font-bold py-2 px-6 rounded-md hover:bg-[var(--color-interactive-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="!allReviewed"
      >
        Finish & Move On ({{ stats.approved }} Approved)
      </button>
    </div>

    <!-- Rejection Feedback Modal -->
    <div v-if="showFeedbackModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div class="bg-[var(--color-bg-secondary)] rounded-2xl p-6 max-w-md w-full flex flex-col gap-4 border border-[var(--color-bg-tertiary)] shadow-2xl">
        <h3 class="text-lg font-bold">Why are you rejecting this image?</h3>
        <p class="text-xs text-[var(--color-text-muted)]">
          Your feedback will be used as refinement instructions for regeneration. Be specific about what to change (e.g., "make the background darker", "remove the cup from the table").
        </p>
        
        <textarea
          v-model="feedbackText"
          placeholder="Enter rejection reason / feedback (optional)..."
          class="bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] rounded-md p-3 w-full border border-transparent focus:border-[var(--color-interactive-focus)] focus:outline-none"
          rows="4"
        ></textarea>
        
        <div class="flex justify-end gap-3">
          <button
            @click="showFeedbackModal = false"
            class="bg-[var(--color-bg-tertiary)] hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-md text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            @click="confirmRejection"
            class="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-md text-sm transition-colors"
          >
            Reject Image
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
