<template>
  <div class="login-container">
    <div class="login-box">
      <div class="headline-container">
        <h1 class="main-headline">Adir</h1>
        <h2 class="sub-headline">Ads Dynamic Image Renderer</h2>
      </div>
      <div class="input-group">
        <label for="client-id">Client ID</label>
        <input
          type="text"
          id="client-id"
          name="client-id"
          v-model="configStore.googleClientId"
        />
      </div>
      <button class="google-signin" @click="handleLogin">
        Sign in with Google
      </button>
    </div>
    <div class="help-link-container">
      <router-link to="/help" class="help-link">Need Help?</router-link>
    </div>
  </div>
</template>

<script setup>
import { createTokenClient } from "@/services/googleAuth";
import { useAuthStore } from "@/stores/auth";
import { useConfigStore } from "@/stores/config";
import { useRouter } from "vue-router";

const authStore = useAuthStore();
const configStore = useConfigStore();
const router = useRouter();

const GOOGLE_API_SCOPES =
  "openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/devstorage.read_write https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/adwords";

async function handleLogin() {
  const clientId = configStore.googleClientId;
  if (!clientId) {
    alert("Please enter a Client ID");
    return;
  }

  const loginCallback = async (tokenResponse) => {
    if (tokenResponse && tokenResponse.access_token) {
      const token = tokenResponse.access_token;
      const expiresIn = tokenResponse.expires_in;
      authStore.setAccessToken(token, expiresIn);
      router.push("/");
    } else {
      alert("Login failed. Please try again.");
    }
  };

  const client = createTokenClient(clientId, GOOGLE_API_SCOPES, loginCallback);
  client.requestAccessToken();
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  width: 100%;
  position: relative;
}

.help-link-container {
  position: absolute;
  top: 20px;
  right: 20px;
}

.help-link {
  color: #9ca3af;
  text-decoration: none;
  font-size: 0.9rem;
  padding: 8px 16px;
  border-radius: 6px;
  background: #1f2937;
  border: 1px solid #374151;
  transition: all 0.2s;
}

.help-link:hover {
  color: #f3f4f6;
  background: #374151;
  border-color: #4b5563;
}

.login-box {
  background: #1f2937; /* bg-gray-800 */
  padding: 40px;
  border-radius: 8px;
  border: 1px solid #374151; /* border-gray-700 */
  text-align: center;
  width: 100%;
  max-width: 400px;
}

.headline-container {
  margin-bottom: 32px;
}

.main-headline {
  font-size: 2.5rem;
  font-weight: 700;
  color: #e5e7eb; /* text-gray-200 */
  margin-bottom: 8px;
}

.sub-headline {
  font-size: 1.1rem;
  font-weight: 400;
  color: #9ca3af; /* text-gray-400 */
}

.input-group {
  margin-bottom: 20px;
  text-align: left;
}

.input-group label {
  display: block;
  margin-bottom: 8px;
  color: #d1d5db; /* text-gray-300 */
  font-weight: bold;
}

.input-group input {
  width: 100%;
  padding: 10px;
  border: 1px solid #4b5563; /* border-gray-600 */
  border-radius: 4px;
  box-sizing: border-box;
  background-color: #374151; /* bg-gray-700 */
  color: #e5e7eb; /* text-gray-200 */
}

.google-signin {
  width: 100%;
  padding: 12px;
  background-color: #4285f4;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s;
}

.google-signin:hover {
  background-color: #357ae8;
}
</style>
