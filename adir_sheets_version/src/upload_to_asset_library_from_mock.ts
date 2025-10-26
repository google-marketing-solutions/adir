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
import { GcsApi } from './gcs-api';
import { GoogleAdsApi, GoogleAdsApiInterface } from './google-ads-api';
import { GoogleAdsApiFactory } from './google-ads-api-mock';
import { Triggerable } from './triggerable';
import { CONFIG } from './config';

export class UploadToAssetLibraryFromMockService extends Triggerable {
  private readonly _gcsApi;
  private readonly _googleAdsApi: GoogleAdsApiInterface;

  constructor() {
    super();
    this._gcsApi = new GcsApi(CONFIG['GCS Bucket']);
    this._googleAdsApi = GoogleAdsApiFactory.createObject();
  }

  run() {
    this.deleteTrigger();
    const accountId = GoogleAdsApiFactory.getAdsAccountId();
    const assetGroups = this._googleAdsApi.getAssetGroups();
    const lastMockImageUploadProcessedAssetGroupId =
      PropertiesService.getScriptProperties().getProperty(
        'lastMockImageUploadProcessedAssetGroupId'
      );
    let startIndex = 0;
    if (lastMockImageUploadProcessedAssetGroupId) {
      const lastIndex = assetGroups.findIndex(
        assetGroup =>
          assetGroup.assetGroup.id === lastMockImageUploadProcessedAssetGroupId
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
          'lastMockImageUploadProcessedAssetGroupId',
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
        accountId,
        assetGroup.assetGroup.id,
        [imgFolder]
      ) as GoogleCloud.Storage.Image[];
      // Upload new images
      if (images.length === 0) {
        Logger.log('No images to upload.');
      } else {
        const realAdsApi = new GoogleAdsApi(
          CONFIG['Ads API Key'],
          CONFIG['Manager ID'],
          CONFIG['Account ID']
        );
        realAdsApi.uploadImageAssets(images);

        this._gcsApi.moveImages(
          accountId,
          assetGroup.assetGroup.id,
          images,
          imgFolder,
          CONFIG['Uploaded DIR']
        );
        PropertiesService.getScriptProperties().setProperty(
          'lastMockImageUploadProcessedAssetGroupId',
          assetGroup.assetGroup.id
        );
      }
    }
    Logger.log('Finished uploading images.');
    // If script completes without timing out, clear the stored asset group ID and any triggers
    PropertiesService.getScriptProperties().deleteProperty(
      'lastMockImageUploadProcessedAssetGroupId'
    );
    this.deleteTrigger();
  }

  static triggeredRun() {
    PropertiesService.getScriptProperties().setProperty(
      `${UploadToAssetLibraryFromMockService.name}StartTime`,
      new Date().getTime().toString()
    );
    const service = new UploadToAssetLibraryFromMockService();
    service.run();
  }

  static manuallyRun() {
    PropertiesService.getScriptProperties().setProperty(
      `${UploadToAssetLibraryFromMockService.name}StartTime`,
      new Date().getTime().toString()
    );
    const lastMockImageUploadProcessedAssetGroupId =
      PropertiesService.getScriptProperties().getProperty(
        'lastMockImageUploadProcessedAssetGroupId'
      );
    if (lastMockImageUploadProcessedAssetGroupId) {
      PropertiesService.getScriptProperties().deleteProperty(
        'lastMockImageUploadProcessedAssetGroupId'
      );
      Logger.log(
        'Cleared last processed Asset Group ID for a fresh manual run.'
      );
    }
    const service = new UploadToAssetLibraryFromMockService();
    service.run();
  }
}
