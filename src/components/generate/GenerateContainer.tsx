import { useEffect } from "react";
import { useGenerateFlashcards } from "./hooks/useGenerateFlashcards";
import { GenerateForm } from "./GenerateForm";
import { LoadingState } from "./LoadingState";
import { ErrorState } from "./ErrorState";
import { ProposalsSection } from "./ProposalsSection";

export default function GenerateContainer() {
  const {
    viewState,
    inputText,
    proposals,
    acceptedCount,
    error,
    hasUnsavedProposals,
    setInputText,
    generateProposals,
    toggleProposalAccepted,
    editProposal,
    rejectProposal,
    selectAllProposals,
    deselectAllProposals,
    saveFlashcards,
    retry,
  } = useGenerateFlashcards();

  // Obsługa beforeunload dla niezapisanych propozycji
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedProposals) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedProposals]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Generowanie Fiszek AI</h1>
        <p className="text-muted-foreground">
          Wklej tekst (1000-32768 znaków), a AI wygeneruje dla Ciebie fiszki edukacyjne
        </p>
      </header>

      <main>
        {viewState === "idle" && (
          <GenerateForm
            inputText={inputText}
            onInputChange={setInputText}
            onGenerate={generateProposals}
            isLoading={false}
          />
        )}

        {viewState === "loading" && <LoadingState />}

        {viewState === "error" && error && <ErrorState error={error} onRetry={retry} />}

        {viewState === "proposals" && (
          <ProposalsSection
            proposals={proposals}
            acceptedCount={acceptedCount}
            onSelectAll={selectAllProposals}
            onDeselectAll={deselectAllProposals}
            onCheck={toggleProposalAccepted}
            onEdit={editProposal}
            onReject={rejectProposal}
            onSave={saveFlashcards}
            isSaving={false}
          />
        )}

        {viewState === "saving" && <LoadingState message="Zapisuję fiszki..." />}
      </main>
    </div>
  );
}
