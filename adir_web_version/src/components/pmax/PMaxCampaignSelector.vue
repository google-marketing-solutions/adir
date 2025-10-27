<template>
  <div>
    <h2>Select a PMax Campaign</h2>
    <MultiSelectDropdown
      :options="campaignOptions"
      v-model="selectedCampaigns"
      @update:modelValue="onCampaignSelect"
    />
  </div>
</template>

<script setup>
import MultiSelectDropdown from "@/components/MultiSelectDropdown.vue";
import { fetchPMaxCampaigns } from "@/services/googleAdsService";
import { computed, onMounted, ref } from "vue";

const campaigns = ref([]);
const selectedCampaigns = ref([]);

const emit = defineEmits(["campaigns-selected"]);

const campaignOptions = computed(() =>
  campaigns.value.map((c) => ({
    label: c.campaign.name,
    value: c,
  })),
);

onMounted(async () => {
  try {
    campaigns.value = await fetchPMaxCampaigns();
    selectedCampaigns.value = campaigns.value;
    onCampaignSelect(selectedCampaigns.value);
  } catch (error) {
    console.error("Failed to fetch PMax campaigns:", error);
  }
});

function onCampaignSelect(selected) {
  const campaignResources = selected.map((s) => s.campaign);
  emit("campaigns-selected", campaignResources);
}
</script>

<style scoped>
h2 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
}
</style>
