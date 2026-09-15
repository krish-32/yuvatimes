import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity, // Data remains fresh until hard reload
      gcTime: Infinity, // Data is never garbage collected from memory
      refetchOnWindowFocus: false, // Don't refetch on tab switch unless stale
      retry: 3, // Only retry failed requests once
    },
  },
});

export const inventoryKeys = {
  all: ["inventory"],
  products: () => [...inventoryKeys.all, "products"],
  draftBatches: () => [...inventoryKeys.all, "draftBatches"],
};
