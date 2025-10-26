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
interface Config {
  'Ads API Key': string;
  'Manager ID': string;
  'Account ID': string;
  'Campaign IDs': string;
  'CTR Threshold': number;
  'Impression Threshold': number;
  'ImgGen Prompt': string;
  'ImgGen Prompt Suffix': string;
  'Number of Square Images per Asset Group (Pmax)': number;
  'Number of Landscape Images per Asset Group (Pmax)': number;
  'Number of Portrait Images per Asset Group (Pmax)': number;
  'GCP Project': string;
  'GCS Bucket': string;
  'Max. bad images': number;
  'Disapproved DIR': string;
  'Bad performance DIR': string;
  'Uploaded DIR': string;
  'Generated DIR': string;
  'Validated DIR': string;
  'Rejected DIR': string;
  'Ad Group Name Regex': string;
  'Image Validation Prompt': string;
  'Adir Mode': string;
  'Keyword Mode Text Prompt Context': string;
  'Keyword Mode Text Prompt': string;
  'Manual Mode Text Prompt Context': string;
  'Manual Mode Text Prompt': string;
  'Text Prompt Suffix': string;
  'Prompt translations sheet': string;
  'Manual Mode Sheet': string;
  'GCP Region'?: string;
  'VertexAI Api Domain Part'?: string;
  'Gemini Model'?: string;
  'Image Generation Model'?: string;
}

export const sheet =
  SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Config')!;
const DEFAULT_CONFIG = {
  'Ads API Key': '',
  'Manager ID': '',
  'Account ID': '',
  'Campaign IDs': '',
  'CTR Threshold': 0,
  'Impression Threshold': 0,
  'ImgGen Prompt': '${name}',
  'ImgGen Prompt Suffix': 'HDR, taken by professional',
  'Number of Square Images per Asset Group (Pmax)': 0,
  'Number of Landscape Images per Asset Group (Pmax)': 0,
  'Number of Portrait Images per Asset Group (Pmax)': 0,
  'GCP Project': '',
  'GCS Bucket': '',
  'Max. bad images': 0,
  'Disapproved DIR': '',
  'Bad performance DIR': '',
  'Uploaded DIR': '',
  'Generated DIR': '',
  'Validated DIR': '',
  'Rejected DIR': '',
  'Image Validation Prompt': '',
  'Ad Group Name Regex': '^(?<name>.*)$', // capture everything by default
  'Adir Mode': '',
  'Keyword Mode Text Prompt Context': '',
  'Keyword Mode Text Prompt': '',
  'Manual Mode Text Prompt Context': '',
  'Manual Mode Text Prompt': '',
  'Text Prompt Suffix': '',
  'Prompt translations sheet': '',
  'Manual Mode Sheet': '',
  'GCP Region': undefined,
  'VertexAI Api Domain Part': undefined,
  'Gemini Model': undefined,
  'Image Generation Model': undefined,
};

/**
 * Defines the available modes for Adir image generation.
 * These modes determine the Google Ads context that will be used for building image generation prompts.
 */
export const ADIR_MODES = {
  AD_GROUP: 'Asset Group Name',
  KEYWORDS: 'Search Signal Keywords ',
  MANUAL: 'Creative Concept Manual Mode',
};
/**
 * Specifies the spreadsheet cell (e.g., 'B6') that stores the current Adir mode.
 */
export const ADIR_MODE_CELL = 'B10';

export const CONFIG: Config =
  sheet
    ?.getRange('A2:B')
    .getDisplayValues()
    .filter(e => e[0])
    .reduce((res, e) => {
      return { ...res, [e[0]]: e[1] };
    }, DEFAULT_CONFIG) ?? DEFAULT_CONFIG;
