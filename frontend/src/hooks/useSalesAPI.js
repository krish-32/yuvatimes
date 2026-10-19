import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { salesService } from "../api/apiCalls";
import { dashboardKeys, inventoryKeys } from "../lib/queryClient";

export function useInfiniteSales() {
  return useInfiniteQuery({
    queryKey: ["sales"],
    queryFn: ({ pageParam = 0 }) => salesService.getSales(50, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (lastPage.hasNextPage) {
        return lastPage.nextOffset;
      }
      return undefined; // Stop fetching
    },
  });
}

export function useExportAndPurgeSales() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => salesService.exportAndPurgeSales(),
    onSuccess: async () => {
      // Wipe cached sales pages and refetch
      await queryClient.resetQueries({ queryKey: ["sales"] });
      // Purging sales affects dashboard stats and inventory availability
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
    },
  });
}
