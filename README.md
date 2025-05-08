<!--
Copyright 2023 Google LLC

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
-->

# Adir: A solution for image assets generation in Performance Max Campaigns

## Overview

**Adir** is an open-source solution designed to streamline image asset generation and management for Google Ads Performance Max (PMax) campaigns. Adir leverages AI via Google Cloud's Vertex AI Imagen model, using your specific asset group context to **generate personalized, high-quality images**. It then allows you to easily **upload these generated images** directly to your Google Ads asset library, enhancing your campaign's visual appeal and performance.

Adir builds upon [Adios](https://github.com/google-marketing-solutions/adios/tree/main), a similar solution focused on image asset management for Search Campaigns. This project was initially derived from the state of Adios at commit [`9df7898`](https://github.com/google-marketing-solutions/adios/commit/9df78981d5119c775fbedb6da1a1c2487cbd7e9a) (`9df78981d5119c775fbedb6da1a1c2487cbd7e9a`).

Adir utilizes the [Imagen](https://cloud.google.com/vertex-ai/docs/generative-ai/image/overview) foundation model on Google Cloud's [Vertex AI](https://cloud.google.com/vertex-ai/) platform for image generation.

## The Challenge

Creating unique, high-quality images that are relevant to potentially thousands of distinct Performance Max asset groups is a significant hurdle. Manually generating tailored visuals at this scale is often impractical, limiting the ability to maximize the visual appeal and relevance of PMax campaigns across diverse products, services, or audiences. Adir addresses this challenge by automating context-aware image generation at scale.

## The Solution

Here are some of Adir's key features:

- **Generate Images at Scale**: Leverage Generative AI on Google Cloud to create numerous images tailored to your asset groups. **Choose** between using **Asset Group Names** or **Search Signal Keywords** as context for the image generation prompts.
- **Optional Manual Validation**: Ensure optimal quality by manually reviewing generated images before uploading them to your asset library using the built-in web app.
- **Automated Asset Upload**: Effortlessly upload your chosen image assets from Google Cloud Storage directly to your Google Ads asset library.

## Installation Guide

# Prerequisites:

1. A new or existing [Google Cloud Platform](https://console.cloud.google.com/) (GCP) project:
   - Ensure that billing is enabled on the project.
   - Enable the [Google Ads API](https://console.cloud.google.com/apis/api/googleads.googleapis.com).
   - Enable the [Cloud Storage API](https://console.cloud.google.com/apis/api/storage.googleapis.com).
   - Enable the [Vertex AI API](https://console.cloud.google.com/apis/api/aiplatform.googleapis.com).
   - Configure an [OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent) (if you haven't done so before for this project).
   - Create a [Google Cloud Storage (GCS) Bucket](https://console.cloud.google.com/storage/browser) within your project to store the generated images. Note the bucket name for the configuration step.
2. A [Google Ads Developer Token](https://developers.google.com/google-ads/api/docs/get-started/dev-token) with **Basic** or **Standard** access level. Instructions for obtaining the required access level can be found [here](https://developers.google.com/google-ads/api/docs/access-levels#applying_for_basic_access).

# Deployment:

1. Join [this Google group](https://groups.google.com/g/adir_pmax_image_generation) to gain access to the template.

2. Make a copy of the [template Spreadsheet: Adir v1.0](https://docs.google.com/spreadsheets/d/18c3lR_6jzDzzw2WoHAFi7XFxWV7FYkeZ5lvOtjdS9bg/edit?gid=528843970#gid=528843970).

3. On the copied Spreadsheet, open Extensions > Apps Script.

4. Go to Project Settings and [change the GCP project](https://developers.google.com/apps-script/guides/cloud-platform-projects).
   Learn how to [determine the project **number**](https://developers.google.com/apps-script/guides/cloud-platform-projects#determine_the_id_number_of_a_standard).

5. Fill in the required configuration in the Spreadsheet, as instructed in the comments.

6. Now you can run the Adir services using the Adir menu.

# Configuration

Configure **Adir** by filling in the parameters in the "Config" sheet of the [template spreadsheet](#deployment). Completing this configuration is essential before running Adir.

**Key Parameters:**

- **Google Ads Details:**
  - `Developer Token`: Your Google Ads API Developer Token.
  - `Manager Account ID (MCC)`: The ID of your Google Ads Manager Account (optional, if applicable).
  - `Account ID`: The ID of the specific Google Ads account you want Adir to run on (must be under the specified MCC, if provided).
  - `Campaign IDs`: A comma-separated list of the PMax Campaign IDs within the specified Account ID that you want Adir to process.
- **GCP Project Details:**
  - `GCP Project ID`: Your Google Cloud Project ID.
  - `GCS Bucket Name`: The name of the Cloud Storage bucket you created.
- **Prompt Configuration:**
  - `Adir Mode`: Choose between 'Asset Group Name' or 'Search Signal Keywords' as the type of context to provide to the prompt for each asset group.
  - `ImgGen Prompt / Text Prompt`: Define the core text prompt structure used for generating images. See the [Pmax Image Generation](#pmax-image-generation) section for details.
- **Other Settings:** Review and adjust any other preset or optional parameters in the "Config" sheet to match your specific needs (e.g., number of images per aspect ratio per asset group, Image Generation Model, `Validated DIR`, `Disapproved DIR`, etc.).

# Usage:

## Pmax Image Generation

Adir generates images based on the context you provide for each PMax Asset Group. The method used depends on the `Adir Mode` selected in the configuration.

**To run image generation:**

1.  Go to the Adir spreadsheet menu.
2.  Select **Run > Pmax Image Generation**.

Images will be generated and saved to your configured GCS bucket.

### Mode 1: Asset Group Name

- **When Used**: Select 'Asset Group Name' in the `Adir Mode` configuration setting.
- **How it Works**:
  1.  Define your base image generation prompt in the `ImgGen Prompt` cell in the Config sheet. This prompt should include the placeholder `${name}` where you want the asset group's name to be inserted.
  2.  For each asset group Adir processes, it retrieves the asset group's name.
  3.  It replaces the `${name}` placeholder in your base prompt with the actual asset group name.
  4.  This final, combined prompt is sent directly to the Vertex AI Imagen model to generate the image.
- **Example**:
  - Your `ImgGen Prompt`: `Generate a high quality image of ${name}`
  - Asset Group Name: `Chocolate Chip Cookies`
  - Final Prompt sent to Imagen: `Generate a high quality image of Chocolate Chip Cookies`

### Mode 2: Search Signal Keywords

- **When Used**: Select 'Search Signal Keywords' in the `Adir Mode` configuration setting.
- **How it Works**: This mode uses Google's Gemini model to help create a more contextually relevant image generation prompt based on the Search Signal keywords associated with your asset group.
  1.  Define **two** prompts in the Config sheet:
      - `Text Prompt Context`: Provide context or background information.
      - `Text Prompt`: Provide the instruction for Gemini on how to generate the _final image prompt_ using the context and keywords.
  2.  For each asset group Adir processes:
      - It retrieves the list of Search Signal Keywords associated with the asset group.
      - It combines the `Text Prompt Context`, the `Text Prompt`, and the asset group keywords, then sends this combined input to the Gemini model.
  3.  Gemini generates a new, tailored image generation prompt based on the asset group keywords and your instructions.
  4.  This Gemini-generated prompt is then sent to the Vertex AI Imagen model to generate images for the asset group.
- **Key Idea**: In this mode, Gemini acts as an intelligent prompt engineer, creating specific image prompts based on the keywords for each asset group before Imagen generates the actual image.

### Translations Option

- **Purpose**: The "Translations" sheet in the template allows you to automatically replace specific text strings before they are used in the image generation process. This is useful if your raw Asset Group Names (in Mode 1) or Search Signal Keywords (in Mode 2, although less common) contain internal codes, abbreviations, or text that isn't ideal for direct use in an image prompt. You can replace them with more descriptive or suitable text.
- **How it Works**:
  1.  Go to the "Translations" sheet in your copied template spreadsheet.
  2.  In the `Text` column, enter the exact phrase you want to replace (e.g., an internal Asset Group Name).
  3.  In the `Translation` column, enter the new phrase you want the script to use instead.
  4.  Before constructing the final prompt, Adir checks if the Asset Group Name (or potentially keywords, depending on your implementation) exists in the `Text` column and, if so, uses the corresponding `Translation` value.
- **Example (using Mode 1: Asset Group Name)**:
  - Your `ImgGen Prompt`: `Generate a high quality image of ${name}`
  - Original Asset Group Name in Google Ads: `AG_Shoes_Run_Disc_Sum24`
  - You feel this name is too technical for the prompt.
  - In the "Translations" sheet:
    - `Text` column: `AG_Shoes_Run_Disc_Sum24`
    - `Translation` column: `High-performance running shoes on summer sale`
  - **Result**: Adir finds `AG_Shoes_Run_Disc_Sum24` in the prompt and replaces it with `High-performance running shoes on summer sale`.
  - Final Prompt sent to Imagen: `Generate a high quality image of High-performance running shoes on summer sale`

## Pmax Image Validation

Adir provides a simple web app interface to review and validate generated images before potentially uploading them to your Google Ads Asset Library. Approved images are moved to a specific folder in your GCS bucket, making them ready for the upload step.

### Configuration

Ensure the following parameters are set in the "Config" sheet of your spreadsheet if you intend to use the validation step:

- `Validated DIR`: The name of the folder within your GCS bucket where **approved** images will be moved (e.g., `VALIDATED`).
- `Disapproved DIR`: The name of the folder within your GCS bucket where **rejected** images will be moved (e.g., `REJECTED`).

_Note: If you leave `Validated DIR` empty in the configuration, the validation step is skipped, and the upload function (if run) will attempt to upload images directly from their initial generation location._

### Launching the Validation UI (Web App)

1.  In the Spreadsheet, open **Extensions > Apps Script**.
2.  In the Apps Script editor, click **Deploy > Test deployments**.
3.  Copy the **Web App URL** provided.
4.  Open this URL in your browser. You may need to grant authorization the first time.

### Using the Validation UI

- The web app displays images generated by Adir that are pending review (often indicated by a yellow status icon or marker).
- Click on an image to view it larger.
- Use the **Approve** or **Reject** buttons (typically located in the top-right) to make your decision.
- **Approving** an image moves its file from the initial generation folder to the `Validated DIR` folder in your GCS bucket.
- **Rejecting** an image moves its file to the `Disapproved DIR` folder in your GCS bucket. Images in this folder will not be uploaded.

## Pmax Image Upload

This function uploads images from your GCS bucket directly into your Google Ads Asset Library for the specified account.

- **If Validation is Used:** Images from the `Validated DIR` folder (containing approved images) in your GCS bucket will be uploaded.
- **If Validation is Skipped:** Images from the initial generation folder(s) in your GCS bucket will be uploaded (excluding any that might have been manually moved or deleted).

**To run the image upload:**

1.  Go to the Adir spreadsheet menu.
2.  Select **Run > Pmax Image Upload**.

The script will process the relevant images and upload them to your Google Ads Asset Library.

## Google Ads API Mocks

Want to try out image generation without real asset groups? Simulate them easily with a spreadsheet:

- **Configure Adir**: In the "Config" sheet, add a variable named "Google Ads Mock Sheet". Choose a name for your mock sheet (e.g., "Mock") and set it as the value for this variable.
- **Create Your Mock Data**: Create a new sheet with the name you chose (e.g., "Mock"). Make sure it has two columns:
  - "Asset Group Name": Enter a name for each simulated asset group.
  - "Keywords": List the keywords associated with each asset group (comma separated).

Adir will treat this as your ad group data for image generation, and you can find the generated images in your GCS bucket under `<Your Bucket>/Mock/...`.

## Disclaimer

**This is not an official Google product.**
