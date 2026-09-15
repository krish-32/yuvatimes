import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // Data is fresh for 5 minutes
      gcTime: 1000 * 60 * 30, // Data remains in cache for 30 minutes
      refetchOnWindowFocus: false, // Don't refetch on tab switch unless stale
      retry: 1, // Only retry failed requests once
    },
  },
});

export const inventoryKeys = {
  all: ['inventory'],
  products: () => [...inventoryKeys.all, 'products'],
  draftBatches: () => [...inventoryKeys.all, 'draftBatches'],
};
