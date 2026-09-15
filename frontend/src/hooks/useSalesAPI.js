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
      // Invalidate the sales query so the UI reflects the empty DB
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
  });
}
