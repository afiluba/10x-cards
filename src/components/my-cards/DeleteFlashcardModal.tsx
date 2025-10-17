import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { FlashcardDTO } from "../../types";

interface FlashcardViewModel extends FlashcardDTO {
  isFlipped: boolean;
  isEditing: boolean;
  isDeleting: boolean;
}

interface DeleteFlashcardModalProps {
  isOpen: boolean;
  flashcard: FlashcardViewModel | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteFlashcardModal: React.FC<DeleteFlashcardModalProps> = ({
  isOpen,
  flashcard,
  onConfirm,
  onCancel,
}) => {
  if (!flashcard) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={onCancel}>
      <AlertDialogContent data-test-id="delete-flashcard-modal">
        <AlertDialogHeader>
          <AlertDialogTitle>Usuń fiszkę</AlertDialogTitle>
          <AlertDialogDescription>
            Czy na pewno chcesz usunąć tę fiszkę? Tej operacji nie można cofnąć.
            <br />
            <strong>Przód:</strong> {flashcard.front_text.slice(0, 100)}
            {flashcard.front_text.length > 100 && "..."}
            <br />
            <strong>Tył:</strong> {flashcard.back_text.slice(0, 100)}
            {flashcard.back_text.length > 100 && "..."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} data-test-id="cancel-delete-button">
            Anuluj
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} data-test-id="confirm-delete-button">
            Usuń
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
