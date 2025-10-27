import { defineStore } from "pinia";

declare const google: any;

/**
 * Pinia store for managing authentication state.
 */
export const useAuthStore = defineStore("auth", {
  state: () => ({
    accessToken: null as string | null,
    expiresAt: null as number | null,
  }),
  getters: {
    isAuthenticated: (state): boolean => {
      if (!state.accessToken || !state.expiresAt) {
        return false;
      }
      return new Date().getTime() < state.expiresAt;
    },
  },
  actions: {
    setAccessToken(token: string, expiresIn: number) {
      this.accessToken = token;
      const now = new Date();
      this.expiresAt = now.getTime() + expiresIn * 1000;
    },
    logout() {
      if (this.accessToken) {
        // This revokes the token on Google's side
        google.accounts.oauth2.revoke(this.accessToken, () => {
          console.log("Token revoked");
        });
      }
      // This clears it from our app
      this.accessToken = null;
      this.expiresAt = null;
    },
  },
  persist: true,
});
