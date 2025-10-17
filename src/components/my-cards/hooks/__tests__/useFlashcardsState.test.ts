import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useFlashcardsState } from "../useFlashcardsState";
import type {
  FlashcardDTO,
  FlashcardListResponseDTO,
  FlashcardCreateCommand,
  FlashcardUpdateCommand,
  FlashcardDeleteResponseDTO,
} from "../../../../types";

// Mock fetch globally
const fetchMock = vi.fn();
global.fetch = fetchMock;

// Mock window.history.replaceState
const replaceStateMock = vi.fn();
Object.defineProperty(window, "history", {
  value: { replaceState: replaceStateMock },
  writable: true,
});

// Mock window.location
const mockLocation = {
  href: "http://localhost:3000/my-cards",
  search: "",
  pathname: "/my-cards",
  origin: "http://localhost:3000",
};
Object.defineProperty(window, "location", {
  value: mockLocation,
  writable: true,
});

// Factory functions for test data
const createMockFlashcard = (overrides: Partial<FlashcardDTO> = {}): FlashcardDTO => ({
  id: "test-id",
  front_text: "Front text",
  back_text: "Back text",
  source_type: "MANUAL",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  ai_generation_audit_id: null,
  ...overrides,
});

const createMockApiResponse = (
  data: FlashcardDTO[],
  overrides: Partial<FlashcardListResponseDTO> = {}
): FlashcardListResponseDTO => ({
  data,
  pagination: {
    page: 1,
    page_size: 20,
    total_pages: 1,
    total_items: data.length,
    ...overrides.pagination,
  },
  ...overrides,
});

const createMockDeleteResponse = (overrides: Partial<FlashcardDeleteResponseDTO> = {}): FlashcardDeleteResponseDTO => ({
  id: "test-id",
  deleted_at: "2024-01-01T00:00:00Z",
  ...overrides,
});

// Setup and teardown
describe("useFlashcardsState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockReset();
    replaceStateMock.mockReset();

    // Reset location mock
    mockLocation.search = "";
    mockLocation.href = "http://localhost:3000/my-cards";

    // Setup default mock for initial fetch
    const defaultResponse = createMockApiResponse([]);
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(defaultResponse),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Initial state", () => {
    it("should initialize with default values", async () => {
      const { result } = renderHook(() => useFlashcardsState());

      // Wait for initial fetch to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.flashcards).toEqual([]);
      expect(result.current.filters).toEqual({
        search: "",
        sourceType: [],
        sort: "created_at:desc",
        page: 1,
        pageSize: 20,
      });
      expect(result.current.pagination).toEqual({
        currentPage: 1,
        totalPages: 1,
        pageSize: 20,
        totalItems: 0,
      });
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it("should initialize filters from URL parameters on mount", async () => {
      const searchParams = "?search=test&page=2&page_size=10&source_type=AI_ORIGINAL&sort=updated_at:asc";
      mockLocation.search = searchParams;
      mockLocation.href = `http://localhost:3000/my-cards${searchParams}`;

      // First fetch will use URL params
      const mockResponse = createMockApiResponse([createMockFlashcard()]);
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const { result } = renderHook(() => useFlashcardsState());

      // Wait for the hook to parse URL and fetch with those params
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Check that fetch was called with URL params
      const fetchUrl = fetchMock.mock.calls[0][0];
      expect(fetchUrl).toContain("search=test");
      expect(fetchUrl).toContain("source_type=AI_ORIGINAL");
      expect(fetchUrl).toContain("sort=updated_at%3Aasc");
      expect(fetchUrl).toContain("page=2");
      expect(fetchUrl).toContain("page_size=10");
    });

    it("should handle invalid URL parameters gracefully", async () => {
      mockLocation.search = "?page=invalid&page_size=999&sort=invalid_sort";

      const mockResponse = createMockApiResponse([]);
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const { result } = renderHook(() => useFlashcardsState());

      await waitFor(() => {
        expect(result.current.filters.search).toBe("");
        expect(result.current.filters.sourceType).toEqual([]);
        expect(result.current.filters.sort).toBe("created_at:desc");
        expect(result.current.filters.page).toBe(1);
        expect(result.current.filters.pageSize).toBe(20);
      });
    });
  });

  describe("Filter management and URL synchronization", () => {
    it("should update filters and sync with URL", async () => {
      const mockResponse = createMockApiResponse([createMockFlashcard()]);
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const { result } = renderHook(() => useFlashcardsState());

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

      act(() => {
        result.current.updateFilters({
          search: "test search",
          sourceType: ["AI_ORIGINAL"],
          sort: "updated_at:desc",
        });
      });

      await waitFor(() => {
        expect(result.current.filters.search).toBe("test search");
        expect(result.current.filters.sourceType).toEqual(["AI_ORIGINAL"]);
        expect(result.current.filters.sort).toBe("updated_at:desc");
        expect(replaceStateMock).toHaveBeenCalled();
      });

      // Verify URL contains expected params (encoding may vary)
      const lastCallUrl = replaceStateMock.mock.calls[replaceStateMock.mock.calls.length - 1][2];
      expect(lastCallUrl).toMatch(/search=test[+%20]search/);
      expect(lastCallUrl).toContain("source_type=AI_ORIGINAL");
      expect(lastCallUrl).toContain("sort=updated_at%3Adesc");
    });

    it("should reset page to 1 when search or sourceType filters change", async () => {
      const mockResponse = createMockApiResponse([createMockFlashcard()]);
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const { result } = renderHook(() => useFlashcardsState());

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

      // Set initial page to 3
      act(() => {
        result.current.updateFilters({ page: 3 });
      });

      await waitFor(() => {
        expect(result.current.filters.page).toBe(3);
      });

      // Change search - should reset page to 1
      act(() => {
        result.current.updateFilters({ search: "new search" });
      });

      await waitFor(() => {
        expect(result.current.filters.page).toBe(1);
        expect(result.current.filters.search).toBe("new search");
      });
    });

    it("should handle empty filter values correctly", async () => {
      const mockResponse = createMockApiResponse([createMockFlashcard()]);
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const { result } = renderHook(() => useFlashcardsState());

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

      act(() => {
        result.current.updateFilters({
          search: "",
          sourceType: [],
        });
      });

      await waitFor(() => {
        expect(replaceStateMock).toHaveBeenCalledWith({}, "", "http://localhost:3000/my-cards");
      });
    });

    it("should not update URL for default values", async () => {
      const mockResponse = createMockApiResponse([createMockFlashcard()]);
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const { result } = renderHook(() => useFlashcardsState());

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

      // Clear previous calls
      replaceStateMock.mockClear();

      act(() => {
        result.current.updateFilters({
          sort: "created_at:desc", // default value
          pageSize: 20, // default value
        });
      });

      await waitFor(() => {
        expect(replaceStateMock).toHaveBeenCalled();
      });

      const url = replaceStateMock.mock.calls[0][2];
      expect(url).not.toContain("sort=");
      expect(url).not.toContain("page_size=");
    });
  });

  describe("API interactions", () => {
    describe("Fetching flashcards", () => {
      it("should fetch flashcards with correct query parameters", async () => {
        const mockResponse = createMockApiResponse([
          createMockFlashcard({ id: "card-1" }),
          createMockFlashcard({ id: "card-2" }),
        ]);
        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const { result } = renderHook(() => useFlashcardsState());

        await waitFor(() => {
          expect(fetchMock).toHaveBeenCalledWith("/api/flashcards?");
          expect(result.current.flashcards).toHaveLength(2);
          expect(result.current.flashcards[0].isFlipped).toBe(false);
          expect(result.current.flashcards[0].isEditing).toBe(false);
          expect(result.current.flashcards[0].isDeleting).toBe(false);
        });
      });

      it("should handle fetch errors gracefully", async () => {
        fetchMock.mockRejectedValueOnce(new Error("Network error"));

        const { result } = renderHook(() => useFlashcardsState());

        await waitFor(() => {
          expect(result.current.error).toBe("Network error");
          expect(result.current.isLoading).toBe(false);
        });
      });

      it("should handle HTTP error responses", async () => {
        fetchMock.mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: { message: "Server error" } }),
        });

        const { result } = renderHook(() => useFlashcardsState());

        await waitFor(() => {
          expect(result.current.error).toBe("Server error");
        });
      });

      it("should build query string correctly for complex filters", async () => {
        const mockResponse = createMockApiResponse([createMockFlashcard()]);
        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const { result } = renderHook(() => useFlashcardsState());

        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

        // First update to set page without search/sourceType (to avoid reset)
        act(() => {
          result.current.updateFilters({
            pageSize: 50,
            sort: "updated_at:asc",
          });
        });

        await waitFor(() => {
          expect(fetchMock).toHaveBeenCalledTimes(2);
        });

        // Then update search and sourceType (this will reset page to 1)
        act(() => {
          result.current.updateFilters({
            search: "test query",
            sourceType: ["AI_ORIGINAL", "MANUAL"],
          });
        });

        await waitFor(() => {
          expect(fetchMock).toHaveBeenCalledTimes(3);
        });

        const callUrl = fetchMock.mock.calls[2][0];
        // URLSearchParams may encode spaces as + or %20, both are valid
        expect(callUrl).toMatch(/search=test[+%20]query/);
        expect(callUrl).toContain("source_type=AI_ORIGINAL");
        expect(callUrl).toContain("source_type=MANUAL");
        // Page should not be in URL since it's reset to 1 (default)
        expect(callUrl).not.toContain("page=");
        expect(callUrl).toContain("page_size=50");
        expect(callUrl).toContain("sort=updated_at%3Aasc");
      });
    });

    describe("Creating flashcards", () => {
      it("should create flashcard with optimistic update", async () => {
        const mockResponse = createMockApiResponse([]);
        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const newCard = createMockFlashcard({ id: "new-card", front_text: "New front", back_text: "New back" });
        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(newCard),
        });

        const { result } = renderHook(() => useFlashcardsState());

        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

        const createCommand: FlashcardCreateCommand = {
          front_text: "New front",
          back_text: "New back",
          source_type: "MANUAL",
        };

        let createdCard: FlashcardDTO | undefined;
        await act(async () => {
          createdCard = await result.current.createFlashcard(createCommand);
        });

        expect(createdCard).toEqual(newCard);
        expect(result.current.flashcards).toHaveLength(1);
        expect(result.current.flashcards[0]).toEqual({
          ...newCard,
          isFlipped: false,
          isEditing: false,
          isDeleting: false,
        });
      });

      it("should handle create errors and not update local state", async () => {
        const mockResponse = createMockApiResponse([]);
        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        fetchMock.mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ error: { message: "Validation error" } }),
        });

        const { result } = renderHook(() => useFlashcardsState());

        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

        const createCommand: FlashcardCreateCommand = {
          front_text: "",
          back_text: "Back text",
          source_type: "MANUAL",
        };

        let errorThrown = false;
        let errorMessage = "";
        try {
          await act(async () => {
            await result.current.createFlashcard(createCommand);
          });
        } catch (error) {
          errorThrown = true;
          errorMessage = (error as Error).message;
        }

        // Verify the error was thrown with correct message
        expect(errorThrown).toBe(true);
        expect(errorMessage).toBe("Validation error");

        // Verify local state was not updated
        expect(result.current.flashcards).toHaveLength(0);
      });
    });

    describe("Updating flashcards", () => {
      it("should update flashcard with optimistic update", async () => {
        const existingCard = createMockFlashcard({ id: "card-1", front_text: "Old front" });
        const mockResponse = createMockApiResponse([existingCard]);
        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const updatedCard = createMockFlashcard({
          id: "card-1",
          front_text: "Updated front",
          back_text: "Updated back",
        });
        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(updatedCard),
        });

        const { result } = renderHook(() => useFlashcardsState());

        await waitFor(() => {
          expect(result.current.flashcards).toHaveLength(1);
          expect(result.current.flashcards[0].front_text).toBe("Old front");
        });

        const updateCommand: FlashcardUpdateCommand = {
          front_text: "Updated front",
          back_text: "Updated back",
        };

        await act(async () => {
          await result.current.updateFlashcard("card-1", updateCommand);
        });

        expect(result.current.flashcards[0]).toEqual({
          ...updatedCard,
          isFlipped: false, // preserved
          isEditing: false, // reset
          isDeleting: false, // preserved
        });
      });

      it("should preserve flip state during update", async () => {
        const existingCard = createMockFlashcard({ id: "card-1" });
        const mockResponse = createMockApiResponse([existingCard]);
        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const updatedCard = createMockFlashcard({ id: "card-1", front_text: "Updated" });
        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(updatedCard),
        });

        const { result } = renderHook(() => useFlashcardsState());

        await waitFor(() => expect(result.current.flashcards).toHaveLength(1));

        // Flip the card
        act(() => {
          result.current.flipFlashcard("card-1");
        });

        expect(result.current.flashcards[0].isFlipped).toBe(true);

        // Update the card
        await act(async () => {
          await result.current.updateFlashcard("card-1", { front_text: "Updated" });
        });

        expect(result.current.flashcards[0].isFlipped).toBe(true); // preserved
      });
    });

    describe("Deleting flashcards", () => {
      it("should delete flashcard with optimistic update", async () => {
        const card1 = createMockFlashcard({ id: "card-1" });
        const card2 = createMockFlashcard({ id: "card-2" });
        const mockResponse = createMockApiResponse([card1, card2]);
        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const deleteResponse = createMockDeleteResponse();
        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(deleteResponse),
        });

        const { result } = renderHook(() => useFlashcardsState());

        await waitFor(() => expect(result.current.flashcards).toHaveLength(2));

        await act(async () => {
          await result.current.deleteFlashcard("card-1");
        });

        expect(result.current.flashcards).toHaveLength(1);
        expect(result.current.flashcards[0].id).toBe("card-2");
      });

      it("should handle delete with reason parameter", async () => {
        const card = createMockFlashcard({ id: "card-1" });
        const mockResponse = createMockApiResponse([card]);
        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const deleteResponse = createMockDeleteResponse();
        fetchMock.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(deleteResponse),
        });

        const { result } = renderHook(() => useFlashcardsState());

        await waitFor(() => expect(result.current.flashcards).toHaveLength(1));

        await act(async () => {
          await result.current.deleteFlashcard("card-1", "Test reason");
        });

        expect(fetchMock).toHaveBeenCalledWith(
          "/api/flashcards/card-1",
          expect.objectContaining({
            method: "DELETE",
            body: JSON.stringify({ reason: "Test reason" }),
          })
        );
      });
    });
  });

  describe("Local state management", () => {
    it("should flip flashcard correctly", async () => {
      const card = createMockFlashcard({ id: "card-1" });
      const mockResponse = createMockApiResponse([card]);
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const { result } = renderHook(() => useFlashcardsState());

      // Wait for initial data load
      await waitFor(
        () => {
          expect(result.current.flashcards).toHaveLength(1);
        },
        { timeout: 2000 }
      );

      expect(result.current.flashcards[0].isFlipped).toBe(false);

      act(() => {
        result.current.flipFlashcard("card-1");
      });

      expect(result.current.flashcards[0].isFlipped).toBe(true);

      act(() => {
        result.current.flipFlashcard("card-1");
      });

      expect(result.current.flashcards[0].isFlipped).toBe(false);
    });

    it("should manage editing state correctly", async () => {
      const card1 = createMockFlashcard({ id: "card-1" });
      const card2 = createMockFlashcard({ id: "card-2" });
      const mockResponse = createMockApiResponse([card1, card2]);
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const { result } = renderHook(() => useFlashcardsState());

      await waitFor(() => expect(result.current.flashcards).toHaveLength(2));

      act(() => {
        result.current.startEditingFlashcard("card-1");
      });

      expect(result.current.flashcards[0].isEditing).toBe(true);
      expect(result.current.flashcards[1].isEditing).toBe(false); // only one can be editing

      act(() => {
        result.current.stopEditingFlashcard("card-1");
      });

      expect(result.current.flashcards[0].isEditing).toBe(false);
    });

    it("should manage deleting state correctly", async () => {
      const card = createMockFlashcard({ id: "card-1" });
      const mockResponse = createMockApiResponse([card]);
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const { result } = renderHook(() => useFlashcardsState());

      await waitFor(() => expect(result.current.flashcards).toHaveLength(1));

      act(() => {
        result.current.startDeletingFlashcard("card-1");
      });

      expect(result.current.flashcards[0].isDeleting).toBe(true);

      act(() => {
        result.current.stopDeletingFlashcard("card-1");
      });

      expect(result.current.flashcards[0].isDeleting).toBe(false);
    });
  });

  describe("Edge cases and error handling", () => {
    it("should handle empty API response", async () => {
      const mockResponse = createMockApiResponse([]);
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const { result } = renderHook(() => useFlashcardsState());

      await waitFor(() => {
        expect(result.current.flashcards).toEqual([]);
        expect(result.current.pagination.totalItems).toBe(0);
      });
    });

    it("should handle malformed API response", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ invalid: "response" }),
      });

      const { result } = renderHook(() => useFlashcardsState());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).not.toBeNull();
      });

      // The exact error message may vary, but it should indicate an error occurred
      expect(result.current.error).toBeTruthy();
    });

    it("should handle network errors during operations", async () => {
      const mockResponse = createMockApiResponse([createMockFlashcard()]);
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      fetchMock.mockRejectedValueOnce(new Error("Network timeout"));

      const { result } = renderHook(() => useFlashcardsState());

      await waitFor(() => expect(result.current.flashcards).toHaveLength(1));

      let errorThrown = false;
      let errorMessage = "";
      try {
        await act(async () => {
          await result.current.createFlashcard({
            front_text: "Test",
            back_text: "Test",
            source_type: "MANUAL",
          });
        });
      } catch (error) {
        errorThrown = true;
        errorMessage = (error as Error).message;
      }

      // Verify the error was thrown with correct message
      expect(errorThrown).toBe(true);
      expect(errorMessage).toBe("Network timeout");
    });

    it("should handle non-Error objects thrown", async () => {
      const mockResponse = createMockApiResponse([createMockFlashcard()]);
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      fetchMock.mockRejectedValueOnce("String error");

      const { result } = renderHook(() => useFlashcardsState());

      await waitFor(() => expect(result.current.flashcards).toHaveLength(1));

      // The rejection should be rethrown
      let errorThrown = false;
      try {
        await act(async () => {
          await result.current.createFlashcard({
            front_text: "Test",
            back_text: "Test",
            source_type: "MANUAL",
          });
        });
      } catch (error) {
        errorThrown = true;
        expect(error).toBe("String error");
      }

      // Verify the error was thrown (non-Error object is rethrown as-is)
      expect(errorThrown).toBe(true);
    });

    it("should handle operations on non-existent flashcards", async () => {
      const mockResponse = createMockApiResponse([createMockFlashcard({ id: "card-1" })]);
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const { result } = renderHook(() => useFlashcardsState());

      await waitFor(() => expect(result.current.flashcards).toHaveLength(1));

      // These should not throw or cause issues
      act(() => {
        result.current.flipFlashcard("non-existent");
        result.current.startEditingFlashcard("non-existent");
        result.current.stopEditingFlashcard("non-existent");
        result.current.startDeletingFlashcard("non-existent");
        result.current.stopDeletingFlashcard("non-existent");
      });

      // State should remain unchanged
      expect(result.current.flashcards[0].isFlipped).toBe(false);
      expect(result.current.flashcards[0].isEditing).toBe(false);
      expect(result.current.flashcards[0].isDeleting).toBe(false);
    });

    it("should handle concurrent API calls correctly", async () => {
      const mockResponse = createMockApiResponse([]);
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const newCard1 = createMockFlashcard({ id: "card-1" });
      const newCard2 = createMockFlashcard({ id: "card-2" });

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(newCard1),
      });

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(newCard2),
      });

      const { result } = renderHook(() => useFlashcardsState());

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1)); // initial fetch

      // Start first create operation and wait for it
      await act(async () => {
        await result.current.createFlashcard({
          front_text: "Card 1",
          back_text: "Back 1",
          source_type: "MANUAL",
        });
      });

      // Start second create operation and wait for it
      await act(async () => {
        await result.current.createFlashcard({
          front_text: "Card 2",
          back_text: "Back 2",
          source_type: "MANUAL",
        });
      });

      expect(result.current.flashcards).toHaveLength(2);
      expect(result.current.flashcards.map((c) => c.id)).toEqual(["card-2", "card-1"]); // LIFO order
    });
  });

  describe("Loading states", () => {
    it("should manage loading state during fetch", async () => {
      let resolvePromise: ((value: Response) => void) | undefined;
      const promise = new Promise<Response>((resolve) => {
        resolvePromise = resolve;
      });

      fetchMock.mockReturnValueOnce(promise as Promise<Response>);

      const { result } = renderHook(() => useFlashcardsState());

      // Wait for hook to initialize
      await waitFor(() => {
        expect(result.current).not.toBeNull();
      });

      // Initially loading should be true
      expect(result.current.isLoading).toBe(true);

      // Resolve the promise
      const mockResponse = createMockApiResponse([]);
      if (resolvePromise) {
        resolvePromise({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        } as Response);
      }

      // Wait for loading to become false
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should set loading to false on error", async () => {
      fetchMock.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useFlashcardsState());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBe("Network error");
      });
    });
  });
});
