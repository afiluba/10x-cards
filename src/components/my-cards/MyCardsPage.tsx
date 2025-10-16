"use client";

import React, { useState } from "react";
import { StatsPanel } from "./StatsPanel";
import { FiltersPanel } from "./FiltersPanel";
import { AddFlashcardButton } from "./AddFlashcardButton";
import { FlashcardGrid } from "./FlashcardGrid";
import { Pagination } from "./Pagination";
import { CreateFlashcardModal } from "./CreateFlashcardModal";
import { DeleteFlashcardModal } from "./DeleteFlashcardModal";
import { useFlashcardsState } from "./hooks/useFlashcardsState";
import { toast } from "sonner";

const MyCardsPage: React.FC = () => {
  const {
    flashcards,
    stats,
    filters,
    pagination,
    isLoading,
    error,
    updateFilters,
    createFlashcard,
    updateFlashcard,
    deleteFlashcard,
    flipFlashcard,
    startEditingFlashcard,
    stopEditingFlashcard,
    startDeletingFlashcard,
    stopDeletingFlashcard,
  } = useFlashcardsState();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleFiltersChange = (newFilters: any) => {
    updateFilters(newFilters);
  };

  const handleOpenCreateModal = () => {
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
  };

  const handleCreateFlashcard = async (data: { front_text: string; back_text: string }) => {
    try {
      await createFlashcard({
        front_text: data.front_text,
        back_text: data.back_text,
        source_type: "MANUAL",
      });
      setIsCreateModalOpen(false);
      toast.success("Fiszka została utworzona pomyślnie");
    } catch (err) {
      // Error is already handled in the hook
      toast.error("Nie udało się utworzyć fiszki");
    }
  };

  const handleEditFlashcard = (id: string) => {
    startEditingFlashcard(id);
  };

  const handleSaveFlashcard = async (id: string, data: { front_text: string; back_text: string }) => {
    try {
      await updateFlashcard(id, {
        front_text: data.front_text,
        back_text: data.back_text,
      });
      stopEditingFlashcard(id);
      toast.success("Fiszka została zaktualizowana pomyślnie");
    } catch (err) {
      // Error is already handled in the hook
      toast.error("Nie udało się zaktualizować fiszki");
    }
  };

  const handleCancelEdit = (id: string) => {
    stopEditingFlashcard(id);
  };

  const handleDeleteFlashcard = (flashcard: any) => {
    startDeletingFlashcard(flashcard.id);
  };

  const handleConfirmDelete = async () => {
    const flashcardToDelete = flashcards.find(f => f.isDeleting);
    if (!flashcardToDelete) return;

    try {
      await deleteFlashcard(flashcardToDelete.id);
      stopDeletingFlashcard(flashcardToDelete.id);
      toast.success("Fiszka została usunięta");
    } catch (err) {
      // Error is already handled in the hook
      toast.error("Nie udało się usunąć fiszki");
    }
  };

  const handleCancelDelete = () => {
    const flashcardToDelete = flashcards.find(f => f.isDeleting);
    if (flashcardToDelete) {
      stopDeletingFlashcard(flashcardToDelete.id);
    }
  };

  const handlePaginationChange = (newPagination: any) => {
    updateFilters({
      page: newPagination.currentPage,
      pageSize: newPagination.pageSize,
    });
  };

  // Show loading state
  if (isLoading && flashcards.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Ładowanie...</div>
      </div>
    );
  }

  // Show error state
  if (error && flashcards.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-red-600">
          Błąd: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <StatsPanel stats={stats} />
      <FiltersPanel filters={filters} onFiltersChange={handleFiltersChange} />
      <AddFlashcardButton onOpenModal={handleOpenCreateModal} />
      <FlashcardGrid
        flashcards={flashcards}
        onEdit={handleEditFlashcard}
        onDelete={handleDeleteFlashcard}
        onFlip={flipFlashcard}
        onSave={handleSaveFlashcard}
        onCancel={handleCancelEdit}
      />
      <Pagination pagination={pagination} onChange={handlePaginationChange} />
      <CreateFlashcardModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        onSubmit={handleCreateFlashcard}
      />
      <DeleteFlashcardModal
        isOpen={flashcards.some(f => f.isDeleting)}
        flashcard={flashcards.find(f => f.isDeleting) || null}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
};

export default MyCardsPage;
