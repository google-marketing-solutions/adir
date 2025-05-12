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
import { GoogleAdsApi } from './google-ads-api';
import { Triggerable } from './triggerable';

export class PmaxImageUploadService extends Triggerable {
  private readonly _gcsApi;
  private readonly _googleAdsApi;

  constructor() {
    super();
    this._gcsApi = new GcsApi(CONFIG['GCS Bucket']);
    this._googleAdsApi = new GoogleAdsApi(
      CONFIG['Ads API Key'],
      CONFIG['Manager ID'],
      CONFIG['Account ID']
    );
  }

  run() {
    this.deleteTrigger();
    const assetGroups = this._googleAdsApi.getAssetGroups();
    const lastImageUploadProcessedAssetGroupId =
      PropertiesService.getScriptProperties().getProperty(
        'lastImageUploadProcessedAssetGroupId'
      );
    let startIndex = 0;
    if (lastImageUploadProcessedAssetGroupId) {
      const lastIndex = assetGroups.findIndex(
        assetGroup =>
          assetGroup.assetGroup.id === lastImageUploadProcessedAssetGroupId
      );
      startIndex = Math.max(lastIndex, 0);
    }
    for (let i = startIndex; i < assetGroups.length; i++) {
      const assetGroup = assetGroups[i];
      if (this.shouldTerminate()) {
        Logger.log(
          `The function is reaching the 6 minute timeout, and therefore will create a trigger to rerun from this asset group: ${assetGroup.assetGroup.name} and then self terminate.`
        );
        PropertiesService.getScriptProperties().setProperty(
          'lastImageUploadProcessedAssetGroupId',
          assetGroup.assetGroup.id
        );
        this.createTriggerForNextRun();
        return; // Exit the function to prevent further execution
      }
      Logger.log(
        `Processing Asset Group ${assetGroup.assetGroup.name} (${assetGroup.assetGroup.id})...`
      );
      const imgFolder = CONFIG['Validated DIR'] || CONFIG['Generated DIR'];
      const images = this._gcsApi.getImages(
        CONFIG['Account ID'],
        assetGroup.assetGroup.id,
        [imgFolder]
      ) as GoogleCloud.Storage.Image[];
      // Upload new images
      if (images.length === 0) {
        Logger.log('No images to upload.');
      } else {
        this._googleAdsApi.uploadImageAssets(images);
        this._gcsApi.moveImages(
          CONFIG['Account ID'],
          assetGroup.assetGroup.id,
          images,
          imgFolder,
          CONFIG['Uploaded DIR']
        );
        PropertiesService.getScriptProperties().setProperty(
          'lastImageUploadProcessedAssetGroupId',
          assetGroup.assetGroup.id
        );
      }
      // TODO: Remove assets from the Asset Library
    }
    Logger.log('Finished uploading images.');
    // If script completes without timing out, clear the stored asset group ID and any triggers
    PropertiesService.getScriptProperties().deleteProperty(
      'lastImageUploadProcessedAssetGroupId'
    );
    this.deleteTrigger();
  }

  static triggeredRun() {
    PropertiesService.getScriptProperties().setProperty(
      `${PmaxImageUploadService.name}StartTime`,
      new Date().getTime().toString()
    );
    const pmaximageUploadService = new PmaxImageUploadService();
    pmaximageUploadService.run();
  }

  static manuallyRun() {
    PropertiesService.getScriptProperties().setProperty(
      `${PmaxImageUploadService.name}StartTime`,
      new Date().getTime().toString()
    );
    const lastImageUploadProcessedAssetGroupId =
      PropertiesService.getScriptProperties().getProperty(
        'lastImageUploadProcessedAssetGroupId'
      );
    if (lastImageUploadProcessedAssetGroupId) {
      PropertiesService.getScriptProperties().deleteProperty(
        'lastImageUploadProcessedAssetGroupId'
      );
      Logger.log(
        'Cleared last processed Asset Group ID for a fresh manual run.'
      );
    }
    const pmaximageUploadService = new PmaxImageUploadService();
    pmaximageUploadService.run();
  }
}
