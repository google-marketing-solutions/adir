<script setup>
import { ref } from "vue";
import PMaxAssetGeneration from "../components/pmax/PMaxAssetGeneration.vue";
import PMaxAssetPreview from "../components/pmax/PMaxAssetPreview.vue";
import PMaxAssetRemoval from "../components/pmax/PMaxAssetRemoval.vue";
import PMaxCampaignSelector from "../components/pmax/PMaxCampaignSelector.vue";

const activeSubPage = ref("removal");
const selectedCampaignIds = ref([]);

function setSubPage(pageName) {
  activeSubPage.value = pageName;
}

function handleCampaignsSelected(campaignIds) {
  selectedCampaignIds.value = campaignIds;
  console.log("Selected campaign IDs in PMaxView:", campaignIds);
}
</script>

<template>
  <div>
    <PMaxCampaignSelector
      @campaigns-selected="handleCampaignsSelected"
      class="mb-6"
    />
    <nav class="flex gap-4 border-b border-gray-700 mb-6">
      <button
        @click="setSubPage('removal')"
        :class="{
          'text-cyan-400 font-semibold border-b-2 border-cyan-400':
            activeSubPage === 'removal',
          'text-gray-500 hover:text-gray-300': activeSubPage !== 'removal',
        }"
        class="text-lg px-4 py-2"
      >
        Asset Removal
      </button>
      <button
        @click="setSubPage('generation')"
        :class="{
          'text-cyan-400 font-semibold border-b-2 border-cyan-400':
            activeSubPage === 'generation',
          'text-gray-500 hover:text-gray-300': activeSubPage !== 'generation',
        }"
        class="text-lg px-4 py-2"
      >
        Asset Generation
      </button>
      <button
        @click="setSubPage('preview')"
        :class="{
          'text-cyan-400 font-semibold border-b-2 border-cyan-400':
            activeSubPage === 'preview',
          'text-gray-500 hover:text-gray-300': activeSubPage !== 'preview',
        }"
        class="text-lg px-4 py-2"
      >
        Asset Preview
      </button>
    </nav>
    <PMaxAssetRemoval
      v-if="activeSubPage === 'removal'"
      :selected-campaigns="selectedCampaignIds"
      @change-subpage="setSubPage"
    />
    <PMaxAssetGeneration
      v-else-if="activeSubPage === 'generation'"
      :selected-campaigns="selectedCampaignIds"
      @change-subpage="setSubPage"
    />
    <PMaxAssetPreview v-else @change-subpage="setSubPage" />
  </div>
</template>
