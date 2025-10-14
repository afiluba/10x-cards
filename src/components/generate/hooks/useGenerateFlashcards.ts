import { useState, useCallback, useMemo, useEffect } from "react";
import { toast } from "sonner";
import type {
  AiGenerationSessionCreateCommand,
  AiGenerationSessionCreateResponseDTO,
  FlashcardBatchSaveCommand,
  FlashcardBatchSaveResponseDTO,
  ErrorResponseDTO,
} from "../../../types";
import type { GenerateState, ProposalViewModel, ProposalEditorData, ApiError } from "../types";
import { createApiError, proposalToSaveCommand } from "../utils";

interface UseGenerateFlashcardsReturn {
  // Stan
  viewState: GenerateState["viewState"];
  inputText: string;
  proposals: ProposalViewModel[];
  error: ApiError | null;
  acceptedCount: number;
  rejectedCount: number;

  // Session recovery
  hasRecoverableSession: boolean;
  recoverableProposalsCount: number;
  recoverSession: () => void;
  discardRecovery: () => void;

  // Akcje
  setInputText: (text: string) => void;
  generateProposals: () => Promise<void>;
  toggleProposalAccepted: (id: string) => void;
  editProposal: (id: string, data: ProposalEditorData) => void;
  rejectProposal: (id: string) => void;
  selectAllProposals: () => void;
  deselectAllProposals: () => void;
  saveFlashcards: () => Promise<void>;
  retry: () => Promise<void>;
  reset: () => void;

  // Computed values
  hasUnsavedProposals: boolean;
  canSave: boolean;
}

interface RecoverableSession {
  session: GenerateState["session"];
  proposals: ProposalViewModel[];
  acceptedCount: number;
  rejectedCount: number;
  timestamp: number;
}

const SESSION_STORAGE_KEY = "ai-proposals-recovery";
const MAX_RECOVERY_AGE_MS = 3600000; // 1 hour

export function useGenerateFlashcards(): UseGenerateFlashcardsReturn {
  const [state, setState] = useState<GenerateState>({
    viewState: "idle",
    inputText: "",
    session: null,
    proposals: [],
    error: null,
    acceptedCount: 0,
    rejectedCount: 0,
  });

  const [recoverableSession, setRecoverableSession] = useState<RecoverableSession | null>(null);

  // Akcja: Ustawienie tekstu wejściowego
  const setInputText = useCallback((text: string) => {
    setState((prev) => ({ ...prev, inputText: text }));
  }, []);

  // Akcja: Generowanie propozycji
  const generateProposals = useCallback(async () => {
    setState((prev) => ({ ...prev, viewState: "loading", error: null }));

    try {
      const command: AiGenerationSessionCreateCommand = {
        input_text: state.inputText,
        model_identifier: null,
        client_request_id: null,
      };

      const response = await fetch("/api/ai-generation/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(command),
      });

      if (!response.ok) {
        const errorData: ErrorResponseDTO = await response.json();
        const apiError = createApiError(errorData, response.status);

        // Dla błędów 500 pokaż toast, ale nie zmieniaj na error state
        if (response.status === 500) {
          toast.error("Wystąpił błąd systemowy", {
            description: apiError.message,
          });
        }

        throw apiError;
      }

      const data: AiGenerationSessionCreateResponseDTO = await response.json();

      const proposalViewModels: ProposalViewModel[] = data.proposals.map((p) => ({
        ...p,
        isAccepted: false,
        isEdited: false,
        isEditMode: false,
      }));

      // Sukces - pokaż toast informacyjny
      if (proposalViewModels.length === 0) {
        toast.warning("Nie udało się wygenerować fiszek", {
          description: "Spróbuj z innym tekstem lub zmień parametry",
        });
      } else {
        toast.success("Fiszki wygenerowane!", {
          description: `Wygenerowano ${proposalViewModels.length} propozycji`,
        });
      }

      setState((prev) => ({
        ...prev,
        viewState: "proposals",
        session: data.session,
        proposals: proposalViewModels,
        acceptedCount: 0,
        rejectedCount: 0,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        viewState: "error",
        error: error as ApiError,
      }));
    }
  }, [state.inputText]);

  // Akcja: Toggle akceptacji propozycji
  const toggleProposalAccepted = useCallback((id: string) => {
    setState((prev) => {
      const updatedProposals = prev.proposals.map((p) =>
        p.temporary_id === id ? { ...p, isAccepted: !p.isAccepted } : p
      );
      const newAcceptedCount = updatedProposals.filter((p) => p.isAccepted).length;

      return {
        ...prev,
        proposals: updatedProposals,
        acceptedCount: newAcceptedCount,
      };
    });
  }, []);

  // Akcja: Edycja propozycji
  const editProposal = useCallback((id: string, data: ProposalEditorData) => {
    setState((prev) => {
      const updatedProposals = prev.proposals.map((p) =>
        p.temporary_id === id
          ? {
              ...p,
              front_text: data.front,
              back_text: data.back,
              isEdited: true,
              isAccepted: true, // auto-accept po edycji
              isEditMode: false,
              originalFront: p.originalFront || p.front_text,
              originalBack: p.originalBack || p.back_text,
            }
          : p
      );
      const newAcceptedCount = updatedProposals.filter((p) => p.isAccepted).length;

      return {
        ...prev,
        proposals: updatedProposals,
        acceptedCount: newAcceptedCount,
      };
    });
  }, []);

  // Akcja: Odrzucenie propozycji
  const rejectProposal = useCallback((id: string) => {
    setState((prev) => {
      const updatedProposals = prev.proposals.filter((p) => p.temporary_id !== id);
      const newAcceptedCount = updatedProposals.filter((p) => p.isAccepted).length;

      return {
        ...prev,
        proposals: updatedProposals,
        acceptedCount: newAcceptedCount,
        rejectedCount: prev.rejectedCount + 1,
      };
    });
  }, []);

  // Akcja: Zaznacz wszystkie propozycje
  const selectAllProposals = useCallback(() => {
    setState((prev) => {
      const updatedProposals = prev.proposals.map((p) => ({ ...p, isAccepted: true }));

      return {
        ...prev,
        proposals: updatedProposals,
        acceptedCount: updatedProposals.length,
      };
    });
  }, []);

  // Akcja: Odznacz wszystkie propozycje
  const deselectAllProposals = useCallback(() => {
    setState((prev) => ({
      ...prev,
      proposals: prev.proposals.map((p) => ({ ...p, isAccepted: false })),
      acceptedCount: 0,
    }));
  }, []);

  // Akcja: Zapis fiszek
  const saveFlashcards = useCallback(async () => {
    if (!state.session) return;

    setState((prev) => ({ ...prev, viewState: "saving" }));

    try {
      const acceptedProposals = state.proposals.filter((p) => p.isAccepted);

      if (acceptedProposals.length === 0) {
        toast.error("Brak zaakceptowanych propozycji");
        setState((prev) => ({ ...prev, viewState: "proposals" }));
        return;
      }

      const command: FlashcardBatchSaveCommand = {
        ai_generation_audit_id: state.session.id,
        cards: acceptedProposals.map(proposalToSaveCommand) as [
          FlashcardBatchSaveCommand["cards"][0],
          ...FlashcardBatchSaveCommand["cards"],
        ],
        rejected_count: state.rejectedCount,
      };

      const response = await fetch("/api/flashcards/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(command),
      });

      if (!response.ok) {
        const errorData: ErrorResponseDTO = await response.json();
        const apiError = createApiError(errorData, response.status);

        // Toast z błędem
        toast.error("Nie udało się zapisać fiszek", {
          description: apiError.message,
        });

        throw apiError;
      }

      const data: FlashcardBatchSaveResponseDTO = await response.json();

      // Sukces - toast i redirect do /my-cards
      toast.success("Fiszki zapisane!", {
        description: `Zapisano ${data.saved_card_ids.length} fiszek`,
      });

      // Małe opóźnienie aby toast się wyświetlił przed redirectem
      setTimeout(() => {
        window.location.href = "/my-cards";
      }, 500);
    } catch (error) {
      setState((prev) => ({
        ...prev,
        viewState: "proposals",
        error: error as ApiError,
      }));
    }
  }, [state.session, state.proposals, state.rejectedCount]);

  // Akcja: Retry (ponowienie generowania)
  const retry = useCallback(async () => {
    await generateProposals();
  }, [generateProposals]);

  // Akcja: Reset do stanu początkowego
  const reset = useCallback(() => {
    setState({
      viewState: "idle",
      inputText: "",
      session: null,
      proposals: [],
      error: null,
      acceptedCount: 0,
      rejectedCount: 0,
    });
  }, []);

  // Computed: Czy są niezapisane propozycje
  const hasUnsavedProposals = useMemo(() => {
    return state.viewState === "proposals" && state.proposals.length > 0;
  }, [state.viewState, state.proposals.length]);

  // Computed: Czy można zapisać
  const canSave = useMemo(() => {
    return state.acceptedCount > 0 && state.session !== null && state.viewState !== "saving";
  }, [state.acceptedCount, state.session, state.viewState]);

  // Session Storage helpers
  const saveToSessionStorage = useCallback(() => {
    if (state.session && state.proposals.length > 0) {
      const sessionData: RecoverableSession = {
        session: state.session,
        proposals: state.proposals,
        acceptedCount: state.acceptedCount,
        rejectedCount: state.rejectedCount,
        timestamp: Date.now(),
      };
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
    }
  }, [state.session, state.proposals, state.acceptedCount, state.rejectedCount]);

  const loadFromSessionStorage = useCallback((): RecoverableSession | null => {
    try {
      const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!stored) return null;

      const data: RecoverableSession = JSON.parse(stored);

      // Sprawdź czy nie jest za stara (max 1h)
      if (Date.now() - data.timestamp > MAX_RECOVERY_AGE_MS) {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
        return null;
      }

      return data;
    } catch {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
  }, []);

  const clearSessionStorage = useCallback(() => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  }, []);

  // Akcja: Przywróć sesję
  const recoverSession = useCallback(() => {
    if (!recoverableSession) return;

    setState({
      viewState: "proposals",
      inputText: "",
      session: recoverableSession.session,
      proposals: recoverableSession.proposals,
      error: null,
      acceptedCount: recoverableSession.acceptedCount,
      rejectedCount: recoverableSession.rejectedCount,
    });

    setRecoverableSession(null);
    toast.success("Sesja przywrócona", {
      description: `Przywrócono ${recoverableSession.proposals.length} propozycji`,
    });
  }, [recoverableSession]);

  // Akcja: Odrzuć recovery
  const discardRecovery = useCallback(() => {
    clearSessionStorage();
    setRecoverableSession(null);
  }, [clearSessionStorage]);

  // Effect: Sprawdź recovery przy montowaniu
  useEffect(() => {
    const recoverable = loadFromSessionStorage();
    if (recoverable) {
      setRecoverableSession(recoverable);
    }
  }, [loadFromSessionStorage]);

  // Effect: Zapisz do sessionStorage przy zmianie propozycji
  useEffect(() => {
    if (state.viewState === "proposals" && state.proposals.length > 0) {
      saveToSessionStorage();
    }
  }, [state.viewState, state.proposals, saveToSessionStorage]);

  // Effect: Wyczyść sessionStorage po zapisie lub resecie
  useEffect(() => {
    if (state.viewState === "idle" && state.session === null) {
      clearSessionStorage();
    }
  }, [state.viewState, state.session, clearSessionStorage]);

  return {
    // Stan
    viewState: state.viewState,
    inputText: state.inputText,
    proposals: state.proposals,
    error: state.error,
    acceptedCount: state.acceptedCount,
    rejectedCount: state.rejectedCount,

    // Session recovery
    hasRecoverableSession: recoverableSession !== null,
    recoverableProposalsCount: recoverableSession?.proposals.length || 0,
    recoverSession,
    discardRecovery,

    // Akcje
    setInputText,
    generateProposals,
    toggleProposalAccepted,
    editProposal,
    rejectProposal,
    selectAllProposals,
    deselectAllProposals,
    saveFlashcards,
    retry,
    reset,

    // Computed values
    hasUnsavedProposals,
    canSave,
  };
}
