import {createVertexAiApiClient, DefaultSecuritySettings} from "./apiService";
/**
 * Generates images from a text prompt using a specified Vertex AI model.
 * @param {string} prompt - The text prompt to generate images from.
 * @param {string} aspectRatio - The desired aspect ratio of the generated images.
 * @param {number} sampleCount - The number of images to generate.
 * @param {string} modelId - The ID of the Vertex AI model to use.
 * @return {Promise<string[]>} A promise that resolves to an array of Base64 encoded image strings.
 */
export async function generateImagesFromPrompt(
  prompt: string,
  aspectRatio: string,
  sampleCount: number,
  modelId: string
): Promise<string[]> {
  const apiClient = createVertexAiApiClient();
  const modelIdLowerCase = modelId.toLowerCase();
  const action = "predict";
  let path;

  if (
    modelIdLowerCase.includes("imagen") ||
    modelIdLowerCase.includes("gemini")
  ) {
    path = `/publishers/google/models/${modelIdLowerCase}:${action}`;
  } else {
    path = `/endpoints/${modelIdLowerCase}:${action}`;
  }

  const body = {
    instances: [{ prompt }],
    parameters: {
      sampleCount,
      aspectRatio,
    },
  };

  const response = await apiClient.post(path, body);

  if (response.predictions) {
    return response.predictions.map(
      (prediction: { bytesBase64Encoded: string }) =>
        prediction.bytesBase64Encoded
    );
  }

  return [];
}

/**
 * Generates text from a prompt using a specified Vertex AI model.
 * @param {string} prompt - The text prompt to generate text from.
 * @param {string} modelId - The ID of the Vertex AI model to use.
 * @return {Promise<string>} A promise that resolves to the generated text.
 */
export async function generateTextFromPrompt(
  prompt: string,
  modelId: string
): Promise<string> {
  const modelIdLowerCase = modelId.toLowerCase();

  if (modelIdLowerCase.includes("gemini-3")) {
    const apiClient = createVertexAiApiClient({
      apiVersion: "v1beta1",
      useGlobalEndpoint: true,
    });
    const endpoint = `/publishers/google/models/${modelIdLowerCase}:generateContent`;
    const body = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 1,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
    };
    try {
      const response = await apiClient.post(endpoint, body);
      if (
        response.candidates &&
        response.candidates[0].content &&
        response.candidates[0].content.parts[0]
      ) {
        const generatedText = response.candidates[0].content.parts[0].text;
        return generatedText;
      }
    } catch (error) {
      console.error(
        "Error generating text with Gemini 3 via Vertex AI:",
        error
      );
      throw error;
    }
  }

  const apiClient = createVertexAiApiClient();
  const action = "generateContent";
  let path;

  if (
    modelIdLowerCase.includes("imagen") ||
    modelIdLowerCase.includes("gemini")
  ) {
    path = `/publishers/google/models/${modelIdLowerCase}:${action}`;
  } else {
    path = `/endpoints/${modelIdLowerCase}:${action}`;
  }

  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 1,
      topP: 0.95,
      maxOutputTokens: 8192,
    },
    safetySettings: DefaultSecuritySettings,
  };

  const response = await apiClient.post(path, body);

  if (
    response.candidates &&
    response.candidates[0].content &&
    response.candidates[0].content.parts[0]
  ) {
    const generatedText = response.candidates[0].content.parts[0].text;
    console.log("Generated text from Gemini:", generatedText);
    return generatedText;
  }

  return "";
}
