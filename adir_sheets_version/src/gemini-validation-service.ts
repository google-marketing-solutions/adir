/**
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { CONFIG } from './config';
import { GcsApi } from './gcs-api';
import { GoogleAdsApiFactory } from './google-ads-api-mock';
import { VertexAiApi } from './vertex-ai-api';

export const POLICY_VIOLATIONS_FILE = 'policyViolations.json';

export interface PolicyViolation {
  policy: string;
  reasoning: string;
}

export interface ImagePolicyViolations {
  image: string;
  violations: PolicyViolation[];
}

export class GeminiValidationService {
  private readonly _gcsApi;
  private readonly _googleAdsApi;
  private readonly _vertexAiApi;

  private readonly sheetName = 'Policies';

  constructor() {
    this._gcsApi = new GcsApi(CONFIG['GCS Bucket']);
    this._vertexAiApi = new VertexAiApi(CONFIG['GCP Project']!, 'us-central1');
    this._googleAdsApi = GoogleAdsApiFactory.createObject();
  }

  getPrompt() {
    if (!CONFIG['Image Validation Prompt']) {
      throw 'Config variable "Image Validation Prompt" should not be empty';
    }

    return CONFIG['Image Validation Prompt'];
  }

  getPolicies() {
    const error = `Error: No policies are found. 
      Please write the policies in the sheet "${this.sheetName}". 
      Remember, the first row is always header.`;

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(
      this.sheetName
    );
    if (!sheet) {
      throw error;
    }

    const sheetData = sheet.getDataRange().getValues();
    if (!sheetData) {
      throw error;
    }

    return sheetData
      .map(x => x[0]) // Only the first column contains the policy text
      .slice(1) // Removing the header
      .join('\n');
  }

  run() {
    const prompt = this.getPrompt().replaceAll(
      '<policies>',
      this.getPolicies()
    );

    const assetGroups = this._googleAdsApi.getAssetGroups();
    for (const assetGroup of assetGroups) {
      Logger.log(
        `Processing Asset Group ${assetGroup.assetGroup.name} (${assetGroup.assetGroup.id})...`
      );

      const images = this._gcsApi.getImages(
        GoogleAdsApiFactory.getAdsAccountId(),
        assetGroup.assetGroup.id,
        [CONFIG['Generated DIR']]
      );

      if (images.length === 0) {
        Logger.log('No images to validate.');
      } else {
        const violationsPerImage: ImagePolicyViolations[] = [];
        images.forEach(image => {
          const gcsPath = `gs://${CONFIG['GCS Bucket']}/${image.fullName}`;
          Logger.log(`Validating ${gcsPath}`);

          const validationResult = this._vertexAiApi.callGeminiApi(
            prompt,
            gcsPath
          );

          Logger.log('Response from Gemini:');
          Logger.log(validationResult);

          if (validationResult) {
            const json = this.textToJSON(validationResult);
            if (json.length) {
              violationsPerImage.push({
                image: image.name,
                violations: json,
              });
            }
          }
        });

        if (violationsPerImage.length) {
          const jsonPath = `${assetGroup.customer.id}/${assetGroup.assetGroup.id}/${CONFIG['Generated DIR']}/${POLICY_VIOLATIONS_FILE}`;
          Logger.log(`Saving violations on GCS: ${jsonPath}`);
          this._gcsApi.uploadFile(JSON.stringify(violationsPerImage), jsonPath);
        }
      }
    }

    Logger.log('Finished validating images.');
  }

  textToJSON(text: string) {
    try {
      const escapedText = text.replaceAll('```json', '').replaceAll('```', '');
      return JSON.parse(escapedText);
    } catch (e) {
      Logger.log(e);
    }

    return [];
  }
}

function runGeminiValidationService() {
  const geminiValidationService = new GeminiValidationService();
  geminiValidationService.run();
}
