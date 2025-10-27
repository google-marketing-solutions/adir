<script setup>
import { ref } from "vue";
import { useRoute } from "vue-router";
import AppHeader from "./components/AppHeader.vue";
import AppSidebar from "./components/AppSidebar.vue";
import SettingsModal from "./components/SettingsModal.vue";
import { useAuthStore } from "./stores/auth";

const authStore = useAuthStore();
const route = useRoute();
const isSettingsOpen = ref(false);

const openSettings = () => {
  isSettingsOpen.value = true;
};

const closeSettings = () => {
  isSettingsOpen.value = false;
};
</script>

<template>
  <div id="app-container">
    <AppHeader v-if="authStore.isAuthenticated" @open-settings="openSettings" />
    <div class="main-container">
      <AppSidebar v-if="authStore.isAuthenticated" />
      <main class="main-content">
        <router-view v-slot="{ Component }">
          <keep-alive>
            <component :is="Component" />
          </keep-alive>
        </router-view>
      </main>
    </div>
    <SettingsModal :isVisible="isSettingsOpen" @close="closeSettings" />
  </div>
</template>

<style scoped>
#app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.main-container {
  display: flex;
  flex: 1;
  overflow: hidden; /* Prevent scrolling at the layout level */
}

.main-content {
  flex: 1;
  padding: 1rem;
  overflow-y: auto; /* Allow scrolling within the main content */
}
</style>
