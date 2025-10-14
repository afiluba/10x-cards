import { useState, useCallback, useMemo } from "react";
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

  // Akcja: Ustawienie tekstu wejściowego
  const setInputText = useCallback((text: string) => {
    setState(prev => ({ ...prev, inputText: text }));
  }, []);

  // Akcja: Generowanie propozycji
  const generateProposals = useCallback(async () => {
    setState(prev => ({ ...prev, viewState: "loading", error: null }));
    
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
        throw createApiError(errorData, response.status);
      }
      
      const data: AiGenerationSessionCreateResponseDTO = await response.json();
      
      const proposalViewModels: ProposalViewModel[] = data.proposals.map(p => ({
        ...p,
        isAccepted: false,
        isEdited: false,
        isEditMode: false,
      }));
      
      setState(prev => ({
        ...prev,
        viewState: "proposals",
        session: data.session,
        proposals: proposalViewModels,
        acceptedCount: 0,
        rejectedCount: 0,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        viewState: "error",
        error: error as ApiError,
      }));
    }
  }, [state.inputText]);

  // Akcja: Toggle akceptacji propozycji
  const toggleProposalAccepted = useCallback((id: string) => {
    setState(prev => {
      const updatedProposals = prev.proposals.map(p =>
        p.temporary_id === id ? { ...p, isAccepted: !p.isAccepted } : p
      );
      const newAcceptedCount = updatedProposals.filter(p => p.isAccepted).length;
      
      return {
        ...prev,
        proposals: updatedProposals,
        acceptedCount: newAcceptedCount,
      };
    });
  }, []);

  // Akcja: Edycja propozycji
  const editProposal = useCallback((id: string, data: ProposalEditorData) => {
    setState(prev => {
      const updatedProposals = prev.proposals.map(p =>
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
      const newAcceptedCount = updatedProposals.filter(p => p.isAccepted).length;
      
      return {
        ...prev,
        proposals: updatedProposals,
        acceptedCount: newAcceptedCount,
      };
    });
  }, []);

  // Akcja: Odrzucenie propozycji
  const rejectProposal = useCallback((id: string) => {
    setState(prev => {
      const updatedProposals = prev.proposals.filter(p => p.temporary_id !== id);
      const newAcceptedCount = updatedProposals.filter(p => p.isAccepted).length;
      
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
    setState(prev => {
      const updatedProposals = prev.proposals.map(p => ({ ...p, isAccepted: true }));
      
      return {
        ...prev,
        proposals: updatedProposals,
        acceptedCount: updatedProposals.length,
      };
    });
  }, []);

  // Akcja: Odznacz wszystkie propozycje
  const deselectAllProposals = useCallback(() => {
    setState(prev => ({
      ...prev,
      proposals: prev.proposals.map(p => ({ ...p, isAccepted: false })),
      acceptedCount: 0,
    }));
  }, []);

  // Akcja: Zapis fiszek
  const saveFlashcards = useCallback(async () => {
    if (!state.session) return;
    
    setState(prev => ({ ...prev, viewState: "saving" }));
    
    try {
      const acceptedProposals = state.proposals.filter(p => p.isAccepted);
      
      if (acceptedProposals.length === 0) {
        throw new Error("Brak zaakceptowanych propozycji");
      }
      
      const command: FlashcardBatchSaveCommand = {
        ai_generation_audit_id: state.session.id,
        cards: acceptedProposals.map(proposalToSaveCommand) as [
          FlashcardBatchSaveCommand["cards"][0],
          ...FlashcardBatchSaveCommand["cards"]
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
        throw createApiError(errorData, response.status);
      }
      
      const data: FlashcardBatchSaveResponseDTO = await response.json();
      
      // Sukces - redirect do /my-cards
      window.location.href = "/my-cards";
    } catch (error) {
      setState(prev => ({
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

  return {
    // Stan
    viewState: state.viewState,
    inputText: state.inputText,
    proposals: state.proposals,
    error: state.error,
    acceptedCount: state.acceptedCount,
    rejectedCount: state.rejectedCount,
    
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

