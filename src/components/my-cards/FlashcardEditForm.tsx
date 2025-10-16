import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Check, X } from "lucide-react";
import type { FlashcardDTO } from "../../types";

interface FlashcardViewModel extends FlashcardDTO {
  isFlipped: boolean;
  isEditing: boolean;
  isDeleting: boolean;
}

interface FlashcardEditFormProps {
  flashcard: FlashcardViewModel;
  onSave: (id: string, data: { front_text: string; back_text: string }) => void;
  onCancel: (id: string) => void;
}

export const FlashcardEditForm: React.FC<FlashcardEditFormProps> = ({
  flashcard,
  onSave,
  onCancel,
}) => {
  const [frontText, setFrontText] = useState(flashcard.front_text);
  const [backText, setBackText] = useState(flashcard.back_text);

  // Reset form when flashcard changes
  useEffect(() => {
    setFrontText(flashcard.front_text);
    setBackText(flashcard.back_text);
  }, [flashcard]);

  const handleSave = () => {
    if (frontText.trim() && backText.trim()) {
      onSave(flashcard.id, {
        front_text: frontText.trim(),
        back_text: backText.trim(),
      });
    }
  };

  const handleCancel = () => {
    onCancel(flashcard.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <Card className="w-full h-[250px] border-2 border-blue-500 bg-blue-50 dark:bg-blue-950">
      <CardContent className="p-4 h-full flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Edycja fiszki</span>
          <div className="flex space-x-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!frontText.trim() || !backText.trim()}
              className="h-8 w-8 p-0"
              aria-label="Zapisz zmiany"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              className="h-8 w-8 p-0"
              aria-label="Anuluj edycję"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`front-${flashcard.id}`} className="text-xs font-medium">
              Przód fiszki
            </Label>
            <Textarea
              id={`front-${flashcard.id}`}
              value={frontText}
              onChange={(e) => setFrontText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Wpisz tekst przodu fiszki..."
              className="min-h-[60px] resize-none"
              maxLength={500}
            />
            <div className="text-xs text-gray-500 text-right">
              {frontText.length}/500
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`back-${flashcard.id}`} className="text-xs font-medium">
              Tył fiszki
            </Label>
            <Textarea
              id={`back-${flashcard.id}`}
              value={backText}
              onChange={(e) => setBackText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Wpisz tekst tyłu fiszki..."
              className="min-h-[60px] resize-none"
              maxLength={500}
            />
            <div className="text-xs text-gray-500 text-right">
              {backText.length}/500
            </div>
          </div>
        </div>

        <div className="text-xs text-gray-500 mt-2">
          Ctrl+Enter aby zapisać • Escape aby anulować
        </div>
      </CardContent>
    </Card>
  );
};
