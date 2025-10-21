import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CharacterCounter } from "./CharacterCounter";
import { ValidationMessage } from "./ValidationMessage";
import { validateTextLength } from "./utils";

interface ProposalEditorProps {
  initialFront: string;
  initialBack: string;
  onSave: (data: { front: string; back: string }) => void;
  onCancel: () => void;
}

const MAX_CHARS = 500;

export function ProposalEditor({ initialFront, initialBack, onSave, onCancel }: ProposalEditorProps) {
  const [frontText, setFrontText] = useState(initialFront);
  const [backText, setBackText] = useState(initialBack);
  const [errors, setErrors] = useState<{ front?: string; back?: string }>({});
  const frontRef = useRef<HTMLTextAreaElement>(null);

  // Autofocus na front textarea
  useEffect(() => {
    frontRef.current?.focus();
  }, []);

  // ESC key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  const handleSave = () => {
    const frontValidation = validateTextLength(frontText, 1, MAX_CHARS);
    const backValidation = validateTextLength(backText, 1, MAX_CHARS);

    const newErrors: { front?: string; back?: string } = {};

    if (!frontValidation.isValid) {
      newErrors.front = frontValidation.errorMessage || "Pole nie może być puste";
    }

    if (!backValidation.isValid) {
      newErrors.back = backValidation.errorMessage || "Pole nie może być puste";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    onSave({ front: frontText, back: backText });
  };

  const frontValidation = validateTextLength(frontText, 1, MAX_CHARS);
  const backValidation = validateTextLength(backText, 1, MAX_CHARS);

  return (
    <div className="space-y-4" role="dialog" aria-label="Edycja propozycji">
      <div className="space-y-2">
        <label htmlFor="edit-front" className="text-xs font-semibold text-muted-foreground">
          Przód:
        </label>
        <Textarea
          ref={frontRef}
          id="edit-front"
          value={frontText}
          onChange={(e) => setFrontText(e.target.value)}
          className="min-h-[100px]"
          aria-describedby={errors.front ? "front-error" : undefined}
          aria-invalid={!!errors.front}
        />
        <CharacterCounter current={frontValidation.current} max={MAX_CHARS} />
        <ValidationMessage message={errors.front} id="front-error" />
      </div>

      <div className="space-y-2">
        <label htmlFor="edit-back" className="text-xs font-semibold text-muted-foreground">
          Tył:
        </label>
        <Textarea
          id="edit-back"
          value={backText}
          onChange={(e) => setBackText(e.target.value)}
          className="min-h-[100px]"
          aria-describedby={errors.back ? "back-error" : undefined}
          aria-invalid={!!errors.back}
        />
        <CharacterCounter current={backValidation.current} max={MAX_CHARS} />
        <ValidationMessage message={errors.back} id="back-error" />
      </div>

      <div className="flex gap-2 pt-2">
        <Button
          type="button"
          onClick={handleSave}
          disabled={!frontValidation.isValid || !backValidation.isValid}
          className="flex-1"
        >
          Zapisz
        </Button>

        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Anuluj
        </Button>
      </div>
    </div>
  );
}
