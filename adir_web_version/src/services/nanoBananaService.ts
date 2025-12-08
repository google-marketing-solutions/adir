import {createVertexAiApiClient, DefaultSecuritySettings} from "./apiService";
/**
 * Edits an image using Gemini 3 Pro Image (Nano Banana) via Vertex AI.
 * @param {string[]} base64Images - The base64 encoded images to edit.
 * @param {string} prompt - The text prompt for editing.
 * @return {Promise<string>} A promise that resolves to the edited image as a Base64 string.
 */
export async function editImageWithNanoBanana(
  base64Images: string | string[],
  prompt: string
): Promise<string> {
  // Ensure base64Images is an array
  const imagesArray = Array.isArray(base64Images)
    ? base64Images
    : [base64Images];

  if (imagesArray.length > 14) {
    console.warn(
      `Gemini 3 Pro Image supports up to 14 images. Truncating from ${imagesArray.length} to 14.`
    );
    imagesArray.splice(14);
  }

  const contents = [
    {
      role: "user",
      parts: [
        { text: prompt },
        ...imagesArray.map((img) => ({
          inlineData: {
            mimeType: "image/png",
            data: img.replace(/^data:image\/\w+;base64,/, ""),
          },
        })),
      ],
    },
  ];

  const modelId = "gemini-3-pro-image-preview";
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
        (part: any) => part.inlineData
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
