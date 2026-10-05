import { useConfigStore } from "../stores/config";
import { createVertexAiApiClient, DefaultSecuritySettings } from "./apiService";

/**
 * Generates or edits an image using Nano Banana (Gemini 3 Image models) via Vertex AI.
 * @param {string | string[]} [base64Images=[]] - Optional base64 encoded reference images.
 * @param {string} prompt - The text prompt for generation or editing.
 * @param {string} [aspectRatio] - Optional aspect ratio for the generated image.
 * @return {Promise<string>} A promise that resolves to the generated image as a Base64 string.
 */
export async function editImageWithNanoBanana(
  base64Images: string | string[] = [],
  prompt: string = "",
  aspectRatio?: string,
): Promise<string> {
  // Ensure base64Images is an array of non-empty strings
  const imagesArray = (
    Array.isArray(base64Images)
      ? base64Images
      : base64Images
        ? [base64Images]
        : []
  ).filter(Boolean);

  if (imagesArray.length > 14) {
    console.warn(
      `Nano Banana supports up to 14 reference images. Truncating from ${imagesArray.length} to 14.`,
    );
    imagesArray.splice(14);
  }

  let finalPrompt = prompt;
  if (aspectRatio) {
    finalPrompt += `\n\nGenerate the image with an aspect ratio of ${aspectRatio}.`;
  }

  const contents = [
    {
      role: "user",
      parts: [
        { text: finalPrompt },
        ...imagesArray.map((img) => ({
          inlineData: {
            mimeType: "image/png",
            data: img.replace(/^data:image\/\w+;base64,/, ""),
          },
        })),
      ],
    },
  ];

  const configStore = useConfigStore();
  const rawModelId = configStore.nanoBananaModel || "gemini-3.1-flash-image";
  const modelId = rawModelId.replace(/-preview$/, "");
  const generateContentApi = "generateContent";
  const endpoint = `/publishers/google/models/${modelId}:${generateContentApi}`;

  const payload = {
    contents,
    generationConfig: {
      temperature: 1,
      maxOutputTokens: 32768,
      responseModalities: ["TEXT", "IMAGE"],
      topP: 0.95,
    },
    safetySettings: DefaultSecuritySettings,
  };

  try {
    const apiClient = createVertexAiApiClient({
      apiVersion: "v1beta1",
      useGlobalEndpoint: true,
    });
    const response = await apiClient.post(endpoint, payload);

    if (
      response.candidates &&
      response.candidates[0].content &&
      response.candidates[0].content.parts
    ) {
      const imagePart = response.candidates[0].content.parts.find(
        (part: any) => part.inlineData,
      );
      if (imagePart) {
        return imagePart.inlineData.data;
      }
    }
    throw new Error("No image returned from Vertex AI API");
  } catch (error) {
    console.error("Error in editImageWithNanoBanana:", error);
    throw error;
  }
}
