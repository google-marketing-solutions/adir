<script setup>
import { ref } from "vue";
import { useRoute } from "vue-router";
import AppHeader from "./components/AppHeader.vue";
import AppSidebar from "./components/AppSidebar.vue";
import PMaxCampaignSelector from "./components/pmax/PMaxCampaignSelector.vue";
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
    <PMaxCampaignSelector
      v-if="authStore.isAuthenticated"
      class="campaign-selector"
    />
    <div class="main-container">
      <AppSidebar v-if="authStore.isAuthenticated" />
      <div class="content-wrapper">
        <main class="main-content">
          <router-view v-slot="{ Component }">
            <keep-alive>
              <component :is="Component" />
            </keep-alive>
          </router-view>
        </main>
      </div>
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

.content-wrapper {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

.campaign-selector {
  padding: 1rem;
  border-bottom: 1px solid #4a5568;
  background-color: #1f2937; /* bg-gray-800 */
  color: #d1d5db; /* text-gray-300 */
}

.main-content {
  flex: 1;
  padding: 1rem;
  overflow-y: auto; /* Allow scrolling within the main content */
}
</style>
