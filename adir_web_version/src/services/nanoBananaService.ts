import { useConfigStore } from "@/stores/config";

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
  const configStore = useConfigStore();
  const { cloudProjectID, cloudRegion, geminiApiKey } = configStore;

  if (!cloudProjectID || !cloudRegion) {
    throw new Error("Google Cloud Project ID and Region are not configured.");
  }

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

  const useGeminiApi = !!geminiApiKey;
  const modelId = "gemini-3-pro-image-preview";
  console.log(
    `Editing image with model: ${modelId}, using Gemini API: ${useGeminiApi}. Images count: ${imagesArray.length}`
  );

  if (useGeminiApi) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${geminiApiKey}`;
    const body = {
      contents: [
        {
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
      ],
    };

    console.log(
      "Sending request to Gemini API:",
      url.replace(geminiApiKey, "REDACTED")
    );
    console.log(`Image data length: ${imagesArray[0].length} characters`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Gemini API error response:", errorData);
      throw new Error(`Gemini API error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log("Gemini API response received");
    if (
      data.candidates &&
      data.candidates[0].content &&
      data.candidates[0].content.parts
    ) {
      const imagePart = data.candidates[0].content.parts.find(
        (part: any) => part.inlineData
      );
      if (imagePart) {
        return imagePart.inlineData.data;
      }
    }
    throw new Error("No image returned from Gemini API");
  } else {
    // Vertex AI fallback (if no API key, but this might not work for Gemini 3 yet)
    // const url = `https://us-central1-aiplatform.googleapis.com/v1/projects/${cloudProjectID}/locations/us-central1/publishers/google/models/${modelId}:predict`;
    // // Vertex AI Gemini 3 prediction body might differ, this is a guess based on standard Vertex AI
    // const body = {
    //   instances: [
    //     {
    //       prompt,
    //       image: {
    //         bytesBase64Encoded: imagesArray[0].replace(
    //           /^data:image\/\w+;base64,/,
    //           ""
    //         ), // Fallback to first image for Vertex AI for now
    //       },
    //     },
    //   ],
    // };
    // Need to add auth token for Vertex AI, which is handled in apiService.
    // For simplicity, let's assume Gemini API with key is preferred for now as it's easier to set up for the user.
    throw new Error("Gemini API key is mandatory for the usage of Nano Banana");
  }
}
