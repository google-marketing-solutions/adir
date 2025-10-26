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

import { FRONTEND_HELPER } from './frontend-helper';
import { GeminiValidationService } from './gemini-validation-service';
import { menu } from './menu';
import { PmaxImageGenerationService } from './pmax-image-generation-service';
import { PmaxImageUploadService } from './pmax-image-upload-service';
import { uiHelper } from './ui-helper';
import { UploadToAssetLibraryFromMockService } from './upload_to_asset_library_from_mock';

menu;
PmaxImageGenerationService;
PmaxImageUploadService;
UploadToAssetLibraryFromMockService;
GeminiValidationService;
FRONTEND_HELPER;
uiHelper;
