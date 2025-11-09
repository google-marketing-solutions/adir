<template>
  <div>
    <h2>Select Pmax And/Or Demand Gen Campaigns</h2>
    <div class="flex items-center mb-4">
      <label class="mr-4">Filter by campaign type:</label>
      <div class="flex gap-4">
        <label class="flex items-center">
          <input
            type="radio"
            v-model="campaignType"
            value="all"
            class="mr-1"
          />
          All
        </label>
        <label class="flex items-center">
          <input
            type="radio"
            v-model="campaignType"
            value="pmax"
            class="mr-1"
          />
          PMax
        </label>
        <label class="flex items-center">
          <input
            type="radio"
            v-model="campaignType"
            value="demandgen"
            class="mr-1"
          />
          Demand Gen
        </label>
      </div>
    </div>
    <MultiSelectDropdown
      :options="campaignOptions"
      v-model="selectedCampaigns"
      @update:modelValue="onCampaignSelect"
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
    selectedCampaigns.value = campaigns.value;
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

<style scoped>
h2 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
}
</style>
