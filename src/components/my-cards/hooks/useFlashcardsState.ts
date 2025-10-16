import { useState, useEffect, useCallback } from "react";
import type {
  FlashcardListResponseDTO,
  FlashcardDTO,
  FlashcardCreateCommand,
  FlashcardDeleteResponseDTO,
  FlashcardListQueryCommand,
} from "../../../types";

// ViewModel types
interface StatsViewModel {
  totalCards: number;
  aiOriginalCount: number;
  aiEditedCount: number;
  manualCount: number;
  aiAcceptanceRate: number;
}

interface FiltersViewModel {
  search: string;
  sourceType: string[];
  sort: string;
  page: number;
  pageSize: number;
}

interface PaginationViewModel {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
}

interface FlashcardViewModel extends FlashcardDTO {
  isFlipped: boolean;
  isEditing: boolean;
  isDeleting: boolean;
}

interface UseFlashcardsStateReturn {
  // State
  flashcards: FlashcardViewModel[];
  stats: StatsViewModel;
  filters: FiltersViewModel;
  pagination: PaginationViewModel;
  isLoading: boolean;
  error: string | null;

  // Actions
  updateFilters: (newFilters: Partial<FiltersViewModel>) => void;
  createFlashcard: (command: FlashcardCreateCommand) => Promise<FlashcardDTO>;
  updateFlashcard: (id: string, command: FlashcardUpdateCommand) => Promise<FlashcardDTO>;
  deleteFlashcard: (id: string, reason?: string) => Promise<FlashcardDeleteResponseDTO>;
  flipFlashcard: (id: string) => void;
  startEditingFlashcard: (id: string) => void;
  stopEditingFlashcard: (id: string) => void;
  startDeletingFlashcard: (id: string) => void;
  stopDeletingFlashcard: (id: string) => void;
}

/**
 * Custom hook for managing flashcards state and API interactions.
 * Handles fetching, creating, deleting flashcards and managing local state.
 */
export const useFlashcardsState = (): UseFlashcardsStateReturn => {
  // State
  const [flashcards, setFlashcards] = useState<FlashcardViewModel[]>([]);
  const [stats, setStats] = useState<StatsViewModel>({
    totalCards: 0,
    aiOriginalCount: 0,
    aiEditedCount: 0,
    manualCount: 0,
    aiAcceptanceRate: 0,
  });
  const [filters, setFilters] = useState<FiltersViewModel>({
    search: "",
    sourceType: [],
    sort: "created_at:desc",
    page: 1,
    pageSize: 20,
  });
  const [pagination, setPagination] = useState<PaginationViewModel>({
    currentPage: 1,
    totalPages: 1,
    pageSize: 20,
    totalItems: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate stats from flashcards data
  const calculateStats = useCallback((flashcardsData: FlashcardDTO[]): StatsViewModel => {
    const totalCards = flashcardsData.length;
    const aiOriginalCount = flashcardsData.filter(f => f.source_type === "AI_ORIGINAL").length;
    const aiEditedCount = flashcardsData.filter(f => f.source_type === "AI_EDITED").length;
    const manualCount = flashcardsData.filter(f => f.source_type === "MANUAL").length;
    const aiTotal = aiOriginalCount + aiEditedCount;
    const aiAcceptanceRate = aiTotal > 0 ? (aiEditedCount / aiTotal) * 100 : 0;

    return {
      totalCards,
      aiOriginalCount,
      aiEditedCount,
      manualCount,
      aiAcceptanceRate: Math.round(aiAcceptanceRate * 100) / 100, // Round to 2 decimal places
    };
  }, []);

  // Fetch flashcards from API
  const fetchFlashcards = useCallback(async (query: FlashcardListQueryCommand) => {
    setIsLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();

      if (query.page && query.page > 1) queryParams.append("page", query.page.toString());
      if (query.page_size && query.page_size !== 20) queryParams.append("page_size", query.page_size.toString());
      if (query.source_type && query.source_type.length > 0) {
        query.source_type.forEach(type => queryParams.append("source_type", type));
      }
      if (query.updated_after) queryParams.append("updated_after", query.updated_after);
      if (query.include_deleted) queryParams.append("include_deleted", "true");
      if (query.search) queryParams.append("search", query.search);
      if (query.sort && query.sort !== "created_at:desc") queryParams.append("sort", query.sort);

      const response = await fetch(`/api/flashcards?${queryParams.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      const data: FlashcardListResponseDTO = await response.json();

      // Transform to view models with additional state
      const viewModels: FlashcardViewModel[] = data.data.map(card => ({
        ...card,
        isFlipped: false,
        isEditing: false,
        isDeleting: false,
      }));

      setFlashcards(viewModels);
      setStats(calculateStats(data.data));
      setPagination({
        currentPage: data.pagination.page,
        totalPages: data.pagination.total_pages,
        pageSize: data.pagination.page_size,
        totalItems: data.pagination.total_items,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMessage);
      console.error("Failed to fetch flashcards:", err);
    } finally {
      setIsLoading(false);
    }
  }, [calculateStats]);

  // Update filters and refetch
  const updateFilters = useCallback((newFilters: Partial<FiltersViewModel>) => {
    setFilters(prev => {
      const updated = { ...prev, ...newFilters };
      // Reset to page 1 when filters change
      if (newFilters.search !== undefined || newFilters.sourceType !== undefined) {
        updated.page = 1;
      }
      return updated;
    });

    // Update URL with new filters
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      const updated = { ...filters, ...newFilters };

      // Update search params
      if (updated.search && updated.search.trim()) {
        url.searchParams.set('search', updated.search);
      } else {
        url.searchParams.delete('search');
      }

      if (updated.sourceType && updated.sourceType.length > 0) {
        updated.sourceType.forEach(type => url.searchParams.append('source_type', type));
      } else {
        url.searchParams.delete('source_type');
      }

      if (updated.sort && updated.sort !== 'created_at:desc') {
        url.searchParams.set('sort', updated.sort);
      } else {
        url.searchParams.delete('sort');
      }

      if (updated.page && updated.page > 1) {
        url.searchParams.set('page', updated.page.toString());
      } else {
        url.searchParams.delete('page');
      }

      if (updated.pageSize && updated.pageSize !== 20) {
        url.searchParams.set('page_size', updated.pageSize.toString());
      } else {
        url.searchParams.delete('page_size');
      }

      // Update URL without triggering a page reload
      window.history.replaceState({}, '', url.toString());
    }
  }, [filters]);

  // Create flashcard
  const createFlashcardApi = useCallback(async (command: FlashcardCreateCommand): Promise<FlashcardDTO> => {
    const response = await fetch("/api/flashcards", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `HTTP ${response.status}`);
    }

    return await response.json();
  }, []);

  // Update flashcard
  const updateFlashcardApi = useCallback(async (id: string, command: FlashcardUpdateCommand): Promise<FlashcardDTO> => {
    const response = await fetch(`/api/flashcards/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `HTTP ${response.status}`);
    }

    return await response.json();
  }, []);

  // Delete flashcard
  const deleteFlashcardApi = useCallback(async (id: string, reason?: string): Promise<FlashcardDeleteResponseDTO> => {
    const response = await fetch(`/api/flashcards/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(reason ? { reason } : {}),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `HTTP ${response.status}`);
    }

    return await response.json();
  }, []);

  // Create flashcard wrapper
  const createFlashcard = useCallback(async (command: FlashcardCreateCommand): Promise<FlashcardDTO> => {
    try {
      const newCard = await createFlashcardApi(command);

      // Add to local state (optimistic update)
      const newViewModel: FlashcardViewModel = {
        ...newCard,
        isFlipped: false,
        isEditing: false,
        isDeleting: false,
      };

      setFlashcards(prev => [newViewModel, ...prev]);
      setStats(prev => calculateStats([newCard, ...flashcards.map(f => ({ ...f }))]));

      return newCard;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create flashcard";
      setError(errorMessage);
      throw err;
    }
  }, [createFlashcardApi, calculateStats, flashcards]);

  // Update flashcard wrapper
  const updateFlashcard = useCallback(async (id: string, command: FlashcardUpdateCommand): Promise<FlashcardDTO> => {
    try {
      const updatedCard = await updateFlashcardApi(id, command);

      // Update local state (optimistic update)
      setFlashcards(prev => prev.map(card =>
        card.id === id
          ? { ...updatedCard, isFlipped: card.isFlipped, isEditing: false, isDeleting: card.isDeleting }
          : card
      ));

      // Update stats if source_type changed
      if (command.source_type) {
        setStats(prev => calculateStats(flashcards.map(f =>
          f.id === id ? { ...updatedCard } : { ...f }
        )));
      }

      return updatedCard;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update flashcard";
      setError(errorMessage);
      throw err;
    }
  }, [updateFlashcardApi, calculateStats, flashcards]);

  // Delete flashcard wrapper
  const deleteFlashcard = useCallback(async (id: string, reason?: string): Promise<FlashcardDeleteResponseDTO> => {
    try {
      const result = await deleteFlashcardApi(id, reason);

      // Remove from local state (optimistic update)
      setFlashcards(prev => prev.filter(f => f.id !== id));
      setStats(prev => calculateStats(flashcards.filter(f => f.id !== id).map(f => ({ ...f }))));

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete flashcard";
      setError(errorMessage);
      throw err;
    }
  }, [deleteFlashcardApi, calculateStats, flashcards]);

  // Local state management functions
  const flipFlashcard = useCallback((id: string) => {
    setFlashcards(prev =>
      prev.map(card =>
        card.id === id ? { ...card, isFlipped: !card.isFlipped } : card
      )
    );
  }, []);

  const startEditingFlashcard = useCallback((id: string) => {
    setFlashcards(prev =>
      prev.map(card =>
        card.id === id ? { ...card, isEditing: true } : { ...card, isEditing: false }
      )
    );
  }, []);

  const stopEditingFlashcard = useCallback((id: string) => {
    setFlashcards(prev =>
      prev.map(card =>
        card.id === id ? { ...card, isEditing: false } : card
      )
    );
  }, []);

  const startDeletingFlashcard = useCallback((id: string) => {
    setFlashcards(prev =>
      prev.map(card =>
        card.id === id ? { ...card, isDeleting: true } : card
      )
    );
  }, []);

  const stopDeletingFlashcard = useCallback((id: string) => {
    setFlashcards(prev =>
      prev.map(card =>
        card.id === id ? { ...card, isDeleting: false } : card
      )
    );
  }, []);

  // Initialize filters from URL on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      const searchParams = url.searchParams;

      const urlFilters: Partial<FiltersViewModel> = {};

      // Parse search
      const search = searchParams.get('search');
      if (search) {
        urlFilters.search = search;
      }

      // Parse source types
      const sourceTypes = searchParams.getAll('source_type');
      if (sourceTypes.length > 0) {
        urlFilters.sourceType = sourceTypes;
      }

      // Parse sort
      const sort = searchParams.get('sort');
      if (sort && ['created_at:asc', 'created_at:desc', 'updated_at:asc', 'updated_at:desc'].includes(sort)) {
        urlFilters.sort = sort;
      }

      // Parse page
      const page = searchParams.get('page');
      if (page) {
        const pageNum = parseInt(page, 10);
        if (!isNaN(pageNum) && pageNum >= 1) {
          urlFilters.page = pageNum;
        }
      }

      // Parse page_size
      const pageSize = searchParams.get('page_size');
      if (pageSize) {
        const sizeNum = parseInt(pageSize, 10);
        if (!isNaN(sizeNum) && [10, 20, 50, 100].includes(sizeNum)) {
          urlFilters.pageSize = sizeNum;
        }
      }

      // Apply URL filters if any were found
      if (Object.keys(urlFilters).length > 0) {
        setFilters(prev => ({ ...prev, ...urlFilters }));
      }
    }
  }, []); // Only run on mount

  // Fetch data when filters change
  useEffect(() => {
    fetchFlashcards({
      page: filters.page,
      page_size: filters.pageSize,
      source_type: filters.sourceType.length > 0 ? filters.sourceType : undefined,
      search: filters.search || undefined,
      sort: filters.sort,
    });
  }, [filters, fetchFlashcards]);

  return {
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
  };
};
