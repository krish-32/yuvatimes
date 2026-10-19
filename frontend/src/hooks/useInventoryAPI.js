import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dashboardService, inventoryService } from "../api/apiCalls";
import { dashboardKeys, inventoryKeys } from "../lib/queryClient";

/** Helper: invalidate both inventory and dashboard caches */
const invalidateAll = (queryClient) => {
  queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
  queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
};

/**
 * Custom hooks leveraging TanStack Query for Inventory & Barcode APIs
 */

export function useDashboardStats() {
  return useQuery({
    queryKey: dashboardKeys.stats(),
    queryFn: async () => {
      const response = await dashboardService.getStats();
      return response.data || response;
    },
  });
}

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
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      return await inventoryService.deleteProduct(id);
    },
    onSuccess: () => invalidateAll(queryClient),
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
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function useRevertBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (batchId) => {
      return await inventoryService.revertBatch(batchId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.draftBatches() });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });
}
