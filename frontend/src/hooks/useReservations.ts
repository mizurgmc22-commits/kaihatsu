/**
 * Reservation hooks with React Query and IndexedDB cache
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reservationApi, type Reservation, type CreateReservationData } from '../lib/api';
import { reservationsCache, isOnline } from '../cache';

// Query keys
export const reservationKeys = {
  all: ['reservations'] as const,
  lists: () => [...reservationKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...reservationKeys.lists(), filters] as const,
  details: () => [...reservationKeys.all, 'detail'] as const,
  detail: (id: string) => [...reservationKeys.details(), id] as const,
  availability: (equipmentId: string, start: string, end: string) => 
    [...reservationKeys.all, 'availability', equipmentId, start, end] as const,
};

// Fetch reservations list with cache fallback
export function useReservationList(params?: {
  equipment_id?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: reservationKeys.list(params || {}),
    queryFn: async () => {
      if (isOnline()) {
        try {
          const response = await reservationApi.list(params);
          if (response.success) {
            // Update cache
            await reservationsCache.setAll(response.data);
            return response;
          }
        } catch (error) {
          console.warn('API failed, falling back to cache:', error);
        }
      }
      
      // Fallback to cache
      const cached = await reservationsCache.getAll();
      if (cached) {
        // Apply filters to cached data
        let filtered = cached;
        if (params?.equipment_id) {
          filtered = filtered.filter(r => r.equipment_id === params.equipment_id);
        }
        if (params?.status) {
          const statuses = params.status.split(',');
          filtered = filtered.filter(r => statuses.includes(r.status));
        }
        if (params?.start_date) {
          filtered = filtered.filter(r => new Date(r.start_time) >= new Date(params.start_date!));
        }
        if (params?.end_date) {
          filtered = filtered.filter(r => new Date(r.end_time) <= new Date(params.end_date!));
        }
        
        return {
          success: true,
          data: filtered,
          pagination: {
            total: filtered.length,
            page: 1,
            limit: filtered.length,
            totalPages: 1,
          },
        };
      }
      
      throw new Error('データを取得できません。ネットワーク接続を確認してください。');
    },
    staleTime: 1 * 60 * 1000, // 1 minute (reservations change more frequently)
  });
}

// Fetch single reservation
export function useReservation(id: string) {
  return useQuery({
    queryKey: reservationKeys.detail(id),
    queryFn: async () => {
      const response = await reservationApi.get(id);
      if (!response.success) {
        throw new Error(response.error || '予約が見つかりません');
      }
      return response.data!;
    },
    enabled: !!id,
  });
}

// Check equipment availability
export function useAvailability(equipmentId: string, startTime: string, endTime: string) {
  return useQuery({
    queryKey: reservationKeys.availability(equipmentId, startTime, endTime),
    queryFn: async () => {
      const response = await reservationApi.checkAvailability(equipmentId, startTime, endTime);
      if (!response.success) {
        throw new Error(response.error || '空き状況を確認できません');
      }
      return response.data!;
    },
    enabled: !!equipmentId && !!startTime && !!endTime,
  });
}

// Create reservation mutation (public)
export function useCreateReservation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateReservationData) => {
      const response = await reservationApi.create(data);
      if (!response.success) {
        throw new Error(response.error || '予約の作成に失敗しました');
      }
      return response.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reservationKeys.lists() });
    },
  });
}

// Update reservation mutation (admin only)
export function useUpdateReservation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Reservation> }) => {
      const response = await reservationApi.update(id, data);
      if (!response.success) {
        throw new Error(response.error || '更新に失敗しました');
      }
      return response.data!;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: reservationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: reservationKeys.detail(id) });
    },
  });
}

// Approve reservation mutation (admin only)
export function useApproveReservation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await reservationApi.approve(id);
      if (!response.success) {
        throw new Error(response.error || '承認に失敗しました');
      }
      return response.data!;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: reservationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: reservationKeys.detail(id) });
    },
  });
}

// Reject reservation mutation (admin only)
export function useRejectReservation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const response = await reservationApi.reject(id, notes);
      if (!response.success) {
        throw new Error(response.error || '却下に失敗しました');
      }
      return response.data!;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: reservationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: reservationKeys.detail(id) });
    },
  });
}

// Cancel reservation mutation
export function useCancelReservation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await reservationApi.cancel(id);
      if (!response.success) {
        throw new Error(response.error || 'キャンセルに失敗しました');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reservationKeys.lists() });
    },
  });
}
