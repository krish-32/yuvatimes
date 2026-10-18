import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { inventoryService } from "../api/apiCalls";
import { inventoryKeys } from "../lib/queryClient";

/**
 * Custom hooks leveraging TanStack Query for Inventory & Barcode APIs
 */

export function useProducts(search = '') {
  return useQuery({
    queryKey: inventoryKeys.products(search),
    queryFn: async () => {
      const response = await inventoryService.getProducts(search);
      return Array.isArray(response) ? response : response.data || [];
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }) => {
      return await inventoryService.updateProduct(id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      return await inventoryService.deleteProduct(id);
    },
    onSuccess: () => {
      // Invalidate all inventory queries (products + drafts) since barcodes were cascaded
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
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
      // Invalidate all inventory queries (products with any filter + drafts)
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
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
