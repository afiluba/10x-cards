import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { FlashcardEditForm } from "./FlashcardEditForm";
import type { FlashcardDTO } from "../../types";

interface FlashcardViewModel extends FlashcardDTO {
  isFlipped: boolean;
  isEditing: boolean;
  isDeleting: boolean;
}

interface FlashcardCardProps {
  flashcard: FlashcardViewModel;
  onEdit: (id: string) => void;
  onDelete: (flashcard: FlashcardViewModel) => void;
  onFlip: (id: string) => void;
  onSave: (id: string, data: { front_text: string; back_text: string }) => void;
  onCancel: (id: string) => void;
}

export const FlashcardCard: React.FC<FlashcardCardProps> = ({
  flashcard,
  onEdit,
  onDelete,
  onFlip,
  onSave,
  onCancel,
}) => {
  const handleFlip = () => {
    onFlip(flashcard.id);
  };

  // If editing, show edit form
  if (flashcard.isEditing) {
    return <FlashcardEditForm flashcard={flashcard} onSave={onSave} onCancel={onCancel} />;
  }

  // Normal card view
  return (
    <div
      className="relative w-full h-[250px] cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
      onClick={handleFlip}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleFlip();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Fiszka: ${flashcard.isFlipped ? flashcard.back_text : flashcard.front_text}. Naciśnij aby obrócić.`}
      data-test-id="flashcard-card"
      data-flashcard-id={flashcard.id}
    >
      <div
        className={`absolute inset-0 w-full h-full transition-transform duration-700 transform-style-preserve-3d ${flashcard.isFlipped ? "rotate-y-180" : ""}`}
      >
        {/* Front of card */}
        <Card
          className={`absolute inset-0 w-full h-full backface-hidden hover:shadow-lg transition-shadow ${flashcard.isFlipped ? "rotate-y-180" : ""}`}
        >
          <CardContent className="p-6 h-full flex flex-col justify-between">
            <div className="flex-1 flex items-center justify-center text-center">
              <p className="text-lg">{flashcard.front_text}</p>
            </div>
            <div className="flex justify-between items-center mt-4">
              <span className="text-sm text-gray-500">Przód</span>
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(flashcard.id);
                  }}
                  aria-label="Edytuj fiszkę"
                  data-test-id="edit-flashcard-button"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(flashcard);
                  }}
                  aria-label="Usuń fiszkę"
                  data-test-id="delete-flashcard-button"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Back of card */}
        <Card
          className={`absolute inset-0 w-full h-full backface-hidden rotate-y-180 hover:shadow-lg transition-shadow ${flashcard.isFlipped ? "" : "rotate-y-180"}`}
        >
          <CardContent className="p-6 h-full flex flex-col justify-between">
            <div className="flex-1 flex items-center justify-center text-center">
              <p className="text-lg">{flashcard.back_text}</p>
            </div>
            <div className="flex justify-between items-center mt-4">
              <span className="text-sm text-gray-500">Tył</span>
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(flashcard.id);
                  }}
                  aria-label="Edytuj fiszkę"
                  data-test-id="edit-flashcard-button"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(flashcard);
                  }}
                  aria-label="Usuń fiszkę"
                  data-test-id="delete-flashcard-button"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
