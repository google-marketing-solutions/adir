import { defineStore } from "pinia";

export const useBrandStore = defineStore("brand", {
  state: () => ({
    guidelines: "",
    useGuidelinesInGeneration: false,
  }),
  actions: {
    setGuidelines(guidelines: string) {
      this.guidelines = guidelines;
    },
    setUseGuidelines(value: boolean) {
      this.useGuidelinesInGeneration = value;
    },
  },
  persist: true,
});
