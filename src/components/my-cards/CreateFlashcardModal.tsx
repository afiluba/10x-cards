import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label"; // Zakładam że jest dostępny, jeśli nie to dodajmy

interface CreateFlashcardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { front_text: string; back_text: string }) => void;
}

export const CreateFlashcardModal: React.FC<CreateFlashcardModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [frontText, setFrontText] = useState("");
  const [backText, setBackText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (frontText.trim() && backText.trim()) {
      onSubmit({ front_text: frontText, back_text: backText });
      setFrontText("");
      setBackText("");
    }
  };

  const handleClose = () => {
    setFrontText("");
    setBackText("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent data-test-id="create-flashcard-modal">
        <DialogHeader>
          <DialogTitle>Dodaj nową fiszkę</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} data-test-id="create-flashcard-form">
          <div className="space-y-4">
            <div>
              <Label htmlFor="front">Przód fiszki</Label>
              <Textarea
                id="front"
                value={frontText}
                onChange={(e) => setFrontText(e.target.value)}
                placeholder="Wpisz tekst przodu fiszki..."
                maxLength={500}
                required
                data-test-id="flashcard-front-input"
              />
              <div className="text-sm text-gray-500 mt-1">{frontText.length}/500</div>
            </div>
            <div>
              <Label htmlFor="back">Tył fiszki</Label>
              <Textarea
                id="back"
                value={backText}
                onChange={(e) => setBackText(e.target.value)}
                placeholder="Wpisz tekst tyłu fiszki..."
                maxLength={500}
                required
                data-test-id="flashcard-back-input"
              />
              <div className="text-sm text-gray-500 mt-1">{backText.length}/500</div>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={handleClose} data-test-id="cancel-flashcard-button">
              Anuluj
            </Button>
            <Button type="submit" disabled={!frontText.trim() || !backText.trim()} data-test-id="save-flashcard-button">
              Dodaj fiszkę
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
