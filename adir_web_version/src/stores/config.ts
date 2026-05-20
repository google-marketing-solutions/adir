import { defineStore } from "pinia";

/**
 * Pinia store for managing application configuration.
 */
export const useConfigStore = defineStore("config", {
  state: () => ({
    cloudProjectID: "",
    cloudRegion: "",
    gcsBucketName: "",
    mccID: "",
    customerID: "",
    developerToken: "",
    geminiModel: "gemini-3-flash-preview",
    nanoBananaModel: "gemini-3.1-flash-image-preview",
    imageGenModel: "imagen-3.0-generate-002",
    googleClientId: "",
    useSecretManager: false,
  }),
  persist: true,
});
