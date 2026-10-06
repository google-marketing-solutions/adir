<template>
  <div class="flex flex-col items-center justify-center min-h-[80vh] text-center p-6 relative overflow-hidden">
    <!-- Subtle Background Glows -->
    <div class="absolute top-1/4 left-1/4 w-80 h-80 bg-[var(--color-interactive-primary)]/10 rounded-full blur-3xl pointer-events-none"></div>
    <div class="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>

    <img src="@/assets/adir_logo.png" alt="Adir Logo" class="h-24 w-auto object-contain mb-6 drop-shadow-lg z-10" />
    <h1 class="text-5xl font-extrabold mb-3 text-[var(--color-text-highlight)] tracking-tight z-10">Welcome to Adir</h1>
    <p class="text-lg text-[var(--color-text-muted)] mb-12 max-w-2xl leading-relaxed z-10">
      Ads Dynamic Image Renderer. Streamline your creative lifecycle: prune underperforming ad visuals, generate AI-tailored variations, and fine-tune assets before deployment.
    </p>

    <!-- Onboarding / Lifecycle Workflow Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full mb-12 z-10">
      <!-- Step 1: Poor Asset Removal -->
      <router-link
        to="/asset-removal"
        class="bg-[var(--color-bg-secondary)]/90 backdrop-blur-md p-6 rounded-2xl border border-[var(--color-bg-tertiary)] flex flex-col items-center text-center group hover:border-[var(--color-interactive-primary)] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 no-underline cursor-pointer"
      >
        <div class="w-12 h-12 rounded-xl bg-[var(--color-interactive-primary)]/15 text-[var(--color-interactive-primary)] flex items-center justify-center text-xl font-bold mb-4 group-hover:scale-110 transition-transform">1</div>
        <h3 class="text-lg font-bold mb-2 text-[var(--color-text-highlight)] group-hover:text-[var(--color-interactive-primary)] transition-colors">Poor Asset Removal</h3>
        <p class="text-sm text-[var(--color-text-muted)] leading-normal">Connect active campaigns and filter by live metrics (CTR, Cost, Conversions) to prune fatigued or underperforming image assets.</p>
      </router-link>

      <!-- Step 2: Asset Generation -->
      <router-link
        to="/asset-generation"
        class="bg-[var(--color-bg-secondary)]/90 backdrop-blur-md p-6 rounded-2xl border border-[var(--color-bg-tertiary)] flex flex-col items-center text-center group hover:border-[var(--color-interactive-primary)] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 no-underline cursor-pointer"
      >
        <div class="w-12 h-12 rounded-xl bg-[var(--color-interactive-primary)]/15 text-[var(--color-interactive-primary)] flex items-center justify-center text-xl font-bold mb-4 group-hover:scale-110 transition-transform">2</div>
        <h3 class="text-lg font-bold mb-2 text-[var(--color-text-highlight)] group-hover:text-[var(--color-interactive-primary)] transition-colors">Asset Generation</h3>
        <p class="text-sm text-[var(--color-text-muted)] leading-normal">Generate high-converting imagery using 3 AI modes: existing asset transformation (Nano Banana), keyword signals, or custom concepts.</p>
      </router-link>

      <!-- Step 3: Preview & Edit -->
      <router-link
        to="/asset-preview"
        class="bg-[var(--color-bg-secondary)]/90 backdrop-blur-md p-6 rounded-2xl border border-[var(--color-bg-tertiary)] flex flex-col items-center text-center group hover:border-[var(--color-interactive-primary)] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 no-underline cursor-pointer"
      >
        <div class="w-12 h-12 rounded-xl bg-[var(--color-interactive-primary)]/15 text-[var(--color-interactive-primary)] flex items-center justify-center text-xl font-bold mb-4 group-hover:scale-110 transition-transform">3</div>
        <h3 class="text-lg font-bold mb-2 text-[var(--color-text-highlight)] group-hover:text-[var(--color-interactive-primary)] transition-colors">Preview & Edit</h3>
        <p class="text-sm text-[var(--color-text-muted)] leading-normal">Audit generated assets in an interactive gallery, fine-tune imagery with natural language AI prompts, and deploy directly to ad groups.</p>
      </router-link>
    </div>

    <div class="flex gap-4 z-10">
      <router-link
        to="/asset-removal"
        class="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold py-3.5 px-8 rounded-xl shadow-lg hover:shadow-blue-500/25 transition-all duration-200 text-base"
      >
        Start Lifecycle
      </router-link>
      <router-link
        to="/help"
        class="bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] font-bold py-3.5 px-8 rounded-xl border border-[var(--color-bg-tertiary)] hover:border-[var(--color-interactive-primary)] transition-all duration-200 text-base shadow-sm"
      >
        Help Center
      </router-link>
    </div>
  </div>
</template>

<script setup>
// No special logic needed for this static onboarding view
</script>
