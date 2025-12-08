<script setup>
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";

const authStore = useAuthStore();
const emit = defineEmits(["open-settings"]);
const router = useRouter();

const logout = () => {
  authStore.logout();
  router.push("/login");
};
</script>

<template>
  <header
    class="flex justify-between items-center px-6 py-4 bg-gray-900/90 backdrop-blur-md border-b border-gray-800 sticky top-0 z-50"
  >
    <div class="flex items-center gap-4">
      <img src="@/assets/adir_logo.png" alt="Adir Logo" class="h-12 w-auto object-contain" />
    </div>
    <div class="flex items-center gap-3">
      <router-link
        to="/help"
        class="group flex items-center gap-2 px-4 py-2 bg-gray-800/50 hover:bg-gray-700/80 text-gray-400 hover:text-white border border-gray-700/50 hover:border-blue-500/30 rounded-xl transition-all duration-300 hover:shadow-[0_0_15px_rgba(59,130,246,0.15)] no-underline"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 transition-transform group-hover:scale-110 group-hover:rotate-12">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
        </svg>
        <span class="font-medium">Help</span>
      </router-link>

      <button
        @click="emit('open-settings')"
        class="group flex items-center gap-2 px-4 py-2 bg-gray-800/50 hover:bg-gray-700/80 text-gray-400 hover:text-white border border-gray-700/50 hover:border-blue-500/30 rounded-xl transition-all duration-300 hover:shadow-[0_0_15px_rgba(59,130,246,0.15)]"
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
        class="group flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 rounded-xl transition-all duration-300 ml-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 transition-transform group-hover:translate-x-1">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 2.062-5M18 12h-6" />
        </svg>
        <span class="font-medium">Logout</span>
      </button>
    </div>
  </header>
</template>
