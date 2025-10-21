import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface AddFlashcardButtonProps {
  onOpenModal: () => void;
}

export const AddFlashcardButton: React.FC<AddFlashcardButtonProps> = ({ onOpenModal }) => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(true);
  }, []);

  return (
    <Button
      onClick={onOpenModal}
      className="w-full sm:w-auto"
      aria-label="Dodaj nową fiszkę"
      data-test-id="add-flashcard-button"
      data-ready={isReady}
    >
      <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
      Dodaj nową fiszkę
    </Button>
  );
};
