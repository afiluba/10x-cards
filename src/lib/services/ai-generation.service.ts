import type { supabaseClient } from "../../db/supabase.client";
import type {
  AiGenerationSessionCreateCommand,
  AiGenerationSessionCreateResponseDTO,
  AiGenerationProposalDTO,
  AiGenerationSessionDTO,
} from "../../types";

/**
 * Generates mock flashcard proposals for testing purposes.
 * In production, this will be replaced with actual AI generation.
 *
 * @param count - Number of proposals to generate (default: 20)
 * @returns Array of mock flashcard proposals with unique temporary IDs
 */
function generateMockProposals(count = 20): AiGenerationProposalDTO[] {
  return Array.from({ length: count }, (_, i) => ({
    temporary_id: crypto.randomUUID(),
    front_text: `What is the answer to question ${i + 1}?`,
    back_text: `This is the answer to question ${i + 1}.`,
  }));
}

/**
 * Creates a new AI generation session with mock flashcard proposals.
 *
 * This function:
 * 1. Generates a client_request_id if not provided
 * 2. Inserts an audit record into ai_generation_audit table
 * 3. Generates 20 mock flashcard proposals
 * 4. Returns session metadata and proposals
 *
 * @param supabase - Supabase client instance
 * @param userId - Authenticated user ID
 * @param command - Session creation command with input text and optional parameters
 * @returns Promise resolving to session metadata and proposals
 * @throws Error with specific code for database conflicts or internal errors
 */
export async function createAiGenerationSession(
  supabase: typeof supabaseClient,
  userId: string,
  command: AiGenerationSessionCreateCommand
): Promise<AiGenerationSessionCreateResponseDTO> {
  // Generate client_request_id if not provided
  const clientRequestId = command.client_request_id ?? crypto.randomUUID();
  const modelIdentifier = command.model_identifier ?? "mock";

  // Generate mock proposals (20 flashcards)
  const proposals = generateMockProposals(20);

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
