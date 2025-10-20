import type { ErrorResponseDTO, FlashcardBatchSaveCardCommand } from "../../types";
import type { ApiError, TextLengthValidation, ProposalViewModel } from "./types";

/**
 * Mapowanie kodu błędu HTTP na ApiError
 */
export function createApiError(errorResponse: ErrorResponseDTO, status: number): ApiError {
  const { error } = errorResponse;

  return {
    code: error.code,
    message: error.message,
    details: error.details,
    retryable: [429, 502, 503].includes(status),
    retryAfter: status === 429 ? parseRetryAfter(error.details) : undefined,
  };
}

/**
 * Parsowanie retry_after z details
 */
function parseRetryAfter(details?: Record<string, string>): number | undefined {
  if (!details?.retry_after) return undefined;
  const parsed = parseInt(details.retry_after, 10);
  return isNaN(parsed) ? undefined : parsed;
}

/**
 * Walidacja długości tekstu
 */
export function validateTextLength(text: string, min: number, max: number): TextLengthValidation {
  const current = text.length;
  const isValid = current >= min && current <= max;

  let errorMessage: string | null = null;
  if (current < min) {
    errorMessage = `Tekst musi mieć minimum ${min} znaków (obecnie: ${current})`;
  } else if (current > max) {
    errorMessage = `Przekroczono limit ${max} znaków (obecnie: ${current})`;
  }

  return { min, max, current, isValid, errorMessage };
}

/**
 * Konwersja ProposalViewModel do FlashcardBatchSaveCardCommand
 */
export function proposalToSaveCommand(proposal: ProposalViewModel): FlashcardBatchSaveCardCommand {
  return {
    front_text: proposal.front_text,
    back_text: proposal.back_text,
    origin_status: proposal.isEdited ? "AI_EDITED" : "AI_ORIGINAL",
  };
}
