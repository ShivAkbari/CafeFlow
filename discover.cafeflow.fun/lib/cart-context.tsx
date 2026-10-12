"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  selectedVariant?: { name: string; price: number } | null;
  selectedAddons?: Array<{ name: string; price: number }>;
}

interface CartContextType {
  items: CartItem[];
  cafeId: string | null;
  cafeName: string | null;
  cafeSlug: string | null;
  currency: string;
  addItem: (item: CartItem, cafe: { id: string; name: string; slug: string; currency?: string }) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  subtotal: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [cafeId, setCafeId] = useState<string | null>(null);
  const [cafeName, setCafeName] = useState<string | null>(null);
  const [cafeSlug, setCafeSlug] = useState<string | null>(null);
  const [currency, setCurrency] = useState<string>("INR");

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("cafeflow_discover_cart");
      if (saved) {
        const parsed = JSON.parse(saved);
        setItems(parsed.items || []);
        setCafeId(parsed.cafeId || null);
        setCafeName(parsed.cafeName || null);
        setCafeSlug(parsed.cafeSlug || null);
        setCurrency(parsed.currency || "INR");
      }
    } catch {}
  }, []);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        "cafeflow_discover_cart",
        JSON.stringify({ items, cafeId, cafeName, cafeSlug, currency })
      );
    } catch {}
  }, [items, cafeId, cafeName, cafeSlug, currency]);

  const addItem = (item: CartItem, cafe: { id: string; name: string; slug: string; currency?: string }) => {
    // If different cafe, ask or replace
    if (cafeId && cafeId !== cafe.id && items.length > 0) {
      if (!confirm(`Your cart contains items from ${cafeName}. Clear cart and add from ${cafe.name}?`)) {
        return;
      }
      setItems([{ ...item, quantity: item.quantity || 1 }]);
      setCafeId(cafe.id);
      setCafeName(cafe.name);
      setCafeSlug(cafe.slug);
      setCurrency(cafe.currency || "INR");
      return;
    }

    setCafeId(cafe.id);
    setCafeName(cafe.name);
    setCafeSlug(cafe.slug);
    if (cafe.currency) setCurrency(cafe.currency);

    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === item.id);
      if (idx > -1) {
        const copy = [...prev];
        copy[idx].quantity += item.quantity || 1;
        return copy;
      }
      return [...prev, { ...item, quantity: item.quantity || 1 }];
    });
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((i) => {
          if (i.id === id) {
            const newQ = i.quantity + delta;
            return newQ > 0 ? { ...i, quantity: newQ } : null;
          }
          return i;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const clearCart = () => {
    setItems([]);
    setCafeId(null);
    setCafeName(null);
    setCafeSlug(null);
  };

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = items.reduce((count, item) => count + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        cafeId,
        cafeName,
        cafeSlug,
        currency,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        subtotal,
        itemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}
