<template>
  <div class="flex flex-col items-center justify-center min-h-[80vh] text-center p-6">
    <img src="@/assets/adir_logo.png" alt="Adir Logo" class="h-24 w-auto object-contain mb-6" />
    <h1 class="text-5xl font-bold mb-2 text-[var(--color-text-highlight)]">Welcome to Adir</h1>
    <p class="text-xl text-[var(--color-text-muted)] mb-12 max-w-2xl">
      Ads Dynamic Image Renderer. Distill your brand, generate creative assets, and optimize campaigns with AI.
    </p>

    <!-- Onboarding Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full mb-12">
      <!-- Step 1 -->
      <div class="bg-[var(--color-bg-secondary)] p-6 rounded-xl border border-[var(--color-bg-tertiary)] flex flex-col items-center text-center group hover:border-[var(--color-interactive-primary)] transition-colors">
        <div class="w-12 h-12 rounded-full bg-[var(--color-interactive-primary)]/10 text-[var(--color-interactive-primary)] flex items-center justify-center text-xl font-bold mb-4">1</div>
        <h3 class="text-lg font-bold mb-2 text-[var(--color-text-primary)]">Define Brand</h3>
        <p class="text-sm text-[var(--color-text-muted)]">Upload documents or link your website to extract brand guidelines that Gemini will follow.</p>
      </div>

      <!-- Step 2 -->
      <div class="bg-[var(--color-bg-secondary)] p-6 rounded-xl border border-[var(--color-bg-tertiary)] flex flex-col items-center text-center group hover:border-[var(--color-interactive-primary)] transition-colors">
        <div class="w-12 h-12 rounded-full bg-[var(--color-interactive-primary)]/10 text-[var(--color-interactive-primary)] flex items-center justify-center text-xl font-bold mb-4">2</div>
        <h3 class="text-lg font-bold mb-2 text-[var(--color-text-primary)]">Generate Assets</h3>
        <p class="text-sm text-[var(--color-text-muted)]">Use 4 different generation modes to create tailored images with Imagen based on concepts or keywords.</p>
      </div>

      <!-- Step 3 -->
      <div class="bg-[var(--color-bg-secondary)] p-6 rounded-xl border border-[var(--color-bg-tertiary)] flex flex-col items-center text-center group hover:border-[var(--color-interactive-primary)] transition-colors">
        <div class="w-12 h-12 rounded-full bg-[var(--color-interactive-primary)]/10 text-[var(--color-interactive-primary)] flex items-center justify-center text-xl font-bold mb-4">3</div>
        <h3 class="text-lg font-bold mb-2 text-[var(--color-text-primary)]">Review & Optimize</h3>
        <p class="text-sm text-[var(--color-text-muted)]">Audit performance, batch edit images with Nano Banana, and remove low-performing assets.</p>
      </div>
    </div>

    <div class="flex gap-4">
      <router-link
        to="/asset-generation"
        class="bg-[var(--color-interactive-primary)] hover:bg-[var(--color-interactive-hover)] text-[var(--color-text-primary)] font-bold py-3 px-8 rounded-lg transition-colors text-lg"
      >
        Get Started
      </router-link>
      <router-link
        to="/help"
        class="bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] font-bold py-3 px-8 rounded-lg border border-[var(--color-bg-tertiary)] hover:border-[var(--color-interactive-primary)] transition-colors text-lg"
      >
        Help Center
      </router-link>
    </div>
  </div>
</template>

<script setup>
// No special logic needed for this static onboarding view
</script>
