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
    enableEvaluation: false,
    maxEvaluationRetries: 3,
    evaluationRules: "",
    aspectRatios: [
      { label: "Square (1:1)", ratio: "1:1", count: 0 },
      { label: "Portrait (9:16)", ratio: "9:16", count: 0 },
      { label: "Landscape (16:9)", ratio: "16:9", count: 0 },
    ],
    promptTemplates: [
      {
        label: "Outpaint & Keep Content Intact",
        prompt: `Crop or outpaint the provided image to the requested aspect ratio.
RESTRICTION: DO NOT modify, rotate, reposition, or alter any existing objects, people, or text in the original image. The original content must remain exactly as it is.
ACTION: Extend the image PURELY with environmental background (e.g., sky, walls, floors, empty space) to fill the new aspect ratio. Maintain the same style, lighting, and tone.
CRITICAL: NO NEW ADDITIONS. Do not add any new icons, symbols, writing, or objects. The new areas must be completely empty.`,
      },
      {
        label: "Remove Background",
        prompt: "Remove the background of the image and replace it with a clean, minimalist studio background with soft lighting.",
      },
      {
        label: "Black Friday Theme",
        prompt: "Add subtle Black Friday elements to the background, like dark aesthetic, red accents, and a mood of high-end retail sale, without altering the main subject.",
      },
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
    addPromptTemplate(label: string, prompt: string) {
      this.promptTemplates.push({ label, prompt });
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
