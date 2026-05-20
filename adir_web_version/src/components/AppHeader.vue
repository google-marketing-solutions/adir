<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";

const authStore = useAuthStore();
const emit = defineEmits(["open-settings"]);
const router = useRouter();

const currentTheme = ref(localStorage.getItem("theme") || "dark");

const setTheme = (theme) => {
  currentTheme.value = theme;
  localStorage.setItem("theme", theme);
  document.documentElement.setAttribute("data-theme", theme);
};

const logout = () => {
  authStore.logout();
  router.push("/login");
};
</script>

<template>
  <header
    class="flex justify-between items-center px-6 py-4 bg-[var(--color-bg-primary)] border-b border-[var(--color-bg-tertiary)] sticky top-0 z-50"
  >
    <div class="flex items-center gap-4">
      <router-link to="/">
        <img src="@/assets/adir_logo.png" alt="Adir Logo" class="h-12 w-auto object-contain cursor-pointer" />
      </router-link>
    </div>
    <div class="flex items-center gap-3">
      <!-- Theme Selector Segmented Control -->
      <div class="theme-selector-group">
        <button
          @click="setTheme('dark')"
          :class="{ active: currentTheme === 'dark' }"
          class="theme-select-btn"
          title="Dark Mode"
        >
          <svg class="theme-btn-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
          </svg>
        </button>
        <button
          @click="setTheme('light')"
          :class="{ active: currentTheme === 'light' }"
          class="theme-select-btn"
          title="Light Mode"
        >
          <svg class="theme-btn-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 2.293a1 1 0 011.414 0l.707.707a1 1 0 01-1.414 1.414l-.707-.707a1 1 0 010-1.414zm2.707 4.707a1 1 0 010 1.414l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-2.293 4.707a1 1 0 010-1.414l.707-.707a1 1 0 111.414 1.414l-.707.707a1 1 0 01-1.414 0zM11 17a1 1 0 11-2 0v-1a1 1 0 11-2 0v1zm-4-2.293a1 1 0 01-1.414 0l-.707-.707a1 1 0 011.414-1.414l.707.707a1 1 0 010 1.414zM4 9a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm2.293-4.707a1 1 0 010 1.414l-.707.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM10 5a5 5 0 100 10 5 5 0 000-10z" clip-rule="evenodd" />
          </svg>
        </button>
        <button
          @click="setTheme('mango')"
          :class="{ active: currentTheme === 'mango' }"
          class="theme-select-btn mango"
          title="Mango Mode"
        >
          <svg class="theme-btn-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 122.88 103.05" fill="currentColor">
            <path d="M82.15,27.1c-1.43-2.33-3.16-4.54-5.23-6.62c-2.03-2.03-4.4-3.95-7.14-5.72c-7.94-2.95-15.02-3.76-21.32-2.79 C41.74,13,35.87,16.09,30.79,20.8c-9.49,8.8-9.97,15.94-10.57,24.78c-0.25,3.67-0.51,7.61-1.37,12.09 c-0.95,4.98-2.42,9.39-4.27,13.19c-1.96,4.03-4.35,7.38-7,10c-2.24,3.01-3.08,5.52-2.45,7.51c0.01,0.03,0.02,0.06,0.03,0.09 c0.69,2.05,3,3.87,6.99,5.45c0.05,0.02,0.1,0.04,0.15,0.06c13.07,5.16,26.63,5.41,38.67,1.32c11.96-4.06,22.42-12.42,29.41-24.53 c4.2-7.28,6.84-15.18,7.14-23.05C87.78,40.7,86.18,33.68,82.15,27.1L82.15,27.1z M76.6,8.63c2.11-2,4.52-3.63,7.42-4.65 c7.38-2.59,17.21-0.47,23.9,3.19c5.36,2.93,10.91,7.53,14.96,12.41c-5.57,2.16-13.35,3.19-21.79,3.7 c-6.45,0.39-12.41-0.57-18.15-3.49c1.27,1.53,2.41,3.11,3.41,4.75c4.57,7.45,6.38,15.4,6.08,23.35 c-0.33,8.71-3.21,17.38-7.79,25.33C77.02,86.41,65.6,95.52,52.55,99.96c-13.11,4.45-27.85,4.19-42.04-1.41 c-0.05-0.02-0.1-0.03-0.15-0.05c-5.45-2.15-8.71-4.99-9.88-8.5c-0.02-0.04-0.03-0.09-0.05-0.14c-1.15-3.64-0.01-7.68,3.31-12.08 l0,0c0.07-0.1,0.16-0.19,0.25-0.28c2.31-2.25,4.41-5.19,6.15-8.77c1.67-3.43,3-7.43,3.87-11.98c0.8-4.19,1.06-7.97,1.29-11.49 c0.67-9.93,1.21-17.93,12.13-28.06c5.78-5.36,12.52-8.89,20.26-10.09c6.62-1.02,13.92-0.33,21.95,2.38l3.94-7.88 c0.72-1.44,2.47-2.02,3.91-1.3c1.44,0.72,2.02,2.47,1.3,3.91L76.6,8.63L76.6,8.63z" />
          </svg>
        </button>
      </div>

      <router-link
        to="/help"
        class="group flex items-center gap-2 px-4 py-2 bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] border border-[var(--color-bg-tertiary)] hover:border-[var(--color-interactive-primary)] rounded-xl transition-all duration-300 no-underline"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 transition-transform group-hover:scale-110 group-hover:rotate-12">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
        </svg>
        <span class="font-medium">Help</span>
      </router-link>

      <button
        @click="emit('open-settings')"
        class="group flex items-center gap-2 px-4 py-2 bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] border border-[var(--color-bg-tertiary)] hover:border-[var(--color-interactive-primary)] rounded-xl transition-all duration-300"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 transition-transform group-hover:rotate-90">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 0 1 0 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281Z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        </svg>
        <span class="font-medium">Settings</span>
      </button>

      <button
        v-if="authStore.isAuthenticated"
        @click="logout"
        class="group flex items-center gap-2 px-4 py-2 bg-[var(--color-status-error)]/10 hover:bg-[var(--color-status-error)]/20 text-[var(--color-status-error)] hover:text-[var(--color-text-primary)] border border-[var(--color-status-error)]/20 hover:border-[var(--color-status-error)]/40 rounded-xl transition-all duration-300 ml-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 transition-transform group-hover:translate-x-1">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 2.062-5M18 12h-6" />
        </svg>
        <span class="font-medium">Logout</span>
      </button>
    </div>
  </header>
</template>
