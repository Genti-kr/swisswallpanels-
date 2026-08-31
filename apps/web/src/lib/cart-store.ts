'use client';

import { create } from 'zustand';
import { CartDTO } from '@swisswall/types';
import { apiFetch } from './api';

interface CartState {
  cart: CartDTO | null;
  loading: boolean;
  fetchCart: () => Promise<void>;
  addItem: (productId: string, quantity?: number, variantId?: string) => Promise<void>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  mergeCart: () => Promise<void>;
}

export const useCart = create<CartState>((set) => ({
  cart: null,
  loading: false,

  fetchCart: async () => {
    set({ loading: true });
    try {
      const res = await apiFetch<{ cart: CartDTO }>('/api/cart');
      set({ cart: res.cart });
    } finally {
      set({ loading: false });
    }
  },

  addItem: async (productId, quantity = 1, variantId) => {
    set({ loading: true });
    try {
      const res = await apiFetch<{ cart: CartDTO }>('/api/cart/items', {
        method: 'POST',
        body: JSON.stringify({ productId, quantity, variantId }),
      });
      set({ cart: res.cart });
    } finally {
      set({ loading: false });
    }
  },

  updateItem: async (itemId, quantity) => {
    set({ loading: true });
    try {
      const res = await apiFetch<{ cart: CartDTO }>(`/api/cart/items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity }),
      });
      set({ cart: res.cart });
    } finally {
      set({ loading: false });
    }
  },

  removeItem: async (itemId) => {
    set({ loading: true });
    try {
      const res = await apiFetch<{ cart: CartDTO }>(`/api/cart/items/${itemId}`, {
        method: 'DELETE',
      });
      set({ cart: res.cart });
    } finally {
      set({ loading: false });
    }
  },

  mergeCart: async () => {
    try {
      const res = await apiFetch<{ cart: CartDTO }>('/api/cart/merge', { method: 'POST' });
      set({ cart: res.cart });
    } catch {
      // ignore if not logged in
    }
  },
}));
