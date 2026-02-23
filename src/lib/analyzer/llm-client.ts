import OpenAI from "openai";
import { z } from "zod";

const ANTIGRAVITY_BASE_URL = process.env.ANTIGRAVITY_BASE_URL ?? "http://127.0.0.1:8045/v1";
const ANTIGRAVITY_API_KEY = process.env.ANTIGRAVITY_API_KEY ?? "dummy-key"; // OpenAI SDK requires a key, even if dummy
const ANTIGRAVITY_MODEL = process.env.ANTIGRAVITY_MODEL ?? "gemini-3-flash";
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;

let openai: OpenAI | null = null;

/**
 * Get or create the OpenAI client
 */
function getClient(): OpenAI {
  if (!openai) {
    if (!process.env.ANTIGRAVITY_API_KEY) {
      console.warn("WARNING: ANTIGRAVITY_API_KEY not set in environment, using dummy key");
    }
    openai = new OpenAI({
      apiKey: ANTIGRAVITY_API_KEY,
      baseURL: ANTIGRAVITY_BASE_URL,
    });
  }
  return openai;
}

export interface LLMResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  tokensUsed: number;
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if error is a rate limit error
 */
function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("rate") ||
      message.includes("quota") ||
      message.includes("429") ||
      message.includes("resource_exhausted") 
    );
  }
  // OpenAI specific error object structure (if not standard Error)
  if (typeof error === 'object' && error !== null && 'status' in error) {
      return (error as any).status === 429;
  }
  return false;
}

/**
 * Generate content using Antigravity Manager (OpenAI protocol)
 * Supports Zod validation and auto-retry on validation failure
 */
export async function generateContent<T>(
  prompt: string,
  systemInstruction?: string,
  schema?: z.ZodSchema<T>
): Promise<LLMResponse<T>> {
  let lastError: string = "";
  let currentPrompt = prompt;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
      
      if (systemInstruction) {
        messages.push({ role: "system", content: systemInstruction });
      }
      
      messages.push({ role: "user", content: currentPrompt });

      const response = await getClient().chat.completions.create({
        model: ANTIGRAVITY_MODEL,
        messages: messages,
        temperature: 0.3,
        top_p: 0.8,
        max_tokens: 4096,
        response_format: { type: "json_object" },
      });

      const text = response.choices[0]?.message?.content ?? "";
      const tokensUsed = response.usage?.total_tokens ?? 0;

      // Parse JSON from response
      let parsedJson: any;
      try {
        parsedJson = JSON.parse(text);
      } catch {
        // Fallback to regex parsing if strict JSON parsing fails
        parsedJson = parseJsonResponse(text);
        if (!parsedJson) {
           throw new Error("Failed to parse JSON from response text");
        }
      }

      // Validate with schema if provided
      if (schema) {
        const result = schema.safeParse(parsedJson);
        if (!result.success) {
          const validationError = fromZodError(result.error);
          console.warn(`Validation failed (attempt ${attempt + 1}): ${validationError.message}`);
          
          // On last attempt, just return the failure
          if (attempt === MAX_RETRIES - 1) {
            return {
              success: false,
              data: null,
              error: `Validation error: ${validationError.message}`,
              tokensUsed,
            };
          }

          // Adjust prompt for retry to help LLM fix the structure
          currentPrompt = `${prompt}\n\nIMPORTANT: Your previous response was invalid. 
          The JSON structure did not match the required schema. 
          Errors: ${validationError.message}
          Please fix the structure and respond with valid JSON.`;
          
          continue;
        }
        return {
          success: true,
          data: result.data,
          error: null,
          tokensUsed,
        };
      }

      return {
        success: true,
        data: parsedJson as T,
        error: null,
        tokensUsed,
      };

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      lastError = message;

      // Check if it's a rate limit error
      if (isRateLimitError(error)) {
        const delayMs = BASE_DELAY_MS * Math.pow(2, attempt);
        console.log(
          `Rate limit hit (attempt ${attempt + 1}/${MAX_RETRIES}). Waiting ${Math.round(delayMs / 1000)}s before retry...`
        );
        await sleep(delayMs);
        continue;
      }

      // If it's a parsing error and we have retries left, try again
      if (message.includes("parse") && attempt < MAX_RETRIES - 1) {
         console.warn(`Parsing failed (attempt ${attempt + 1}): ${message}`);
         continue;
      }

      // Non-rate-limit/non-parsing error or last attempt, don't retry
      break;
    }
  }

  return {
    success: false,
    data: null,
    error: lastError,
    tokensUsed: 0,
  };
}

/**
 * Utility to format Zod errors for LLM feedback
 */
function fromZodError(error: z.ZodError): { message: string } {
  const issues = error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join("; ");
  return { message: issues };
}


/**
 * Parse JSON from LLM response text
 * Handles markdown code blocks and raw JSON
 */
function parseJsonResponse<T>(text: string): T | null {
  // Try to extract JSON from markdown code block
  const jsonBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonText = jsonBlockMatch ? jsonBlockMatch[1]?.trim() : text.trim();

  if (!jsonText) {
    return null;
  }

  try {
    return JSON.parse(jsonText) as T;
  } catch {
    // Try to find JSON object in text
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Check if Antigravity API is configured
 */
export function isLLMConfigured(): boolean {
   // OpenAI SDK always requires an API key, but we default to dummy if not set.
   // So effectively it is always "configured" on the client side, 
   // but might fail if the server requires a valid key.
   // For now checking if the env var is present or we used the default.
  return process.env.ANTIGRAVITY_API_KEY ? process.env.ANTIGRAVITY_API_KEY.length > 0 : false;
}

/**
 * Get current LLM configuration for debugging
 */
export function getLLMConfig(): { baseUrl: string; model: string; configured: boolean } {
  return {
    baseUrl: ANTIGRAVITY_BASE_URL,
    model: ANTIGRAVITY_MODEL,
    configured: isLLMConfigured(),
  };
}
