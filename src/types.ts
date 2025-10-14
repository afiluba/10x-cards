import type { Enums, Tables } from "./db/database.types";

type FlashcardEntity = Tables<"flashcards">;
type AiGenerationAuditEntity = Tables<"ai_generation_audit">;

/**
 * Normalized ISO-8601 timestamp string used across API responses.
 */
export type IsoDateTimeString = string;

/**
 * API-facing representation of the flashcard source type.
 * It is derived by upper-casing the canonical enum coming from the database schema.
 */
export type FlashcardSourceType = Uppercase<Enums<"flashcard_source_type">>;

/**
 * Set of fields exposed for flashcard records in API payloads.
 */
type FlashcardRecordProjection = Pick<
  FlashcardEntity,
  "id" | "front_text" | "back_text" | "ai_generation_audit_id" | "created_at" | "updated_at"
>;

/**
 * Flashcard shape used across response DTOs.
 * The `source_type` field is converted to the API-friendly enum variant.
 */
export type FlashcardDTO = FlashcardRecordProjection & {
  source_type: FlashcardSourceType;
};

/**
 * Direction parameter accepted by sortable list endpoints.
 */
export type SortDirection = "asc" | "desc";

/**
 * Sorting keys supported by the flashcard listing endpoint.
 */
export type FlashcardSortableField = "created_at" | "updated_at";

/**
 * Canonical representation of the `sort` query parameter (`field:direction`).
 */
export type FlashcardSortParam = `${FlashcardSortableField}:${SortDirection}`;

/**
 * Query model describing `/api/flashcards` supported filters.
 */
export interface FlashcardListQueryCommand {
  page?: number;
  page_size?: number;
  source_type?: FlashcardSourceType[];
  updated_after?: IsoDateTimeString;
  include_deleted?: boolean;
  search?: string;
  sort?: FlashcardSortParam;
}

/**
 * Metadata returned alongside paginated collections.
 */
export interface PaginationMetaDTO {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
}

/**
 * Response payload for flashcard listings.
 */
export interface FlashcardListResponseDTO {
  data: FlashcardDTO[];
  pagination: PaginationMetaDTO;
}

/**
 * Command model for manual flashcard creation.
 * Source type is constrained to `MANUAL` as per API contract.
 */
export interface FlashcardCreateCommand {
  front_text: FlashcardEntity["front_text"];
  back_text: FlashcardEntity["back_text"];
  source_type: Extract<FlashcardSourceType, "MANUAL">;
  ai_generation_audit_id?: AiGenerationAuditEntity["id"] | null;
}

/**
 * Response DTO for flashcard creation and retrieval endpoints.
 */
export type FlashcardDetailResponseDTO = FlashcardDTO;

/**
 * Command model for batch-saving AI-generated flashcards.
 */
export interface FlashcardBatchSaveCommand {
  ai_generation_audit_id: AiGenerationAuditEntity["id"];
  cards: readonly [FlashcardBatchSaveCardCommand, ...FlashcardBatchSaveCardCommand[]];
  rejected_count: AiGenerationAuditEntity["rejected_count"];
}

/**
 * Command model describing individual flashcard payload within batch save operations.
 */
export interface FlashcardBatchSaveCardCommand {
  front_text: FlashcardEntity["front_text"];
  back_text: FlashcardEntity["back_text"];
  origin_status: Extract<FlashcardSourceType, "AI_ORIGINAL" | "AI_EDITED">;
}

/**
 * DTO summarising audit counters returned from batch save operations.
 */
export type FlashcardBatchAuditDTO = Pick<
  AiGenerationAuditEntity,
  | "id"
  | "generated_count"
  | "saved_unchanged_count"
  | "saved_edited_count"
  | "rejected_count"
  | "generation_completed_at"
>;

/**
 * Response DTO for batch flashcard save operations.
 */
export interface FlashcardBatchSaveResponseDTO {
  saved_card_ids: FlashcardEntity["id"][];
  audit: FlashcardBatchAuditDTO;
}

/**
 * Command model for partial flashcard updates.
 */
export type FlashcardUpdateCommand = Partial<{
  front_text: FlashcardEntity["front_text"];
  back_text: FlashcardEntity["back_text"];
  source_type: Extract<FlashcardSourceType, "AI_EDITED" | "MANUAL">;
}>;

/**
 * Command model accompanying flashcard deletion requests.
 */
export interface FlashcardDeleteCommand {
  reason?: string;
}

/**
 * Lightweight DTO returned when soft-deleting flashcards.
 */
export type FlashcardDeleteResponseDTO = Pick<FlashcardEntity, "id" | "deleted_at">;

/**
 * Response DTO returned by restore endpoint.
 */
export type FlashcardRestoreResponseDTO = FlashcardDTO;

/**
 * Command model initiating an AI generation session.
 */
export interface AiGenerationSessionCreateCommand {
  input_text: string;
  model_identifier?: AiGenerationAuditEntity["model_identifier"];
  client_request_id?: AiGenerationAuditEntity["client_request_id"] | null;
}

/**
 * DTO describing persisted AI generation session metadata.
 */
export type AiGenerationSessionDTO = Pick<
  AiGenerationAuditEntity,
  "id" | "client_request_id" | "model_identifier" | "generation_started_at"
>;

/**
 * DTO conveying AI-generated flashcard proposals before persistence.
 * Text fields reuse the flashcard entity contracts for consistency.
 */
export interface AiGenerationProposalDTO {
  temporary_id: string;
  front_text: FlashcardEntity["front_text"];
  back_text: FlashcardEntity["back_text"];
}

/**
 * Response DTO for AI generation session creation.
 */
export interface AiGenerationSessionCreateResponseDTO {
  session: AiGenerationSessionDTO;
  proposals: AiGenerationProposalDTO[];
}

/**
 * Standardised error payload shared across endpoints.
 */
export interface ErrorDTO {
  code: string;
  message: string;
  details?: Record<string, string>;
}

/**
 * Envelope wrapping API errors.
 */
export interface ErrorResponseDTO {
  error: ErrorDTO;
}
