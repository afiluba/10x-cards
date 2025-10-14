import type {
  AiGenerationSessionDTO,
  AiGenerationProposalDTO,
  ErrorResponseDTO,
} from "../../types";

/**
 * Stan widoku generowania
 */
export type GenerateViewState = "idle" | "loading" | "proposals" | "error" | "saving";

/**
 * ViewModel dla propozycji z dodatkowymi stanami UI
 */
export interface ProposalViewModel extends AiGenerationProposalDTO {
  isAccepted: boolean;
  isEdited: boolean;
  isEditMode: boolean;
  originalFront?: string;
  originalBack?: string;
}

/**
 * Dane formularza generowania
 */
export interface GenerateFormData {
  inputText: string;
}

/**
 * Stan błędu API z dodatkowymi informacjami dla UI
 */
export interface ApiError {
  code: string;
  message: string;
  retryable: boolean;
  retryAfter?: number; // sekundy dla rate limit
  details?: Record<string, string>;
}

/**
 * Dane do zapisu propozycji (edycja inline)
 */
export interface ProposalEditorData {
  front: string;
  back: string;
}

/**
 * Konfiguracja walidacji długości tekstu
 */
export interface TextLengthValidation {
  min: number;
  max: number;
  current: number;
  isValid: boolean;
  errorMessage: string | null;
}

/**
 * Stan całego widoku generowania (dla custom hook)
 */
export interface GenerateState {
  viewState: GenerateViewState;
  inputText: string;
  session: AiGenerationSessionDTO | null;
  proposals: ProposalViewModel[];
  error: ApiError | null;
  acceptedCount: number;
  rejectedCount: number;
}

