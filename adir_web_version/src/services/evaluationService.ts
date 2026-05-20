import { useConfigStore } from "../stores/config";
import { createVertexAiApiClient, DefaultSecuritySettings } from "./apiService";

export interface EvaluationResult {
  approved: boolean;
  feedback: string;
}

/**
 * Evaluates a generated image against brand guidelines and evaluation rules.
 * @param {string} imageBase64 - The base64 encoded image (with or without data:image/png;base64 prefix).
 * @param {string} prompt - The original prompt used to generate the image.
 * @param {string} brandGuidelines - The brand guidelines to check against.
 * @param {string} evaluationRules - Specific evaluation rules to check against.
 * @return {Promise<EvaluationResult>} The evaluation result.
 */
export async function evaluateImage(
  imageBase64: string,
  prompt: string,
  brandGuidelines: string,
  evaluationRules: string
): Promise<EvaluationResult> {
  const configStore = useConfigStore();
  const modelId = configStore.geminiModel || "gemini-3-flash-preview";
  const modelIdLowerCase = modelId.toLowerCase();
  
  // Use v1beta1 as it has better support for structured outputs and system instructions
  const apiClient = createVertexAiApiClient({
    apiVersion: "v1beta1",
    useGlobalEndpoint: true,
  });
  
  const endpoint = `/publishers/google/models/${modelIdLowerCase}:generateContent`;

  const systemInstruction = `You are an expert brand auditor and creative director.
Your task is to evaluate the generated image against the original prompt, brand guidelines, and specific evaluation rules.
You must decide if the image is approved or rejected.
If rejected, you must provide detailed, constructive feedback on what is wrong and how to improve the image prompt to fix these issues in the next generation attempt.

You must return a JSON object with the following structure:
{
  "approved": boolean,
  "feedback": "Detailed explanation of issues and prompt refinement suggestions if rejected, or empty string if approved."
}

Guidelines for feedback:
- Be specific about what failed (e.g., "The background is red instead of the required blue").
- Suggest concrete additions or modifications to the prompt to correct the issue (e.g., "Change 'a cat on a red rug' to 'a cat on a blue rug, ensuring the rug is strictly blue as per brand guidelines'").
- Keep feedback professional and objective.
- Do NOT just say "rejected". Give actionable advice to improve the prompt.
`;

  const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

  const userContent = [
    {
      role: "user",
      parts: [
        { text: `Original Prompt: ${prompt}` },
        { text: `Brand Guidelines:\n${brandGuidelines || "None provided."}` },
        { text: `Evaluation Rules:\n${evaluationRules || "None provided."}` },
        {
          inlineData: {
            mimeType: "image/png",
            data: cleanBase64,
          },
        },
        { text: "Please evaluate this image and respond strictly in the requested JSON format." }
      ],
    },
  ];

  const payload = {
    contents: userContent,
    systemInstruction: {
      parts: [{ text: systemInstruction }]
    },
    generationConfig: {
      temperature: 0.2, // Low temperature for more deterministic evaluation
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          approved: { type: "BOOLEAN" },
          feedback: { type: "STRING" }
        },
        required: ["approved", "feedback"]
      }
    },
    safetySettings: DefaultSecuritySettings,
  };

  try {
    const response = await apiClient.post(endpoint, payload);

    if (
      response.candidates &&
      response.candidates[0].content &&
      response.candidates[0].content.parts &&
      response.candidates[0].content.parts[0]
    ) {
      const text = response.candidates[0].content.parts[0].text;
      try {
        const result: EvaluationResult = JSON.parse(text);
        return result;
      } catch (e) {
        console.error("Failed to parse evaluation response as JSON:", text, e);
        return {
          approved: false,
          feedback: "Failed to parse evaluation response. Raw response was: " + text
        };
      }
    }
    throw new Error("No content returned from Vertex AI API for evaluation");
  } catch (error) {
    console.error("Error in evaluateImage:", error);
    throw error;
  }
}

/**
 * Automatically generates evaluation rules based on a prompt and brand guidelines.
 * @param {string} prompt - The base prompt or creative vision description.
 * @param {string} brandGuidelines - The brand guidelines.
 * @return {Promise<string>} A promise that resolves to the generated rules as a string.
 */
export async function generateEvaluationRules(
  prompt: string,
  brandGuidelines: string,
  referenceImages?: string[],
  imageContextInstructions?: string
): Promise<string> {
  const configStore = useConfigStore();
  const modelId = configStore.geminiModel || "gemini-3-flash-preview";
  const modelIdLowerCase = modelId.toLowerCase();

  const apiClient = createVertexAiApiClient({
    apiVersion: "v1beta1",
    useGlobalEndpoint: true,
  });

  const endpoint = `/publishers/google/models/${modelIdLowerCase}:generateContent`;

  const systemInstruction = `You are an expert QA engineer and brand compliance officer.
Your task is to analyze the provided image generation prompt, brand guidelines, and optional reference images (along with instructions on how to use them), and distill them into a set of concrete, actionable, and text-only evaluation rules.
These rules will be used by a visual auditor to check if generated images are correct.

Guidelines for generating rules:
- Rules must be objective and verifiable (e.g., "The main subject must be a running shoe", NOT "The image should look good").
- Extract key elements from the prompt: subject, setting, key colors, mood, and specific instructions.
- Incorporate critical brand guidelines (e.g., color constraints, logo rules).
- If reference images are provided, analyze their visual style, composition, or subject based on the provided instructions, and generate rules that ensure consistency (e.g., "The image must match the minimalist style and white background of the reference images", or "The product design must strictly match the shoe shown in reference image 1").
- List the rules clearly as bullet points.
- Keep the rules concise and easy to understand.
- Do NOT include any introductory or concluding text. Return ONLY the list of bulleted rules.
`;

  const parts: any[] = [
    { text: `Base Prompt/Creative Vision:\n${prompt}` },
    { text: `Brand Guidelines:\n${brandGuidelines || "None provided."}` },
  ];

  if (imageContextInstructions) {
    parts.push({ text: `Reference Images Instructions:\n${imageContextInstructions}` });
  }

  if (referenceImages && referenceImages.length > 0) {
    parts.push({ text: "Here are the reference images for visual context:" });
    referenceImages.forEach((img) => {
      parts.push({
        inlineData: {
          mimeType: "image/png",
          data: img.replace(/^data:image\/\w+;base64,/, ""),
        },
      });
    });
  }

  parts.push({ text: "Please generate the evaluation rules based on the above information." });

  const userContent = [
    {
      role: "user",
      parts: parts,
    },
  ];

  const payload = {
    contents: userContent,
    systemInstruction: {
      parts: [{ text: systemInstruction }]
    },
    generationConfig: {
      temperature: 0.7, // slightly higher temperature for creative extraction
      maxOutputTokens: 2048,
    },
    safetySettings: DefaultSecuritySettings,
  };

  try {
    const response = await apiClient.post(endpoint, payload);

    if (
      response.candidates &&
      response.candidates[0].content &&
      response.candidates[0].content.parts &&
      response.candidates[0].content.parts[0]
    ) {
      return response.candidates[0].content.parts[0].text;
    }
    throw new Error("No content returned from Vertex AI API for rule generation");
  } catch (error) {
    console.error("Error in generateEvaluationRules:", error);
    throw error;
  }
}
