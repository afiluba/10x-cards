import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

interface FiltersViewModel {
  search: string;
  sourceType: string[];
  sort: string;
  page: number;
  pageSize: number;
}

interface FiltersPanelProps {
  filters: FiltersViewModel;
  onFiltersChange: (filters: Partial<FiltersViewModel>) => void;
}

export const FiltersPanel: React.FC<FiltersPanelProps> = ({ filters, onFiltersChange }) => {
  const [searchValue, setSearchValue] = useState(filters.search);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== filters.search) {
        onFiltersChange({ search: searchValue });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchValue, filters.search, onFiltersChange]);

  // Update local search value when filters change externally (e.g., from URL)
  useEffect(() => {
    setSearchValue(filters.search);
  }, [filters.search]);

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
  };

  const handleSourceTypeChange = (value: string) => {
    const sourceTypes = value === "all" ? [] : [value];
    onFiltersChange({ sourceType: sourceTypes });
  };

  const handleSortChange = (value: string) => {
    onFiltersChange({ sort: value });
  };

  const handleClearFilters = () => {
    setSearchValue("");
    onFiltersChange({
      search: "",
      sourceType: [],
      sort: "created_at:desc",
    });
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-center" data-test-id="filters-panel">
      <div className="relative flex-1">
        <label htmlFor="search-input" className="sr-only">
          Szukaj fiszek
        </label>
        <Search
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4"
          aria-hidden="true"
        />
        <Input
          id="search-input"
          placeholder="Szukaj fiszek..."
          value={searchValue}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-10"
          aria-describedby="search-help"
          data-test-id="search-input"
        />
        <div id="search-help" className="sr-only">
          Wyszukiwanie działa w czasie rzeczywistym z opóźnieniem 300ms
        </div>
      </div>
      <div>
        <label htmlFor="source-type-select" className="sr-only">
          Filtruj według typu źródła
        </label>
        <Select
          value={filters.sourceType.length === 0 ? "all" : filters.sourceType[0]}
          onValueChange={handleSourceTypeChange}
        >
          <SelectTrigger className="w-48" id="source-type-select" data-test-id="source-type-filter">
            <SelectValue placeholder="Typ źródła" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie</SelectItem>
            <SelectItem value="AI_ORIGINAL">AI Oryginalne</SelectItem>
            <SelectItem value="AI_EDITED">AI Edytowane</SelectItem>
            <SelectItem value="MANUAL">Ręczne</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <label htmlFor="sort-select" className="sr-only">
          Sortuj fiszki
        </label>
        <Select value={filters.sort} onValueChange={handleSortChange}>
          <SelectTrigger className="w-48" id="sort-select" data-test-id="sort-select">
            <SelectValue placeholder="Sortuj" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at:desc">Najnowsze</SelectItem>
            <SelectItem value="created_at:asc">Najstarsze</SelectItem>
            <SelectItem value="updated_at:desc">Ostatnio edytowane</SelectItem>
            <SelectItem value="updated_at:asc">Najmniej edytowane</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button variant="outline" onClick={handleClearFilters} data-test-id="clear-filters-button">
        <X className="h-4 w-4 mr-2" />
        Wyczyść
      </Button>
    </div>
  );
};
