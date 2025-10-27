<script setup>
import GcsImage from "@/components/GcsImage.vue";
import MultiSelectDropdown from "@/components/MultiSelectDropdown.vue";
import { listImages, removeImages } from "@/services/gcsService";
import { useConfigStore } from "@/stores/config";
import { computed, onMounted, ref, watch } from "vue";

const emit = defineEmits(["change-subpage"]);
const showSuccessMessage = ref(false);
const previewData = ref([]);
const isLoading = ref(true);
const isRemoving = ref(false);
const removalMessage = ref("");
const configStore = useConfigStore();

const fetchImages = async () => {
  if (!configStore.customerID) {
    console.error("Customer ID not available in config store.");
    isLoading.value = false;
    return;
  }
  isLoading.value = true;
  try {
    const images = await listImages(`${configStore.customerID}/`);
    console.log("Raw images from GCS:", images);
    const campaigns = {};

    images.forEach((image, index) => {
      const parts = image.name.split("/");
      // 0: account_id, 1: campaign_id or 'manual_mode', 2: asset_group_id or 'GENERATED', ...
      if (parts.length < 3) return;

      let campaignName, assetGroupName;
      const accountId = parts[0];

      if (parts[1] === "manual_mode" && parts[2] === "GENERATED") {
        campaignName = "Manual";
        assetGroupName = "Generated";
      } else if (parts.length >= 4) {
        const campaignIdentifier = parts[1];
        const assetGroupIdentifier = parts[2];
        campaignName = campaignIdentifier.split("~")[0].replace(/_/g, " ");
        assetGroupName = assetGroupIdentifier.split("~")[0].replace(/_/g, " ");
      } else {
        return;
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
        selected: true,
      });
    });

    previewData.value = Object.values(campaigns).map((campaign) => ({
      ...campaign,
      assetGroups: Object.values(campaign.assetGroups),
    }));
    console.log("Processed preview data:", previewData.value);
    selectedCampaigns.value = campaignOptions.value.map((c) => c.value);
  } catch (error) {
    console.error("Error fetching images:", error);
  } finally {
    isLoading.value = false;
  }
};

onMounted(fetchImages);

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
  return previewData.value.filter((c) =>
    selectedCampaigns.value.includes(c.campaignName),
  );
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
    await fetchImages(); // Refetch images to update the view
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
        <div class="flex gap-4">
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
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      class="mt-8 pt-6 border-t border-gray-700 flex justify-between items-center gap-4"
    >
      <div v-if="showSuccessMessage" class="text-green-400">
        <strong>Success!</strong> Selected assets uploaded to Asset Library.
      </div>
      <div v-if="removalMessage" class="text-white">
        {{ removalMessage }}
      </div>
      <div class="flex gap-4 ml-auto">
        <button
          @click.prevent="emit('change-subpage', 'generation')"
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
          @click.prevent="showSuccessMessage = true"
          class="bg-cyan-600 text-white font-bold py-2 px-6 rounded-md hover:bg-cyan-700"
        >
          Upload Selected to Asset Library
        </button>
      </div>
    </div>
  </div>
</template>
