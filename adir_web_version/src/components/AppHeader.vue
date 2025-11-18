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
    class="flex justify-between items-center p-4 bg-gray-800 border-b border-gray-700"
  >
    <img src="@/assets/adir_logo.png" alt="Adir Logo" class="h-16" />
    <div>
      <button
        @click="emit('open-settings')"
        class="py-2 px-4 bg-gray-700 rounded-md hover:bg-gray-600"
      >
        Settings
      </button>
      <button
        v-if="authStore.isAuthenticated"
        @click="logout"
        class="ml-4 py-2 px-4 bg-red-600 rounded-md hover:bg-red-500"
      >
        Logout
      </button>
    </div>
  </header>
</template>
