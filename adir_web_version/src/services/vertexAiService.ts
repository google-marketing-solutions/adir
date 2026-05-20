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
  const effectiveModelId = modelId || "imagen-3.0-generate-002";
  const modelIdLowerCase = effectiveModelId.toLowerCase();
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

  console.log("Generated instruction:", instruction);

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
  const modelIdLowerCase = modelId.toLowerCase();

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

  if (modelIdLowerCase.includes("gemini-3")) {
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

  const modelIdLowerCase = modelId.toLowerCase();
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

/**
 * Generates exactly 3 distinct character design prompts from a creative brief and optional brand guidelines.
 * @param {string} creativeBrief - The creative brief or baseline instructions.
 * @param {string} modelId - The Gemini model ID.
 * @param {string} [brandGuidelines] - Optional brand guidelines.
 * @return {Promise<string[]>} An array of exactly 3 image generation prompt strings.
 */
export async function generateCharacterPrompts(
  creativeBrief: string,
  modelId: string,
  brandGuidelines?: string
): Promise<string[]> {
  let systemPrompt = `You are a creative director and character designer.
Your task is to read the following creative brief and generate exactly 3 distinct character concepts (e.g., representing diverse aspects of the target audience).
For each character concept, you must write a highly-detailed image prompt optimized for a photorealistic AI image generator (like Imagen).
The character prompts should focus solely on generating a high-quality, isolated portrait of that single character on a clean, solid neutral background (like a solid studio gray background) to make it suitable as a reference image. Avoid complex scenes, landscapes, text, or multiple people.

Adhere strictly to the following instructions:
1. Focus on the character's appearance, expression, age, gender, ethnicity, clothing, and style.
2. Ensure the characters represent distinct and diverse personas fitting the creative brief.
3. The background MUST be a solid, uniform, neutral color.
4. Do not include any conversational filler, framing, or explanations.
5. Output exactly 3 prompts, one per line, each starting with "a photo of". Do not number the lines.`;

  if (brandGuidelines) {
    systemPrompt += `\n\nAdhere strictly to the following brand guidelines:\n${brandGuidelines}`;
  }

  const promptForGemini = `${systemPrompt}\n\nHere is the creative brief:\n${creativeBrief}\n\nGenerate the 3 character prompts now (exactly 1 prompt per line, no numbers, starting with "a photo of"):`;

  const rawOutput = await generateTextFromPrompt(promptForGemini, modelId);
  console.log("Raw character prompts from Gemini:", rawOutput);

  const prompts = rawOutput
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && (line.toLowerCase().startsWith("a photo of") || line.toLowerCase().startsWith("photo of")));

  const formattedPrompts = prompts.map(p => p.toLowerCase().startsWith("a photo of") ? p : `a ${p}`);

  // Fallback to make sure we always return exactly 3 valid prompts
  while (formattedPrompts.length < 3) {
    formattedPrompts.push(`a photo of a professional corporate specialist representing the brand, high quality, studio portrait, solid neutral background`);
  }

  return formattedPrompts.slice(0, 3);
}
