import { createContext, useContext, useState, ReactNode, useMemo } from "react";
import type { Equipment } from "../types/equipment";

export interface CartItem extends Equipment {
  selectedQuantity: number;
}

interface ReservationCartContextType {
  items: CartItem[];
  addItem: (equipment: Equipment, quantity?: number) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  hasItem: (id: string) => boolean;
  getItem: (id: string) => CartItem | undefined;
  totalItems: number;
}

const ReservationCartContext = createContext<
  ReservationCartContextType | undefined
>(undefined);

export function ReservationCartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = (equipment: Equipment, quantity: number = 1) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.id === equipment.id);
      if (existing) {
        return prev.map((item) =>
          item.id === equipment.id
            ? { ...item, selectedQuantity: item.selectedQuantity + quantity }
            : item,
        );
      }
      return [...prev, { ...equipment, selectedQuantity: quantity }];
    });
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, selectedQuantity: quantity } : item,
      ),
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const hasItem = (id: string) => {
    return items.some((item) => item.id === id);
  };

  const getItem = (id: string) => {
    return items.find((item) => item.id === id);
  };

  const totalItems = useMemo(() => items.length, [items]);

  return (
    <ReservationCartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        hasItem,
        getItem,
        totalItems,
      }}
    >
      {children}
    </ReservationCartContext.Provider>
  );
}

export function useReservationCart() {
  const context = useContext(ReservationCartContext);
  if (context === undefined) {
    throw new Error(
      "useReservationCart must be used within a ReservationCartProvider",
    );
  }
  return context;
}
