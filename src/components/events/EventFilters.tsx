'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/Input';
import { SelectDropdown } from '@/components/ui/Dropdown';
import { Button } from '@/components/ui/Button';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import type { EventCategory, EventFilters as Filters } from '@/types';

const CATEGORIES: { value: EventCategory | ''; label: string }[] = [
  { value: '', label: 'All Categories' },
  { value: 'MUSIC', label: 'Music' },
  { value: 'SPORTS', label: 'Sports' },
  { value: 'ARTS', label: 'Arts' },
  { value: 'THEATER', label: 'Theater' },
  { value: 'COMEDY', label: 'Comedy' },
  { value: 'CONFERENCE', label: 'Conference' },
  { value: 'FESTIVAL', label: 'Festival' },
  { value: 'NETWORKING', label: 'Networking' },
  { value: 'OTHER', label: 'Other' },
];

const DATE_OPTIONS = [
  { value: '', label: 'Any Date' },
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'this-week', label: 'This Week' },
  { value: 'this-weekend', label: 'This Weekend' },
  { value: 'next-week', label: 'Next Week' },
  { value: 'this-month', label: 'This Month' },
];

const SORT_OPTIONS = [
  { value: 'date-asc', label: 'Date (Earliest First)' },
  { value: 'date-desc', label: 'Date (Latest First)' },
  { value: 'price-asc', label: 'Price (Low to High)' },
  { value: 'price-desc', label: 'Price (High to Low)' },
  { value: 'popularity', label: 'Popularity' },
];

export interface EventFiltersProps {
  filters: Partial<Filters>;
  onFiltersChange: (filters: Partial<Filters>) => void;
  className?: string;
  showMobileToggle?: boolean;
}

export function EventFilters({
  filters,
  onFiltersChange,
  className,
  showMobileToggle = true,
}: EventFiltersProps) {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(filters.search || '');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFiltersChange({ ...filters, search: searchValue });
  };

  const handleClearFilters = () => {
    setSearchValue('');
    onFiltersChange({});
  };

  const hasActiveFilters =
    filters.category || filters.search || filters.startDateFrom || filters.minPrice;

  const filterContent = (
    <div className="space-y-4">
      {/* Search */}
      <form onSubmit={handleSearchSubmit}>
        <Input
          placeholder="Search events..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
          rightIcon={
            searchValue && (
              <button
                type="button"
                onClick={() => {
                  setSearchValue('');
                  onFiltersChange({ ...filters, search: undefined });
                }}
                className="hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )
          }
        />
      </form>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Category
        </label>
        <SelectDropdown
          value={filters.category || ''}
          onChange={(value) =>
            onFiltersChange({
              ...filters,
              category: value as EventCategory | undefined,
            })
          }
          options={CATEGORIES}
        />
      </div>

      {/* Date Range */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Date
        </label>
        <SelectDropdown
          value={filters.startDateFrom || ''}
          onChange={(value) =>
            onFiltersChange({
              ...filters,
              startDateFrom: value || undefined,
            })
          }
          options={DATE_OPTIONS}
        />
      </div>

      {/* Price Range */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Price Range
        </label>
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Min"
            value={filters.minPrice || ''}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                minPrice: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          />
          <Input
            type="number"
            placeholder="Max"
            value={filters.maxPrice || ''}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                maxPrice: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          />
        </div>
      </div>

      {/* Sort */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Sort By
        </label>
        <SelectDropdown
          value={`${filters.sortBy || 'date'}-${filters.sortOrder || 'asc'}`}
          onChange={(value) => {
            const [sortBy, sortOrder] = value.split('-') as [
              'date' | 'price' | 'popularity',
              'asc' | 'desc'
            ];
            onFiltersChange({ ...filters, sortBy, sortOrder });
          }}
          options={SORT_OPTIONS}
        />
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button variant="ghost" onClick={handleClearFilters} className="w-full">
          Clear All Filters
        </Button>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Filters */}
      <div className={cn('hidden lg:block', className)}>{filterContent}</div>

      {/* Mobile Filter Toggle */}
      {showMobileToggle && (
        <div className="lg:hidden">
          <Button
            variant="outline"
            onClick={() => setMobileFiltersOpen(true)}
            className="w-full"
          >
            <SlidersHorizontal className="w-4 h-4 mr-2" />
            Filters
            {hasActiveFilters && (
              <span className="ml-2 bg-indigo-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                !
              </span>
            )}
          </Button>

          {/* Mobile Filters Modal */}
          {mobileFiltersOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div
                className="absolute inset-0 bg-black/50"
                onClick={() => setMobileFiltersOpen(false)}
              />
              <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-6 max-h-[80vh] overflow-auto">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Filters</h2>
                  <button
                    onClick={() => setMobileFiltersOpen(false)}
                    className="p-2 -m-2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                {filterContent}
                <div className="mt-6">
                  <Button
                    onClick={() => setMobileFiltersOpen(false)}
                    className="w-full"
                  >
                    Apply Filters
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

// Quick filter chips for common filters
export function QuickFilters({
  activeCategory,
  onCategoryChange,
  className,
}: {
  activeCategory?: EventCategory;
  onCategoryChange: (category?: EventCategory) => void;
  className?: string;
}) {
  const quickCategories: (EventCategory | 'ALL')[] = [
    'ALL',
    'MUSIC',
    'SPORTS',
    'COMEDY',
    'THEATER',
    'FESTIVAL',
  ];

  return (
    <div className={cn('flex gap-2 overflow-x-auto pb-2 scrollbar-hide', className)}>
      {quickCategories.map((cat) => (
        <button
          key={cat}
          onClick={() => onCategoryChange(cat === 'ALL' ? undefined : cat)}
          className={cn(
            'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
            (cat === 'ALL' && !activeCategory) || cat === activeCategory
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          )}
        >
          {cat === 'ALL' ? 'All' : cat.charAt(0) + cat.slice(1).toLowerCase()}
        </button>
      ))}
    </div>
  );
}
