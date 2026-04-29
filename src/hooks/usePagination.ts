import { useMemo, useState } from 'react';

export interface PaginationOptions {
  pageSize?: number;
  initialPage?: number;
}

export interface PaginationResult<T> {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  paginatedData: T[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  setPageSize: (size: number) => void;
}

export function usePagination<T>(
  data: T[],
  options: PaginationOptions = {}
): PaginationResult<T> {
  const { pageSize: initialPageSize = 10, initialPage = 1 } = options;
  
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  const paginationData = useMemo(() => {
    const totalItems = data.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedData = data.slice(startIndex, endIndex);

    return {
      totalItems,
      totalPages,
      paginatedData,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
    };
  }, [data, currentPage, pageSize]);

  const goToPage = (page: number) => {
    const clampedPage = Math.max(1, Math.min(page, paginationData.totalPages));
    setCurrentPage(clampedPage);
  };

  const nextPage = () => {
    if (paginationData.hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const previousPage = () => {
    if (paginationData.hasPreviousPage) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const setPageSize = (size: number) => {
    setPageSizeState(size);
    // Reset to first page when changing page size
    setCurrentPage(1);
  };

  return {
    currentPage,
    totalPages: paginationData.totalPages,
    pageSize,
    totalItems: paginationData.totalItems,
    paginatedData: paginationData.paginatedData,
    hasNextPage: paginationData.hasNextPage,
    hasPreviousPage: paginationData.hasPreviousPage,
    goToPage,
    nextPage,
    previousPage,
    setPageSize,
  };
}

// Hook for server-side pagination
export interface ServerPaginationOptions {
  pageSize?: number;
  initialPage?: number;
  onPageChange?: (page: number, pageSize: number) => void;
}

export interface ServerPaginationResult {
  currentPage: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  setPageSize: (size: number) => void;
}

export function useServerPagination(
  totalItems: number,
  options: ServerPaginationOptions = {}
): ServerPaginationResult {
  const { pageSize: initialPageSize = 10, initialPage = 1, onPageChange } = options;
  
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  const totalPages = Math.ceil(totalItems / pageSize);
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  const goToPage = (page: number) => {
    const clampedPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(clampedPage);
    onPageChange?.(clampedPage, pageSize);
  };

  const nextPage = () => {
    if (hasNextPage) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      onPageChange?.(newPage, pageSize);
    }
  };

  const previousPage = () => {
    if (hasPreviousPage) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      onPageChange?.(newPage, pageSize);
    }
  };

  const setPageSize = (size: number) => {
    setPageSizeState(size);
    setCurrentPage(1);
    onPageChange?.(1, size);
  };

  return {
    currentPage,
    pageSize,
    hasNextPage,
    hasPreviousPage,
    goToPage,
    nextPage,
    previousPage,
    setPageSize,
  };
}