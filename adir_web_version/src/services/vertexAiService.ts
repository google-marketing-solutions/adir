import {createVertexAiApiClient, DefaultSecuritySettings} from "./apiService";

/**
 * Resolves Gemini model aliases (such as `gemini-flash-latest` or `gemini-pro-latest`,
 * which exist on the Gemini Developer API `generativelanguage.googleapis.com` but NOT
 * as publisher model IDs on Google Cloud Vertex AI `aiplatform.googleapis.com`) to the
 * official Vertex AI publisher model IDs (`gemini-3.8-flash` and `gemini-3.1-pro-preview`).
 * @param {string} [modelId] - The selected model ID or alias.
 * @return {string} The resolved Vertex AI publisher model ID.
 */
export function resolveGeminiModelId(modelId?: string): string {
  const raw = (modelId || "gemini-flash-latest").trim().toLowerCase();
  if (
    raw === "gemini-flash-latest" ||
    raw === "gemini-latest" ||
    raw === "gemini-next" ||
    raw === "gemini-3.5-flash" ||
    raw === "gemini-3.1-flash-lite" ||
    raw === "gemini-1.5-flash"
  ) {
    return "gemini-3.8-flash";
  }
  if (
    raw === "gemini-pro-latest" ||
    raw === "gemini-3.1-pro" ||
    raw === "gemini-3.1-pro-preview"
  ) {
    return "gemini-3.1-pro-preview";
  }
  return raw;
}

/**
 * Generates the system prompt template for generating creative concept image prompts, incorporating optional brand guidelines and reference image context.
 * @param {string} [brandGuidelines] - Optional brand guidelines to include.
 * @param {string[]} [referenceImages] - Optional array of base64 reference images for context.
 * @param {string} [imageContextInstructions] - Optional instructions on how to use the reference images.
 * @return {string} The constructed prompt template.
 */
export function getCreativeConceptsInstruction(
  brandGuidelines?: string,
  referenceImages?: string[],
  imageContextInstructions?: string
): string {
  let brandGuidelinesString = "";
  if (brandGuidelines) {
    brandGuidelinesString += `\n\n## Adhere *strictly* to the following brand guidelines:\n${brandGuidelines}\n\n`;
  }

  let referenceImagesString = "";
  if (referenceImages && referenceImages.length > 0) {
    referenceImagesString += `\n\n## Reference Images Context:`;
    if (imageContextInstructions) {
      referenceImagesString += `\nAdhere *strictly* to these instructions for using the attached reference images:\n${imageContextInstructions}\n\n`;
    } else {
      referenceImagesString += `\nUse the style, composition, or visual cues from the attached reference images for context.\n\n`;
    }
  }

  const instruction = `# ROLE & GOAL
You are a technical art director and expert prompt engineer.
Your specialty is translating a creative director's written vision into a
precise, highly-detailed, and technically optimized prompt for advanced AI image
generation models like "Nano Banana 2". Your task is to read the following creative
vision description and translate it into a single, comprehensive image generation prompt.
You must meticulously extract all the key details from the description: the
subject, setting, action, mood, lighting style, and color palette. Synthesize
these details into a keyword-rich, comma-separated string optimized for a
photorealistic output.

A critical part of your task involves handling the text overlay conditionally:
If you find a line at the end of the description that starts with Text: you must
incorporate that exact text into your prompt as a clean, modern, and prominent
overlay on the image. The text can have a colored background.

If there is no line that starts with Text: do not include any instructions for
adding text. The final visual should be completely text-free.

**Make sure to follow these guidlines: **
1. Make the product or service the primary focal point of the image.
2. Generate a single, cohesive scene; do not create a collage.
3. The background must be simple and uncluttered to avoid distraction.
4. Place any text in empty space, not on top of the main subject.
5. Use lighting that is natural for the environment and clearly illuminates the subject.
6. The setting should be directly relevant to the product's use or target audience.
*Your entire output must be ONLY the final image generation prompt.
Do not add any conversational text, titles, or explanations.*
${brandGuidelinesString}${referenceImagesString}Here is the creative vision description:`;
  return instruction;
}

/**
 * Generates text from a prompt using a specified Vertex AI model.
 * @param {string} prompt - The text prompt to generate text from.
 * @param {string} modelId - The ID of the Vertex AI model to use.
 * @param {string[]} [reference_images] - Optional array of base64 reference images to supply to the model.
 * @return {Promise<string>} A promise that resolves to the generated text.
 */
export async function generateTextFromPrompt(
  prompt: string,
  modelId: string,
  reference_images?: string[]
): Promise<string> {
  const modelIdLowerCase = resolveGeminiModelId(modelId);

  const parts: any[] = [{ text: prompt }];
  if (reference_images && reference_images.length > 0) {
    reference_images.forEach((img) => {
      parts.push({
        inlineData: {
          mimeType: "image/png",
          data: img.replace(/^data:image\/\w+;base64,/, ""),
        },
      });
    });
  }

  if (modelIdLowerCase.includes("gemini")) {
    const apiClient = createVertexAiApiClient({
      apiVersion: "v1beta1",
      useGlobalEndpoint: true,
    });
    const endpoint = `/publishers/google/models/${modelIdLowerCase}:generateContent`;
    const body = {
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature: 1,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
      safetySettings: DefaultSecuritySettings,
    };
    try {
      const response = await apiClient.post(endpoint, body);
      const candidateParts = response?.candidates?.[0]?.content?.parts;
      if (Array.isArray(candidateParts) && candidateParts.length > 0) {
        const nonThoughtText = candidateParts
          .filter((p: any) => !p.thought && typeof p.text === "string")
          .map((p: any) => p.text)
          .join("");
        return nonThoughtText || candidateParts[0].text || "";
      }
      return "";
    } catch (error) {
      console.error(
        `Error generating text with ${modelIdLowerCase} via Vertex AI:`,
        error
      );
      throw error;
    }
  }

  const apiClient = createVertexAiApiClient();
  const path = `/endpoints/${modelIdLowerCase}:generateContent`;

  const body = {
    contents: [{ role: "user", parts }],
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

/**
 * Extracts brand guidelines from a prompt, optionally using Search Grounding or file data.
 * @param {string} prompt - The prompt for Gemini.
 * @param {string} modelId - The model ID to use.
 * @param {boolean} useGrounding - Whether to enable Search Grounding.
 * @param {object} [fileData] - Optional file data { mimeType, data }.
 * @return {Promise<string>} The extracted guidelines.
 */
export async function extractBrandGuidelines(
  prompt: string,
  modelId: string,
  useGrounding: boolean = false,
  fileData?: { mimeType: string; data: string } | { mimeType: string; data: string }[]
): Promise<string> {
  const apiClient = createVertexAiApiClient({
    apiVersion: "v1beta1",
    useGlobalEndpoint: true,
  });

  const modelIdLowerCase = resolveGeminiModelId(modelId);
  const endpoint = `/publishers/google/models/${modelIdLowerCase}:generateContent`;

  const parts: any[] = [{ text: prompt }];
  if (fileData) {
    if (Array.isArray(fileData)) {
      fileData.forEach(file => parts.unshift({ inlineData: file }));
    } else {
      parts.unshift({ inlineData: fileData });
    }
  }

  const body = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 4096,
    },
    tools: useGrounding ? [{ googleSearch: {} }] : undefined,
  };

  try {
    const response = await apiClient.post(endpoint, body);
    if (
      response.candidates &&
      response.candidates[0].content &&
      response.candidates[0].content.parts[0]
    ) {
      return response.candidates[0].content.parts[0].text;
    }
  } catch (error) {
    console.error("Error extracting brand guidelines:", error);
    throw error;
  }
  return "";
}

/**
 * Generates an optimized image generation prompt from a creative concept description using Gemini.
 * Supports optional reference images and brand guidelines.
 * @param {string} creativeVision - The baseline template or custom creative vision description.
 * @param {string} conceptDescription - The specific creative concept details.
 * @param {string} modelId - The Gemini model ID.
 * @param {string[]} [reference_images] - Optional array of base64 reference images.
 * @param {string} [brand_guidelines] - Optional brand guidelines to adhere to.
 * @return {Promise<string>} The generated image generation prompt.
 */
export async function createCreativeConceptPrompt(
  creativeVision: string,
  conceptDescription: string,
  modelId: string,
  reference_images?: string[],
  brand_guidelines?: string
): Promise<string> {
  let fullInstructions = creativeVision;

  if (brand_guidelines) {
    fullInstructions = `Adhere strictly to the following brand guidelines:\n${brand_guidelines}\n\n${fullInstructions}`;
  }

  const promptForGemini = `You are a prompt engineer and your job is to provide the best short prompt to generate an image for a digital campaign. Given the following text, provide the optimal Generative AI prompt to generate a realistic style image to be used in an ad of a digital campaign that will best illustrate the concepts defined by the text. Please return only the prompt and start the prompt with "a photo of". Here is the text: ${fullInstructions} ${conceptDescription ? "and the creative concept: " + conceptDescription : ""}`;

  return generateTextFromPrompt(
    promptForGemini,
    modelId,
    reference_images
  );
}


