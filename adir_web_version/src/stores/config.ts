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
    geminiModel: "gemini-2.5-flash",
    imageGenModel: "",
    googleClientId: "",
    geminiApiKey: "", // Used for image editing using Nano Banana
  }),
  persist: true,
});
