<template>
  <div class="bg-gray-800/50 p-6 rounded-xl border border-gray-700/50 backdrop-blur-sm">
    <h2 class="text-lg font-bold text-white tracking-tight mb-6 flex items-center gap-2">
      <span class="text-indigo-500">/</span>
      CAMPAIGN SELECTION
    </h2>
    <div class="flex items-center mb-6">
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
import { computed, onMounted, ref } from "vue";

const campaigns = ref([]);
const selectedCampaigns = ref([]);
const campaignType = ref("pmax");

const campaignStore = useCampaignStore();

const filteredCampaigns = computed(() => {
  if (campaignType.value === "all") {
    return campaigns.value;
  }
  return campaigns.value.filter((c) => c.type === campaignType.value);
});

const campaignOptions = computed(() =>
  filteredCampaigns.value.map((c) => ({
    label: c.campaign.name,
    value: c,
  })),
);

onMounted(async () => {
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
    // Only select campaigns that match the default filter
    selectedCampaigns.value = campaigns.value.filter(c => c.type === campaignType.value);
    onCampaignSelect(selectedCampaigns.value);
  } catch (error) {
    console.error("Failed to fetch campaigns:", error);
  }
});

function onCampaignSelect(selected) {
  const campaignResources = selected.filter((s) => s && s.campaign);
  campaignStore.setCampaigns(campaignResources);
}
</script>


