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
import { ADIR_MODES, CONFIG } from './config';
import { GcsApi } from './gcs-api';
import { GoogleAdsApiFactory } from './google-ads-api-mock';
import { Triggerable } from './triggerable';
import {
  GeminiApiCallError,
  ImageGenerationApiCallError,
  JsonParseError,
  VertexAiApi,
} from './vertex-ai-api';

export class PmaxImageGenerationService extends Triggerable {
  private readonly _gcsApi;
  private readonly _vertexAiApi;
  private readonly _googleAdsApi;
  private readonly _aspectRatios = [
    {
      type: 'square',
      ratio: '1:1',
    },
    {
      type: 'landscape',
      ratio: '16:9',
    },
    {
      type: 'portrait',
      ratio: '9:16',
    },
  ];

  constructor() {
    super();
    this._gcsApi = new GcsApi(CONFIG['GCS Bucket']);
    this._vertexAiApi = new VertexAiApi(
      CONFIG['GCP Project'],
      CONFIG['GCP Region'],
      CONFIG['VertexAI Api Domain Part'],
      CONFIG['Gemini Model'],
      CONFIG['Image Generation Model']
    );
    this._googleAdsApi = GoogleAdsApiFactory.createObject();
  }

  run() {
    const MAX_TRIES = 3;
    this.deleteTrigger();
    const assetGroups = this._googleAdsApi.getAssetGroups();

    const lastPmaxImageGenerationProcessedAdGroupId =
      PropertiesService.getScriptProperties().getProperty(
        'lastPmaxImageGenerationProcessedAdGroupId'
      );
    let startIndex = 0;
    if (lastPmaxImageGenerationProcessedAdGroupId) {
      const lastIndex = assetGroups.findIndex(
        assetGroup =>
          assetGroup.assetGroup.id === lastPmaxImageGenerationProcessedAdGroupId
      );
      startIndex = Math.max(lastIndex, 0); // startIndex might be -1
    }
    assetGroupsLoop: for (let i = startIndex; i < assetGroups.length; i++) {
      const assetGroup = assetGroups[i];
      if (this.shouldTerminate()) {
        Logger.log(
          `The function is reaching the 6 minute timeout, and therefore will create a trigger to rerun from this ad group: ${assetGroup.assetGroup.name} and then self terminate.`
        );
        PropertiesService.getScriptProperties().setProperty(
          'lastPmaxImageGenerationProcessedAdGroupId',
          assetGroup.assetGroup.id
        );
        this.createTriggerForNextRun();
        return; // Exit the function to prevent further execution
      }

      Logger.log(
        `Processing Asset Group ${assetGroup.assetGroup.name} (${assetGroup.assetGroup.id})...`
      );
      let generatedImages = 0;
      let numTries = 0;
      let neededSquare =
        Number(CONFIG['Number of Square Images per Asset Group (Pmax)']) || 0;
      let neededLandscape =
        Number(CONFIG['Number of Landscape Images per Asset Group (Pmax)']) ||
        0;
      let neededPortrait =
        Number(CONFIG['Number of Portrait Images per Asset Group (Pmax)']) || 0;
      const assetGroupImgCount =
        neededSquare + neededLandscape + neededPortrait;
      Logger.log(
        `generating: ${neededSquare} square images, ${neededLandscape} Landscape images,
        and ${neededPortrait} portrait images. Over all ${assetGroupImgCount}. `
      );
      // Process it in batches of max VISION_API_LIMIT images (as for now, 4)
      while (generatedImages < assetGroupImgCount && numTries <= MAX_TRIES) {
        let gAdsData = ''; // Kwds or AssetGroup data
        let imgPrompt = ''; // Prompt that will be sent to Vision API (Imagen)

        switch (CONFIG['Adir Mode']) {
          case ADIR_MODES.AD_GROUP: {
            const regex = new RegExp(CONFIG['Ad Group Name Regex']);
            const matchGroups = this.getRegexMatchGroups(
              assetGroup.assetGroup.name,
              regex
            );

            if (matchGroups) {
              gAdsData = this.createPrompt(matchGroups);
            } else {
              Logger.log(
                `No matching groups found for ${assetGroup.assetGroup.name} with ${regex}. Using full prompt.`
              );
              gAdsData = CONFIG['ImgGen Prompt'];
            }
            break;
          }
          case ADIR_MODES.KEYWORDS:
          case ADIR_MODES.MANUAL: {
            const keywordInfo =
              this._googleAdsApi.getSearchSignalKeywordsForAdGroup(
                assetGroup.assetGroup.id
              );
            // Set to avoid duplicated text in keywords
            const keywordList = [
              ...new Set(
                keywordInfo
                  .map(x => x.assetGroupSignal.searchTheme.text)
                  .filter(x => !!x)
              ),
            ];

            if (!keywordList.length) {
              Logger.log(
                `No positive keywords or creative summary: skipping Asset Group ${assetGroup.assetGroup.id}`
              );
              continue assetGroupsLoop;
            }

            Logger.log(
              'Positive keyword list or creative summary:' + keywordList.join()
            );
            gAdsData = keywordList.join();
            break;
          }
          default:
            // TODO: Prevent execution if Config is not correctly filled
            console.error(`Unknown mode: ${CONFIG['Adir Mode']}`);
        }

        // Keywords mode -> generate Imagen Prompt through Gemini API
        if (CONFIG['Adir Mode'] === ADIR_MODES.AD_GROUP) {
          imgPrompt = gAdsData;
        } else if (
          CONFIG['Adir Mode'] === ADIR_MODES.KEYWORDS ||
          CONFIG['Adir Mode'] === ADIR_MODES.MANUAL
        ) {
          // Call Gemini to generate the Img Prompt
          const promptContext =
            CONFIG['Adir Mode'] === ADIR_MODES.KEYWORDS
              ? CONFIG['Keyword Mode Text Prompt Context']
              : CONFIG['Manual Mode Text Prompt Context'];
          const baseTextPrompt =
            CONFIG['Adir Mode'] === ADIR_MODES.KEYWORDS
              ? CONFIG['Keyword Mode Text Prompt']
              : CONFIG['Manual Mode Text Prompt'];
          let textPrompt = `${promptContext} ${baseTextPrompt} ${gAdsData}`;

          if (CONFIG['Text Prompt Suffix']) {
            textPrompt += ' ' + CONFIG['Text Prompt Suffix'];
          }
          Logger.log('Prompt to generate Imagen Prompt: ' + textPrompt);
          try {
            imgPrompt = this._vertexAiApi.callGeminiApi(textPrompt);
          } catch (e) {
            if (e instanceof JsonParseError) {
              Logger.log('Gemini output is not correct JSON, retrying');
            } else if (e instanceof GeminiApiCallError) {
              Logger.log('Gemini call error, retrying');
            } else {
              throw e; // Unknown error
            }

            // retrying
            numTries++;
            continue;
          }
        }

        if (CONFIG['Prompt translations sheet']) {
          imgPrompt = this.applyTranslations(imgPrompt);
        }

        if (CONFIG['ImgGen Prompt Suffix']) {
          imgPrompt += ' ' + CONFIG['ImgGen Prompt Suffix'];
        }

        Logger.log(
          `Imagen Prompt for assetGroup ${assetGroup.assetGroup.name}: "${imgPrompt}"`
        );

        let images: string[] = [];
        try {
          for (const aspectRatio of this._aspectRatios) {
            // One generation per each aspect ratio.
            let batchSize = 0;
            let currentNeeded = 0;
            switch (aspectRatio.type) {
              case 'square':
                currentNeeded = neededSquare;
                break;
              case 'landscape':
                currentNeeded = neededLandscape;
                break;
              case 'portrait':
                currentNeeded = neededPortrait;
                break;
              default:
                currentNeeded = 0;
                break;
            }
            let newImages: string[] = [];
            if (currentNeeded > 0) {
              batchSize = Math.min(
                currentNeeded,
                this._vertexAiApi.IMAGE_GENERATION_API_LIMIT
              );
              newImages =
                this._vertexAiApi.callImageGenerationApi(
                  imgPrompt,
                  batchSize,
                  aspectRatio.ratio
                ) || [];
              if (aspectRatio.type === 'square') {
                neededSquare -= newImages.length;
              } else if (aspectRatio.type === 'landscape') {
                neededLandscape -= newImages.length;
              } else if (aspectRatio.type === 'portrait') {
                neededPortrait -= newImages.length;
              }
              images = images.concat(newImages);
            }
            for (const image of newImages) {
              const filename = this.generateImageFileName(
                assetGroup.assetGroup.id,
                assetGroup.assetGroup.name,
                aspectRatio.type
              );
              const folder = `${assetGroup.customer.id}/${assetGroup.assetGroup.id}/${CONFIG['Generated DIR']}`;
              const imageBlob = Utilities.newBlob(
                Utilities.base64Decode(image),
                'image/png',
                filename
              );
              this._gcsApi.uploadImage(imageBlob, filename, folder);
            }
          }
        } catch (e) {
          if (e instanceof ImageGenerationApiCallError) {
            Logger.log(
              'Not able to generate images, this might be because of the blocked content (see the logs)...'
            );
            numTries++;
            continue;
          }
          throw e;
        }

        Logger.log(
          `Received ${images?.length || 0} images for ${
            assetGroup.assetGroup.name
          }(${assetGroup.assetGroup.id})...`
        );
        if (!images || !images.length) {
          numTries++;
          continue;
        }
        // Update generatedImages to finish the while loop
        generatedImages += images.length;
      }
      PropertiesService.getScriptProperties().setProperty(
        'lastPmaxImageGenerationProcessedAdGroupId',
        assetGroup.assetGroup.id
      );
    }
    Logger.log('Finished generating.');
    PropertiesService.getScriptProperties().deleteProperty(
      'lastPmaxImageGenerationProcessedAdGroupId'
    );
    this.deleteTrigger();
  }
  /**
   * Create the image file name.
   *
   * Google Ads filenames can be up to 128 characters long. If a long ad group
   * name is provided as an argument, this will be trimmed so that the final
   * name does not exceed this.
   *
   * @param {number} assetGroupId: the ID of the ad group
   * @param {string} assetGroupName: the name of the ad group
   * @return {string} a file name that's less than 128 characters long, that
   *   takes the form `assetGroupId|assetGroupName|timestamp`
   */
  generateImageFileName(
    assetGroupId: number,
    assetGroupName: string,
    aspect?: string
  ) {
    // Remove any slashes in the ad group name as that would be problematic with
    // the file path
    assetGroupName = assetGroupName.replaceAll('/', ''); // TODO: Escape "|"
    // Some ad group names can be very long. Trim them to stay within the 128
    // character limit.
    const fileNameLimit = 128;
    const now = Date.now().toString();
    // These are the | characters added to the final string.
    const extraChars = 3;
    const assetGroupNameLimit =
      fileNameLimit - now.length - assetGroupId.toString().length - extraChars;
    const trimmedassetGroupName = assetGroupName.slice(0, assetGroupNameLimit);
    return `${assetGroupId}|${trimmedassetGroupName}|${Date.now()}|${aspect}`;
  }
  /**
   * For a given string & regex return the match groups if they exist else null
   */
  getRegexMatchGroups(str: string, regex: RegExp) {
    const regexMatch = str.match(regex);
    if (regexMatch !== null) {
      return regexMatch.groups;
    }
    return null;
  }
  /**
   * Inject the values from the object into the prompt and return.
   *
   * A prompt can have placeholders for keys in the object. For example:
   * "A photo of a ${city} in sharp, 4k".
   * If an object with { 'city': 'London' } is provided it will replace the
   * placeholder and return "A photo of a London in sharp, 4k".
   */
  createPrompt(obj: { [key: string]: string }) {
    let prompt = CONFIG['ImgGen Prompt'];
    for (const [key, value] of Object.entries(obj)) {
      prompt = prompt.replaceAll('${' + key + '}', value);
    }
    return prompt;
  }

  /**
   * Simple text replacer (based on the translations sheet data)
   *
   * @param prompt
   */
  applyTranslations(prompt: string) {
    const error = `Error: No translations are found.
      Please check that sheet "${CONFIG['Prompt translations sheet']}" exists
      and contains the translations. Remember, the first row is always header.`;

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(
      CONFIG['Prompt translations sheet']
    );
    if (!sheet) {
      throw error;
    }

    const translations = sheet.getDataRange().getDisplayValues().slice(1); // Removing the header
    if (!translations) {
      throw error;
    }

    return translations.reduce((acc, t) => acc.replaceAll(t[0], t[1]), prompt);
  }

  static triggeredRun() {
    PropertiesService.getScriptProperties().setProperty(
      `${PmaxImageGenerationService.name}StartTime`,
      new Date().getTime().toString()
    );
    const PmaximageGenerationService = new PmaxImageGenerationService();
    PmaximageGenerationService.run();
  }

  static manuallyRun() {
    PropertiesService.getScriptProperties().setProperty(
      `${PmaxImageGenerationService.name}StartTime`,
      new Date().getTime().toString()
    );
    const lastPmaxImageGenerationProcessedAdGroupId =
      PropertiesService.getScriptProperties().getProperty(
        'lastPmaxImageGenerationProcessedAdGroupId'
      );
    if (lastPmaxImageGenerationProcessedAdGroupId) {
      PropertiesService.getScriptProperties().deleteProperty(
        'lastPmaxImageGenerationProcessedAdGroupId'
      );
      Logger.log(
        'Cleared last processed Asset Group ID for a fresh manual run.'
      );
    }
    const pmaxImageGenerationService = new PmaxImageGenerationService();
    pmaxImageGenerationService.run();
  }
}
