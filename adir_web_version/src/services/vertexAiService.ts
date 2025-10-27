import { createVertexAiApiClient } from "./apiService";

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
  const apiClient = createVertexAiApiClient();
  const modelIdLowerCase = modelId.toLowerCase();
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
    safetySettings: [
      {
        category: "HARM_CATEGORY_HATE_SPEECH",
        threshold: "BLOCK_NONE",
      },
      {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold: "BLOCK_NONE",
      },
      {
        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        threshold: "BLOCK_NONE",
      },
      {
        category: "HARM_CATEGORY_HARASSMENT",
        threshold: "BLOCK_NONE",
      },
    ],
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
