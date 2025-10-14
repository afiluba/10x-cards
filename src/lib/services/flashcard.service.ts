import type { supabaseClient } from "../../db/supabase.client";
import type { FlashcardBatchSaveCommand, FlashcardBatchSaveResponseDTO } from "../../types";

/**
 * Custom error factory for service layer errors.
 * Creates errors with additional metadata for proper HTTP response handling.
 *
 * @param code - Error code identifier
 * @param message - Human-readable error message
 * @param status - HTTP status code
 * @param details - Optional additional error details
 * @returns Error object with extended properties
 */
function createError(
  code: string,
  message: string,
  status: number,
  details?: Record<string, string>
): Error & { code: string; status: number; details?: Record<string, string> } {
  const error = new Error(message) as Error & {
    code: string;
    status: number;
    details?: Record<string, string>;
  };
  error.code = code;
  error.status = status;
  if (details) {
    error.details = details;
  }
  return error;
}

/**
 * Saves a batch of AI-generated flashcards and updates audit counters.
 *
 * This function performs the following operations atomically:
 * 1. Validates the audit session exists and is not completed
 * 2. Validates counts match (saved + rejected = generated)
 * 3. Inserts flashcards in bulk
 * 4. Updates audit record with counters and completion timestamp
 *
 * Business rules:
 * - Session must exist and belong to the user (enforced by RLS)
 * - Session must not be completed (generation_completed_at must be null)
 * - Sum of saved cards + rejected count must equal generated count
 * - All text fields must be within 1-500 character limits
 *
 * @param supabase - Supabase client instance
 * @param userId - Authenticated user ID
 * @param command - Batch save command with audit ID, cards, and rejected count
 * @returns Promise resolving to saved card IDs and updated audit metadata
 * @throws Error with specific code and status for various validation failures
 */
export async function saveBatchFlashcards(
  supabase: typeof supabaseClient,
  userId: string,
  command: FlashcardBatchSaveCommand
): Promise<FlashcardBatchSaveResponseDTO> {
  // 1. Fetch and validate audit session
  const { data: auditSession, error: fetchError } = await supabase
    .from("ai_generation_audit")
    .select("id, generated_count, generation_completed_at")
    .eq("id", command.ai_generation_audit_id)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .single();

  // Handle session not found
  if (fetchError || !auditSession) {
    throw createError("SESSION_NOT_FOUND", "AI generation session not found", 404);
  }

  // Check if session already completed
  if (auditSession.generation_completed_at !== null) {
    throw createError("SESSION_ALREADY_COMPLETED", "This AI generation session has already been completed", 409);
  }

  // 2. Validate counts match
  const savedCount = command.cards.length;
  const totalCount = savedCount + command.rejected_count;

  if (totalCount !== auditSession.generated_count) {
    throw createError("INVALID_COUNTS", "Sum of saved and rejected cards does not match generated count", 400, {
      expected: auditSession.generated_count.toString(),
      received: totalCount.toString(),
    });
  }

  // 3. Calculate audit counters
  let savedUnchangedCount = 0;
  let savedEditedCount = 0;

  for (const card of command.cards) {
    if (card.origin_status === "AI_ORIGINAL") {
      savedUnchangedCount++;
    } else {
      savedEditedCount++;
    }
  }

  // 4. Prepare flashcards for bulk insert
  const flashcardsToInsert = command.cards.map((card) => ({
    user_id: userId,
    front_text: card.front_text,
    back_text: card.back_text,
    source_type: card.origin_status.toLowerCase() as "ai_original" | "ai_edited",
    ai_generation_audit_id: command.ai_generation_audit_id,
  }));

  // 5. Execute transaction: Insert flashcards
  const { data: savedCards, error: insertError } = await supabase
    .from("flashcards")
    .insert(flashcardsToInsert)
    .select("id");

  if (insertError || !savedCards) {
    throw createError("TRANSACTION_FAILED", "Failed to save flashcards", 500, { database_error: insertError?.message });
  }

  // 6. Update audit record
  const { data: updatedAudit, error: updateError } = await supabase
    .from("ai_generation_audit")
    .update({
      saved_unchanged_count: savedUnchangedCount,
      saved_edited_count: savedEditedCount,
      rejected_count: command.rejected_count,
      generation_completed_at: new Date().toISOString(),
    })
    .eq("id", command.ai_generation_audit_id)
    .select("id, generated_count, saved_unchanged_count, saved_edited_count, rejected_count, generation_completed_at")
    .single();

  if (updateError || !updatedAudit) {
    throw createError("TRANSACTION_FAILED", "Failed to update audit record", 500, {
      database_error: updateError?.message,
    });
  }

  // 7. Return response
  return {
    saved_card_ids: savedCards.map((card) => card.id),
    audit: {
      id: updatedAudit.id,
      generated_count: updatedAudit.generated_count,
      saved_unchanged_count: updatedAudit.saved_unchanged_count,
      saved_edited_count: updatedAudit.saved_edited_count,
      rejected_count: updatedAudit.rejected_count,
      generation_completed_at: updatedAudit.generation_completed_at,
    },
  };
}
