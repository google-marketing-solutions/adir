import { defineStore } from "pinia";

/**
 * Pinia store for managing asset state.
 */
export const useAssetStore = defineStore("assetStore", {
  state: () => ({
    assets: [],
    selectedAssets: new Set(),
    removedAssets: new Set(),
  }),
  getters: {
    isAssetSelected: (state) => (assetResourceName) => {
      return state.selectedAssets.has(assetResourceName);
    },
    isAssetRemoved: (state) => (assetGroupAssetResourceName) => {
      return state.removedAssets.has(assetGroupAssetResourceName);
    },
  },
  actions: {
    setAssets(newAssets) {
      this.assets = newAssets;
      this.selectedAssets = new Set();
      this.removedAssets.clear();
    },
    markAsRemoved(removedResourceNames) {
      removedResourceNames.forEach((resourceName) => {
        this.removedAssets.add(resourceName);
      });
    },
    toggleAssetSelection(assetResourceName) {
      if (this.selectedAssets.has(assetResourceName)) {
        this.selectedAssets.delete(assetResourceName);
      } else {
        this.selectedAssets.add(assetResourceName);
      }
    },
    selectAssets({ assetResourceNames, shouldSelect }) {
      assetResourceNames.forEach((assetResourceName) => {
        if (shouldSelect) {
          this.selectedAssets.add(assetResourceName);
        } else {
          this.selectedAssets.delete(assetResourceName);
        }
      });
    },
    clearSelections() {
      this.selectedAssets.clear();
    },
  },
});
