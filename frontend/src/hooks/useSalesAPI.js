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
    onSuccess: () => {
      // Invalidate all affected caches in parallel
      Promise.all([
        queryClient.resetQueries({ queryKey: ["sales"] }),
        queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
        queryClient.invalidateQueries({ queryKey: inventoryKeys.all }),
      ]);
    },
  });
}
