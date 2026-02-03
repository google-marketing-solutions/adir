<template>
  <div class="bg-gray-800/50 p-6 rounded-xl border border-gray-700/50 backdrop-blur-sm">
    <h2 class="text-lg font-bold text-white tracking-tight mb-6 flex items-center gap-2">
      <span class="text-indigo-500">/</span>
      CAMPAIGN SELECTION
    </h2>
    <div v-if="errorMessage" class="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg flex items-start gap-3">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
      </svg>
      <div class="flex-1">
        <h3 class="text-sm font-bold text-red-400">Failed to load campaigns</h3>
        <p class="text-sm text-red-200 mt-1">{{ errorMessage }}</p>
        <button
          @click="fetchCampaigns"
          class="mt-3 text-xs font-semibold text-red-300 hover:text-white underline"
        >
          Try Again
        </button>
      </div>
    </div>
    <div class="flex items-center mb-6 justify-between">
      <div class="flex items-center">
        <label class="mr-4 text-sm font-mono font-medium text-gray-400 uppercase tracking-widest">Filter Mode:</label>
        <div class="flex gap-4">
          <label class="flex items-center cursor-pointer group">
            <input
              type="radio"
              v-model="campaignType"
              value="all"
              class="mr-2 text-indigo-500 focus:ring-indigo-500 bg-gray-700 border-gray-600"
            />
            <span class="text-base font-bold text-gray-300 group-hover:text-white transition-colors">All</span>
          </label>
          <label class="flex items-center cursor-pointer group">
            <input
              type="radio"
              v-model="campaignType"
              value="pmax"
              class="mr-2 text-indigo-500 focus:ring-indigo-500 bg-gray-700 border-gray-600"
            />
            <span class="text-base font-bold text-gray-300 group-hover:text-white transition-colors">PMax</span>
          </label>
          <label class="flex items-center cursor-pointer group">
            <input
              type="radio"
              v-model="campaignType"
              value="demandgen"
              class="mr-2 text-indigo-500 focus:ring-indigo-500 bg-gray-700 border-gray-600"
            />
            <span class="text-base font-bold text-gray-300 group-hover:text-white transition-colors">Demand Gen</span>
          </label>
        </div>
      </div>

      <label class="flex items-center cursor-pointer group">
        <div class="relative">
          <input type="checkbox" v-model="showPaused" class="sr-only peer" />
          <div class="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
        </div>
        <span class="ml-3 text-sm font-medium text-gray-300 group-hover:text-white transition-colors">Show Paused Campaigns</span>
      </label>
    </div>
    <MultiSelectDropdown
      :options="campaignOptions"
      v-model="selectedCampaigns"
      @update:modelValue="onCampaignSelect"
      placeholder="SELECT CAMPAIGNS..."
    />
  </div>
</template>

<script setup>
import MultiSelectDropdown from "@/components/MultiSelectDropdown.vue";
import {
  fetchDemandGenCampaigns,
  fetchPMaxCampaigns,
} from "@/services/googleAdsService";
import { useCampaignStore } from "@/stores/campaignStore";
import { computed, onMounted, ref, watch } from "vue";

const campaigns = ref([]);
const selectedCampaigns = ref([]);
const campaignType = ref("all");
const showPaused = ref(false);
const previousVisibleIds = ref(new Set());
const errorMessage = ref("");

const campaignStore = useCampaignStore();

const filteredCampaigns = computed(() => {
  let result = campaigns.value;

  if (campaignType.value !== "all") {
    result = result.filter((c) => c.type === campaignType.value);
  }

  if (!showPaused.value) {
    result = result.filter((c) => c.campaign.status !== 'PAUSED');
  }

  return result;
});

const campaignOptions = computed(() =>
  filteredCampaigns.value.map((c) => ({
    label: c.campaign.name,
    value: c,
  })),
);

// Watch for changes in filters and deselect campaigns that are no longer visible
watch([campaignType, showPaused], () => {
  const currentVisibleCampaigns = filteredCampaigns.value;
  const currentVisibleIds = new Set(currentVisibleCampaigns.map(c => c.campaign.id));

  // 1. Keep selected campaigns that are still visible
  const retainedSelection = selectedCampaigns.value.filter(c => currentVisibleIds.has(c.campaign.id));

  // 2. Identify newly visible campaigns (present in current but not in previous)
  const newlyVisibleCampaigns = currentVisibleCampaigns.filter(c => !previousVisibleIds.value.has(c.campaign.id));

  // 3. Combine: Retained + Newly Visible
  const newSelection = [...retainedSelection, ...newlyVisibleCampaigns];

  selectedCampaigns.value = newSelection;
  onCampaignSelect(selectedCampaigns.value);
  // Update tracking
  previousVisibleIds.value = currentVisibleIds;
});

async function fetchCampaigns() {
  errorMessage.value = "";
  try {
    const pmaxCampaignsData = await fetchPMaxCampaigns();
    const demandGenCampaignsData = await fetchDemandGenCampaigns();

    const pmaxCampaigns = pmaxCampaignsData.map((c) => ({
      ...c,
      type: "pmax",
    }));
    const demandGenCampaigns = demandGenCampaignsData.map((c) => ({
      ...c,
      type: "demandgen",
    }));

    campaigns.value = [...pmaxCampaigns, ...demandGenCampaigns];
    // Initial selection based on default filters
    const currentVisibleIds = new Set(filteredCampaigns.value.map(c => c.campaign.id));
    selectedCampaigns.value = campaigns.value.filter(c => currentVisibleIds.has(c.campaign.id));
    previousVisibleIds.value = currentVisibleIds;
    onCampaignSelect(selectedCampaigns.value);
  } catch (error) {
    console.error("Failed to fetch campaigns:", error);
    errorMessage.value = error.message || "An unexpected error occurred.";
  }
}

onMounted(() => {
  fetchCampaigns();
});

function onCampaignSelect(selected) {
  const campaignResources = selected.filter((s) => s && s.campaign);
  campaignStore.setCampaigns(campaignResources);
}
</script>


