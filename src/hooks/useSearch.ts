import { useMemo, useState } from 'react';
import { useDebounce } from './useDebounce';

export interface SearchOptions<T> {
  searchFields: (keyof T)[];
  filterFn?: (item: T, filters: Record<string, any>) => boolean;
  sortFn?: (a: T, b: T) => number;
  debounceMs?: number;
}

export interface SearchResult<T> {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filters: Record<string, any>;
  setFilters: (filters: Record<string, any>) => void;
  setFilter: (key: string, value: any) => void;
  clearFilters: () => void;
  filteredData: T[];
  totalCount: number;
  hasActiveFilters: boolean;
}

export function useSearch<T extends Record<string, any>>(
  data: T[],
  options: SearchOptions<T>
): SearchResult<T> {
  const { searchFields, filterFn, sortFn, debounceMs = 300 } = options;
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, any>>({});
  
  const debouncedSearchTerm = useDebounce(searchTerm, debounceMs);
  
  const filteredData = useMemo(() => {
    let result = [...data];
    
    // Apply text search
    if (debouncedSearchTerm.trim()) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      result = result.filter(item =>
        searchFields.some(field => {
          const value = item[field];
          if (value == null) return false;
          return String(value).toLowerCase().includes(searchLower);
        })
      );
    }
    
    // Apply custom filters
    if (filterFn && Object.keys(filters).length > 0) {
      result = result.filter(item => filterFn(item, filters));
    }
    
    // Apply sorting
    if (sortFn) {
      result.sort(sortFn);
    }
    
    return result;
  }, [data, debouncedSearchTerm, filters, searchFields, filterFn, sortFn]);
  
  const setFilter = (key: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };
  
  const clearFilters = () => {
    setFilters({});
    setSearchTerm('');
  };
  
  const hasActiveFilters = debouncedSearchTerm.trim() !== '' || Object.keys(filters).length > 0;
  
  return {
    searchTerm,
    setSearchTerm,
    filters,
    setFilters,
    setFilter,
    clearFilters,
    filteredData,
    totalCount: data.length,
    hasActiveFilters,
  };
}

// Predefined filter functions for common use cases
export const commonFilters = {
  // Status filter
  byStatus: <T extends { status: string }>(item: T, filters: { status?: string }) => {
    if (!filters.status) return true;
    return item.status === filters.status;
  },
  
  // Priority filter
  byPriority: <T extends { priority: string }>(item: T, filters: { priority?: string }) => {
    if (!filters.priority) return true;
    return item.priority === filters.priority;
  },
  
  // Date range filter
  byDateRange: <T extends { createdAt: string }>(
    item: T, 
    filters: { startDate?: string; endDate?: string }
  ) => {
    const itemDate = new Date(item.createdAt);
    
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      if (itemDate < startDate) return false;
    }
    
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      if (itemDate > endDate) return false;
    }
    
    return true;
  },
  
  // Assigned user filter
  byAssignedUser: <T extends { assignedTo?: string }>(
    item: T, 
    filters: { assignedTo?: string }
  ) => {
    if (!filters.assignedTo) return true;
    return item.assignedTo === filters.assignedTo;
  },
  
  // Team filter
  byTeam: <T extends { teamId?: string }>(item: T, filters: { teamId?: string }) => {
    if (!filters.teamId) return true;
    return item.teamId === filters.teamId;
  },
  
  // Campaign filter
  byCampaign: <T extends { campaign?: string }>(item: T, filters: { campaign?: string }) => {
    if (!filters.campaign) return true;
    return item.campaign === filters.campaign;
  },
};

// Predefined sort functions
export const commonSorts = {
  // Sort by date (newest first)
  byDateDesc: <T extends { createdAt: string }>(a: T, b: T) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  },
  
  // Sort by date (oldest first)
  byDateAsc: <T extends { createdAt: string }>(a: T, b: T) => {
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  },
  
  // Sort by priority (Critical > High > Medium > Low)
  byPriority: <T extends { priority: string }>(a: T, b: T) => {
    const priorityOrder = { Critical: 4, High: 3, Medium: 2, Low: 1 };
    const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
    const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
    return bPriority - aPriority;
  },
  
  // Sort by status (custom order)
  byStatus: <T extends { status: string }>(a: T, b: T) => {
    const statusOrder = { 'In Progress': 4, Pending: 3, Blocked: 2, Done: 1 };
    const aStatus = statusOrder[a.status as keyof typeof statusOrder] || 0;
    const bStatus = statusOrder[b.status as keyof typeof statusOrder] || 0;
    return bStatus - aStatus;
  },
  
  // Sort alphabetically by name/title
  byName: <T extends { name?: string; title?: string }>(a: T, b: T) => {
    const aName = (a.name || a.title || '').toLowerCase();
    const bName = (b.name || b.title || '').toLowerCase();
    return aName.localeCompare(bName);
  },
};