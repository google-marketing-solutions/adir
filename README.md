# Adir: Google Ads Asset Optimization Suite

This repository contains two versions of the open-source solution Adir, designed to streamline image asset generation, management, and optimization for Google Ads Performance Max (PMax) and Demand Gen campaigns.

Both solutions leverage Generative AI via Google Cloud's Vertex AI (using both Imagen and Gemini models) to help you create personalized, high-quality images, manage their inclusion in your campaigns, and optimize asset performance.

## The Challenge

Creating unique, high-quality images that are relevant to potentially thousands of distinct Pmax/Demand Gen asset groups is a significant hurdle. Manually analyzing asset performance, removing underperforming images, and generating tailored visuals at this scale is often impractical. Adir addresses this challenge by automating context-aware image generation and optimization.

## The Solutions: Adir

This repository contains two different implementations of the Adir solution, each with a different approach to asset optimization.

### 1. Adir (Sheets Version)

- **Location:** `adir-sheets-version/`
- **Description:** The older version of the solution built on Google Sheets and Apps Script, ideal for quickly generating and uploading new images at scale. It uses a spreadsheet for configuration and a simple web app for optional manual validation.
- **Core Flow:** `Generate -> Validate (Optional) -> Upload.`

### 2. Adir (Web App Version)

- **Location:** `adir-web-app/` (Assumed directory name)
- **Description:** A full-featured Vue.js web application that provides a comprehensive optimization workflow. It not only generates new assets but also helps identify and remove underperforming ones based on performance data.
- **Core Flow:** `Remove Assets -> Generate Assets -> Preview & Upload.`

For deeper instructions and documentation, refer to the README files within each directory.

---

### Disclaimer

This is not an officially supported Google product. Copyright 2023 Google LLC. This solution, including any related sample code or data, is made available on an “as is,” “as available,” and “with all faults” basis, solely for illustrative purposes, and without warranty or representation of any kind. This solution is experimental, unsupported and provided solely for your convenience. Your use of it is subject to your agreements with Google, as applicable, and may constitute a beta feature as defined under those agreements. To the extent that you make any data available to Google in connection with your use of the solution, you represent and warrant that you have all necessary and appropriate rights, consents and permissions to permit Google to use and process that data. By using any portion of this solution, you acknowledge, assume and accept all risks, known and unknown, associated with its usage, including with respect to your deployment of any portion of this solution in your systems, or usage in connection with your business, if at all.
