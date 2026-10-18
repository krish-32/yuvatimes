import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 min — data is fresh for this period before a refetch is triggered
      gcTime: 10 * 60 * 1000, // 10 min — unused cache entries are garbage collected after this
      refetchOnWindowFocus: false, // Don't refetch on tab switch
      retry: 2, // Retry failed requests twice (3 total attempts)
    },
  },
});

export const dashboardKeys = {
  all: ["dashboard"],
  stats: () => [...dashboardKeys.all, "stats"],
};

export const inventoryKeys = {
  all: ["inventory"],
  products: (search = '') => [...inventoryKeys.all, "products", search],
  draftBatches: () => [...inventoryKeys.all, "draftBatches"],
};
