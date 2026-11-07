"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCart, DiscoverOrderMode } from "@/lib/cart-context";
import dynamic from "next/dynamic";
import { GoogleAuthModal } from "@/components/google-login-modal";
import { resolveCafeCustomerFee } from "@/lib/country-fees";

const MapLocationSelectorModal = dynamic(
  () => import("@/components/map-location-selector-modal").then((mod) => mod.MapLocationSelectorModal),
  { ssr: false }
);
import { FoodTypeBadge } from "@/components/ui/food-type-badge";
import { SmartEmailInput } from "@/components/ui/smart-email-input";
import QRCode from "qrcode";
import {
  ArrowLeft,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ShoppingBag,
  Tag,
  CreditCard,
  Banknote,
  CheckCircle2,
  Check,
  ShieldCheck,
  AlertCircle,
  Wallet,
  X,
  MapPin,
  Truck,
  UtensilsCrossed,
  Package,
  Navigation,
  Loader2,
  QrCode,
  ExternalLink
} from "lucide-react";

export default function CartPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F7F5EC] dark:bg-[#001F19] flex items-center justify-center p-4">
        <div className="w-full max-w-[430px] md:max-w-2xl space-y-4 animate-pulse">
          <div className="h-12 bg-white dark:bg-[#002D23] rounded-full border border-[#DDE3DD]" />
          <div className="h-32 bg-white dark:bg-[#002D23] rounded-2xl border border-[#DDE3DD]" />
          <div className="h-40 bg-white dark:bg-[#002D23] rounded-2xl border border-[#DDE3DD]" />
        </div>
      </div>
    }>
      <CartPageContent />
    </Suspense>
  );
}

interface DeliveryAddress {
  id: string;
  label: string;
  recipientName: string;
  contactNumber: string;
  formattedAddress: string;
  houseFlat?: string;
  buildingName?: string;
  landmark?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  latitude: number;
  longitude: number;
  isDefault?: boolean;
}

interface DeliveryQuoteData {
  quoteId: string;
  courierName: string;
  estimatedDeliveryMinutes: number;
  providerFare: number; // in rupees
  markup: number;       // ₹5
  customerDeliveryFee: number; // in rupees (providerFare + ₹5)
  distanceKm: number;
  distanceSource?: "route" | "straight-line";
  diagnostics?: any;
}


function CartPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    items,
    cafeName,
    cafeSlug,
    cafeId,
    currency,
    updateQuantity,
    removeItem,
    clearCart,
    subtotal,
    orderMode,
    setOrderMode
  } = useCart();

  const [orderType, setOrderType] = useState<DiscoverOrderMode>(orderMode || "dine-in");
  const [tableNumber, setTableNumber] = useState("");
  const [verifiedTable, setVerifiedTable] = useState<{ id: string; name: string } | null>(null);
  const [customerUser, setCustomerUser] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "cash" | null>(null);
  const [cafeUpiId, setCafeUpiId] = useState<string>("");
  const [cafeFlowFeeMode, setCafeFlowFeeMode] = useState<"customer" | "cafe">("customer");
  const [upiModalOpen, setUpiModalOpen] = useState(false);
  const [upiOrderData, setUpiOrderData] = useState<any>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  const [promoError, setPromoError] = useState("");
  const [availablePromotions, setAvailablePromotions] = useState<any[]>([]);
  const [showCouponSelector, setShowCouponSelector] = useState(false);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [pendingOrder, setPendingOrder] = useState<any>(null);
  const [showCheckoutFields, setShowCheckoutFields] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<"cart" | "checkout">("cart");

  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [useWallet, setUseWallet] = useState<boolean>(true);

  // Delivery specific state
  const [savedAddresses, setSavedAddresses] = useState<DeliveryAddress[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<DeliveryAddress | null>(null);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [showAddAddressModal, setShowAddAddressModal] = useState(false);
  
  // New address form state
  const [newAddrLabel, setNewAddrLabel] = useState<"Home" | "Work" | "Other">("Home");
  const [newAddrRecipient, setNewAddrRecipient] = useState("");
  const [newAddrPhone, setNewAddrPhone] = useState("");
  const [newAddrFlat, setNewAddrFlat] = useState("");
  const [newAddrBuilding, setNewAddrBuilding] = useState("");
  const [newAddrLandmark, setNewAddrLandmark] = useState("");
  const [newAddrPostal, setNewAddrPostal] = useState("");
  const [newAddrAddress, setNewAddrAddress] = useState("");
  const [newAddrLat, setNewAddrLat] = useState<number | null>(null);
  const [newAddrLng, setNewAddrLng] = useState<number | null>(null);
  const [locatingGps, setLocatingGps] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [showMapSelector, setShowMapSelector] = useState(false);

  // Quote State
  const [deliveryQuote, setDeliveryQuote] = useState<DeliveryQuoteData | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState("");

  // Sync mode changes with context
  const handleModeChange = (mode: DiscoverOrderMode) => {
    setOrderType(mode);
    setOrderMode(mode);
    setOrderError("");
  };

  // 1. User Profile check & Initial load
  useEffect(() => {
    fetch("/api/user/profile")
      .then((res) => res.json())
      .then((res) => {
        if (res.user) {
          setCustomerUser(res.user);
          if (res.user.name) setCustomerName(res.user.name);
          if (res.user.phone) setCustomerPhone(res.user.phone);
          if (res.user.email) setCustomerEmail(res.user.email);
        }
      })
      .catch(() => {});

    // Wallet balance check
    fetch(`/api/wallet?cafeId=${encodeURIComponent(cafeId || "__global__")}`)
      .then((res) => res.json())
      .then((res) => {
        if (res.authenticated && typeof res.balance === "number") {
          setWalletBalance(res.balance);
        }
      })
      .catch(() => {});

    // Table Session check from query param ?table= or session cookie
    const tableParam = searchParams.get("table");
    if (tableParam && cafeSlug) {
      fetch("/api/table-session/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cafeSlug,
          tableToken: tableParam
        })
      })
        .then((res) => res.json())
        .then((res) => {
          if (res.verified && res.table) {
            setVerifiedTable(res.table);
            setTableNumber(res.table.id);
            setOrderType("dine-in");
            setOrderMode("dine-in");
          }
        })
        .catch(() => {});
    } else {
      setVerifiedTable(null);
    }

    // Fetch real promotions and cafe settings (including UPI ID) for this cafe
    if (cafeSlug) {
      fetch(`/api/cafes/${cafeSlug}`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data.promotions)) {
            setAvailablePromotions(data.promotions);
          }
          if (data.cafe?.upiId) {
            setCafeUpiId(data.cafe.upiId);
          }
          if (data.cafe?.cafeFlowFeeMode) {
            setCafeFlowFeeMode(data.cafe.cafeFlowFeeMode === "cafe" ? "cafe" : "customer");
          }
        })
        .catch(() => {});
    }

    // Ordering mode preference fallback
    try {
      const mode = localStorage.getItem("cafeflow_ordering_mode") as DiscoverOrderMode;
      if ((mode === "dine-in" || mode === "takeaway" || mode === "delivery") && !searchParams.get("table")) {
        setOrderType(mode);
      }
    } catch {}
  }, [cafeId, cafeSlug, searchParams, setOrderMode]);

  // Load user saved addresses
  const loadAddresses = async () => {
    setLoadingAddresses(true);
    try {
      const res = await fetch("/api/user/addresses");
      const data = await res.json();
      if (data.authenticated && Array.isArray(data.addresses)) {
        setSavedAddresses(data.addresses);
        if (data.addresses.length > 0 && !selectedAddress) {
          const defaultAddr = data.addresses.find((a: DeliveryAddress) => a.isDefault) || data.addresses[0];
          setSelectedAddress(defaultAddr);
        }
      }
    } catch (err) {
      console.error("Failed to load addresses", err);
    } finally {
      setLoadingAddresses(false);
    }
  };

  useEffect(() => {
    if (customerUser) {
      loadAddresses();
    }
  }, [customerUser]);

  // Enforce UPI (online) payment for delivery
  useEffect(() => {
    if (orderType === "delivery") {
      setPaymentMethod("upi");
    }
  }, [orderType]);

  // Recalculate Shiprocket delivery quote when address or cafe changes
  const fetchDeliveryQuote = async (addr: DeliveryAddress) => {
    if (!cafeId || !addr) return;
    setQuoteLoading(true);
    setQuoteError("");
    setDeliveryQuote(null);

    try {
      const res = await fetch("/api/delivery/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cafeId,
          addressId: addr.id,
          customerLat: addr.latitude,
          customerLng: addr.longitude,
          customerAddress: addr.formattedAddress,
          recipientName: addr.recipientName || customerName,
          recipientPhone: addr.contactNumber || customerPhone,
          orderValue: subtotal
        })
      });

      const data = await res.json();

      if (!res.ok || data.error || typeof data.customerDeliveryFee !== "number") {
        setQuoteError(data.error || "Delivery is currently unavailable to this location.");

        setDeliveryQuote(null);
        return;
      }

      setDeliveryQuote({
        quoteId: data.quoteId,
        courierName: data.courierName || "Shiprocket Quick",
        estimatedDeliveryMinutes: data.durationMins || data.estimatedDeliveryMinutes || 30,
        providerFare: data.providerFare,
        markup: data.markup,
        customerDeliveryFee: data.customerDeliveryFee,
        distanceKm: data.distanceKm,
        distanceSource: data.distanceSource || "route",
        diagnostics: data.diagnostics,
      });
    } catch (err: any) {
      setQuoteError(err.message || "Unable to calculate delivery quote for this address.");
    } finally {
      setQuoteLoading(false);
    }
  };


  useEffect(() => {
    if (orderType === "delivery" && selectedAddress && cafeId) {
      fetchDeliveryQuote(selectedAddress);
    }
  }, [orderType, selectedAddress, cafeId, subtotal]);

  // Handle GPS detect for new address
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    setLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setNewAddrLat(lat);
        setNewAddrLng(lng);

        try {
          const res = await fetch(`/api/user/addresses/geocode?lat=${lat}&lng=${lng}`);
          if (res.ok) {
            const data = await res.json();
            if (data.formattedAddress) {
              setNewAddrAddress(data.formattedAddress);
              if (data.postalCode) setNewAddrPostal(data.postalCode);
            }
          }
        } catch {}
        setLocatingGps(false);
      },
      (err) => {
        console.error("Geolocation error", err);
        setLocatingGps(false);
        // Default to Bangalore MG road coordinates if denied in local dev
        setNewAddrLat(12.9716);
        setNewAddrLng(77.5946);
        setNewAddrAddress("MG Road, Bangalore, Karnataka");
        setNewAddrPostal("560001");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Handle saving new delivery address
  const handleSaveNewAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerUser) {
      setShowAuthModal(true);
      return;
    }

    if (!newAddrAddress) {
      alert("Please provide the full street address");
      return;
    }

    setSavingAddress(true);
    try {
      const res = await fetch("/api/user/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: newAddrLabel,
          recipientName: newAddrRecipient || customerName || "Customer",
          contactNumber: newAddrPhone || customerPhone || "9876543210",
          formattedAddress: newAddrAddress,
          houseFlat: newAddrFlat,
          buildingName: newAddrBuilding,
          landmark: newAddrLandmark,
          postalCode: newAddrPostal,
          latitude: newAddrLat || 12.9716,
          longitude: newAddrLng || 77.5946,
          isDefault: savedAddresses.length === 0
        })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to save address");
      }

      await loadAddresses();
      if (data.address) {
        setSelectedAddress(data.address);
      }
      setShowAddAddressModal(false);
    } catch (err: any) {
      alert(err.message || "Failed to save address");
    } finally {
      setSavingAddress(false);
    }
  };

  // Dynamic Tax Calculation from Cart Items
  const tax = useMemo(() => {
    const calculatedTax = items.reduce((sum, item) => {
      const rate = Number(item.taxRate) || 0;
      const price = Math.max(0, Number(item.price) || 0);
      const qty = Math.max(1, Number(item.quantity) || 1);
      return sum + (price * qty * (rate / 100));
    }, 0);
    return Math.round(calculatedTax * 100) / 100;
  }, [items]);

  // Dynamic CafeFlow Fee Calculation
  const resolvedFee = useMemo(() => {
    return resolveCafeCustomerFee({
      currency: currency || "INR",
      cafeFlowFeeMode
    });
  }, [currency, cafeFlowFeeMode]);

  const cafeFlowFee = resolvedFee.success
    ? resolvedFee.feeAddedToCustomerBill
    : (cafeFlowFeeMode === "cafe" ? 0 : 1);
  const currencySymbol = resolvedFee.symbol || "₹";
  const discount = appliedPromo ? appliedPromo.discount : 0;
  
  // Delivery Fee is strictly: Shiprocket fare + ₹5 markup (only if mode is delivery)
  const deliveryFee = orderType === "delivery" && deliveryQuote ? deliveryQuote.customerDeliveryFee : 0;

  const grossTotal = Math.max(0, subtotal + tax + cafeFlowFee + deliveryFee - discount);
  const walletDeduction = useWallet && walletBalance > 0 ? Math.min(walletBalance, grossTotal) : 0;
  const total = Math.max(0, grossTotal - walletDeduction);

  // Apply promo
  const handleApplyPromo = (codeToApply?: string) => {
    const targetCode = (codeToApply || promoCode).trim();
    if (!targetCode) return;
    setPromoError("");

    const matched = availablePromotions.find(
      (p: any) => p.code.toLowerCase() === targetCode.toLowerCase()
    );

    if (!matched) {
      setPromoError("Invalid promo code for this cafe.");
      return;
    }

    if (matched.min_order_value && subtotal < matched.min_order_value) {
      setPromoError(`Minimum order of ${currencySymbol}${matched.min_order_value} required for code ${matched.code}.`);
      return;
    }

    let disc = 0;
    if (matched.promo_type === "percentage") {
      disc = (subtotal * matched.value) / 100;
      if (matched.max_discount > 0 && disc > matched.max_discount) {
        disc = matched.max_discount;
      }
    } else {
      disc = Math.min(subtotal, matched.value);
    }
    disc = Math.round(disc * 100) / 100;

    setAppliedPromo({
      code: matched.code,
      discount: disc,
      title: matched.title || `${matched.code} Applied`,
      description: matched.description
    });
    setPromoCode(matched.code);
    setShowCouponSelector(false);
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoCode("");
    setPromoError("");
  };

  // Step 1 -> Step 2: Validate cart before proceeding to checkout page
  const handleProceedToCheckout = () => {
    setOrderError("");

    // 1. Google Authentication (Guest mode strictly prohibited)
    if (!customerUser) {
      setShowAuthModal(true);
      return;
    }

    // 2. Dine-in Verified Table Check
    if (orderType === "dine-in" && !verifiedTable) {
      setOrderError("Dine-in orders require a verified table QR session. Please scan your table QR code at the cafe, or switch to Takeaway / Delivery.");
      return;
    }

    // 3. Delivery Address and Quote Check
    if (orderType === "delivery") {
      if (!selectedAddress) {
        setOrderError("Please select or add a delivery address to proceed.");
        return;
      }
      if (quoteLoading) {
        setOrderError("Calculating live Shiprocket delivery fare. Please wait a moment...");
        return;
      }
      if (quoteError || !deliveryQuote) {
        setOrderError(quoteError || "Delivery is currently unavailable to this address. Please choose another address or switch to Takeaway.");
        return;
      }
    }

    // Switch to dedicated checkout step
    setCheckoutStep("checkout");
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Step 2: Place order on the checkout page
  const handleCheckout = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // 1. Google Authentication (Guest mode strictly prohibited)
    if (!customerUser) {
      setShowAuthModal(true);
      return;
    }

    // 2. Dine-in Verified Table Check
    if (orderType === "dine-in" && !verifiedTable) {
      setOrderError("Dine-in orders require a verified table QR session. Please scan your table QR code at the cafe, or switch to Takeaway / Delivery.");
      return;
    }

    // 3. Delivery Address and Quote Check
    if (orderType === "delivery") {
      if (!selectedAddress) {
        setOrderError("Please select or add a delivery address to proceed.");
        return;
      }
      if (quoteLoading) {
        setOrderError("Calculating live Shiprocket delivery fare. Please wait a moment...");
        return;
      }
      if (quoteError || !deliveryQuote) {
        setOrderError(quoteError || "Delivery is currently unavailable to this address. Please choose another address or switch to Takeaway.");
        return;
      }
    }

    // 4. Payment Method Selection Check
    if (!paymentMethod) {
      setOrderError("Please choose how you'd like to pay: UPI (Online) or Cash at Counter.");
      return;
    }

    if (!customerName.trim() && customerUser?.name) {
      setCustomerName(customerUser.name);
    }

    if (paymentMethod === "cash" && !customerPhone) {
      setOrderError("Please enter your mobile number for Pay at Counter / Cash orders.");
      return;
    }
    if (items.length === 0 || !cafeId) return;

    setSubmitting(true);
    const effectiveName = customerName.trim() || customerUser?.name || "Customer";

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cafeId,
          customerName: effectiveName,
          customerPhone: customerPhone || customerUser?.phone || undefined,
          customerEmail: customerEmail || customerUser?.email || undefined,
          orderType,
          tableId: orderType === "dine-in" ? tableNumber : undefined,
          deliveryAddress: orderType === "delivery" ? selectedAddress : undefined,
          quoteId: orderType === "delivery" ? deliveryQuote?.quoteId : undefined,
          items,
          notes,
          paymentMethod,
          promoCode: appliedPromo ? appliedPromo.code : undefined,
          appliedWalletAmount: walletDeduction
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to place order");
      }

      if (paymentMethod === "upi") {
        const orderData = data.order;
        setUpiOrderData(orderData);

        // Generate dynamic QR code if upiUri is available
        if (orderData.upiUri) {
          try {
            const qrDataUrl = await QRCode.toDataURL(orderData.upiUri, {
              width: 320,
              margin: 1,
              color: {
                dark: "#062F23",
                light: "#FFFFFF"
              }
            });
            setQrCodeDataUrl(qrDataUrl);
          } catch (qrErr) {
            console.error("Error generating QR code:", qrErr);
          }
        }

        setUpiModalOpen(true);
        setSubmitting(false);
      } else {
        // Cash at Counter: clear cart and redirect to order tracking page
        clearCart();
        router.push(`/orders/${data.order.publicOrderRef || data.order.id}`);
      }
    } catch (err: any) {
      setOrderError(err.message || "Failed to place order");
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#F7F5EC] dark:bg-[#001F19] text-[#0B1714] dark:text-[#F7F5EC]">
        <main className="max-w-[430px] md:max-w-2xl mx-auto px-4 py-20 text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-white dark:bg-[#002D23] border border-[#DDE3DD] dark:border-[#002D23] flex items-center justify-center mx-auto text-[#73716B] shadow-xs">
            <ShoppingBag className="w-6 h-6 text-[#002D23] dark:text-[#34D399]" />
          </div>
          <h2 className="text-[17px] font-extrabold">Your cart is empty</h2>
          <p className="text-[12px] text-[#73716B]">Explore partner cafes and add fresh artisan specials to your order.</p>
          <Link
            href="/"
            className="inline-block mt-2 px-5 py-2.5 rounded-full bg-[#002D23] text-white font-bold text-xs shadow-sm hover:bg-[#001F19] transition-colors"
          >
            Explore Cafes
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F5EC] dark:bg-[#001F19] text-[#0B1714] dark:text-[#F7F5EC]">
      <main className="max-w-[430px] md:max-w-3xl mx-auto px-4 sm:px-6 pt-3 pb-24 md:pb-10 space-y-4">

        {checkoutStep === "cart" ? (
          <>
            {/* 1. CART HEADER */}
            <div className="pt-1 space-y-2">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.back()}
                  aria-label="Back"
                  className="w-8 h-8 rounded-full bg-transparent flex items-center justify-center text-[#0B1714] dark:text-white"
                >
                  <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
                </button>
                <h1 className="font-extrabold text-[18px] text-[#0B1714] dark:text-white leading-tight">
                  Your Cart
                </h1>
              </div>

              {/* Subheader: Cafe Name, Distance, Change button */}
              <div className="flex items-center justify-between pl-1">
                <div className="flex items-center gap-1.5 text-[12px] text-[#73716B] font-medium">
                  <span className="font-bold text-[#0B1714] dark:text-white">{cafeName || "The Brew Room"}</span>
                  <span>•</span>
                  <span className="capitalize font-semibold text-[#002D23] dark:text-[#34D399]">
                    {orderType === "dine-in" ? "Dine-in" : (orderType === "delivery" ? "Shiprocket Delivery" : "Takeaway Pickup")}
                  </span>
                </div>
                <Link
                  href="/"
                  className="text-[12px] font-bold text-[#002D23] dark:text-[#34D399] hover:underline"
                >
                  Change Cafe
                </Link>
              </div>
            </div>

            {/* Order Mode & Status Banner */}
            <section className="space-y-2">
              {orderError && (
                <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                  <span>{orderError}</span>
                </div>
              )}

              {verifiedTable ? (
                <div className="p-3 rounded-2xl bg-[#E6F0DD] dark:bg-[#002D23]/40 border border-[#002D23]/30 text-[#002D23] dark:text-[#34D399] text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 shrink-0 text-[#002D23] dark:text-[#34D399]" />
                    <div>
                      <div className="font-extrabold">Verified Table: {verifiedTable.name}</div>
                      <div className="text-[10px] opacity-80">Table QR session verified • Dine-in</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-200">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span>Table QR Verification Required for Dine-in</span>
                  </div>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300">
                    To place dine-in orders, please scan the physical QR code on your cafe table.
                  </p>
                </div>
              )}
            </section>

            {/* 3. CART ITEMS LIST */}
            <section className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-[#002D23] border border-[#DDE3DD] dark:border-[#002D23] shadow-xs"
                >
                  {/* Left: Thumbnail & Item info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-800 shrink-0">
                      <img
                        src={item.image || "https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=300&q=80"}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <FoodTypeBadge foodType={item.foodType} isVeg={item.isVeg} size="sm" />
                        <h3 className="font-bold text-[14px] text-[#0B1714] dark:text-white truncate">
                          {item.name}
                        </h3>
                      </div>
                      {Array.isArray(item.selectedAddons) && item.selectedAddons.length > 0 && (
                        <p className="text-[11px] text-[#73716B] dark:text-[#A8A29E] truncate">
                          + {item.selectedAddons.map((a: any) => a.name).join(", ")}
                        </p>
                      )}
                      <p className="text-[13px] font-extrabold text-[#0B1714] dark:text-white">
                        {currencySymbol}{Math.max(0, Number(item.price) || 0)}
                      </p>
                    </div>
                  </div>

                  {/* Right: Quantity Stepper & Delete Trash button */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-2 border border-[#DDE3DD] dark:border-[#002D23] rounded-xl px-2 py-1 bg-white dark:bg-[#001F19]">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="p-0.5 text-[#73716B] hover:text-[#0B1714]"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="p-0.5 text-[#73716B] hover:text-[#0B1714]"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      aria-label="Delete item"
                      className="p-1 text-[#73716B] hover:text-rose-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </section>

            {/* 4. APPLY OFFERS SECTION */}
            <section className="space-y-2 pt-1">
              <div className="flex items-center justify-between px-0.5">
                <h3 className="text-[14px] font-extrabold text-[#0B1714] dark:text-white">
                  Apply Offers &amp; Coupons
                </h3>
                {availablePromotions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowCouponSelector(!showCouponSelector)}
                    className="text-[12px] font-bold text-[#002D23] dark:text-[#34D399] hover:underline"
                  >
                    {showCouponSelector ? "Hide Coupons" : `View Coupons (${availablePromotions.length})`}
                  </button>
                )}
              </div>

              {appliedPromo ? (
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#E6F0DD] dark:bg-[#002D23]/30 border border-[#002D23]/40 shadow-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[#002D23] text-white flex items-center justify-center shrink-0">
                      <Tag className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <h4 className="font-extrabold text-[13px] text-[#002D23] dark:text-[#34D399]">
                        {appliedPromo.code} applied
                      </h4>
                      <p className="text-[11px] text-[#002D23]/80 dark:text-stone-300 truncate">
                        Saved {currencySymbol}{appliedPromo.discount.toFixed(0)} with {appliedPromo.title}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemovePromo}
                    className="text-xs font-bold text-stone-500 hover:text-rose-600 px-2 py-1"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      placeholder="Enter Coupon Code"
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-[#DDE3DD] dark:border-[#002D23] bg-white dark:bg-[#002D23] text-xs font-mono font-bold tracking-wider uppercase focus:outline-none focus:border-[#002D23]"
                    />
                    <button
                      type="button"
                      onClick={() => handleApplyPromo()}
                      disabled={!promoCode.trim()}
                      className="px-5 py-2.5 rounded-xl bg-[#002D23] disabled:opacity-40 text-white font-extrabold text-xs shadow-xs"
                    >
                      Apply
                    </button>
                  </div>
                  {promoError && (
                    <p className="text-xs text-rose-500 font-semibold px-1">{promoError}</p>
                  )}
                </div>
              )}

              {/* Available coupons */}
              {showCouponSelector && availablePromotions.length > 0 && !appliedPromo && (
                <div className="p-3 bg-white dark:bg-[#002D23] rounded-2xl border border-[#DDE3DD] dark:border-[#002D23] space-y-2 text-xs">
                  <span className="font-extrabold text-[11px] text-[#73716B] uppercase block">
                    Eligible Coupons for this Cafe
                  </span>
                  <div className="space-y-2">
                    {availablePromotions.map((promo) => (
                      <div
                        key={promo.id}
                        className="p-2.5 rounded-xl border border-[#DDE3DD] dark:border-[#002D23] bg-[#F7F5EC]/50 dark:bg-[#001F19] flex items-center justify-between"
                      >
                        <div>
                          <div className="font-extrabold text-[12px] font-mono text-[#002D23] dark:text-[#34D399]">
                            {promo.code}
                          </div>
                          <div className="text-[11px] text-[#73716B]">{promo.title || promo.description}</div>
                          {promo.min_order_value && (
                            <div className="text-[10px] text-stone-400">Min. order: {currencySymbol}{promo.min_order_value}</div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleApplyPromo(promo.code)}
                          className="px-3 py-1 rounded-lg bg-[#002D23] text-white font-bold text-[11px]"
                        >
                          Apply
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* 5. BILL SUMMARY */}
            <section className="space-y-2.5 pt-1">
              <h3 className="text-[14px] font-extrabold text-[#0B1714] dark:text-white px-0.5">
                Bill Summary
              </h3>

              <div className="p-4 rounded-2xl bg-white dark:bg-[#002D23] border border-[#DDE3DD] dark:border-[#002D23] shadow-xs space-y-2 text-[13px]">
                <div className="flex justify-between text-[#73716B]">
                  <span>Item Total</span>
                  <span className="font-medium text-[#0B1714] dark:text-white">{currencySymbol}{subtotal.toFixed(0)}</span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between text-[#002D23] dark:text-[#34D399] font-medium">
                    <span>Discount ({appliedPromo?.code})</span>
                    <span>-{currencySymbol}{discount.toFixed(0)}</span>
                  </div>
                )}

                {tax > 0 ? (
                  <div className="flex justify-between text-[#73716B]">
                    <span>Taxes (GST / VAT)</span>
                    <span className="font-medium text-[#0B1714] dark:text-white">{currencySymbol}{tax.toFixed(2)}</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-[#73716B]">
                    <span>Taxes</span>
                    <span className="font-medium text-[#0B1714] dark:text-white">{currencySymbol}0.00</span>
                  </div>
                )}

                {/* Delivery Fee Line Item */}
                {orderType === "delivery" && (
                  <div className="flex justify-between text-[#73716B]">
                    <div className="flex items-center gap-1">
                      <span>Shiprocket Delivery Fee</span>
                      {deliveryQuote && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold">
                          {currencySymbol}{deliveryQuote.providerFare} + {currencySymbol}5 markup
                        </span>
                      )}
                    </div>
                    <span className="font-bold text-[#0B1714] dark:text-white">
                      {quoteLoading ? "Calculating..." : (deliveryQuote ? `${currencySymbol}${deliveryQuote.customerDeliveryFee.toFixed(2)}` : "—")}
                    </span>
                  </div>
                )}

                {cafeFlowFeeMode !== "cafe" && cafeFlowFee > 0 && (
                  <div className="flex justify-between text-[#73716B]">
                    <div className="flex items-center gap-1">
                      <span>CafeFlow Fee</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-100 dark:bg-stone-800 text-stone-500 font-bold">Standard</span>
                    </div>
                    <span className="font-medium text-[#0B1714] dark:text-white">{currencySymbol}{cafeFlowFee.toFixed(2)}</span>
                  </div>
                )}

                {orderType === "delivery" && (
                  <div className="py-2 px-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/30 flex items-center justify-between text-[11px]">
                    <span className="text-amber-800 dark:text-amber-300 font-semibold flex items-center gap-1.5">
                      <QrCode className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      Online Payment (UPI)
                    </span>
                    <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-tight">
                      Prepaid Only
                    </span>
                  </div>
                )}

                {walletBalance > 0 && (
                  <div className="pt-2 border-t border-[#DDE3DD] dark:border-[#002D23] flex items-center justify-between text-[12px]">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-[#002D23] dark:text-[#34D399]" />
                      <span>CafeFlow Wallet ({currencySymbol}{walletBalance.toFixed(0)} available)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUseWallet(!useWallet)}
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full border transition-colors ${
                        useWallet
                          ? "bg-[#002D23] text-white border-[#002D23]"
                          : "bg-transparent text-[#73716B] border-[#DDE3DD]"
                      }`}
                    >
                      {useWallet ? `-${currencySymbol}${walletDeduction.toFixed(0)} Applied` : "Apply"}
                    </button>
                  </div>
                )}

                <div className="pt-2 border-t border-[#DDE3DD] dark:border-[#002D23] flex justify-between font-extrabold text-[15px] text-[#0B1714] dark:text-white">
                  <span>Grand Total</span>
                  <span>{currencySymbol}{total.toFixed(0)}</span>
                </div>
              </div>
            </section>

            {/* STICKY BOTTOM BUTTON FOR STEP 1 (CART) */}
            <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#001F19]/95 backdrop-blur-md border-t border-[#DDE3DD] dark:border-[#002D23] p-3 px-4 safe-area-pb space-y-2">
              {orderError && (
                <div className="max-w-[430px] md:max-w-3xl mx-auto p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-200 text-xs flex items-center justify-between gap-2 shadow-xs">
                  <span className="font-medium leading-tight">{orderError}</span>
                </div>
              )}
              <div className="max-w-[430px] md:max-w-3xl mx-auto flex gap-2">
                <button
                  type="button"
                  onClick={handleProceedToCheckout}
                  disabled={orderType === "delivery" && (!selectedAddress || quoteLoading || !!quoteError)}
                  className="w-full py-3.5 rounded-full font-extrabold text-[14px] shadow-sm active:scale-98 transition-all flex items-center justify-between px-6 cursor-pointer bg-[#002D23] hover:bg-[#001F19] text-white disabled:opacity-50"
                >
                  <span>Proceed to Pay</span>
                  <div className="flex items-center gap-1.5">
                    <span>{currencySymbol}{total.toFixed(0)}</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </div>
                </button>
              </div>
            </div>
          </>
        ) : (
          /* STEP 2: DEDICATED CHECKOUT PAGE (UPI / CASH SELECTION) */
          <div className="space-y-4 animate-fade-in pb-28 md:pb-20">
            {/* Checkout Header */}
            <div className="pt-1 space-y-2">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setCheckoutStep("cart");
                    setOrderError("");
                  }}
                  aria-label="Back to Cart"
                  className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-[#0B1714] dark:text-white hover:bg-stone-200 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
                </button>
                <div>
                  <h1 className="font-extrabold text-[18px] text-[#0B1714] dark:text-white leading-tight">
                    Select Payment Method
                  </h1>
                  <p className="text-[11px] text-[#73716B]">Step 2 of 2 • Checkout</p>
                </div>
              </div>
            </div>

            {/* Order Total Highlight Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#002D23] to-[#0A4D3C] text-white shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-wider font-semibold opacity-85 block">Amount to Pay</span>
                <span className="text-2xl font-black">{currencySymbol}{total.toFixed(0)}</span>
                <span className="text-[11px] opacity-80 block mt-0.5">
                  {items.reduce((acc, it) => acc + it.quantity, 0)} items • {orderType === "dine-in" ? `Dine-in (${verifiedTable?.name || "Table"})` : (orderType === "delivery" ? "Delivery" : "Takeaway")}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setCheckoutStep("cart")}
                className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Review Items
              </button>
            </div>

            {/* Error Message */}
            {orderError && (
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2 shadow-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                <span className="font-medium leading-tight">{orderError}</span>
              </div>
            )}

            {/* Customer Contact Details */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#002D23] border border-[#DDE3DD] dark:border-[#002D23] shadow-xs space-y-3 text-xs">
              <h4 className="font-extrabold text-[13px] text-[#0B1714] dark:text-white">
                Customer Details
              </h4>
              <div className="space-y-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-[#73716B] mb-1">Full Name <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#DDE3DD] dark:border-[#002D23] bg-stone-50/50 dark:bg-[#001F19] focus:outline-none focus:border-[#002D23] text-xs font-medium"
                  />
                </div>

                <div>
                  <SmartEmailInput
                    label="Email Bill Delivery"
                    value={customerEmail}
                    onChange={(email) => setCustomerEmail(email)}
                    placeholder="e.g. rahul123"
                    helperText="Your final paid bill receipt will be automatically emailed to this address."
                  />
                </div>

                {customerUser?.email && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-[11px] text-emerald-800 dark:text-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                    <span className="truncate">Signed in: <strong className="font-semibold">{customerUser.email}</strong></span>
                  </div>
                )}

                {paymentMethod === "cash" && (
                  <div>
                    <label className="block text-[11px] font-semibold text-[#73716B] mb-1">Phone Number <span className="text-rose-500">*</span></label>
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value.replace(/[^0-9+\s\-]/g, ""))}
                      placeholder="+91 98765 43210"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#DDE3DD] dark:border-[#002D23] bg-stone-50/50 dark:bg-[#001F19] focus:outline-none focus:border-[#002D23] text-xs font-medium"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Payment Method Selector Card */}
            <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#002D23] border border-[#DDE3DD] dark:border-[#002D23] shadow-sm space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h4 className="font-extrabold text-[15px] sm:text-[16px] text-[#0B1714] dark:text-white leading-tight">
                    Choose How to Pay
                  </h4>
                  <p className="text-[12px] text-[#73716B] mt-0.5">
                    Select your preferred payment method below
                  </p>
                </div>
                {paymentMethod && (
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40 dark:border-emerald-800/40 shrink-0">
                    {paymentMethod === "upi" ? "UPI Selected" : "Cash Selected"}
                  </span>
                )}
              </div>

              {/* UPI Missing Warning if customer chose UPI but cafe has not configured upiId */}
              {!cafeUpiId && paymentMethod === "upi" && (
                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">UPI Not Configured by Cafe</p>
                    <p className="text-[11px] leading-tight text-amber-700 dark:text-amber-300">
                      This cafe has not configured their UPI ID yet. Please select <strong>Cash at Counter</strong> below to place your order.
                    </p>
                  </div>
                </div>
              )}

              {/* Exactly two payment options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* 1. UPI Payment Option */}
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod("upi");
                    setOrderError("");
                  }}
                  className={`w-full p-4 sm:p-5 rounded-2xl border text-left flex items-start gap-3.5 transition-all cursor-pointer shadow-xs ${
                    paymentMethod === "upi"
                      ? "bg-[#002D23] text-white border-[#002D23] shadow-md ring-2 ring-[#002D23]/25"
                      : "bg-stone-50/60 dark:bg-[#001F19] border-[#DDE3DD] dark:border-[#002D23] text-[#0B1714] dark:text-[#F7F5EC] hover:border-[#002D23] hover:bg-white dark:hover:bg-[#142d24]"
                  }`}
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                    paymentMethod === "upi" ? "bg-white/20 text-white" : "bg-[#002D23]/10 text-[#002D23] dark:text-[#34D399]"
                  }`}>
                    <QrCode className="w-6 h-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-extrabold text-[15px] block leading-tight">
                        UPI — Pay Online
                      </span>
                      {paymentMethod === "upi" && (
                        <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
                      )}
                    </div>
                    <span className={`text-[12px] block mt-1.5 leading-relaxed ${
                      paymentMethod === "upi" ? "text-white/90" : "text-[#73716B] dark:text-stone-300"
                    }`}>
                      Scan dynamic QR code or open GPay, PhonePe, Paytm, BHIM
                    </span>
                  </div>
                </button>

                {/* 2. Cash at Counter Option */}
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod("cash");
                    setOrderError("");
                  }}
                  className={`w-full p-4 sm:p-5 rounded-2xl border text-left flex items-start gap-3.5 transition-all cursor-pointer shadow-xs ${
                    paymentMethod === "cash"
                      ? "bg-[#002D23] text-white border-[#002D23] shadow-md ring-2 ring-[#002D23]/25"
                      : "bg-stone-50/60 dark:bg-[#001F19] border-[#DDE3DD] dark:border-[#002D23] text-[#0B1714] dark:text-[#F7F5EC] hover:border-[#002D23] hover:bg-white dark:hover:bg-[#142d24]"
                  }`}
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                    paymentMethod === "cash" ? "bg-white/20 text-white" : "bg-[#002D23]/10 text-[#002D23] dark:text-[#34D399]"
                  }`}>
                    <Banknote className="w-6 h-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-extrabold text-[15px] block leading-tight">
                        Cash at Counter
                      </span>
                      {paymentMethod === "cash" && (
                        <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
                      )}
                    </div>
                    <span className={`text-[12px] block mt-1.5 leading-relaxed ${
                      paymentMethod === "cash" ? "text-white/90" : "text-[#73716B] dark:text-stone-300"
                    }`}>
                      Pay in cash at the cafe counter when your order is placed
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* STICKY BOTTOM BUTTON FOR STEP 2 (CHECKOUT) */}
            <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#001F19]/95 backdrop-blur-md border-t border-[#DDE3DD] dark:border-[#002D23] p-3 px-4 safe-area-pb space-y-2">
              <div className="max-w-[430px] md:max-w-3xl mx-auto flex gap-2">
                <button
                  type="button"
                  onClick={() => handleCheckout()}
                  disabled={submitting || !paymentMethod || (paymentMethod === "upi" && !cafeUpiId)}
                  className={`w-full py-3.5 rounded-full font-extrabold text-[14px] shadow-sm active:scale-98 transition-all flex items-center justify-between px-6 cursor-pointer ${
                    !paymentMethod
                      ? "bg-stone-300 dark:bg-stone-700 text-stone-600 dark:text-stone-300 cursor-not-allowed"
                      : "bg-[#002D23] hover:bg-[#001F19] text-white disabled:opacity-50"
                  }`}
                >
                  <span>
                    {submitting
                      ? "Placing Order..."
                      : !paymentMethod
                      ? "Choose UPI or Cash Above"
                      : paymentMethod === "upi"
                      ? (cafeUpiId ? "Pay via UPI (Open QR Code)" : "UPI Unavailable - Choose Cash")
                      : "Place Order (Pay Cash at Counter)"}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span>{currencySymbol}{total.toFixed(0)}</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Delivery Address Modal */}
        {showAddAddressModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
            <div className="bg-white dark:bg-[#002D23] w-full max-w-md rounded-3xl p-5 border border-[#DDE3DD] dark:border-[#002D23] shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-[15px] text-[#0B1714] dark:text-white">
                  Add Delivery Address
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddAddressModal(false)}
                  className="w-7 h-7 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tag selector */}
              <div className="flex gap-2">
                {(["Home", "Work", "Other"] as const).map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setNewAddrLabel(tag)}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                      newAddrLabel === tag
                        ? "bg-[#002D23] text-white border-[#002D23]"
                        : "border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              {/* Location Detection & Map Picker Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleDetectLocation}
                  disabled={locatingGps}
                  className="py-2.5 px-3 rounded-xl border border-dashed border-[#002D23] text-[#002D23] dark:text-[#34D399] dark:border-[#34D399] font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-[#E6F0DD]/30 transition-colors cursor-pointer"
                >
                  {locatingGps ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Navigation className="w-3.5 h-3.5" />
                  )}
                  <span>{locatingGps ? "Detecting..." : "Use Current GPS"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowMapSelector(true)}
                  className="py-2.5 px-3 rounded-xl border border-[#002D23] text-[#002D23] dark:text-[#34D399] dark:border-[#34D399] font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-[#E6F0DD]/30 transition-colors cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Select on Map</span>
                </button>
              </div>

              <form onSubmit={handleSaveNewAddress} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-stone-500 mb-1">Complete Address *</label>
                  <textarea
                    required
                    rows={2}
                    value={newAddrAddress}
                    onChange={(e) => setNewAddrAddress(e.target.value)}
                    placeholder="Street, area, locality, city"
                    className="w-full px-3 py-2 rounded-xl border border-[#DDE3DD] dark:border-[#002D23] bg-transparent focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-500 mb-1">Flat / House No.</label>
                    <input
                      type="text"
                      value={newAddrFlat}
                      onChange={(e) => setNewAddrFlat(e.target.value)}
                      placeholder="e.g. 402, 4th Floor"
                      className="w-full px-3 py-2 rounded-xl border border-[#DDE3DD] dark:border-[#002D23] bg-transparent focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-stone-500 mb-1">Building / Society</label>
                    <input
                      type="text"
                      value={newAddrBuilding}
                      onChange={(e) => setNewAddrBuilding(e.target.value)}
                      placeholder="e.g. Sunshine Apts"
                      className="w-full px-3 py-2 rounded-xl border border-[#DDE3DD] dark:border-[#002D23] bg-transparent focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-500 mb-1">Landmark (Optional)</label>
                    <input
                      type="text"
                      value={newAddrLandmark}
                      onChange={(e) => setNewAddrLandmark(e.target.value)}
                      placeholder="e.g. Near Metro"
                      className="w-full px-3 py-2 rounded-xl border border-[#DDE3DD] dark:border-[#002D23] bg-transparent focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-stone-500 mb-1">Pincode</label>
                    <input
                      type="text"
                      value={newAddrPostal}
                      onChange={(e) => setNewAddrPostal(e.target.value)}
                      placeholder="e.g. 560001"
                      className="w-full px-3 py-2 rounded-xl border border-[#DDE3DD] dark:border-[#002D23] bg-transparent focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-500 mb-1">Recipient Name</label>
                    <input
                      type="text"
                      value={newAddrRecipient}
                      onChange={(e) => setNewAddrRecipient(e.target.value)}
                      placeholder={customerName || "Recipient"}
                      className="w-full px-3 py-2 rounded-xl border border-[#DDE3DD] dark:border-[#002D23] bg-transparent focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-stone-500 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={newAddrPhone}
                      onChange={(e) => setNewAddrPhone(e.target.value)}
                      placeholder={customerPhone || "Phone"}
                      className="w-full px-3 py-2 rounded-xl border border-[#DDE3DD] dark:border-[#002D23] bg-transparent focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={savingAddress}
                    className="w-full py-3 rounded-xl bg-[#002D23] text-white font-extrabold text-xs shadow-sm hover:bg-[#001F19] transition-colors disabled:opacity-50"
                  >
                    {savingAddress ? "Saving Address..." : "Save and Select Address"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Google Auth Modal */}
        <GoogleAuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onSuccess={(user) => {
            setCustomerUser(user);
            if (user.name) setCustomerName(user.name);
            if (user.phone) setCustomerPhone(user.phone);
            if (user.email) setCustomerEmail(user.email);
            loadAddresses();
            // Proceed to checkout step or re-invoke checkout
            if (checkoutStep === "cart") {
              setCheckoutStep("checkout");
              if (typeof window !== "undefined") {
                window.scrollTo({ top: 0, behavior: "smooth" });
              }
            } else {
              setTimeout(() => handleCheckout(), 100);
            }
          }}
        />

        {/* Map Location Selector Modal */}
        <MapLocationSelectorModal
          isOpen={showMapSelector}
          onClose={() => setShowMapSelector(false)}
          initialLat={newAddrLat || 23.0225}
          initialLng={newAddrLng || 72.5714}
          onSelectLocation={(loc) => {
            setNewAddrAddress(loc.address);
            setNewAddrLat(loc.lat);
            setNewAddrLng(loc.lng);
            setShowMapSelector(false);
          }}
          title="Pin Delivery Location"
        />

        {/* UPI Payment Modal / Screen */}
        {upiModalOpen && upiOrderData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
            <div className="bg-white dark:bg-[#002D23] w-full max-w-sm rounded-[28px] p-6 border border-[#DDE3DD] dark:border-[#002D23] shadow-2xl text-center space-y-4 max-h-[92vh] overflow-y-auto">
              
              <div className="flex items-center justify-between pb-1 border-b border-[#DDE3DD] dark:border-[#002D23]">
                <div className="text-left">
                  <h3 className="font-extrabold text-[16px] text-[#0B1714] dark:text-white">
                    Scan &amp; Pay via UPI
                  </h3>
                  <p className="text-[11px] font-mono text-[#73716B]">
                    Order {upiOrderData.orderNumber}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setUpiModalOpen(false);
                    clearCart();
                    router.push(`/orders/${upiOrderData.publicOrderRef || upiOrderData.id}`);
                  }}
                  className="w-7 h-7 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-500 hover:text-stone-800 transition-colors"
                  title="Close and track order"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Cafe & Payable Amount */}
              <div className="p-3 rounded-2xl bg-[#F7F5EC] dark:bg-[#001F19] border border-[#DDE3DD] dark:border-[#002D23] space-y-0.5">
                <span className="text-[11px] font-medium text-[#73716B] block">
                  Paying to <strong className="text-[#0B1714] dark:text-white font-bold">{upiOrderData.cafeName || cafeName}</strong>
                </span>
                <span className="text-2xl font-black text-[#002D23] dark:text-[#34D399] tracking-tight block">
                  {currencySymbol}{Number(upiOrderData.total || 0).toFixed(2)}
                </span>
                {upiOrderData.upiId && (
                  <span className="text-[11px] font-mono text-[#73716B] block">
                    UPI ID: {upiOrderData.upiId}
                  </span>
                )}
              </div>

              {/* Dynamic QR Code */}
              <div className="flex flex-col items-center justify-center py-1">
                {qrCodeDataUrl ? (
                  <div className="p-3 bg-white rounded-2xl border-2 border-[#DDE3DD] shadow-xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrCodeDataUrl}
                      alt="UPI Payment QR Code"
                      className="w-48 h-48 sm:w-52 sm:h-52 object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-48 h-48 bg-stone-100 dark:bg-stone-800 rounded-2xl flex items-center justify-center animate-pulse">
                    <Loader2 className="w-6 h-6 animate-spin text-[#002D23]" />
                  </div>
                )}
                <p className="text-[11px] text-[#73716B] mt-2 font-medium">
                  Scan with GPay, PhonePe, Paytm, or any UPI app
                </p>
              </div>

              {/* Action Buttons: UPI Intent deep link & Track Order */}
              <div className="space-y-2 pt-1">
                {upiOrderData.upiUri && (
                  <a
                    href={upiOrderData.upiUri}
                    className="w-full py-3 px-4 rounded-full bg-[#002D23] hover:bg-[#001F19] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                  >
                    <span>Pay Using UPI App</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setUpiModalOpen(false);
                    clearCart();
                    router.push(`/orders/${upiOrderData.publicOrderRef || upiOrderData.id}`);
                  }}
                  className="w-full py-2.5 px-4 rounded-full border border-[#DDE3DD] dark:border-[#002D23] text-stone-700 dark:text-stone-300 font-bold text-xs hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
                >
                  View Order Status
                </button>
              </div>

              {/* Explicit Verification Notice */}
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 text-left text-[11px] leading-relaxed text-amber-900 dark:text-amber-200">
                <p className="font-bold flex items-center gap-1.5 mb-0.5">
                  <span>ℹ️</span> Verification Notice
                </p>
                <p>
                  Your payment will be manually verified and confirmed by the cafe counter staff. Your order remains pending until cafe staff confirms receipt.
                </p>
              </div>

            </div>
          </div>
        )}

      </main>
    </div>
  );
}
