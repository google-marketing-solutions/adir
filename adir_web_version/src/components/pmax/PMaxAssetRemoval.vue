<script setup>
import ProxiedImage from "@/components/ProxiedImage.vue";
import ScrollToTopButton from "@/components/ScrollToTopButton.vue";
import {
  fetchDemandGenAssets,
  fetchPMaxAssets,
  removeAssetGroupAssets,
} from "@/services/googleAdsService.ts";
import { useAssetStore } from "@/stores/assetStore";
import { useCampaignStore } from "@/stores/campaignStore";
import { computed, defineEmits, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const assetStore = useAssetStore();
const campaignStore = useCampaignStore();
const removalStep = ref(1);
const emit = defineEmits(["change-subpage"]);
const showRemovalNotice = ref(false);
const isLoading = ref(false);
const isRemoving = ref(false);
const showSuccessMessage = ref(false);
const successMessage = ref("");

const conditions = ref([]);
let conditionIdCounter = 0;
const dateRange = ref("LAST_30_DAYS");

const activeMetrics = computed(() => {
  return new Set(conditions.value.map((c) => c.metric));
});

const getAssetFormat = (asset) => {
  if (asset.type === "pmax") {
    let format = asset.assetGroupAsset?.resourceName?.split("~").pop();
    if (format === "MARKETING_IMAGE") {
      format = "LANDSCAPE_MARKETING_IMAGE";
    }
    return format;
  } else {
    const { width, height } = asset.asset?.imageAsset?.fullSize || {};
    if (width && height) {
      if (width === height) {
        return "SQUARE_MARKETING_IMAGE";
      } else if (width > height) {
        return "LANDSCAPE_MARKETING_IMAGE";
      } else {
        return "PORTRAIT_MARKETING_IMAGE";
      }
    }
    return "UNKNOWN"; // Or handle appropriately
  }
};

const getAssetResourceName = (asset) => {
  return asset.type === "pmax"
    ? asset.assetGroupAsset.resourceName
    : asset.asset.resourceName;
};

const getAssetUniqueId = (asset) => {
  if (asset.type === "demandgen") {
    // For Demand Gen, the combination of ad and asset is the one used in the API
    return `${asset.adGroupAd?.resourceName || 'unknown-ad'}~${asset.asset?.resourceName || 'unknown-asset'}`;
  }
  // For PMax, the asset group asset resource name is enough
  return asset.assetGroupAsset?.resourceName || 'unknown-pmax-asset';
};

const assetFormats = [
  "SQUARE_MARKETING_IMAGE",
  "PORTRAIT_MARKETING_IMAGE",
  "LANDSCAPE_MARKETING_IMAGE",
  "UNKNOWN",
];
const visibleFormats = ref(new Set(assetFormats));
const filterTrigger = ref(0);

function updateVisibleFormats(format, isChecked) {
  const newVisibleFormats = new Set(visibleFormats.value);
  if (isChecked) {
    newVisibleFormats.add(format);
  } else {
    newVisibleFormats.delete(format);
  }
  visibleFormats.value = newVisibleFormats;
  filterTrigger.value++;
}

const filteredAssets = computed(() => {
  filterTrigger.value; // Depend on the trigger
  return assetStore.assets.filter((asset) => {
    const format = getAssetFormat(asset);
    return visibleFormats.value.has(format);
  });
});

const groupedAssets = computed(() => {
  // Use the new getter from the asset store
  const allGroupedAssets = assetStore.groupedAssets;

  // We still need to filter based on the visible formats selected in the UI
  // The getter in the store operates on all assets, so we filter here.
  const filteredCampaigns = allGroupedAssets
    .map((campaign) => {
      const filteredCampaign = { ...campaign, assetGroups: {}, adGroups: {} };

      // Filter PMax asset groups
      Object.values(campaign.assetGroups).forEach((assetGroup) => {
        const filteredAssetsInGroup = assetGroup.assets.filter((asset) =>
          visibleFormats.value.has(getAssetFormat(asset)),
        );
        if (filteredAssetsInGroup.length > 0) {
          filteredCampaign.assetGroups[assetGroup.name] = {
            ...assetGroup,
            assets: filteredAssetsInGroup,
          };
        }
      });

      // Filter Demand Gen ad groups and their ads
      Object.values(campaign.adGroups).forEach((adGroup) => {
        const filteredAdGroup = { ...adGroup, ads: {} };
        let hasVisibleAssetsInAdGroup = false;

        Object.values(adGroup.ads).forEach((ad) => {
          const filteredAssetsInAd = ad.assets.filter((asset) =>
            visibleFormats.value.has(getAssetFormat(asset)),
          );
          if (filteredAssetsInAd.length > 0) {
            filteredAdGroup.ads[ad.name] = {
              ...ad,
              assets: filteredAssetsInAd,
            };
            hasVisibleAssetsInAdGroup = true;
          }
        });

        if (hasVisibleAssetsInAdGroup) {
          filteredCampaign.adGroups[adGroup.name] = filteredAdGroup;
        }
      });

      // Only include the campaign if it has any visible assets left after filtering
      if (
        Object.keys(filteredCampaign.assetGroups).length > 0 ||
        Object.keys(filteredCampaign.adGroups).length > 0
      ) {
        return filteredCampaign;
      }
      return null;
    })
    .filter(Boolean); // Remove nulls

  return filteredCampaigns;
});

// Pass the currency code dynamically (e.g., 'ILS', 'EUR', 'USD')
const formatAdsCurrency = (micros, currencyCode = "USD") => {
  if (micros === undefined || micros === null) {
    return "N/A";
  }
  const actualAmount = micros / 1000000;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
  }).format(actualAmount);
};

const safeFormat = (value, formatterFn) => {
  const num = Number(value);
  if (isNaN(num)) {
    return "N/A";
  }
  return formatterFn(num);
};

// Specific Formatters (using Intl for precision)
const formatters = {
  // For Conversions, Clicks, Impressions
  number: (val) =>
    new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(val),

  // For CTR, Conv. Rate
  percent: (val) =>
    new Intl.NumberFormat("en-US", {
      style: "percent",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val),
};

// 3. Expose clean functions to the template
const formatNumber = (val) => safeFormat(val, formatters.number);
const formatPercent = (val) => safeFormat(val, formatters.percent);

async function handleCheckAssets() {
  isLoading.value = true;
  try {
    if (
      !campaignStore.selectedCampaigns ||
      campaignStore.selectedCampaigns.length === 0
    ) {
      console.error("No campaigns selected or prop not ready.");
      isLoading.value = false;
      return;
    }
    const pmaxCampaigns = campaignStore.selectedCampaigns.filter(
      (c) => c.type === "pmax",
    );
    const demandGenCampaigns = campaignStore.selectedCampaigns.filter(
      (c) => c.type === "demandgen",
    );

    const pmaxCampaignIds = pmaxCampaigns.map((c) => c.campaign.id);
    const demandGenCampaignIds = demandGenCampaigns.map((c) => c.campaign.id);

    let pmaxResults = [];
    if (pmaxCampaignIds.length > 0) {
      pmaxResults = await fetchPMaxAssets(
        conditions.value,
        dateRange.value,
        pmaxCampaignIds,
      );
      pmaxResults = pmaxResults.map((asset) => ({ ...asset, type: "pmax" }));
    }

    let demandGenResults = [];
    if (demandGenCampaignIds.length > 0) {
      demandGenResults = await fetchDemandGenAssets(
        conditions.value,
        dateRange.value,
        demandGenCampaignIds,
      );
      demandGenResults = demandGenResults.map((asset) => ({
        ...asset,
        type: "demandgen",
      }));
    }

    const allAssets = [...pmaxResults, ...demandGenResults];

    assetStore.setAssets(allAssets || []);
    removalStep.value = 2;
  } catch (error) {
    console.error("Failed to fetch assets:", error);
    // Optionally, show an error message to the user
  } finally {
    isLoading.value = false;
  }
}

function addCondition() {
  conditions.value.push({
    id: ++conditionIdCounter,
    metric: "Clicks",
    operator: "<",
    value: 100,
    logicalOperator: "AND",
  });
}

function removeCondition(index) {
  conditions.value.splice(index, 1);
  if (conditions.value.length === 0) {
    addCondition();
  }
}



onMounted(() => {
  const hasValidAssets =
    assetStore.assets.length > 0 &&
    assetStore.assets.every((a) => a.campaign?.name);

  if (hasValidAssets) {
    removalStep.value = 2;
  } else {
    if (assetStore.assets.length > 0) {
      assetStore.setAssets([]);
    }
    if (conditions.value.length === 0) {
      addCondition();
    }
  }
});

function areAllInGroupSelected(groupAssets) {
  // A group is "all selected" if all its PMax assets are selected.
  // Demand Gen assets are ignored as they cannot be selected.
  const pmaxAssets = groupAssets.filter((asset) => asset.type === "pmax");
  if (pmaxAssets.length === 0) {
    return false; // Cannot be "all selected" if there are no selectable assets.
  }
  return pmaxAssets.every((asset) =>
    assetStore.selectedAssets.has(getAssetUniqueId(asset)),
  );
}

function areAllInCampaignSelected(campaign) {
  // A campaign is "all selected" if all of its PMax assets are selected.
  const allPMaxAssets = Object.values(campaign.assetGroups).flatMap(
    (group) => group.assets,
  );
  if (allPMaxAssets.length === 0) {
    return false; // Nothing to select
  }
  return allPMaxAssets.every((asset) =>
    assetStore.selectedAssets.has(getAssetUniqueId(asset)),
  );
}

async function handleRemoveAssets() {
  if (assetStore.selectedAssets.size === 0) {
    alert("No assets selected for removal.");
    return;
  }
  isRemoving.value = true;
  try {
    // We only need to consider PMax assets, as Demand Gen assets cannot be removed.
    const selectedPMaxAssets = Array.from(assetStore.selectedAssets).filter(
      (uniqueId) => {
        const asset = assetStore.assets.find(
          (a) => getAssetUniqueId(a) === uniqueId,
        );
        return asset && asset.type === "pmax";
      },
    );

    // Handle PMax asset removal
    if (selectedPMaxAssets.length > 0) {
      await removeAssetGroupAssets(selectedPMaxAssets);
      assetStore.markAsRemoved(selectedPMaxAssets);
    }

    const removedAssetsDetails = selectedPMaxAssets
      .map((uniqueId) => {
        return assetStore.assets.find((a) => getAssetUniqueId(a) === uniqueId);
      })
      .filter(Boolean);

    const campaignNames = [
      ...new Set(removedAssetsDetails.map((a) => a.campaign.name)),
    ];
    const assetGroupNames = [
      ...new Set(
        removedAssetsDetails.map((a) =>
          a.type === "pmax" ? a.assetGroup.name : a.adGroup.name,
        ),
      ),
    ];

    successMessage.value = `${selectedPMaxAssets.length} assets removed from ${assetGroupNames.length} asset groups in ${campaignNames.length} campaigns.`;
    showSuccessMessage.value = true;
    assetStore.clearSelections();
  } catch (error) {
    console.error("Failed to remove assets:", error);
    alert("Failed to remove some assets. Check console for details.");
  } finally {
    isRemoving.value = false;
  }
}
</script>

<template>
  <div>
    <div v-if="removalStep === 1">
      <h2 class="text-2xl font-bold mb-4">
        Pull Low-Performing PMax & Demand Gen Assets
      </h2>
      <div class="bg-gray-800 p-8 rounded-lg">
        <p class="text-gray-400 mb-6">
          Define the performance threshold to identify assets for removal. Add
          multiple conditions using "AND" or "OR".
        </p>
        <div
          class="bg-yellow-900 border-l-4 border-yellow-500 text-yellow-100 p-4 mb-6"
          role="alert"
        >
          <p class="font-bold">API Limitation Notice</p>
          <p>
            Note: Demand Gen ad creatives cannot be modified or removed
            programmatically due to a Google Ads API limitation.
          </p>
        </div>
        <div class="space-y-4">
          <div v-for="(condition, index) in conditions" :key="condition.id">
            <div class="condition-row flex items-center gap-2 mb-2">
              <select
                v-model="condition.metric"
                class="bg-gray-700 rounded-md p-2"
              >
                <option>CTR</option>
                <option>Clicks</option>
                <option>Cost</option>
                <option>Impressions</option>
                <option>Conversions</option>
                <option value="AverageCPC">Avg. CPC</option>
                <option value="ConversionValue">Conversion Value</option>
                <option>CPA</option>
                <option value="ConvValuePerCost">Conv. Value / Cost</option>
              </select>
              <select
                v-model="condition.operator"
                class="bg-gray-700 rounded-md p-2"
              >
                <option><</option>
                <option>></option>
                <option>=</option>
                <option><=</option>
                <option>>=</option>
              </select>
              <input
                v-model.number="condition.value"
                type="number"
                placeholder="e.g., 0.5"
                class="bg-gray-700 rounded-md p-2"
              />
              <button
                @click="removeCondition(index)"
                v-if="conditions.length > 1"
                class="text-red-500 hover:text-red-400"
              >
                X
              </button>
            </div>
            <div
              v-if="index < conditions.length - 1"
              class="flex items-center my-2"
            >
              <select
                v-model="condition.logicalOperator"
                class="bg-gray-700 text-cyan-400 rounded-md p-1"
              >
                <option>AND</option>
                <option>OR</option>
              </select>
              <div class="flex-grow border-t border-gray-600 ml-4"></div>
            </div>
          </div>
        </div>
        <button
          @click.prevent="addCondition"
          class="text-cyan-400 font-semibold hover:text-cyan-300 mt-4"
        >
          + Add Condition
        </button>
        <div class="mt-6">
          <label
            for="dateRange"
            class="block text-sm font-medium text-gray-300 mb-2"
            >Date Range</label
          >
          <select
            id="dateRange"
            v-model="dateRange"
            class="bg-gray-700 rounded-md p-2"
          >
            <option value="LAST_7_DAYS">Last 7 Days</option>
            <option value="LAST_14_DAYS">Last 14 Days</option>
            <option value="LAST_30_DAYS">Last 30 Days</option>
          </select>
        </div>
        <div class="mt-6 flex justify-end">
          <button
            @click.prevent="handleCheckAssets"
            class="bg-cyan-600 text-white font-bold py-2 px-6 rounded-md hover:bg-cyan-700"
            :disabled="isLoading"
          >
            {{ isLoading ? "Checking..." : "Fetch Candidates for Removal" }}
          </button>
        </div>
      </div>
    </div>
    <div v-else-if="removalStep === 2">
      <div v-if="assetStore.assets.length > 0">
        <h2 class="text-2xl font-bold mb-4">
          Candidates For Removal - Preview ({{ assetStore.assets.length }})
        </h2>
        <p class="text-gray-400 mb-6">
          Uncheck any images you wish to keep. All checked images will be
          removed from their respective campaigns.
        </p>
        <div
          class="bg-yellow-900 border-l-4 border-yellow-500 text-yellow-100 p-4 mb-6"
          role="alert"
        >
          <p class="font-bold">API Limitation Notice</p>
          <p>
            Note: Demand Gen ad creatives cannot be modified or removed
            programmatically due to a Google Ads API limitation.
          </p>
        </div>
        <div
          class="mt-8 pt-6 border-t border-gray-700 flex justify-end gap-4 mb-4"
        >
          <div
            v-if="showSuccessMessage"
            class="text-green-400 p-4 bg-green-900 bg-opacity-50 rounded-md border border-green-700 mr-auto"
          >
            <strong>Success!</strong> {{ successMessage }}
          </div>
          <button
            @click.prevent="removalStep = 1"
            class="bg-gray-600 text-white font-bold py-2 px-6 rounded-md hover:bg-gray-700"
          >
            Back
          </button>
          <button
            @click.prevent="handleRemoveAssets"
            class="bg-red-600 text-white font-bold py-2 px-6 rounded-md hover:bg-red-700"
            :disabled="isRemoving"
          >
            {{ isRemoving ? "Removing..." : "Remove Assets" }}
          </button>
          <button
            @click.prevent="router.push({ name: 'AssetGeneration' })"
            class="bg-green-600 text-white font-bold py-2 px-6 rounded-md hover:bg-green-700"
          >
            Generate New Assets
          </button>
        </div>
        <div class="filter-bar mb-6 p-4 bg-gray-800 rounded-lg">
          <span class="mr-4 font-semibold">Filter by format:</span>
          <label
            v-for="format in assetFormats"
            :key="format"
            class="inline-flex items-center mr-4"
          >
            <input
              type="checkbox"
              :checked="visibleFormats.has(format)"
              @change="updateVisibleFormats(format, $event.target.checked)"
              class="h-4 w-4 rounded"
            />
            <span class="ml-2 text-sm capitalize">{{
              format.replace(/_MARKETING_IMAGE/g, "").toLowerCase()
            }}</span>
          </label>
        </div>
        <div class="space-y-8">
          <div
            v-for="campaign in groupedAssets"
            :key="campaign.name"
            class="bg-gray-700 rounded-lg p-6"
          >
            <h3 class="text-xl font-semibold text-white mb-4">
              <input
                  type="checkbox"
                  :checked="areAllInCampaignSelected(campaign)"
                  @change="assetStore.selectAssets({ assetResourceNames: Object.values(campaign.assetGroups).flatMap(group => group.assets).map(a => getAssetUniqueId(a)), shouldSelect: $event.target.checked })"
                  class="h-5 w-5 rounded mr-2"
                  :disabled="Object.values(campaign.assetGroups).length === 0"
                />
              {{ campaign.name }}
            </h3>
            <div class="space-y-6">
              <!-- PMax Asset Groups -->
              <div
                v-for="assetGroup in campaign.assetGroups"
                :key="assetGroup.name"
                class="bg-gray-600 rounded-lg p-4 mb-4"
              >
                <h4 class="text-lg font-medium text-cyan-400 mb-3">
                  <input
                    type="checkbox"
                    :checked="areAllInGroupSelected(assetGroup.assets)"
                    @change="
                      assetStore.selectAssets({
                        assetResourceNames: assetGroup.assets.map((a) =>
                          getAssetUniqueId(a),
                        ),
                        shouldSelect: $event.target.checked,
                      })
                    "
                    class="h-5 w-5 rounded mr-2"
                  />
                  {{ assetGroup.name }} (PMax)
                </h4>
                <!-- Asset Grid -->
                <div
                  class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4"
                >
                  <div
                    v-for="asset in assetGroup.assets"
                    :key="getAssetUniqueId(asset)"
                    class="relative"
                  >
                    <ProxiedImage
                      :src="asset.asset.imageAsset.fullSize.url"
                      alt="Asset"
                      class="rounded-lg"
                      :class="{
                        'filter grayscale': assetStore.isAssetRemoved(
                          getAssetUniqueId(asset),
                        ),
                      }"
                    />
                    <div class="text-xs text-gray-400 mt-1 truncate">
                      {{ asset.asset.name }}
                    </div>
                    <div
                      v-if="assetStore.isAssetRemoved(getAssetUniqueId(asset))"
                      class="absolute inset-0 flex items-center justify-center"
                    >
                      <span
                        class="material-symbols-outlined text-red-500 text-6xl select-none"
                      >
                        cancel
                      </span>
                    </div>
                   <input
                     v-if="asset.type === 'pmax'"
                     type="checkbox"
                     :checked="
                       assetStore.isAssetSelected(getAssetUniqueId(asset))
                     "
                     @change="
                       assetStore.toggleAssetSelection(getAssetUniqueId(asset))
                     "
                     class="absolute top-2 left-2 h-5 w-5 rounded"
                   />
                    <div class="metrics-container text-xs mt-1 space-y-1">
                      <div v-if="activeMetrics.has('CTR')">
                        CTR: {{ formatPercent(asset.metrics.ctr) }}
                      </div>
                      <div v-if="activeMetrics.has('Clicks')">
                        Clicks: {{ formatNumber(asset.metrics.clicks) }}
                      </div>
                      <div v-if="activeMetrics.has('Impressions')">
                        Impressions: {{ formatNumber(asset.metrics.impressions) }}
                      </div>
                      <div v-if="activeMetrics.has('Cost')">
                        Cost:
                        {{
                          formatAdsCurrency(
                            asset.metrics.costMicros,
                            campaign.currencyCode,
                          )
                        }}
                      </div>
                      <div v-if="activeMetrics.has('Conversions')">
                        Conversions:
                        {{ formatNumber(asset.metrics.conversions) }}
                      </div>
                      <div v-if="activeMetrics.has('CPA')">
                        CPA:
                        {{
                          formatAdsCurrency(
                            asset.metrics.costPerConversion,
                            campaign.currencyCode,
                          )
                        }}
                      </div>
                      <div v-if="activeMetrics.has('ConvValuePerCost')">
                        Val / Cost:
                        {{ formatNumber(asset.metrics.valuePerCost) }}
                      </div>
                      <div v-if="activeMetrics.has('AverageCPC')">
                        Avg. CPC:
                        {{
                          formatAdsCurrency(
                            asset.metrics.averageCpc,
                            campaign.currencyCode,
                          )
                        }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Demand Gen Ad Groups -->
              <div
                v-for="adGroup in campaign.adGroups"
                :key="adGroup.name"
                class="bg-gray-600 rounded-lg p-4 mb-4"
              >
                <h4 class="text-lg font-medium text-cyan-400 mb-3">
                  <input
                    type="checkbox"
                    :checked="false"
                    :disabled="true"
                    class="h-5 w-5 rounded mr-2"
                  />
                  {{ adGroup.name }} (Demand Gen)
                </h4>
                <!-- Ads within Ad Group -->
                <div
                  v-for="ad in adGroup.ads"
                  :key="ad.resourceName"
                  class="bg-gray-500 rounded-lg p-3 mt-3"
                >
                  <h5 class="text-md font-medium text-white mb-2">
                    <input
                      type="checkbox"
                      :checked="false"
                      :disabled="true"
                      class="h-4 w-4 rounded mr-2"
                    />
                    {{ ad.name }}
                  </h5>
                  <!-- Asset Grid -->
                  <div
                    class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4"
                  >
                    <div
                      v-for="asset in ad.assets"
                      :key="getAssetUniqueId(asset)"
                      class="relative"
                    >
                      <ProxiedImage
                        :src="asset.asset.imageAsset.fullSize.url"
                        alt="Asset"
                        class="rounded-lg"
                        :class="{
                          'filter grayscale': assetStore.isAssetRemoved(
                            getAssetUniqueId(asset),
                          ),
                        }"
                      />
                      <div class="text-xs text-gray-400 mt-1 truncate">
                        {{ asset.asset.name }}
                      </div>
                      <div
                        v-if="assetStore.isAssetRemoved(getAssetUniqueId(asset))"
                        class="absolute inset-0 flex items-center justify-center"
                      >
                        <span
                          class="material-symbols-outlined text-red-500 text-6xl select-none"
                        >
                          cancel
                        </span>
                      </div>
                      <!-- No checkbox for Demand Gen assets -->
                      <div class="metrics-container text-xs mt-1 space-y-1">
                        <div v-if="activeMetrics.has('CTR')">
                          CTR: {{ formatPercent(asset.metrics.ctr) }}
                        </div>
                        <div v-if="activeMetrics.has('Clicks')">
                          Clicks: {{ formatNumber(asset.metrics.clicks) }}
                        </div>
                        <div v-if="activeMetrics.has('Impressions')">
                          Impressions:
                          {{ formatNumber(asset.metrics.impressions) }}
                        </div>
                        <div v-if="activeMetrics.has('Cost')">
                          Cost:
                          {{
                            formatAdsCurrency(
                              asset.metrics.costMicros,
                              campaign.currencyCode,
                            )
                          }}
                        </div>
                        <div v-if="activeMetrics.has('Conversions')">
                          Conversions:
                          {{ formatNumber(asset.metrics.conversions) }}
                        </div>
                        <div v-if="activeMetrics.has('CPA')">
                          CPA:
                          {{
                            formatAdsCurrency(
                              asset.metrics.costPerConversion,
                              campaign.currencyCode,
                            )
                          }}
                        </div>
                        <div v-if="activeMetrics.has('ConvValuePerCost')">
                          Val / Cost:
                          {{ formatNumber(asset.metrics.valuePerCost) }}
                        </div>
                        <div v-if="activeMetrics.has('AverageCPC')">
                          Avg. CPC:
                          {{
                            formatAdsCurrency(
                              asset.metrics.averageCpc,
                              campaign.currencyCode,
                            )
                          }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <ScrollToTopButton />
      </div>
      <div v-else>
        <div class="bg-gray-800 p-8 rounded-lg text-center">
          <h2 class="text-2xl font-bold mb-4">No Assets Found</h2>
          <p class="text-gray-400">
            There are 0 images with the selected rules. Please go back and
            adjust your conditions.
          </p>
          <div class="mt-6">
            <button
              @click.prevent="removalStep = 1"
              class="bg-cyan-600 text-white font-bold py-2 px-6 rounded-md hover:bg-cyan-700"
            >
              Back to Conditions
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
