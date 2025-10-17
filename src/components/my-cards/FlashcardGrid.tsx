import React from "react";
import { FlashcardCard } from "./FlashcardCard";
import type { FlashcardDTO } from "../../types";

interface FlashcardViewModel extends FlashcardDTO {
  isFlipped: boolean;
  isEditing: boolean;
  isDeleting: boolean;
}

interface FlashcardGridProps {
  flashcards: FlashcardViewModel[];
  onEdit: (id: string) => void;
  onDelete: (flashcard: FlashcardViewModel) => void;
  onFlip: (id: string) => void;
  onSave: (id: string, data: { front_text: string; back_text: string }) => void;
  onCancel: (id: string) => void;
}

export const FlashcardGrid: React.FC<FlashcardGridProps> = ({
  flashcards,
  onEdit,
  onDelete,
  onFlip,
  onSave,
  onCancel,
}) => {
  if (flashcards.length === 0) {
    return (
      <div className="text-center py-12" data-test-id="empty-flashcards-message">
        <p className="text-gray-500">Brak fiszek do wyświetlenia.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-test-id="flashcard-grid">
      {flashcards.map((flashcard) => (
        <FlashcardCard
          key={flashcard.id}
          flashcard={flashcard}
          onEdit={onEdit}
          onDelete={onDelete}
          onFlip={onFlip}
          onSave={onSave}
          onCancel={onCancel}
        />
      ))}
    </div>
  );
};
