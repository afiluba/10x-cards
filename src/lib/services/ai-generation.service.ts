import type { supabaseClient } from "../../db/supabase.client";
import type {
  AiGenerationSessionCreateCommand,
  AiGenerationSessionCreateResponseDTO,
  AiGenerationProposalDTO,
  AiGenerationSessionDTO,
} from "../../types";
import { OpenRouterService } from "./openrouter.service";
import type { ResponseFormat } from "./openrouter.types";
import {
  OpenRouterConfigError,
  OpenRouterNetworkError,
  OpenRouterAPIError,
  OpenRouterRateLimitError,
  OpenRouterValidationError,
  OpenRouterTimeoutError,
} from "./openrouter.errors";

/**
 * JSON Schema for flashcard proposals response.
 * Defines the expected structure of AI-generated flashcards.
 */
const FLASHCARD_PROPOSALS_SCHEMA: ResponseFormat = {
  type: "json_schema",
  json_schema: {
    name: "flashcard_proposals",
    strict: true,
    schema: {
      type: "object",
      properties: {
        proposals: {
          type: "array",
          items: {
            type: "object",
            properties: {
              front_text: {
                type: "string",
                description: "The question or prompt text for the flashcard",
              },
              back_text: {
                type: "string",
                description: "The answer or explanation text for the flashcard",
              },
            },
            required: ["front_text", "back_text"],
            additionalProperties: false,
          },
        },
      },
      required: ["proposals"],
      additionalProperties: false,
    },
  },
};

/**
 * System prompt for AI flashcard generation.
 * Provides instructions and guidelines for generating high-quality flashcards.
 */
const FLASHCARD_GENERATION_SYSTEM_PROMPT = `You are an expert educational content creator specializing in creating effective flashcards for learning.

Your task is to analyze the provided text and generate approximately 20 high-quality flashcards that:
- Cover the most important concepts, facts, and ideas from the text
- Are clear, concise, and focused on a single concept per card
- Have questions (front) that are specific and unambiguous
- Have answers (back) that are complete but concise
- Follow best practices for spaced repetition learning
- Use simple, direct language
- Avoid redundancy across cards

Generate between 15-25 flashcards depending on the content density. Focus on quality over quantity.`;

/**
 * Interface for the AI response structure.
 */
interface FlashcardGenerationResponse {
  proposals: {
    front_text: string;
    back_text: string;
  }[];
}

/**
 * Generates flashcard proposals using AI via OpenRouter service.
 *
 * @param inputText - The source text to generate flashcards from
 * @param modelIdentifier - The AI model to use for generation
 * @returns Promise resolving to array of flashcard proposals
 * @throws Error with specific code for various failure scenarios
 */
async function generateFlashcardProposals(
  inputText: string,
  modelIdentifier: string
): Promise<AiGenerationProposalDTO[]> {
  // Get API key from environment
  const apiKey = import.meta.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    const error = new Error("OpenRouter API key not configured") as Error & {
      code: string;
      status: number;
    };
    error.code = "CONFIGURATION_ERROR";
    error.status = 500;
    throw error;
  }

  // Initialize OpenRouter service
  const openRouter = new OpenRouterService({
    apiKey,
    model: modelIdentifier,
    timeout: 60000, // 60 seconds for generation
    maxRetries: 2,
  });

  try {
    // Call OpenRouter API
    const response = await openRouter.chat<FlashcardGenerationResponse>({
      systemMessage: FLASHCARD_GENERATION_SYSTEM_PROMPT,
      userMessage: `Generate flashcards from the following text:\n\n${inputText}`,
      responseFormat: FLASHCARD_PROPOSALS_SCHEMA,
      temperature: 0.7,
      maxTokens: 4096,
    });

    // Validate response structure
    if (!response.content.proposals || !Array.isArray(response.content.proposals)) {
      const error = new Error("Invalid response structure from AI") as Error & {
        code: string;
        status: number;
      };
      error.code = "AI_RESPONSE_ERROR";
      error.status = 500;
      throw error;
    }

    // Convert to DTO format with temporary IDs
    return response.content.proposals.map((proposal) => ({
      temporary_id: crypto.randomUUID(),
      front_text: proposal.front_text,
      back_text: proposal.back_text,
    }));
  } catch (error) {
    // Map OpenRouter errors to application errors
    if (error instanceof OpenRouterConfigError) {
      const appError = new Error("AI service configuration error") as Error & {
        code: string;
        status: number;
        details: Record<string, string>;
      };
      appError.code = "CONFIGURATION_ERROR";
      appError.status = 500;
      appError.details = { message: error.message };
      throw appError;
    }

    if (error instanceof OpenRouterRateLimitError) {
      const appError = new Error("AI service rate limit exceeded") as Error & {
        code: string;
        status: number;
        details: Record<string, string>;
      };
      appError.code = "RATE_LIMIT_ERROR";
      appError.status = 429;
      appError.details = {
        message: error.message,
        retry_after: error.retryAfter?.toString() || "unknown",
      };
      throw appError;
    }

    if (error instanceof OpenRouterTimeoutError) {
      const appError = new Error("AI generation timed out") as Error & {
        code: string;
        status: number;
      };
      appError.code = "TIMEOUT_ERROR";
      appError.status = 504;
      throw appError;
    }

    if (error instanceof OpenRouterNetworkError) {
      const appError = new Error("Network error communicating with AI service") as Error & {
        code: string;
        status: number;
      };
      appError.code = "NETWORK_ERROR";
      appError.status = 503;
      throw appError;
    }

    if (error instanceof OpenRouterAPIError) {
      const appError = new Error("AI service API error") as Error & {
        code: string;
        status: number;
        details: Record<string, string>;
      };
      appError.code = "AI_API_ERROR";
      appError.status = error.statusCode || 500;
      appError.details = { message: error.message };
      throw appError;
    }

    if (error instanceof OpenRouterValidationError) {
      const appError = new Error("AI response validation failed") as Error & {
        code: string;
        status: number;
      };
      appError.code = "AI_RESPONSE_ERROR";
      appError.status = 500;
      throw appError;
    }

    // Re-throw if already formatted
    if (error && typeof error === "object" && "code" in error && "status" in error) {
      throw error;
    }

    // Generic error
    const appError = new Error("Failed to generate flashcards") as Error & {
      code: string;
      status: number;
    };
    appError.code = "INTERNAL_ERROR";
    appError.status = 500;
    throw appError;
  }
}

/**
 * Creates a new AI generation session with AI-generated flashcard proposals.
 *
 * This function:
 * 1. Generates a client_request_id if not provided
 * 2. Generates flashcard proposals using AI via OpenRouter
 * 3. Inserts an audit record into ai_generation_audit table
 * 4. Returns session metadata and proposals
 *
 * @param supabase - Supabase client instance
 * @param userId - Authenticated user ID
 * @param command - Session creation command with input text and optional parameters
 * @returns Promise resolving to session metadata and proposals
 * @throws Error with specific code for AI errors, database conflicts, or internal errors
 */
export async function createAiGenerationSession(
  supabase: typeof supabaseClient,
  userId: string,
  command: AiGenerationSessionCreateCommand
): Promise<AiGenerationSessionCreateResponseDTO> {
  // Generate client_request_id if not provided
  const clientRequestId = command.client_request_id ?? crypto.randomUUID();
  const modelIdentifier = command.model_identifier ?? "qwen/qwen3-coder:free";

  // Generate flashcard proposals using AI
  const proposals = await generateFlashcardProposals(command.input_text, modelIdentifier);

  // Create audit record
  const { data: auditRecord, error: insertError } = await supabase
    .from("ai_generation_audit")
    .insert({
      user_id: userId,
      client_request_id: clientRequestId,
      model_identifier: modelIdentifier,
      generation_started_at: new Date().toISOString(),
      generated_count: proposals.length,
      saved_unchanged_count: 0,
      saved_edited_count: 0,
      rejected_count: 0,
    })
    .select("id, client_request_id, model_identifier, generation_started_at")
    .single();

  // Handle database errors
  if (insertError) {
    // Check for unique constraint violation (duplicate client_request_id)
    if (insertError.code === "23505") {
      const error = new Error("A session with this client_request_id already exists") as Error & {
        code: string;
        status: number;
      };
      error.code = "DUPLICATE_REQUEST_ID";
      error.status = 409;
      throw error;
    }

    // Generic database error
    const error = new Error("Failed to create AI generation session") as Error & {
      code: string;
      status: number;
      details: Record<string, string>;
    };
    error.code = "INTERNAL_ERROR";
    error.status = 500;
    error.details = { database_error: insertError.message };
    throw error;
  }

  if (!auditRecord) {
    const error = new Error("Failed to create audit record") as Error & {
      code: string;
      status: number;
    };
    error.code = "INTERNAL_ERROR";
    error.status = 500;
    throw error;
  }

  // Build session DTO
  const session: AiGenerationSessionDTO = {
    id: auditRecord.id,
    client_request_id: auditRecord.client_request_id,
    model_identifier: auditRecord.model_identifier,
    generation_started_at: auditRecord.generation_started_at,
  };

  return {
    session,
    proposals,
  };
}
