<script setup>
import ProxiedImage from "@/components/ProxiedImage.vue";
import {
  fetchPMaxAssets,
  removeAssetGroupAssets,
} from "@/services/googleAdsService.ts";
import { useAssetStore } from "@/stores/assetStore";
import { computed, defineEmits, defineProps, onMounted, ref } from "vue";

const props = defineProps({
  selectedCampaigns: {
    type: Array,
    required: true,
  },
});

const assetStore = useAssetStore();
const removalStep = ref(1);
const emit = defineEmits(["change-subpage"]);
const showRemovalNotice = ref(false);
const isLoading = ref(false);
const isRemoving = ref(false);
const showSuccessMessage = ref(false);
const successMessage = ref("");

const conditions = ref([]);
const dateRange = ref("LAST_30_DAYS");

const activeMetrics = computed(() => {
  return new Set(conditions.value.map((c) => c.metric));
});

const getAssetFormat = (resourceName) => {
  let format = resourceName.split("~").pop();
  if (format === "MARKETING_IMAGE") {
    format = "LANDSCAPE_MARKETING_IMAGE";
  }
  return format;
};

const assetFormats = [
  "SQUARE_MARKETING_IMAGE",
  "PORTRAIT_MARKETING_IMAGE",
  "LANDSCAPE_MARKETING_IMAGE",
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
    const format = getAssetFormat(asset.assetGroupAsset.resourceName);
    return visibleFormats.value.has(format);
  });
});

const groupedAssets = computed(() => {
  const campaigns = {};
  filteredAssets.value.forEach((asset) => {
    const campaignName = asset.campaign.name;
    const assetGroupName = asset.assetGroup.name;

    if (!campaigns[campaignName]) {
      campaigns[campaignName] = {
        name: campaignName,
        assetGroups: {},
      };
    }

    if (!campaigns[campaignName].assetGroups[assetGroupName]) {
      campaigns[campaignName].assetGroups[assetGroupName] = {
        name: assetGroupName,
        assets: [],
      };
    }

    campaigns[campaignName].assetGroups[assetGroupName].assets.push(asset);
  });
  return Object.values(campaigns);
});

function formatCurrency(micros) {
  if (micros === undefined || micros === null) {
    return "0.00";
  }
  return (micros / 1000000).toFixed(2);
}

async function handleCheckAssets() {
  isLoading.value = true;
  try {
    const campaignIds = props.selectedCampaigns.map((c) => c.id);
    const results = await fetchPMaxAssets(
      conditions.value,
      dateRange.value,
      campaignIds,
    );
    assetStore.setAssets(results || []);
    removalStep.value = 2;
  } finally {
    isLoading.value = false;
  }
}

function addCondition() {
  conditions.value.push({
    id: Date.now(),
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

function showConditions() {
  console.log(conditions.value);
}

onMounted(() => {
  if (assetStore.assets.length > 0) {
    removalStep.value = 2;
  } else if (conditions.value.length === 0) {
    addCondition();
  }
});

function scrollToTop() {
  const mainContent = document.querySelector(".main-content");
  if (mainContent) {
    mainContent.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function areAllInGroupSelected(groupAssets) {
  return groupAssets.every((asset) =>
    assetStore.selectedAssets.has(asset.assetGroupAsset.resourceName),
  );
}

function areAllInCampaignSelected(campaign) {
  return Object.values(campaign.assetGroups).every((group) =>
    areAllInGroupSelected(group.assets),
  );
}

async function handleRemoveAssets() {
  if (assetStore.selectedAssets.size === 0) {
    alert("No assets selected for removal.");
    return;
  }
  isRemoving.value = true;
  try {
    const selectedAssets = Array.from(assetStore.selectedAssets);
    await removeAssetGroupAssets(selectedAssets);
    assetStore.markAsRemoved(selectedAssets);

    const removedAssetsDetails = selectedAssets
      .map((resourceName) => {
        return assetStore.assets.find(
          (a) => a.assetGroupAsset.resourceName === resourceName,
        );
      })
      .filter(Boolean);

    const campaignNames = [
      ...new Set(removedAssetsDetails.map((a) => a.campaign.name)),
    ];
    const assetGroupNames = [
      ...new Set(removedAssetsDetails.map((a) => a.assetGroup.name)),
    ];

    successMessage.value = `${selectedAssets.length} assets removed from ${assetGroupNames.length} asset groups in ${campaignNames.length} campaigns.`;
    showSuccessMessage.value = true;

    assetStore.clearSelections();
  } finally {
    isRemoving.value = false;
  }
}
</script>

<template>
  <div>
    <div v-if="removalStep === 1">
      <h2 class="text-2xl font-bold mb-4">Pull Low-Performing PMax Assets</h2>
      <div class="bg-gray-800 p-8 rounded-lg">
        <p class="text-gray-400 mb-6">
          Define the performance threshold to identify assets for removal. Add
          multiple conditions using "AND" or "OR".
        </p>
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
            <option value="LAST_30_DAYS">Last 30 Days</option>
            <option value="LAST_90_DAYS">Last 90 Days</option>
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
            @click.prevent="emit('change-subpage', 'generation')"
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
                @change="
                  assetStore.selectAssets({
                    assetResourceNames: Object.values(campaign.assetGroups)
                      .flatMap((g) => g.assets)
                      .map((a) => a.assetGroupAsset.resourceName),
                    shouldSelect: $event.target.checked,
                  })
                "
                class="h-5 w-5 rounded mr-2"
              />
              {{ campaign.name }}
            </h3>
            <div class="space-y-6">
              <div
                v-for="group in Object.values(campaign.assetGroups)"
                :key="group.name"
                class="bg-gray-600 rounded-lg p-4 mb-4"
              >
                <h4 class="text-lg font-medium text-cyan-400 mb-3">
                  <input
                    type="checkbox"
                    :checked="areAllInGroupSelected(group.assets)"
                    @change="
                      assetStore.selectAssets({
                        assetResourceNames: group.assets.map(
                          (a) => a.assetGroupAsset.resourceName,
                        ),
                        shouldSelect: $event.target.checked,
                      })
                    "
                    class="h-5 w-5 rounded mr-2"
                  />
                  {{ group.name }}
                </h4>
                <div
                  class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4"
                >
                  <div
                    v-for="asset in group.assets"
                    :key="asset.assetGroupAsset.resourceName"
                    class="relative"
                  >
                    <ProxiedImage
                      :src="asset.asset.imageAsset.fullSize.url"
                      alt="Asset"
                      class="rounded-lg"
                      :class="{
                        'filter grayscale': assetStore.isAssetRemoved(
                          asset.assetGroupAsset.resourceName,
                        ),
                      }"
                    />
                    <div class="text-xs text-gray-400 mt-1 truncate">
                      {{ asset.asset.name }}
                    </div>
                    <div
                      v-if="
                        assetStore.isAssetRemoved(
                          asset.assetGroupAsset.resourceName,
                        )
                      "
                      class="absolute inset-0 flex items-center justify-center"
                    >
                      <svg
                        class="w-16 h-16 text-red-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M6 18L18 6M6 6l12 12"
                        ></path>
                      </svg>
                    </div>
                    <input
                      type="checkbox"
                      :checked="
                        assetStore.isAssetSelected(
                          asset.assetGroupAsset.resourceName,
                        )
                      "
                      @change="
                        assetStore.toggleAssetSelection(
                          asset.assetGroupAsset.resourceName,
                        )
                      "
                      class="absolute top-2 left-2 h-5 w-5 rounded"
                    />
                    <div class="metrics-container text-xs mt-1 space-y-1">
                      <div v-if="activeMetrics.has('CTR')">
                        CTR:
                        {{
                          typeof asset.metrics.ctr === "number"
                            ? asset.metrics.ctr.toFixed(4)
                            : "N/A"
                        }}
                      </div>
                      <div v-if="activeMetrics.has('Clicks')">
                        Clicks: {{ asset.metrics.clicks }}
                      </div>
                      <div v-if="activeMetrics.has('Impressions')">
                        Impressions: {{ asset.metrics.impressions }}
                      </div>
                      <div v-if="activeMetrics.has('Cost')">
                        Cost: ${{ formatCurrency(asset.metrics.costMicros) }}
                      </div>
                      <div v-if="activeMetrics.has('Conversions')">
                        Conversions:
                        {{
                          typeof asset.metrics.conversions === "number"
                            ? asset.metrics.conversions.toFixed(2)
                            : "N/A"
                        }}
                      </div>
                      <div v-if="activeMetrics.has('CPA')">
                        CPA: ${{
                          formatCurrency(asset.metrics.costPerConversion)
                        }}
                      </div>
                      <div v-if="activeMetrics.has('ConvValuePerCost')">
                        Val / Cost:
                        {{
                          typeof asset.metrics.valuePerCost === "number"
                            ? asset.metrics.valuePerCost.toFixed(2)
                            : "N/A"
                        }}
                      </div>
                      <div v-if="activeMetrics.has('AverageCPC')">
                        Avg. CPC: ${{
                          formatCurrency(asset.metrics.averageCpc)
                        }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="mt-8 flex justify-center">
          <button
            @click="scrollToTop"
            class="bg-gray-600 text-white font-bold py-2 px-6 rounded-md hover:bg-gray-700"
          >
            Back to Top
          </button>
        </div>
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
