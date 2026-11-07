"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { AlertTriangle, Store, Trash2 } from "lucide-react";

export interface CartItem {
  id: string;
  baseItemId?: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  taxRate?: number;
  foodType?: "veg" | "non_veg" | "egg";
  isVeg?: boolean;
  selectedVariant?: { name: string; price: number } | null;
  selectedVariants?: Record<string, any>;
  selectedAddons?: Array<{ id?: string; name: string; price: number }>;
}

export type DiscoverOrderMode = "dine-in" | "takeaway" | "delivery";

export interface CafeInfo {
  id: string;
  name: string;
  slug: string;
  currency?: string;
}

interface PendingSwitchAction {
  item: CartItem;
  cafe: CafeInfo;
  onSuccess?: () => void;
}

interface CartContextType {
  items: CartItem[];
  cafeId: string | null;
  cafeName: string | null;
  cafeSlug: string | null;
  currency: string;
  orderMode: DiscoverOrderMode;
  setOrderMode: (mode: DiscoverOrderMode) => void;
  addItem: (
    item: CartItem,
    cafe: CafeInfo,
    options?: { onSuccess?: () => void }
  ) => boolean;
  replaceCartAndAdd: (item: CartItem, cafe: CafeInfo) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  subtotal: number;
  itemCount: number;
  promptSwitchCafe: (
    item: CartItem,
    cafe: CafeInfo,
    onSuccess?: () => void
  ) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [cafeId, setCafeId] = useState<string | null>(null);
  const [cafeName, setCafeName] = useState<string | null>(null);
  const [cafeSlug, setCafeSlug] = useState<string | null>(null);
  const [currency, setCurrency] = useState<string>("INR");
  const [orderMode, setOrderModeState] = useState<DiscoverOrderMode>("dine-in");

  // State for the professional "Switch restaurant?" dialog
  const [pendingSwitch, setPendingSwitch] = useState<PendingSwitchAction | null>(null);

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
      setOrderModeState("dine-in");
      localStorage.setItem("cafeflow_ordering_mode", "dine-in");
    } catch {}
  }, []);

  const setOrderMode = (_mode: DiscoverOrderMode) => {
    setOrderModeState("dine-in");
    try {
      localStorage.setItem("cafeflow_ordering_mode", "dine-in");
      sessionStorage.setItem("cafeflow_entry_completed", "true");
    } catch {}
  };

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        "cafeflow_discover_cart",
        JSON.stringify({ items, cafeId, cafeName, cafeSlug, currency, orderMode })
      );
    } catch {}
  }, [items, cafeId, cafeName, cafeSlug, currency, orderMode]);

  const promptSwitchCafe = (
    item: CartItem,
    cafe: CafeInfo,
    onSuccess?: () => void
  ) => {
    setPendingSwitch({ item, cafe, onSuccess });
  };

  const replaceCartAndAdd = (item: CartItem, cafe: CafeInfo) => {
    const newItem: CartItem = { ...item, quantity: item.quantity || 1 };
    setItems([newItem]);
    setCafeId(cafe.id);
    setCafeName(cafe.name);
    setCafeSlug(cafe.slug);
    setCurrency(cafe.currency || "INR");

    // Also persist directly to ensure fresh state across immediate navigations
    try {
      localStorage.setItem(
        "cafeflow_discover_cart",
        JSON.stringify({
          items: [newItem],
          cafeId: cafe.id,
          cafeName: cafe.name,
          cafeSlug: cafe.slug,
          currency: cafe.currency || "INR",
          orderMode
        })
      );
    } catch {}
  };

  const addItem = (
    item: CartItem,
    cafe: CafeInfo,
    options?: { onSuccess?: () => void }
  ): boolean => {
    // If different cafe with existing items, prompt switch modal
    if (cafeId && cafeId !== cafe.id && items.length > 0) {
      promptSwitchCafe(item, cafe, options?.onSuccess);
      return false;
    }

    setCafeId(cafe.id);
    setCafeName(cafe.name);
    setCafeSlug(cafe.slug);
    if (cafe.currency) setCurrency(cafe.currency);

    const sanitizedPrice = Math.max(0, Number(item.price) || 0);
    const sanitizedItem: CartItem = {
      ...item,
      price: sanitizedPrice,
      quantity: Math.max(1, Number(item.quantity) || 1)
    };

    setItems((prev) => {
      let updated: CartItem[];
      const idx = prev.findIndex((i) => i.id === sanitizedItem.id);
      if (idx > -1) {
        updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          quantity: updated[idx].quantity + sanitizedItem.quantity
        };
      } else {
        updated = [...prev, sanitizedItem];
      }

      // Synchronously write to localStorage to guarantee preservation across navigation/refresh
      try {
        localStorage.setItem(
          "cafeflow_discover_cart",
          JSON.stringify({
            items: updated,
            cafeId: cafe.id,
            cafeName: cafe.name,
            cafeSlug: cafe.slug,
            currency: cafe.currency || currency || "INR",
            orderMode
          })
        );
      } catch {}

      return updated;
    });

    if (options?.onSuccess) {
      options.onSuccess();
    }
    return true;
  };

  const handleConfirmSwitch = () => {
    if (!pendingSwitch) return;
    const { item, cafe, onSuccess } = pendingSwitch;
    replaceCartAndAdd(item, cafe);
    setPendingSwitch(null);
    if (onSuccess) {
      onSuccess();
    }
  };

  const handleCancelSwitch = () => {
    setPendingSwitch(null);
  };

  const removeItem = (id: string) => {
    setItems((prev) => {
      const updated = prev.filter((i) => i.id !== id);
      if (updated.length === 0) {
        setCafeId(null);
        setCafeName(null);
        setCafeSlug(null);
      }
      return updated;
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setItems((prev) => {
      const updated = prev
        .map((i) => {
          if (i.id === id) {
            const newQ = i.quantity + delta;
            return newQ > 0 ? { ...i, quantity: newQ } : null;
          }
          return i;
        })
        .filter(Boolean) as CartItem[];

      if (updated.length === 0) {
        setCafeId(null);
        setCafeName(null);
        setCafeSlug(null);
      }
      return updated;
    });
  };

  const clearCart = () => {
    setItems([]);
    setCafeId(null);
    setCafeName(null);
    setCafeSlug(null);
    try {
      localStorage.removeItem("cafeflow_discover_cart");
    } catch {}
  };

  const subtotal = items.reduce((sum, item) => {
    const p = Math.max(0, Number(item.price) || 0);
    const q = Math.max(1, Number(item.quantity) || 1);
    return sum + p * q;
  }, 0);
  const itemCount = items.reduce((count, item) => count + Math.max(1, Number(item.quantity) || 1), 0);

  return (
    <CartContext.Provider
      value={{
        items,
        cafeId,
        cafeName,
        cafeSlug,
        currency,
        orderMode,
        setOrderMode,
        addItem,
        replaceCartAndAdd,
        removeItem,
        updateQuantity,
        clearCart,
        subtotal,
        itemCount,
        promptSwitchCafe
      }}
    >
      {children}

      {/* Switch Restaurant Confirmation Modal */}
      {pendingSwitch && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="switch-cafe-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="w-full max-w-sm bg-white dark:bg-[#15231D] rounded-3xl p-6 border border-[#E9E3D9] dark:border-[#234438] shadow-2xl relative text-[#171A17] dark:text-white space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/60 flex items-center justify-center text-amber-700 dark:text-amber-400 mx-auto shadow-xs">
              <Store className="w-6 h-6 stroke-[2.2]" />
            </div>

            <div className="text-center space-y-2">
              <h2
                id="switch-cafe-title"
                className="text-[18px] font-extrabold tracking-tight text-[#171A17] dark:text-white"
              >
                Switch restaurant?
              </h2>
              <p className="text-[13px] text-[#73716B] dark:text-stone-300 leading-relaxed px-1">
                Your cart contains items from{" "}
                <span className="font-bold text-[#171A17] dark:text-white">
                  {cafeName || "another cafe"}
                </span>
                . To add items from{" "}
                <span className="font-bold text-[#003F30] dark:text-[#34D399]">
                  {pendingSwitch.cafe.name}
                </span>
                , you&apos;ll need to start a new cart.
              </p>
            </div>

            <div className="pt-2 space-y-2.5">
              <button
                type="button"
                onClick={handleConfirmSwitch}
                className="w-full py-3 px-4 rounded-full bg-[#003F30] hover:bg-[#10251E] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98] cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear cart and switch</span>
              </button>

              <button
                type="button"
                onClick={handleCancelSwitch}
                className="w-full py-2.5 px-4 rounded-full bg-stone-100 hover:bg-stone-200 dark:bg-[#1E2E27] dark:hover:bg-[#253930] text-[#171A17] dark:text-stone-200 font-bold text-xs flex items-center justify-center transition-all active:scale-[0.98] cursor-pointer"
              >
                Keep current cart
              </button>
            </div>
          </div>
        </div>
      )}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}
