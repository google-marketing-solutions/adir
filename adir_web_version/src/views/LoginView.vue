<template>
  <div class="login-wrapper min-h-screen w-full flex items-center justify-center p-6 bg-[var(--color-bg-primary)] relative overflow-hidden">
    <!-- Ambient Background Glows -->
    <div class="absolute -top-40 -left-40 w-96 h-96 bg-[var(--color-interactive-primary)]/10 rounded-full blur-3xl pointer-events-none"></div>
    <div class="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>

    <!-- Top Help Link -->
    <div class="absolute top-6 right-6 z-20">
      <router-link
        to="/help"
        class="flex items-center gap-2 px-4 py-2 bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:text-[var(--color-text-highlight)] border border-[var(--color-bg-tertiary)] rounded-xl transition-all duration-200 text-sm font-medium shadow-sm"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
        </svg>
        Need Help?
      </router-link>
    </div>

    <!-- Main Content Container -->
    <div class="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center z-10">
      
      <!-- Left Column: Product Story & Core Workflow -->
      <div class="lg:col-span-7 space-y-8 pr-0 lg:pr-6">
        <div class="flex items-center gap-4">
          <img src="@/assets/adir_logo.png" alt="Adir Logo" class="h-14 w-auto object-contain drop-shadow-md" />
        </div>

        <div>
          <h1 class="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[var(--color-text-highlight)] mb-3 whitespace-nowrap">
            <span class="adir-letter">A</span>ds 
            <span class="adir-letter">D</span>ynamic 
            <span class="adir-letter">I</span>mage 
            <span class="adir-letter">R</span>enderer
          </h1>
          <p class="text-lg text-[var(--color-text-muted)] leading-relaxed max-w-xl">
            Streamline your Google Ads creative lifecycle. Prune low-performing visuals, generate brand-consistent AI assets, and refine variations with precision.
          </p>
        </div>

        <!-- Coherent Workflow Timeline -->
        <div class="space-y-4 pt-2">
          <!-- Step 1 -->
          <div class="group bg-[var(--color-bg-secondary)]/80 backdrop-blur-md p-5 rounded-xl border border-[var(--color-bg-tertiary)] hover:border-[var(--color-interactive-primary)] transition-all duration-300 flex items-start gap-4 shadow-sm hover:shadow-md">
            <div class="w-10 h-10 rounded-lg bg-[var(--color-interactive-primary)]/15 text-[var(--color-interactive-primary)] flex items-center justify-center font-bold text-base shrink-0 group-hover:scale-105 transition-transform">
              1
            </div>
            <div>
              <h3 class="text-base font-bold text-[var(--color-text-highlight)] mb-1 flex items-center gap-2">
                Poor Asset Removal
              </h3>
              <p class="text-sm text-[var(--color-text-muted)] leading-normal">
                Audit PMax and Demand Gen asset groups. Filter by live performance metrics (CTR, Cost, Conversions) to prune fatigued or low-performing images.
              </p>
            </div>
          </div>

          <!-- Step 2 -->
          <div class="group bg-[var(--color-bg-secondary)]/80 backdrop-blur-md p-5 rounded-xl border border-[var(--color-bg-tertiary)] hover:border-[var(--color-interactive-primary)] transition-all duration-300 flex items-start gap-4 shadow-sm hover:shadow-md">
            <div class="w-10 h-10 rounded-lg bg-[var(--color-interactive-primary)]/15 text-[var(--color-interactive-primary)] flex items-center justify-center font-bold text-base shrink-0 group-hover:scale-105 transition-transform">
              2
            </div>
            <div>
              <h3 class="text-base font-bold text-[var(--color-text-highlight)] mb-1 flex items-center gap-2">
                Asset Generation
              </h3>
              <p class="text-sm text-[var(--color-text-muted)] leading-normal">
                Generate tailored ad imagery using 3 AI modes: existing asset transformation (Nano Banana), keyword search themes, or custom free-form concepts.
              </p>
            </div>
          </div>

          <!-- Step 3 -->
          <div class="group bg-[var(--color-bg-secondary)]/80 backdrop-blur-md p-5 rounded-xl border border-[var(--color-bg-tertiary)] hover:border-[var(--color-interactive-primary)] transition-all duration-300 flex items-start gap-4 shadow-sm hover:shadow-md">
            <div class="w-10 h-10 rounded-lg bg-[var(--color-interactive-primary)]/15 text-[var(--color-interactive-primary)] flex items-center justify-center font-bold text-base shrink-0 group-hover:scale-105 transition-transform">
              3
            </div>
            <div>
              <h3 class="text-base font-bold text-[var(--color-text-highlight)] mb-1 flex items-center gap-2">
                Preview & Edit
              </h3>
              <p class="text-sm text-[var(--color-text-muted)] leading-normal">
                Review generated assets in an interactive gallery, fine-tune individual images or batch edit with natural language AI prompts, and deploy directly to Google Ads.
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: Login Card -->
      <div class="lg:col-span-5 flex justify-center">
        <div class="w-full max-w-md bg-[var(--color-bg-secondary)]/90 backdrop-blur-xl p-8 rounded-2xl border border-[var(--color-bg-tertiary)] shadow-2xl space-y-6">
          <div class="text-center space-y-2">
            <h2 class="text-2xl font-bold text-[var(--color-text-highlight)]">Get Started</h2>
            <p class="text-sm text-[var(--color-text-muted)]">
              Sign in with your OAuth Client ID to access your campaigns.
            </p>
          </div>

          <!-- Inline Error Message -->
          <div
            v-if="errorMessage"
            class="p-3 bg-[var(--color-status-error)]/15 border border-[var(--color-status-error)]/30 rounded-lg text-[var(--color-status-error)] text-sm flex items-center gap-2 animate-pulse"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 shrink-0">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
            </svg>
            <span>{{ errorMessage }}</span>
          </div>

          <form @submit.prevent="handleLogin" class="space-y-5">
            <div class="space-y-2">
              <label for="client-id" class="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-primary)]">
                Google Cloud Client ID
              </label>
              <input
                type="text"
                id="client-id"
                name="client-id"
                v-model="configStore.googleClientId"
                placeholder="e.g. 123456789-abc.apps.googleusercontent.com"
                class="w-full px-4 py-3 rounded-lg bg-[var(--color-bg-primary)] border border-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] placeholder-[var(--color-text-dim)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-interactive-primary)] transition-all"
              />
            </div>

            <div class="pt-1">
              <label class="flex items-center gap-3 text-sm text-[var(--color-text-muted)] cursor-pointer select-none">
                <input
                  type="checkbox"
                  id="use-redirect-flow"
                  v-model="configStore.useRedirectFlow"
                  class="rounded border-[var(--color-bg-tertiary)] text-[var(--color-interactive-primary)] focus:ring-[var(--color-interactive-primary)] w-4 h-4 cursor-pointer"
                />
                <span>Use Redirect Flow <span class="text-xs text-[var(--color-text-dim)]">(Recommended if popups fail)</span></span>
              </label>
            </div>

            <button
              type="submit"
              class="w-full py-3.5 px-4 bg-[#4285F4] hover:bg-[#357AE8] text-white font-bold rounded-xl shadow-lg hover:shadow-blue-500/25 transition-all duration-200 flex items-center justify-center gap-3 cursor-pointer group"
            >
              <div class="w-6 h-6 bg-white rounded-full flex items-center justify-center p-1">
                <svg viewBox="0 0 24 24" class="w-full h-full">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
              </div>
              <span>Sign in with Google</span>
            </button>
          </form>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import {
  createTokenClient,
  redirectToGoogleSignIn,
} from "@/services/googleAuth";
import { useAuthStore } from "@/stores/auth";
import { useConfigStore } from "@/stores/config";
import { useRouter } from "vue-router";

const authStore = useAuthStore();
const configStore = useConfigStore();
const router = useRouter();
const errorMessage = ref("");

const GOOGLE_API_SCOPES =
  "openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/devstorage.read_write https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/adwords";

async function handleLogin() {
  errorMessage.value = "";
  const clientId = configStore.googleClientId?.trim();
  if (!clientId) {
    errorMessage.value = "Please enter a valid Google Cloud Client ID.";
    return;
  }

  if (configStore.useRedirectFlow) {
    redirectToGoogleSignIn(clientId, GOOGLE_API_SCOPES);
    return;
  }

  const loginCallback = async (tokenResponse) => {
    if (tokenResponse && tokenResponse.access_token) {
      const token = tokenResponse.access_token;
      const expiresIn = tokenResponse.expires_in;
      authStore.setAccessToken(token, expiresIn);
      router.push("/");
    } else {
      errorMessage.value = "Authentication failed or cancelled. Please try again.";
    }
  };

  const client = createTokenClient(clientId, GOOGLE_API_SCOPES, loginCallback);
  client.requestAccessToken();
}
</script>

<style scoped>
.adir-letter {
  display: inline-block;
  font-weight: 900;
  font-size: 1.12em;
  background: linear-gradient(135deg, #38bdf8 0%, #3b82f6 50%, #818cf8 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 0 12px rgba(56, 189, 248, 0.45));
  position: relative;
  margin-right: 0.5px;
}

.adir-letter::after {
  content: '';
  position: absolute;
  bottom: 0px;
  left: 0;
  width: 100%;
  height: 3px;
  background: linear-gradient(90deg, #38bdf8, #818cf8);
  border-radius: 9999px;
  box-shadow: 0 0 8px rgba(56, 189, 248, 0.6);
}
</style>
