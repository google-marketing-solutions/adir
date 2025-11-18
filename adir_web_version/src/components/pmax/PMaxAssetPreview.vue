<script setup>
import GcsImage from "@/components/GcsImage.vue";
import MultiSelectDropdown from "@/components/MultiSelectDropdown.vue";
import ScrollToTopButton from "@/components/ScrollToTopButton.vue";
import {
  downloadFileAsBase64,
  moveImages,
  removeImages,
} from "@/services/gcsService";
import { uploadImageAssets } from "@/services/googleAdsService";
import { useAssetStore } from "@/stores/assetStore";
import { useConfigStore } from "@/stores/config";
import { computed, onActivated, ref, watch } from "vue";
import { useRoute } from "vue-router";

const assetStore = useAssetStore();
const emit = defineEmits(["change-page"]);
const showSuccessMessage = ref(false);
const allImagesCache = ref([]);
const previewData = ref([]);
const isLoading = ref(true);
const isRemoving = ref(false);
const isUploading = ref(false);
const uploadMessage = ref("");
const removalMessage = ref("");
const showUploaded = ref(false);
const configStore = useConfigStore();
const route = useRoute();
const initialLoad = ref(true);

const fetchImages = async (force = false) => {
  if (!configStore.customerID) {
    console.error("Customer ID not available in config store.");
    isLoading.value = false;
    return;
  }
  isLoading.value = true;
  try {
    const images = await assetStore.fetchGcsImages(
      configStore.customerID,
      force,
    );
    console.log("Raw images from GCS:", images);
    allImagesCache.value = images;
    await processImages();
  } catch (error) {
    console.error("Error fetching images:", error);
  } finally {
    isLoading.value = false;
  }
};

const processImages = async () => {
  isLoading.value = true;
  await new Promise((resolve) => setTimeout(resolve, 0)); // Allow UI to update

  const campaigns = {};
  const images = allImagesCache.value; // Process all images once

  images.forEach((image, index) => {
    const parts = image.name.split("/");
    // The image path from GCS is expected to the following structure:
    // customerId/campaignname~id/assetGroupnamd~id/statusFolder/image.jpg
    // For example: '1234567890/Campaign_Name~123/Asset_Group_Name~456/GENERATED/image.jpg'
    if (parts.length < 4) return;

    const statusFolder = parts[parts.length - 2];

    let campaignName, assetGroupName;
      if (parts[1] === "manual_mode" && parts[2] === "GENERATED") {
        campaignName = "Manual";
        assetGroupName = "Generated";
      } else {
        const campaignIdentifier = parts[1];
        const assetGroupIdentifier = parts[2];
        campaignName = campaignIdentifier.split("~")[0].replace(/_/g, " ");
        assetGroupName = assetGroupIdentifier.split("~")[0].replace(/_/g, " ");
      }

      if (!campaigns[campaignName]) {
        campaigns[campaignName] = { campaignName, assetGroups: {} };
      }
      if (!campaigns[campaignName].assetGroups[assetGroupName]) {
        campaigns[campaignName].assetGroups[assetGroupName] = {
          groupName: assetGroupName,
          assets: [],
        };
      }

    campaigns[campaignName].assetGroups[assetGroupName].assets.push({
      id: `gen-${index}`,
      src: image.gcsUri,
      name: image.name,
      selected: statusFolder !== "UPLOADED",
      uploaded: statusFolder === "UPLOADED",
    });
  });

  previewData.value = Object.values(campaigns).map((campaign) => ({
    ...campaign,
    assetGroups: Object.values(campaign.assetGroups),
  }));
  console.log("Processed preview data:", previewData.value);
  selectedCampaigns.value = campaignOptions.value.map((c) => c.value);
  isLoading.value = false;
};

onActivated(() => {
  if (initialLoad.value || assetStore.needsRefresh) {
    fetchImages(true);
    assetStore.setNeedsRefresh(false); // Reset the flag if it was set
    initialLoad.value = false; // Ensure this only runs once on initial load
  }
});

watch(showUploaded, () => {
  // No need to re-process everything, just filter the view
  // This is handled by the `imagesToProcess` computed property now.
  // The watcher is kept to trigger re-computation if necessary.
});

const selectedCampaigns = ref([]);
const selectedAssetGroups = ref([]);

const campaignOptions = computed(() => {
  const options = new Set(previewData.value.map((c) => c.campaignName));
  return Array.from(options).map((name) => ({ label: name, value: name }));
});

const availableAssetGroups = computed(() => {
  const assetGroups = new Set();
  previewData.value
    .filter((c) => selectedCampaigns.value.includes(c.campaignName))
    .forEach((c) => {
      c.assetGroups.forEach((ag) => assetGroups.add(ag.groupName));
    });
  return Array.from(assetGroups).map((name) => ({ label: name, value: name }));
});

watch(
  availableAssetGroups,
  (newGroups) => {
    selectedAssetGroups.value = newGroups.map((g) => g.value);
  },
  { deep: true },
);

const filteredCampaigns = computed(() => {
  const filtered = previewData.value
    .map((campaign) => {
      const newCampaign = { ...campaign };
      newCampaign.assetGroups = newCampaign.assetGroups
        .map((group) => {
          const newGroup = { ...group };
          newGroup.assets = newGroup.assets.filter(
            (asset) => showUploaded.value || !asset.uploaded,
          );
          return newGroup;
        })
        .filter((group) => group.assets.length > 0);
      return newCampaign;
    })
    .filter(
      (campaign) =>
        campaign.assetGroups.length > 0 &&
        selectedCampaigns.value.includes(campaign.campaignName),
    );
  return filtered;
});

function toggleSelectAll(assets, value) {
  assets.forEach((asset) => (asset.selected = value));
}

const allSelected = computed(() => {
  return previewData.value.every((c) =>
    c.assetGroups.every((ag) => ag.assets.every((a) => a.selected)),
  );
});

function setAllCheckboxes(value) {
  previewData.value.forEach((c) =>
    c.assetGroups.forEach((ag) =>
      ag.assets.forEach((a) => (a.selected = value)),
    ),
  );
}

const areAllInCampaignSelected = (campaign) => {
  return campaign.assetGroups.every((ag) => ag.assets.every((a) => a.selected));
};

const areAllInGroupSelected = (group) => {
  return group.assets.every((a) => a.selected);
};

function toggleCampaignSelection(campaign, shouldSelect) {
  campaign.assetGroups.forEach((ag) => {
    ag.assets.forEach((a) => (a.selected = shouldSelect));
  });
}

function toggleGroupSelection(group, shouldSelect) {
  group.assets.forEach((a) => (a.selected = shouldSelect));
}

const handleRemoveSelected = async () => {
  const selectedImageUris = [];
  previewData.value.forEach((campaign) => {
    campaign.assetGroups.forEach((group) => {
      group.assets.forEach((asset) => {
        if (asset.selected) {
          selectedImageUris.push(asset.src);
        }
      });
    });
  });

  if (selectedImageUris.length === 0) {
    removalMessage.value = "No images selected for removal.";
    setTimeout(() => {
      removalMessage.value = "";
    }, 3000);
    return;
  }

  isRemoving.value = true;
  removalMessage.value = "Removing the requested images...";

  try {
    await removeImages(selectedImageUris);
    await fetchImages(true); // Force refetch
    removalMessage.value = "Images removed successfully.";
  } catch (error) {
    console.error("Error removing images:", error);
    removalMessage.value = "Error removing images.";
  } finally {
    isRemoving.value = false;
    setTimeout(() => {
      removalMessage.value = "";
    }, 3000);
  }
};

const handleUploadSelected = async () => {
  const selectedImages = [];
  previewData.value.forEach((campaign) => {
    campaign.assetGroups.forEach((group) => {
      group.assets.forEach((asset) => {
        if (asset.selected && !asset.uploaded) {
          selectedImages.push({
            name: asset.name,
            gcsUri: asset.src,
          });
        }
      });
    });
  });

  if (selectedImages.length === 0) {
    uploadMessage.value = "No new images selected for upload.";
    setTimeout(() => (uploadMessage.value = ""), 3000);
    return;
  }

  isUploading.value = true;
  uploadMessage.value = `Uploading ${selectedImages.length} images...`;

  try {
    const imagesWithContent = await Promise.all(
      selectedImages.map(async (image) => {
        const base64Content = await downloadFileAsBase64(image.gcsUri);
        return {
          name: image.name,
          content: base64Content,
        };
      })
    );

    await uploadImageAssets(imagesWithContent);
    const imageNamesToMove = selectedImages.map((img) => img.name);
    await moveImages(imageNamesToMove);
    await fetchImages(true); // Force refetch
    uploadMessage.value = "Images uploaded and moved successfully.";
  } catch (error) {
    console.error("Error uploading images:", error);
    uploadMessage.value = "Error during upload process.";
  } finally {
    isUploading.value = false;
    setTimeout(() => (uploadMessage.value = ""), 3000);
  }
};
</script>

<template>
  <div>
    <h2 class="text-2xl font-bold mb-4">Generated Asset Preview</h2>

    <div v-if="isLoading" class="flex justify-center items-center h-64">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <div v-else>
      <div
        class="flex justify-between items-center mb-6 bg-gray-800 p-4 rounded-lg"
      >
        <div class="flex gap-4 items-center">
          <button
            @click="setAllCheckboxes(true)"
            class="bg-gray-600 text-white font-bold py-2 px-4 rounded-md hover:bg-gray-700"
          >
            Select All
          </button>
          <button
            @click="setAllCheckboxes(false)"
            class="bg-gray-600 text-white font-bold py-2 px-4 rounded-md hover:bg-gray-700"
          >
            Deselect All
          </button>
          <div class="form-control">
            <label class="label cursor-pointer">
              <span class="label-text mr-2">Show Uploaded</span>
              <input
                type="checkbox"
                v-model="showUploaded"
                class="toggle toggle-primary"
              />
            </label>
          </div>
        </div>
        <div class="flex-grow flex justify-end gap-4 items-center">
          <div class="flex-1 max-w-md">
            <label for="campaign-filter" class="mr-2">Campaign:</label>
            <MultiSelectDropdown
              :options="campaignOptions"
              v-model="selectedCampaigns"
            />
          </div>
          <div class="flex-1 max-w-md">
            <label for="asset-group-filter" class="mr-2">Asset Group:</label>
            <MultiSelectDropdown
              :options="availableAssetGroups"
              v-model="selectedAssetGroups"
            />
          </div>
        </div>
      </div>
      <div
        class="mt-8 pt-6 mb-4 border-t border-gray-700 flex justify-between items-center gap-4"
      >
        <div v-if="uploadMessage" class="text-white">
          {{ uploadMessage }}
        </div>
        <div v-if="removalMessage" class="text-white">
          {{ removalMessage }}
        </div>
        <div class="flex gap-4 ml-auto">
          <button
            @click.prevent="emit('change-page', 'PMaxAssetGeneration')"
            class="bg-gray-600 text-white font-bold py-2 px-6 rounded-md hover:bg-gray-700"
          >
            Back
          </button>
          <button
            @click.prevent="handleRemoveSelected"
            :disabled="isRemoving"
            class="bg-red-600 text-white font-bold py-2 px-6 rounded-md hover:bg-red-700 disabled:bg-gray-400"
          >
            {{ isRemoving ? "Removing..." : "Remove Selected" }}
          </button>
          <button
            @click.prevent="handleUploadSelected"
            :disabled="isUploading"
            class="bg-cyan-600 text-white font-bold py-2 px-6 rounded-md hover:bg-cyan-700 disabled:bg-gray-400"
          >
            {{ isUploading ? "Uploading..." : "Upload Selected to Asset Library" }}
          </button>
        </div>
      </div>

      <div class="space-y-8">
        <div
          v-for="campaign in filteredCampaigns"
          :key="campaign.campaignName"
          class="bg-gray-800 rounded-lg p-6"
        >
          <h3 class="text-xl font-semibold text-white mb-4">
            <input
              type="checkbox"
              :checked="areAllInCampaignSelected(campaign)"
              @change="toggleCampaignSelection(campaign, $event.target.checked)"
              class="h-5 w-5 rounded mr-2"
            />
            {{ campaign.campaignName }}
          </h3>
          <div class="space-y-6">
            <div
              v-for="group in campaign.assetGroups"
              :key="group.groupName"
              v-show="selectedAssetGroups.includes(group.groupName)"
            >
              <h4 class="text-lg font-medium text-cyan-400 mb-3">
                <input
                  type="checkbox"
                  :checked="areAllInGroupSelected(group)"
                  @change="toggleGroupSelection(group, $event.target.checked)"
                  class="h-5 w-5 rounded mr-2"
                />
                {{ group.groupName }}
              </h4>
              <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <div
                  v-for="asset in group.assets"
                  :key="asset.id"
                  class="relative"
                >
                  <GcsImage
                    :gcs-uri="asset.src"
                    alt="Asset"
                    class="rounded-lg"
                  />
                  <input
                    type="checkbox"
                    v-model="asset.selected"
                    class="absolute top-2 left-2 h-5 w-5 rounded"
                    :disabled="asset.uploaded"
                  />
                  <div
                    v-if="asset.uploaded"
                    class="absolute top-2 right-2 bg-green-500 text-white rounded-full h-6 w-6 flex items-center justify-center"
                  >
                    ✓
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <ScrollToTopButton :visible="showScrollButton" :scroll-to-top="scrollToTop" />
  </div>
</template>
