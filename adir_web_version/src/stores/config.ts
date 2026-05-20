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
    aspectRatios: [
      { label: "Square (1:1)", ratio: "1:1", count: 0 },
      { label: "Portrait (9:16)", ratio: "9:16", count: 0 },
      { label: "Landscape (16:9)", ratio: "16:9", count: 0 },
    ],
  }),
  getters: {
    allAllowedAspectRatios: () => [
      { label: "Square (1:1)", ratio: "1:1" },
      { label: "Portrait (9:16)", ratio: "9:16" },
      { label: "Landscape (16:9)", ratio: "16:9" },
      { label: "1:4", ratio: "1:4" },
      { label: "1:8", ratio: "1:8" },
      { label: "2:3", ratio: "2:3" },
      { label: "3:2", ratio: "3:2" },
      { label: "3:4", ratio: "3:4" },
      { label: "4:1", ratio: "4:1" },
      { label: "4:3", ratio: "4:3" },
      { label: "4:5", ratio: "4:5" },
      { label: "5:4", ratio: "5:4" },
      { label: "8:1", ratio: "8:1" },
      { label: "21:9", ratio: "21:9" },
    ],
  },
  actions: {
    addAspectRatio(label: string, ratio: string) {
      const exists = this.aspectRatios.some((ar) => ar.ratio === ratio);
      if (!exists) {
        this.aspectRatios.push({ label, ratio, count: 0 });
      }
    },
    resetAspectRatios() {
      this.aspectRatios = [
        { label: "Square (1:1)", ratio: "1:1", count: 0 },
        { label: "Portrait (9:16)", ratio: "9:16", count: 0 },
        { label: "Landscape (16:9)", ratio: "16:9", count: 0 },
      ];
    },
  },
  persist: true,
});
