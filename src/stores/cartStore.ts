import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PaymentMethod, TicketTier, Event } from '@/types';

export interface CartItem {
  id: string;
  eventId: string;
  event: Pick<Event, 'id' | 'name' | 'startDate' | 'venueName' | 'city' | 'coverImageUrl'>;
  tierId: string;
  tier: Pick<TicketTier, 'id' | 'name' | 'priceUsd'>;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  selectedPaymentMethod: PaymentMethod;

  // Actions
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  clear: () => void;

  // Computed
  getTotalItems: () => number;
  getTotalPrice: () => number;
  getItemsByEvent: (eventId: string) => CartItem[];
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      selectedPaymentMethod: 'CREDIT_CARD',

      addItem: (item) => {
        const id = `${item.eventId}-${item.tierId}`;
        const existingItem = get().items.find((i) => i.id === id);

        if (existingItem) {
          set({
            items: get().items.map((i) =>
              i.id === id
                ? { ...i, quantity: i.quantity + item.quantity }
                : i
            ),
          });
        } else {
          set({
            items: [...get().items, { ...item, id }],
          });
        }
      },

      removeItem: (id) => {
        set({
          items: get().items.filter((i) => i.id !== id),
        });
      },

      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id);
          return;
        }

        set({
          items: get().items.map((i) =>
            i.id === id ? { ...i, quantity } : i
          ),
        });
      },

      setPaymentMethod: (method) => {
        set({ selectedPaymentMethod: method });
      },

      clear: () => {
        set({ items: [] });
      },

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },

      getTotalPrice: () => {
        return get().items.reduce(
          (total, item) => total + item.tier.priceUsd * item.quantity,
          0
        );
      },

      getItemsByEvent: (eventId) => {
        return get().items.filter((item) => item.eventId === eventId);
      },
    }),
    {
      name: 'trueticket-cart',
    }
  )
);
