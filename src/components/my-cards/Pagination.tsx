import React from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationViewModel {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
}

interface PaginationProps {
  pagination: PaginationViewModel;
  onChange: (newPagination: Partial<PaginationViewModel>) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ pagination, onChange }) => {
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= pagination.totalPages) {
      onChange({ currentPage: page });
    }
  };

  const handlePageSizeChange = (pageSize: number) => {
    onChange({ pageSize, currentPage: 1 });
  };

  const renderPageButtons = () => {
    const buttons = [];
    const maxVisible = 5;
    let start = Math.max(1, pagination.currentPage - Math.floor(maxVisible / 2));
    const end = Math.min(pagination.totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      buttons.push(
        <Button
          key={i}
          variant={i === pagination.currentPage ? "default" : "outline"}
          size="sm"
          onClick={() => handlePageChange(i)}
        >
          {i}
        </Button>
      );
    }

    return buttons;
  };

  if (pagination.totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-between" data-test-id="pagination">
      <div className="flex items-center space-x-2">
        <label htmlFor="page-size-select" className="text-sm text-gray-700">
          Rozmiar strony:
        </label>
        <Select value={pagination.pageSize.toString()} onValueChange={(value) => handlePageSizeChange(Number(value))}>
          <SelectTrigger className="w-20" id="page-size-select" data-test-id="page-size-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="20">20</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(pagination.currentPage - 1)}
          disabled={pagination.currentPage === 1}
          aria-label="Poprzednia strona"
          data-test-id="previous-page-button"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <nav aria-label="Numery stron" className="flex items-center space-x-1" data-test-id="page-numbers">
          {renderPageButtons()}
        </nav>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(pagination.currentPage + 1)}
          disabled={pagination.currentPage === pagination.totalPages}
          aria-label="Następna strona"
          data-test-id="next-page-button"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
      <div className="text-sm text-gray-700" data-test-id="total-items">
        {pagination.totalItems} elementów
      </div>
    </div>
  );
};
