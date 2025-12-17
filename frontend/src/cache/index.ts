/**
 * IndexedDB Cache Layer
 * Read-only cache for offline support with React Query integration
 */

import Dexie, { type Table } from 'dexie';
import type { Equipment, EquipmentCategory, Reservation } from '../lib/api';

// Cache database schema
class CacheDB extends Dexie {
  equipment!: Table<Equipment & { cached_at: number }, string>;
  categories!: Table<EquipmentCategory & { cached_at: number }, string>;
  reservations!: Table<Reservation & { cached_at: number }, string>;

  constructor() {
    super('EquipmentBookingCache');
    
    this.version(1).stores({
      equipment: 'id, category_id, status, cached_at',
      categories: 'id, cached_at',
      reservations: 'id, equipment_id, status, start_time, cached_at',
    });
  }
}

export const cacheDb = new CacheDB();

// Cache TTL in milliseconds (1 hour)
const CACHE_TTL = 60 * 60 * 1000;

// Check if cache is stale
function isCacheStale(cachedAt: number): boolean {
  return Date.now() - cachedAt > CACHE_TTL;
}

// Equipment cache operations
export const equipmentCache = {
  async getAll(): Promise<Equipment[] | null> {
    try {
      const items = await cacheDb.equipment.toArray();
      if (items.length === 0) return null;
      
      // Check if any item is stale
      const hasStale = items.some(item => isCacheStale(item.cached_at));
      if (hasStale) return null;
      
      return items.map(({ cached_at, ...item }) => item);
    } catch {
      return null;
    }
  },

  async get(id: string): Promise<Equipment | null> {
    try {
      const item = await cacheDb.equipment.get(id);
      if (!item || isCacheStale(item.cached_at)) return null;
      
      const { cached_at, ...equipment } = item;
      return equipment;
    } catch {
      return null;
    }
  },

  async setAll(items: Equipment[]): Promise<void> {
    try {
      const now = Date.now();
      await cacheDb.equipment.clear();
      await cacheDb.equipment.bulkPut(
        items.map(item => ({ ...item, cached_at: now }))
      );
    } catch (error) {
      console.warn('Failed to cache equipment:', error);
    }
  },

  async set(item: Equipment): Promise<void> {
    try {
      await cacheDb.equipment.put({ ...item, cached_at: Date.now() });
    } catch (error) {
      console.warn('Failed to cache equipment item:', error);
    }
  },

  async clear(): Promise<void> {
    await cacheDb.equipment.clear();
  },
};

// Categories cache operations
export const categoriesCache = {
  async getAll(): Promise<EquipmentCategory[] | null> {
    try {
      const items = await cacheDb.categories.toArray();
      if (items.length === 0) return null;
      
      const hasStale = items.some(item => isCacheStale(item.cached_at));
      if (hasStale) return null;
      
      return items.map(({ cached_at, ...item }) => item);
    } catch {
      return null;
    }
  },

  async setAll(items: EquipmentCategory[]): Promise<void> {
    try {
      const now = Date.now();
      await cacheDb.categories.clear();
      await cacheDb.categories.bulkPut(
        items.map(item => ({ ...item, cached_at: now }))
      );
    } catch (error) {
      console.warn('Failed to cache categories:', error);
    }
  },

  async clear(): Promise<void> {
    await cacheDb.categories.clear();
  },
};

// Reservations cache operations
export const reservationsCache = {
  async getAll(): Promise<Reservation[] | null> {
    try {
      const items = await cacheDb.reservations.toArray();
      if (items.length === 0) return null;
      
      const hasStale = items.some(item => isCacheStale(item.cached_at));
      if (hasStale) return null;
      
      return items.map(({ cached_at, ...item }) => item);
    } catch {
      return null;
    }
  },

  async setAll(items: Reservation[]): Promise<void> {
    try {
      const now = Date.now();
      await cacheDb.reservations.clear();
      await cacheDb.reservations.bulkPut(
        items.map(item => ({ ...item, cached_at: now }))
      );
    } catch (error) {
      console.warn('Failed to cache reservations:', error);
    }
  },

  async clear(): Promise<void> {
    await cacheDb.reservations.clear();
  },
};

// Clear all caches
export async function clearAllCaches(): Promise<void> {
  await Promise.all([
    equipmentCache.clear(),
    categoriesCache.clear(),
    reservationsCache.clear(),
  ]);
}

// Check if online
export function isOnline(): boolean {
  return navigator.onLine;
}
