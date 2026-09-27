import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { salesService } from '../api/apiCalls';

export function useInfiniteSales() {
  return useInfiniteQuery({
    queryKey: ['sales'],
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
      // Use resetQueries for infinite queries to completely wipe the cached pages and refetch
      queryClient.resetQueries({ queryKey: ['sales'] });
    },
  });
}
