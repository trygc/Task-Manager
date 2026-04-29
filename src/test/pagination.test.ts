import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePagination, useServerPagination } from '../hooks/usePagination';

describe('usePagination', () => {
  const mockData = Array.from({ length: 25 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }));

  it('should initialize with correct default values', () => {
    const { result } = renderHook(() => usePagination(mockData));

    expect(result.current.currentPage).toBe(1);
    expect(result.current.pageSize).toBe(10);
    expect(result.current.totalItems).toBe(25);
    expect(result.current.totalPages).toBe(3);
    expect(result.current.paginatedData).toHaveLength(10);
    expect(result.current.hasNextPage).toBe(true);
    expect(result.current.hasPreviousPage).toBe(false);
  });

  it('should navigate to next page correctly', () => {
    const { result } = renderHook(() => usePagination(mockData));

    act(() => {
      result.current.nextPage();
    });

    expect(result.current.currentPage).toBe(2);
    expect(result.current.paginatedData).toHaveLength(10);
    expect(result.current.hasNextPage).toBe(true);
    expect(result.current.hasPreviousPage).toBe(true);
  });

  it('should navigate to previous page correctly', () => {
    const { result } = renderHook(() => usePagination(mockData, { initialPage: 2 }));

    act(() => {
      result.current.previousPage();
    });

    expect(result.current.currentPage).toBe(1);
    expect(result.current.hasPreviousPage).toBe(false);
  });

  it('should go to specific page correctly', () => {
    const { result } = renderHook(() => usePagination(mockData));

    act(() => {
      result.current.goToPage(3);
    });

    expect(result.current.currentPage).toBe(3);
    expect(result.current.paginatedData).toHaveLength(5); // Last page has 5 items
    expect(result.current.hasNextPage).toBe(false);
  });

  it('should handle page size changes', () => {
    const { result } = renderHook(() => usePagination(mockData));

    act(() => {
      result.current.setPageSize(5);
    });

    expect(result.current.pageSize).toBe(5);
    expect(result.current.totalPages).toBe(5);
    expect(result.current.currentPage).toBe(1); // Should reset to page 1
    expect(result.current.paginatedData).toHaveLength(5);
  });

  it('should clamp page numbers to valid range', () => {
    const { result } = renderHook(() => usePagination(mockData));

    act(() => {
      result.current.goToPage(-1);
    });
    expect(result.current.currentPage).toBe(1);

    act(() => {
      result.current.goToPage(999);
    });
    expect(result.current.currentPage).toBe(3); // Max page
  });

  it('should not navigate beyond boundaries', () => {
    const { result } = renderHook(() => usePagination(mockData, { initialPage: 3 }));

    act(() => {
      result.current.nextPage();
    });
    expect(result.current.currentPage).toBe(3); // Should stay on last page

    const { result: result2 } = renderHook(() => usePagination(mockData, { initialPage: 1 }));

    act(() => {
      result2.current.previousPage();
    });
    expect(result2.current.currentPage).toBe(1); // Should stay on first page
  });
});

describe('useServerPagination', () => {
  it('should initialize with correct default values', () => {
    const { result } = renderHook(() => useServerPagination(100));

    expect(result.current.currentPage).toBe(1);
    expect(result.current.pageSize).toBe(10);
    expect(result.current.hasNextPage).toBe(true);
    expect(result.current.hasPreviousPage).toBe(false);
  });

  it('should call onPageChange when navigating', () => {
    let lastCall: { page: number; pageSize: number } | null = null;
    const onPageChange = (page: number, pageSize: number) => {
      lastCall = { page, pageSize };
    };

    const { result } = renderHook(() => 
      useServerPagination(100, { onPageChange })
    );

    act(() => {
      result.current.nextPage();
    });

    expect(lastCall).toEqual({ page: 2, pageSize: 10 });
  });

  it('should handle page size changes with callback', () => {
    let lastCall: { page: number; pageSize: number } | null = null;
    const onPageChange = (page: number, pageSize: number) => {
      lastCall = { page, pageSize };
    };

    const { result } = renderHook(() => 
      useServerPagination(100, { onPageChange })
    );

    act(() => {
      result.current.setPageSize(20);
    });

    expect(result.current.pageSize).toBe(20);
    expect(result.current.currentPage).toBe(1);
    expect(lastCall).toEqual({ page: 1, pageSize: 20 });
  });
});