# Google Ads Asset Optimization Suite

This application is a powerful tool designed for marketing professionals and advertisers to streamline the optimization of their Google Ads campaigns, with a special focus on Performance Max (PMax) and Demand Gen campaigns. It provides a seamless workflow to identify and remove underperforming image assets, generate new, high-quality creative images using Imagen, and manage their inclusion in campaigns directly within the platform.

## User Pains Targeted

- **Time-Consuming Manual Optimization**: Manually analyzing asset performance across numerous campaigns and asset groups is tedious and inefficient.
- **Creative Bottlenecks**: Constantly creating fresh and engaging images is a significant challenge for marketing teams.
- **Data-Driven Decision Making**: Difficulty in systematically identifying which assets to remove based on concrete performance metrics.
- **Fragmented Workflow**: Using multiple tools for performance analysis, creative generation, and campaign updates is cumbersome.

This suite addresses these pains by automating the analysis, centralizing the creative workflow, and integrating directly with Google Ads.

## The Asset Optimization Flow

The application guides the user through a three-step process for image asset optimization:

### 1. Asset Removal (`PMaxAssetRemoval.vue`)

This is the first step in the optimization process. Users can identify and remove low-performing assets from their campaigns.

- **Define Performance Metrics**: Users can set specific conditions to filter assets. For example, you can pull all assets with a `CTR < 0.5` and `Cost > $50` over the last 30 days. Multiple conditions can be combined using `AND`/`OR` logic.
- **Select Date Range**: Performance data can be analyzed over various periods like the last 7, 30, or 90 days.
- **Fetch & Preview**: The tool fetches all assets that match the defined criteria across selected campaigns.
- **Selective Removal**: Users are presented with a list of underperforming assets. They can review these assets and uncheck any they wish to keep before removing the rest from their respective asset groups.

### 2. Asset Generation (`PMaxAssetGeneration.vue`)

After removing ineffective image assets, users can generate new ones to fill the creative gap. The application offers three distinct AI-powered generation modes:

- **Creative Concepts Mode**: Users provide creative concepts or ideas, and Gemini creates image generation prompts based on the ideas and Google Ads image assets best practices. These prompts are then sent to Imagen. This is ideal for exploring new creative directions or generating high qualtiy image assets without pulling data from actual campaigns.
- **Asset Group Name Mode**: Image generation based on prompts that use the names of the asset groups in he selected campaigns to generate relevant and contextually appropriate images at scale.
- **Search Signal Keywords Mode**: This mode leverages the keywords from the search signals associated with the pmax campaigns to generate highly relevant image creatives. This mode is great for advertises who want to leverage keywords to generate relevant and contextually appropriate images at scale.

### 3. Asset Preview and Upload (`PMaxAssetPreview.vue`)

This final step allows users to manage the newly generated assets.

- **Preview Generated Assets**: All generated images are displayed, organized by their original campaign and asset group context.
- **Filter and Select**: Users can filter the view by campaign and asset group and select the best-performing or most visually appealing assets.
- **Deselect and Remove**: Any unwanted generated images can be deselected and permanently removed from the storage bucket.
- **Upload to Google Ads**: The chosen assets can be uploaded directly to the Google Ads asset library, making them available for use in campaigns.

## Tech Stack

The application is built with a modern and robust technology stack:

- **Frontend**: [Vue.js](https://vuejs.org/) (with Vue 3 Composition API)
- **State Management**: [Pinia](https://pinia.vuejs.org/)
- **Backend Services**:
  - **Google Ads API**: For fetching campaign data, asset performance metrics, and removing assets.
  - **Google Cloud Storage (GCS)**: For storing and managing generated image assets.
  - **Vertex AI (Google's AI Platform)**: Powers the image generation capabilities.
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) for a utility-first CSS framework.
- **Build Tool**: [Vite](https://vitejs.dev/) for fast development and optimized builds.

## Getting Started

(This section will be updated soon with after hosing the app externally)

1.  **Clone the repository.**
2.  **Install dependencies:** `npm install`
3.  **Run the development server:** `npm run dev`

## Disclaimer

This is not an officially supported Google product. Copyright 2023 Google LLC. This solution, including any related sample code or data, is made available on an “as is,” “as available,” and “with all faults” basis, solely for illustrative purposes, and without warranty or representation of any kind. This solution is experimental, unsupported and provided solely for your convenience. Your use of it is subject to your agreements with Google, as applicable, and may constitute a beta feature as defined under those agreements. To the extent that you make any data available to Google in connection with your use of the solution, you represent and warrant that you have all necessary and appropriate rights, consents and permissions to permit Google to use and process that data. By using any portion of this solution, you acknowledge, assume and accept all risks, known and unknown, associated with its usage, including with respect to your deployment of any portion of this solution in your systems, or usage in connection with your business, if at all.
