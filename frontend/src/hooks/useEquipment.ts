/**
 * Equipment hooks with React Query and IndexedDB cache
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { equipmentApi, type Equipment, type EquipmentCategory } from '../lib/api';
import { equipmentCache, categoriesCache, isOnline } from '../cache';

// Query keys
export const equipmentKeys = {
  all: ['equipment'] as const,
  lists: () => [...equipmentKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...equipmentKeys.lists(), filters] as const,
  details: () => [...equipmentKeys.all, 'detail'] as const,
  detail: (id: string) => [...equipmentKeys.details(), id] as const,
  categories: () => [...equipmentKeys.all, 'categories'] as const,
};

// Fetch equipment list with cache fallback
export function useEquipmentList(params?: { category_id?: string; include_inactive?: boolean }) {
  return useQuery({
    queryKey: equipmentKeys.list(params || {}),
    queryFn: async () => {
      // Try API first if online
      if (isOnline()) {
        try {
          const response = await equipmentApi.list(params);
          if (response.success && response.data) {
            // Update cache
            await equipmentCache.setAll(response.data);
            return response.data;
          }
        } catch (error) {
          console.warn('API failed, falling back to cache:', error);
        }
      }
      
      // Fallback to cache
      const cached = await equipmentCache.getAll();
      if (cached) {
        // Apply filters to cached data
        let filtered = cached;
        if (params?.category_id) {
          filtered = filtered.filter(e => e.category_id === params.category_id);
        }
        if (!params?.include_inactive) {
          filtered = filtered.filter(e => e.status === 'active');
        }
        return filtered;
      }
      
      throw new Error('データを取得できません。ネットワーク接続を確認してください。');
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Fetch single equipment
export function useEquipment(id: string) {
  return useQuery({
    queryKey: equipmentKeys.detail(id),
    queryFn: async () => {
      if (isOnline()) {
        try {
          const response = await equipmentApi.get(id);
          if (response.success && response.data) {
            await equipmentCache.set(response.data);
            return response.data;
          }
        } catch (error) {
          console.warn('API failed, falling back to cache:', error);
        }
      }
      
      const cached = await equipmentCache.get(id);
      if (cached) return cached;
      
      throw new Error('資機材が見つかりません');
    },
    enabled: !!id,
  });
}

// Fetch categories with cache fallback
export function useCategories() {
  return useQuery({
    queryKey: equipmentKeys.categories(),
    queryFn: async () => {
      if (isOnline()) {
        try {
          const response = await equipmentApi.getCategories();
          if (response.success && response.data) {
            await categoriesCache.setAll(response.data);
            return response.data;
          }
        } catch (error) {
          console.warn('API failed, falling back to cache:', error);
        }
      }
      
      const cached = await categoriesCache.getAll();
      if (cached) return cached;
      
      throw new Error('カテゴリを取得できません');
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

// Create equipment mutation (admin only)
export function useCreateEquipment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Partial<Equipment>) => {
      const response = await equipmentApi.create(data);
      if (!response.success) {
        throw new Error(response.error || '作成に失敗しました');
      }
      return response.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: equipmentKeys.lists() });
    },
  });
}

// Update equipment mutation (admin only)
export function useUpdateEquipment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Equipment> }) => {
      const response = await equipmentApi.update(id, data);
      if (!response.success) {
        throw new Error(response.error || '更新に失敗しました');
      }
      return response.data!;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: equipmentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: equipmentKeys.detail(id) });
    },
  });
}

// Delete equipment mutation (admin only)
export function useDeleteEquipment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await equipmentApi.delete(id);
      if (!response.success) {
        throw new Error(response.error || '削除に失敗しました');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: equipmentKeys.lists() });
    },
  });
}

// Create category mutation (admin only)
export function useCreateCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { name: string; description?: string; sort_order?: number }) => {
      const response = await equipmentApi.createCategory(data);
      if (!response.success) {
        throw new Error(response.error || '作成に失敗しました');
      }
      return response.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: equipmentKeys.categories() });
    },
  });
}
