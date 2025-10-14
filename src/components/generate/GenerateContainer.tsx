import { useEffect } from "react";
import { useGenerateFlashcards } from "./hooks/useGenerateFlashcards";
import { LoadingState } from "./LoadingState";
import { ErrorState } from "./ErrorState";

export default function GenerateContainer() {
  const {
    viewState,
    inputText,
    error,
    hasUnsavedProposals,
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
          <div className="text-center py-12">
            <p className="text-muted-foreground">Formularz będzie tutaj (Krok 4)</p>
          </div>
        )}

        {viewState === "loading" && <LoadingState />}

        {viewState === "error" && error && (
          <ErrorState error={error} onRetry={retry} />
        )}

        {viewState === "proposals" && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Propozycje będą tutaj (Kroki 5-8)</p>
          </div>
        )}

        {viewState === "saving" && (
          <LoadingState message="Zapisuję fiszki..." />
        )}
      </main>
    </div>
  );
}

