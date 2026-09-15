import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryService } from '../api/apiCalls';
import { inventoryKeys } from '../lib/queryClient';

/**
 * Custom hooks leveraging TanStack Query for Inventory & Barcode APIs
 */

export function useProducts() {
  return useQuery({
    queryKey: inventoryKeys.products(),
    queryFn: async () => {
      const response = await inventoryService.getProducts();
      return Array.isArray(response) ? response : response.data || [];
    },
  });
}

export function useDraftBatches() {
  return useQuery({
    queryKey: inventoryKeys.draftBatches(),
    queryFn: async () => {
      const response = await inventoryService.getDraftBatches();
      return Array.isArray(response) ? response : response.data || [];
    },
  });
}

export function useGenerateBatch() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (payload) => {
      return await inventoryService.generateBatch(payload);
    },
    onSuccess: () => {
      // Invalidate drafts so the UI instantly shows the new draft batch
      queryClient.invalidateQueries({ queryKey: inventoryKeys.draftBatches() });
    },
  });
}

export function usePrintZpl() {
  return useMutation({
    mutationFn: async (payload) => {
      return await inventoryService.printZpl(payload);
    },
  });
}

export function useCommitBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (batchId) => {
      return await inventoryService.commitBatch(batchId);
    },
    onSuccess: () => {
      // Invalidate both lists since stock moved from Draft -> In-Stock
      queryClient.invalidateQueries({ queryKey: inventoryKeys.draftBatches() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.products() });
    },
  });
}

export function useRevertBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (batchId) => {
      return await inventoryService.revertBatch(batchId);
    },
    onSuccess: () => {
      // Discarding a batch only affects the drafts list
      queryClient.invalidateQueries({ queryKey: inventoryKeys.draftBatches() });
    },
  });
}
