<template>
  <PMaxAssetPreview @change-page="handleChangePage" />
</template>

<script setup>
import PMaxAssetPreview from "@/components/pmax/PMaxAssetPreview.vue";
import { useRouter } from "vue-router";

const router = useRouter();

const handleChangePage = () => {
  router.push({ name: "AssetGeneration" });
};
</script>