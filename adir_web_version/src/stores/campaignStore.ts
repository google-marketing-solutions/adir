import { defineStore } from "pinia";
import { ref } from "vue";

export const useCampaignStore = defineStore("campaign", () => {
  const selectedCampaigns = ref([]);

  function setCampaigns(campaigns) {
    selectedCampaigns.value = campaigns;
  }

  return { selectedCampaigns, setCampaigns };
});
