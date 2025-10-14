import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CharacterCounter } from "./CharacterCounter";
import { ValidationMessage } from "./ValidationMessage";
import { validateTextLength } from "./utils";

interface GenerateFormProps {
  inputText: string;
  onInputChange: (text: string) => void;
  onGenerate: () => Promise<void>;
  isLoading: boolean;
}

const MIN_CHARS = 1000;
const MAX_CHARS = 32768;

export function GenerateForm({ inputText, onInputChange, onGenerate, isLoading }: GenerateFormProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Autofocus przy montowaniu
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Funkcja do wykonania generowania z walidacją
  const executeGenerate = useCallback(async () => {
    const validation = validateTextLength(inputText, MIN_CHARS, MAX_CHARS);

    if (!validation.isValid) {
      setValidationError(validation.errorMessage);
      return;
    }

    setValidationError(null);
    await onGenerate();
  }, [inputText, onGenerate]);

  // Obsługa Ctrl+Enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        executeGenerate();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [executeGenerate]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    onInputChange(text);

    // Walidacja real-time
    const validation = validateTextLength(text, MIN_CHARS, MAX_CHARS);
    setValidationError(validation.errorMessage);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await executeGenerate();
  };

  const validation = validateTextLength(inputText, MIN_CHARS, MAX_CHARS);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="input-text" className="text-sm font-medium leading-none">
          Wklej tekst do wygenerowania fiszek
        </label>

        <Textarea
          ref={textareaRef}
          id="input-text"
          value={inputText}
          onChange={handleChange}
          placeholder="Wklej tutaj tekst edukacyjny (minimum 1000 znaków)..."
          className="min-h-[300px] resize-y"
          disabled={isLoading}
          aria-describedby={validationError ? "input-error" : undefined}
          aria-invalid={!validation.isValid}
        />

        <div className="flex items-center justify-between">
          <CharacterCounter current={validation.current} min={validation.min} max={validation.max} />

          <p className="text-xs text-muted-foreground">Naciśnij Ctrl+Enter aby wygenerować</p>
        </div>

        <ValidationMessage message={validationError} id="input-error" />
      </div>

      <Button type="submit" disabled={!validation.isValid || isLoading} size="lg" className="w-full sm:w-auto">
        {isLoading ? "Generowanie..." : "Generuj fiszki"}
      </Button>
    </form>
  );
}
