<template>
  <button
    v-if="showScrollButton"
    @click="scrollToTop"
    class="fixed bottom-10 right-10 bg-cyan-600 text-white rounded-full p-3 shadow-lg hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-opacity-50 transition-opacity duration-300"
    :class="{ 'opacity-100': showScrollButton, 'opacity-0': !showScrollButton }"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M5 15l7-7 7 7"
      />
    </svg>
  </button>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from "vue";

const elementSelector = ".main-content";
const showScrollButton = ref(false);

const handleScroll = () => {
  const mainContent = document.querySelector(elementSelector);
  if (mainContent) {
    showScrollButton.value = mainContent.scrollTop > 200;
  }
};

const scrollToTop = () => {
  const mainContent = document.querySelector(elementSelector);
  if (mainContent) {
    mainContent.scrollTo({ top: 0, behavior: "smooth" });
  }
};

onMounted(() => {
  const mainContent = document.querySelector(elementSelector);
  if (mainContent) {
    mainContent.addEventListener("scroll", handleScroll);
  }
});

onUnmounted(() => {
  const mainContent = document.querySelector(elementSelector);
  if (mainContent) {
    mainContent.removeEventListener("scroll", handleScroll);
  }
});
</script>