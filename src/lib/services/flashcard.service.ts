import type { supabaseClient } from "../../db/supabase.client";
import type {
  FlashcardBatchSaveCommand,
  FlashcardBatchSaveResponseDTO,
  FlashcardListQueryCommand,
  FlashcardListResponseDTO,
  FlashcardDTO,
  FlashcardSourceType,
  FlashcardSortableField,
  SortDirection,
} from "../../types";

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

/**
 * Lists flashcards for authenticated user with filtering, pagination, and search.
 *
 * This function performs the following operations:
 * 1. Builds a query with user-specific filtering (enforced by RLS)
 * 2. Applies optional filters: source_type, updated_after, deleted status, search
 * 3. Applies sorting based on the sort parameter
 * 4. Applies pagination using range-based limiting
 * 5. Returns paginated results with metadata
 *
 * Business rules:
 * - Only returns flashcards owned by the authenticated user (RLS enforced)
 * - By default excludes soft-deleted flashcards
 * - Search is case-insensitive and matches both front and back text
 * - Maximum page size is 100 items
 *
 * @param supabase - Supabase client instance
 * @param userId - Authenticated user ID
 * @param query - Query parameters for filtering and pagination
 * @returns Promise resolving to paginated flashcard list with metadata
 * @throws Error with specific code and status for various failures
 */
export async function listFlashcards(
  supabase: typeof supabaseClient,
  userId: string,
  query: FlashcardListQueryCommand
): Promise<FlashcardListResponseDTO> {
  // 1. Parse sort parameter
  const [sortField, sortDirection] = (query.sort || "created_at:desc").split(":") as [
    FlashcardSortableField,
    SortDirection,
  ];

  // 2. Build base query with count
  let queryBuilder = supabase
    .from("flashcards")
    .select("id, front_text, back_text, source_type, ai_generation_audit_id, created_at, updated_at", {
      count: "exact",
    })
    .eq("user_id", userId);

  // 3. Apply deleted_at filter
  if (!query.include_deleted) {
    queryBuilder = queryBuilder.is("deleted_at", null);
  }

  // 4. Apply source_type filter
  if (query.source_type && query.source_type.length > 0) {
    const dbSourceTypes = query.source_type.map((st) => st.toLowerCase() as "ai_original" | "ai_edited" | "manual");
    queryBuilder = queryBuilder.in("source_type", dbSourceTypes);
  }

  // 5. Apply updated_after filter
  if (query.updated_after) {
    queryBuilder = queryBuilder.gt("updated_at", query.updated_after);
  }

  // 6. Apply search filter
  if (query.search) {
    const searchPattern = `%${query.search}%`;
    queryBuilder = queryBuilder.or(`front_text.ilike.${searchPattern},back_text.ilike.${searchPattern}`);
  }

  // 7. Apply sorting
  queryBuilder = queryBuilder.order(sortField, { ascending: sortDirection === "asc" });

  // 8. Apply pagination
  const page = query.page || 1;
  const pageSize = query.page_size || 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  queryBuilder = queryBuilder.range(from, to);

  // 9. Execute query
  const { data, error, count } = await queryBuilder;

  if (error) {
    throw createError("DATABASE_ERROR", "Failed to fetch flashcards", 500, {
      database_error: error.message,
    });
  }

  // 10. Transform to DTOs
  const flashcardDTOs: FlashcardDTO[] = (data || []).map((card) => ({
    id: card.id,
    front_text: card.front_text,
    back_text: card.back_text,
    source_type: card.source_type.toUpperCase() as FlashcardSourceType,
    ai_generation_audit_id: card.ai_generation_audit_id,
    created_at: card.created_at,
    updated_at: card.updated_at,
  }));

  // 11. Calculate pagination metadata
  const totalItems = count || 0;
  const totalPages = Math.ceil(totalItems / pageSize);

  // 12. Return response
  return {
    data: flashcardDTOs,
    pagination: {
      page,
      page_size: pageSize,
      total_items: totalItems,
      total_pages: totalPages,
    },
  };
}
