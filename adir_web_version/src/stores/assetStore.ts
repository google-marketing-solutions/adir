import { listImages } from "@/services/gcsService";
import { defineStore } from "pinia";

/**
 * Pinia store for managing asset state.
 */
export const useAssetStore = defineStore("assetStore", {
  state: () => ({
    assets: [],
    selectedAssets: new Set(),
    removedAssets: new Set(),
    gcsImages: [],
    lastFetched: null,
    imageDataCache: {},
    needsRefresh: false,
  }),
  getters: {
    getImageData: (state) => (uri) => state.imageDataCache[uri],
    isAssetSelected: (state) => (uniqueId) => {
      return state.selectedAssets.has(uniqueId);
    },
    isAssetRemoved: (state) => (uniqueId) => {
      return state.removedAssets.has(uniqueId);
    },

    groupedAssets: (state) => {
      const campaigns = {};
      state.assets.forEach((asset) => {
        const campaignName = asset.campaign.name;
        if (!campaigns[campaignName]) {
          campaigns[campaignName] = {
            name: campaignName,
            assetGroups: {},
            adGroups: {},
          };
        }

        if (asset.type === "pmax") {
          const groupName = asset.assetGroup.name;
          if (!campaigns[campaignName].assetGroups[groupName]) {
            campaigns[campaignName].assetGroups[groupName] = {
              name: groupName,
              assets: [],
              type: "pmax",
            };
          }
          campaigns[campaignName].assetGroups[groupName].assets.push(asset);
        } else if (asset.type === "demandgen") {
          const adGroupName = asset.adGroup.name;
          const adResourceName = asset.adGroupAd.resourceName;
          const adName = asset.adGroupAd.ad.name;

          if (!campaigns[campaignName].adGroups[adGroupName]) {
            campaigns[campaignName].adGroups[adGroupName] = {
              name: adGroupName,
              type: "demandgen",
              ads: {},
            };
          }

          if (
            !campaigns[campaignName].adGroups[adGroupName].ads[adResourceName]
          ) {
            campaigns[campaignName].adGroups[adGroupName].ads[adResourceName] =
              {
                name: adName,
                resourceName: adResourceName,
                assets: [],
              };
          }

          campaigns[campaignName].adGroups[adGroupName].ads[
            adResourceName
          ].assets.push(asset);
        }
      });
      return Object.values(campaigns);
    },
  },
  actions: {
    setAssets(newAssets) {
      this.assets = newAssets;
      this.selectedAssets = new Set();
      this.removedAssets.clear();
    },
    setNeedsRefresh(value) {
      this.needsRefresh = value;
    },
    async fetchGcsImages(customerId, force = false) {
      const now = Date.now();
      const cacheDuration = 300000; // 5 minutes

      if (
        !force &&
        this.gcsImages.length > 0 &&
        this.lastFetched &&
        now - this.lastFetched < cacheDuration
      ) {
        return this.gcsImages;
      }

      try {
        const fetchedImages = await listImages(`${customerId}/`);
        this.gcsImages = fetchedImages;
        this.lastFetched = now;
        return this.gcsImages;
      } catch (error) {
        console.error("Failed to fetch GCS images:", error);
        return []; // Return empty array on failure
      }
    },
    clearGcsCache() {
      this.gcsImages = [];
      this.lastFetched = null;
      this.imageDataCache = {};
    },
    cacheImageData({ uri, dataUrl }) {
      this.imageDataCache[uri] = dataUrl;
    },
    markAsRemoved(removedIds) {
      removedIds.forEach((id) => {
        this.removedAssets.add(id);
      });
    },
    toggleAssetSelection(uniqueId) {
      if (this.selectedAssets.has(uniqueId)) {
        this.selectedAssets.delete(uniqueId);
      } else {
        this.selectedAssets.add(uniqueId);
      }
    },
    selectAssets({ assetResourceNames, shouldSelect }) {
      // Note: assetResourceNames is now expected to be an array of unique IDs
      assetResourceNames.forEach((uniqueId) => {
        if (shouldSelect) {
          this.selectedAssets.add(uniqueId);
        } else {
          this.selectedAssets.delete(uniqueId);
        }
      });
    },
    clearSelections() {
      this.selectedAssets.clear();
    },
  },
});
