"use client";

import { useEffect, useState, use, useMemo, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Search,
  X,
  Star,
  MapPin,
  Clock,
  ChevronDown,
  Tag,
  Plus,
  Minus,
  Check,
  Calendar,
  Users,
  Armchair,
  ShoppingBag,
  ExternalLink,
  Sparkles,
  Info,
  ChevronRight,
  ShieldCheck,
  UtensilsCrossed,
  Truck,
  Store,
  QrCode,
  CalendarDays
} from "lucide-react";
import { useCart, type DiscoverOrderMode } from "@/lib/cart-context";
import { GoogleAuthModal } from "@/components/google-login-modal";
import { QRScannerModal } from "@/components/qr-scanner-modal";
import { FoodTypeBadge, RestaurantCategoryBadge } from "@/components/ui/food-type-badge";
import type { FoodType, RestaurantFoodCategory } from "@/lib/food-classification";
import { getFeeConfigByCurrency } from "@/lib/country-fees";

interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number | null;
  offerBadge?: string | null;
  image: string;
  isVeg: boolean;
  foodType?: FoodType;
  isSpicy?: boolean;
  isChefSpecial?: boolean;
  isPopular?: boolean;
  inStock: boolean;
  variants?: any[];
  addons?: any[];
  tags?: string[];
  taxRate?: number;
}

interface Promotion {
  id: string;
  code: string;
  title: string;
  description: string;
  promo_type: string;
  value: number;
  min_order_value?: number;
  max_discount?: number;
  discountText: string;
}

export default function CafeDetailClient({ slug }: { slug: string }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F7F5EC] dark:bg-[#001F19] flex items-center justify-center p-4">
        <div className="w-full max-w-[430px] md:max-w-2xl space-y-4 animate-pulse">
          <div className="h-12 bg-white dark:bg-[#002D23] rounded-full border border-[#DDE3DD]" />
          <div className="h-28 bg-white dark:bg-[#002D23] rounded-2xl border border-[#DDE3DD]" />
          <div className="h-20 bg-white dark:bg-[#002D23] rounded-2xl border border-[#DDE3DD]" />
          <div className="h-44 bg-white dark:bg-[#002D23] rounded-2xl border border-[#DDE3DD]" />
        </div>
      </div>
    }>
      <CafeDetailContent slug={slug} />
    </Suspense>
  );
}

function CafeDetailContent({ slug }: { slug: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Mode: null (default restaurant page) or "reserve" (reservation flow)
  const initialMode = searchParams.get("mode") === "reserve" ? "reserve" : "browse";
  const [mode, setMode] = useState<"browse" | "reserve">(initialMode);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showAllOffersSheet, setShowAllOffersSheet] = useState(false);
  const [addedItemIds, setAddedItemIds] = useState<Record<string, boolean>>({});

  // Item customization modal
  const [selectedItemForCustomization, setSelectedItemForCustomization] = useState<MenuItem | null>(null);
  const [selectedVariantOptions, setSelectedVariantOptions] = useState<Record<string, {
    groupId: string;
    groupName: string;
    optionId: string;
    optionName: string;
    priceAdjustment: number;
  }>>({});
  const [selectedAddons, setSelectedAddons] = useState<Array<{ id: string; name: string; price: number }>>([]);
  const [customizationQty, setCustomizationQty] = useState(1);

  // 7-Step Guided Reservation Flow state
  const [reservationStep, setReservationStep] = useState<number>(1); // 1: Welcome, 2: Date & Time, 3: Guests, 4: Seating, 5: Contact, 6: Review, 7: Confirmation
  const [bookingDate, setBookingDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [partySize, setPartySize] = useState<number>(2);
  const [seatingPreference, setSeatingPreference] = useState<string>("Indoor");
  const [specialRequest, setSpecialRequest] = useState<string>("");
  const [slots, setSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [bookerName, setBookerName] = useState("");
  const [bookerPhone, setBookerPhone] = useState("");
  const [bookerEmail, setBookerEmail] = useState("");
  const [bookingStatus, setBookingStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [bookingError, setBookingError] = useState("");
  const [confirmedReservation, setConfirmedReservation] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [phoneError, setPhoneError] = useState<string>("");

  // Phone number validator: checks 10-15 digits after removing formatting characters
  const validatePhone = (num: string): boolean => {
    const cleaned = num.replace(/[\s\-()]/g, "");
    // Standard mobile number format: 10 digits (India) or +country code 10-14 digits
    return /^(?:\+?91|0)?[6-9]\d{9}$/.test(cleaned) || /^\+?[1-9]\d{9,14}$/.test(cleaned);
  };

  // Ordering mode: "dine-in" | "takeaway" | "delivery"
  const { orderMode, setOrderMode } = useCart();
  const [orderingMode, setOrderingModeLocal] = useState<DiscoverOrderMode>("dine-in");
  const [verifiedTable, setVerifiedTable] = useState<{ id: string; name: string; section?: string } | null>(null);
  const [tableVerificationError, setTableVerificationError] = useState<string>("");
  const [verifyingTable, setVerifyingTable] = useState<boolean>(false);
  const [showQrScanner, setShowQrScanner] = useState<boolean>(false);

  useEffect(() => {
    if (orderMode) {
      setOrderingModeLocal(orderMode);
    }
  }, [orderMode]);

  // Load saved ordering mode
  useEffect(() => {
    try {
      const saved = localStorage.getItem("cafeflow_ordering_mode") as DiscoverOrderMode;
      if (saved === "dine-in" || saved === "takeaway" || saved === "delivery") {
        setOrderingModeLocal(saved);
        setOrderMode(saved);
      }
    } catch {}
  }, [setOrderMode]);

  const handleSelectOrderingMode = (mode: DiscoverOrderMode) => {
    setOrderingModeLocal(mode);
    setOrderMode(mode);
  };

  // Table QR Verification: Triggered only when URL contains an authentic ?table= token
  useEffect(() => {
    const tableParam = searchParams.get("table");

    if (tableParam) {
      setVerifyingTable(true);
      setTableVerificationError("");

      // Attempt to acquire location if available
      const verifyWithLocation = (lat?: number, lng?: number) => {
        fetch("/api/table-session/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cafeSlug: slug,
            tableToken: tableParam,
            customerLat: lat,
            customerLng: lng
          })
        })
          .then((res) => res.json())
          .then((res) => {
            setVerifyingTable(false);
            if (res.verified) {
              setVerifiedTable(res.table);
              setOrderMode("dine-in");
              setOrderingModeLocal("dine-in");
              setTableVerificationError("");
            } else {
              setTableVerificationError(res.error || "Could not verify table QR code.");
            }
          })
          .catch((err) => {
            setVerifyingTable(false);
            setTableVerificationError("Verification connection failed.");
          });
      };

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => verifyWithLocation(pos.coords.latitude, pos.coords.longitude),
          () => verifyWithLocation(),
          { timeout: 5000, enableHighAccuracy: true }
        );
      } else {
        verifyWithLocation();
      }
    } else {
      // Direct visit without table QR parameter -> do not auto-bind table
      setVerifiedTable(null);
    }
  }, [slug, searchParams]);

  const { addItem, updateQuantity, removeItem, items: cartItems, itemCount, subtotal } = useCart();
  const menuContainerRef = useRef<HTMLDivElement>(null);

  // Load cafe details & menu
  useEffect(() => {
    fetch(`/api/cafes/${slug}`)
      .then((res) => {
        if (!res.ok) throw new Error("Cafe not found");
        return res.json();
      })
      .then((res) => {
        setData(res);
        setLoading(false);
        // Set default seating preference from cafe config if available
        if (res.cafe?.reservationsConfig?.seatingTypes?.length > 0) {
          setSeatingPreference(res.cafe.reservationsConfig.seatingTypes[0]);
        }
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [slug]);

  // Load user profile for pre-filling booking info
  useEffect(() => {
    fetch("/api/user/profile")
      .then((res) => res.json())
      .then((res) => {
        if (res.user) {
          setUserProfile(res.user);
          if (res.user.name) setBookerName(res.user.name);
          if (res.user.phone) setBookerPhone(res.user.phone);
          if (res.user.email) setBookerEmail(res.user.email);
        }
      })
      .catch(() => {});
  }, []);

  // Load reservation slots when in reserve mode or when date/party/seating changes
  useEffect(() => {
    if (!data?.cafe?.id || mode !== "reserve") return;
    const prefParam = encodeURIComponent(seatingPreference || "Any");
    fetch(`/api/reservations?cafeId=${data.cafe.id}&date=${bookingDate}&partySize=${partySize}&seatingPreference=${prefParam}`)
      .then((res) => res.json())
      .then((res) => {
        const fetchedSlots = res.slots || [];
        setSlots(fetchedSlots);
        if (fetchedSlots.length > 0) {
          const firstAvailable = fetchedSlots.find((s: any) => s.available);
          if (firstAvailable && (!selectedSlot || !fetchedSlots.some((s: any) => s.time === selectedSlot && s.available))) {
            setSelectedSlot(firstAvailable.time);
          }
        }
      })
      .catch(console.error);
  }, [data?.cafe?.id, mode, bookingDate, partySize, seatingPreference]);

  const [dietFilter, setDietFilter] = useState<"all" | "veg" | "non_veg" | "egg">("all");

  // Next 7 dates for date picker
  const next7Dates = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      const weekday = i === 0 ? "Today" : d.toLocaleDateString("en-US", { weekday: "short" });
      const dayNum = d.getDate();
      const month = d.toLocaleDateString("en-US", { month: "short" });
      return { dateStr, weekday, dayNum, month };
    });
  }, []);

  // Filtered menu items based on category, dietFilter and scoped search query
  const { allItems, offeredItems, filteredItems } = useMemo(() => {
    const rawItems: MenuItem[] = data?.items || [];
    const q = searchQuery.trim().toLowerCase();

    // 1. Dietary filter
    let dietary = rawItems;
    if (dietFilter !== "all") {
      dietary = rawItems.filter((item) => {
        const type = item.foodType || (item.isVeg ? "veg" : "non_veg");
        return type === dietFilter;
      });
    }

    // 2. Scoped search filter
    let searched = dietary;
    if (q) {
      searched = dietary.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q)
      );
    }

    // 3. Offered Items: products that have an explicit offer badge or valid promotional discount
    const offered = dietary.filter((i) => Boolean(i.offerBadge) || (i.originalPrice && i.originalPrice > i.price));

    // 4. Category filtering
    let categorized = searched;
    if (selectedCategory !== "all") {
      categorized = searched.filter((item) => item.categoryId === selectedCategory);
    }

    return {
      allItems: rawItems,
      offeredItems: offered,
      filteredItems: categorized
    };
  }, [data, searchQuery, selectedCategory, dietFilter]);

  // Open item customization modal with preselected options
  const openCustomizationModal = (item: MenuItem) => {
    setSelectedItemForCustomization(item);
    setCustomizationQty(1);

    const initialVariants: Record<string, any> = {};
    if (Array.isArray(item.variants)) {
      item.variants.forEach((vg: any) => {
        const gId = vg.id || vg.name || "variant";
        if (vg.options && Array.isArray(vg.options) && vg.options.length > 0) {
          const firstOpt = vg.options[0];
          initialVariants[gId] = {
            groupId: gId,
            groupName: vg.name || "Variant",
            optionId: firstOpt.id || firstOpt.name,
            optionName: firstOpt.name,
            priceAdjustment: Number(firstOpt.priceAdjustment) || 0
          };
        } else if (vg.name) {
          initialVariants[gId] = {
            groupId: gId,
            groupName: vg.name,
            optionId: vg.name,
            optionName: vg.name,
            priceAdjustment: Math.max(0, (Number(vg.price) || 0) - (Number(item.price) || 0))
          };
        }
      });
    }
    setSelectedVariantOptions(initialVariants);
    setSelectedAddons([]);
  };

  const openCustomizationIfApplicable = (item: MenuItem) => {
    const hasVariants = Array.isArray(item.variants) && item.variants.length > 0;
    const hasAddons = Array.isArray(item.addons) && item.addons.length > 0;
    if (hasVariants || hasAddons) {
      openCustomizationModal(item);
    }
  };

  // Handle Add Item to Cart
  const handleItemAdd = (item: MenuItem) => {
    if (!verifiedTable) {
      setShowQrScanner(true);
      return;
    }
    const resolvedFoodType = item.foodType || (item.isVeg ? "veg" : "non_veg");
    const hasVariants = Array.isArray(item.variants) && item.variants.length > 0;
    const hasAddons = Array.isArray(item.addons) && item.addons.length > 0;

    if (hasVariants || hasAddons) {
      openCustomizationModal(item);
    } else {
      addItem(
        {
          id: item.id,
          baseItemId: item.id,
          name: item.name,
          price: Math.max(0, Number(item.price) || 0),
          quantity: 1,
          image: item.image,
          foodType: resolvedFoodType,
          isVeg: resolvedFoodType === "veg",
          taxRate: item.taxRate || 0
        },
        {
          id: data.cafe.id,
          name: data.cafe.name,
          slug: data.cafe.slug,
          currency: data.cafe.currency
        }
      );

      setAddedItemIds((prev) => ({ ...prev, [item.id]: true }));
      setTimeout(() => {
        setAddedItemIds((prev) => ({ ...prev, [item.id]: false }));
      }, 1200);
    }
  };

  // Handle Decrementing Item from Cart
  const handleItemDecrement = (item: MenuItem) => {
    const matchingCartItems = cartItems.filter((ci) => ci.id === item.id || ci.id.startsWith(`${item.id}-`));
    if (matchingCartItems.length === 0) return;

    // If only 1 cart entry matches this item base id
    if (matchingCartItems.length === 1) {
      updateQuantity(matchingCartItems[0].id, -1);
    } else {
      // If multiple configurations exist, decrement the most recently added or first
      const target = matchingCartItems[matchingCartItems.length - 1];
      updateQuantity(target.id, -1);
    }
  };

  const handleConfirmCustomization = () => {
    if (!selectedItemForCustomization) return;
    if (!verifiedTable) {
      setSelectedItemForCustomization(null);
      setShowQrScanner(true);
      return;
    }

    const basePrice = Math.max(0, Number(selectedItemForCustomization.price) || 0);
    const variantsDelta = Object.values(selectedVariantOptions).reduce(
      (sum, v: any) => sum + (Number(v?.priceAdjustment) || 0),
      0
    );
    const addonsDelta = selectedAddons.reduce(
      (sum, a) => sum + (Number(a.price) || 0),
      0
    );
    const finalPrice = Math.max(0, basePrice + variantsDelta + addonsDelta);

    const variantNames = Object.values(selectedVariantOptions)
      .map((v: any) => v.optionName)
      .filter(Boolean);
    const variantSubtitle = variantNames.length > 0 ? variantNames.join(", ") : "";
    const variantKey = variantNames.length > 0 ? `-${variantNames.join("-").replace(/\s+/g, "_")}` : "";
    const customId = `${selectedItemForCustomization.id}${variantKey}`;

    const resolvedFoodType = selectedItemForCustomization.foodType || (selectedItemForCustomization.isVeg ? "veg" : "non_veg");

    const primaryOption = Object.values(selectedVariantOptions)[0] as any;
    const legacyVariant = primaryOption ? {
      name: primaryOption.optionName,
      price: finalPrice
    } : null;

    addItem(
      {
        id: customId,
        baseItemId: selectedItemForCustomization.id,
        name: variantSubtitle
          ? `${selectedItemForCustomization.name} (${variantSubtitle})`
          : selectedItemForCustomization.name,
        price: finalPrice,
        quantity: Math.max(1, customizationQty || 1),
        image: selectedItemForCustomization.image,
        foodType: resolvedFoodType,
        isVeg: resolvedFoodType === "veg",
        taxRate: selectedItemForCustomization.taxRate || 0,
        selectedVariant: legacyVariant,
        selectedVariants: selectedVariantOptions,
        selectedAddons: selectedAddons
      },
      {
        id: data.cafe.id,
        name: data.cafe.name,
        slug: data.cafe.slug,
        currency: data.cafe.currency
      }
    );

    setSelectedItemForCustomization(null);
  };

  // Submit Reservation
  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !bookerName || !bookerPhone) return;

    setBookingStatus("loading");
    setBookingError("");

    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cafeId: data.cafe.id,
          customerName: bookerName,
          customerPhone: bookerPhone,
          customerEmail: bookerEmail,
          partySize,
          date: bookingDate,
          time: selectedSlot,
          specialRequests: `Preference: ${seatingPreference}. ${specialRequest}`.trim()
        })
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Reservation failed");
      }

      setConfirmedReservation(resData.reservation);
      setBookingStatus("success");
      return true;
    } catch (err: any) {
      setBookingStatus("error");
      setBookingError(err.message || "Failed to make reservation");
      return false;
    }
  };

  // Customer Dine-in Ordering directly on Discover
  const handleDineInOrder = () => {
    setOrderMode("dine-in");
    setOrderingModeLocal("dine-in");
    const el = document.getElementById("cafe-menu-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F5EC] dark:bg-[#001F19] flex items-center justify-center p-4">
        <div className="w-full max-w-[430px] md:max-w-2xl space-y-4 animate-pulse">
          <div className="h-12 bg-white dark:bg-[#002D23] rounded-full border border-[#DDE3DD]" />
          <div className="h-28 bg-white dark:bg-[#002D23] rounded-2xl border border-[#DDE3DD]" />
          <div className="h-20 bg-white dark:bg-[#002D23] rounded-2xl border border-[#DDE3DD]" />
          <div className="h-44 bg-white dark:bg-[#002D23] rounded-2xl border border-[#DDE3DD]" />
        </div>
      </div>
    );
  }

  if (!data?.cafe) {
    return (
      <div className="min-h-screen bg-[#F7F5EC] dark:bg-[#001F19] flex flex-col items-center justify-center p-4 text-center space-y-3">
        <h2 className="text-lg font-black text-[#0B1714] dark:text-white">Cafe Not Found</h2>
        <p className="text-xs text-[#73716B]">This restaurant is currently unavailable or disabled.</p>
        <Link
          href="/"
          className="px-4 py-2 rounded-full bg-[#002D23] text-white text-xs font-bold"
        >
          Return to Discover
        </Link>
      </div>
    );
  }

  const { cafe, categories, promotions } = data;
  const promoList: Promotion[] = promotions || [];
  const currency = cafe?.currency || "INR";
  const currencySymbol = getFeeConfigByCurrency(currency)?.symbol || currency || "₹";

  return (
    <div className="min-h-screen bg-[#F7F5EC] dark:bg-[#001F19] text-[#0B1714] dark:text-[#F7F5EC]">
      <div className="max-w-[430px] md:max-w-2xl mx-auto pb-32">

        {/* ============================================================ */}
        {/* SECTION 1: STICKY TOP BAR — BACK BUTTON & STICKY SEARCH BAR   */}
        {/* ============================================================ */}
        <header className="sticky top-0 z-40 bg-[#F7F5EC]/95 dark:bg-[#001F19]/95 backdrop-blur-md px-4 py-2.5 border-b border-[#DDE3DD] dark:border-[#002D23] flex items-center gap-2.5 shadow-xs">
          <button
            onClick={() => {
              if (mode === "reserve") setMode("browse");
              else router.back();
            }}
            aria-label="Back"
            className="w-9 h-9 rounded-full bg-white dark:bg-[#002D23] border border-[#DDE3DD] dark:border-[#002D23] text-[#0B1714] dark:text-white flex items-center justify-center shrink-0 shadow-2xs hover:scale-105 active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          </button>

          {/* Scoped Cafe Search Bar */}
          <div className="flex-1 relative flex items-center bg-white dark:bg-[#002D23] rounded-full border border-[#DDE3DD] dark:border-[#002D23] px-3 py-1.5 shadow-2xs focus-within:border-[#002D23]">
            <Search className="w-3.5 h-3.5 text-[#73716B] shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search in ${cafe.name}...`}
              className="w-full bg-transparent px-2 text-[12px] text-[#0B1714] dark:text-white placeholder-[#73716B] focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="w-4 h-4 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-500"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        </header>

        {/* ============================================================ */}
        {/* ============================================================ */}
        {/* MODE B: 7-STEP GUIDED SMART RESERVATION JOURNEY              */}
        {/* ============================================================ */}
        {mode === "reserve" ? (
          <div className="p-4 space-y-4 animate-in fade-in duration-200">
            {/* Progress Bar & Back Control */}
            <div className="flex items-center justify-between gap-3 bg-white dark:bg-[#002D23] p-3 rounded-2xl border border-[#DDE3DD] dark:border-[#002D23] shadow-xs">
              <button
                type="button"
                onClick={() => {
                  if (reservationStep === 1 || reservationStep === 7) {
                    setMode("browse");
                    setReservationStep(1);
                  } else {
                    setReservationStep(reservationStep - 1);
                  }
                }}
                className="flex items-center gap-1 text-xs font-bold text-[#002D23] dark:text-[#34D399]"
              >
                <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
                <span>{reservationStep === 1 || reservationStep === 7 ? "Back to Cafe" : "Back"}</span>
              </button>

              {reservationStep < 7 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-[#73716B]">Step {reservationStep} of 6</span>
                  <div className="w-24 h-2 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#002D23] dark:bg-[#34D399] transition-all duration-300 rounded-full"
                      style={{ width: `${(reservationStep / 6) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* STEP 1: WELCOME */}
            {reservationStep === 1 && (
              <div className="bg-white dark:bg-[#002D23] rounded-3xl p-6 border border-[#DDE3DD] dark:border-[#002D23] text-center space-y-4 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                {cafe.coverImage || cafe.logo ? (
                  <div className="w-24 h-24 rounded-2xl overflow-hidden mx-auto border border-[#DDE3DD] dark:border-[#002D23] shadow-xs">
                    <img src={cafe.coverImage || cafe.logo} alt={cafe.name} className="w-full h-full object-cover" />
                  </div>
                ) : null}
                <div className="space-y-1">
                  <span className="px-3 py-1 rounded-full bg-[#E6F0DD] text-[#002D23] text-[11px] font-extrabold tracking-wide uppercase">
                    Smart Table Booking
                  </span>
                  <h1 className="text-[22px] font-black text-[#0B1714] dark:text-white leading-tight">
                    Let&apos;s find your perfect table
                  </h1>
                  <p className="text-xs text-[#73716B] max-w-xs mx-auto">
                    A few quick details and your table request at <strong className="text-[#0B1714] dark:text-white">{cafe.name}</strong> is ready.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!userProfile) {
                        setShowAuthModal(true);
                        return;
                      }
                      setReservationStep(2);
                    }}
                    className="w-full py-3.5 rounded-full bg-[#002D23] text-white font-extrabold text-sm shadow-md hover:bg-[#001F19] active:scale-98 transition-transform cursor-pointer"
                  >
                    {userProfile ? "Let's go" : "Sign in with Google to Reserve"}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: CHOOSE ARRIVAL DATE AND TIME */}
            {reservationStep === 2 && (
              <div className="bg-white dark:bg-[#002D23] rounded-3xl p-5 border border-[#DDE3DD] dark:border-[#002D23] space-y-4 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                <div>
                  <h2 className="text-[18px] font-black text-[#0B1714] dark:text-white">
                    When are you arriving?
                  </h2>
                  <p className="text-xs text-[#73716B]">
                    Timezone: {cafe.timezone || "Cafe Local Time"} • 90-minute guaranteed reservation
                  </p>
                </div>

                {/* Date Picker */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#73716B] uppercase tracking-wider">Select Date</label>
                  <div className="grid grid-cols-7 gap-1 overflow-x-auto pb-1">
                    {next7Dates.map((item) => {
                      const isSelected = bookingDate === item.dateStr;
                      return (
                        <button
                          key={item.dateStr}
                          type="button"
                          onClick={() => setBookingDate(item.dateStr)}
                          className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                            isSelected
                              ? "bg-[#002D23] text-white border-[#002D23] shadow-xs scale-102"
                              : "bg-[#F7F5EC] dark:bg-[#001F19] text-[#0B1714] dark:text-stone-300 border-[#DDE3DD] dark:border-[#002D23] hover:border-[#002D23]"
                          }`}
                        >
                          <span className="text-[9px] opacity-80">{item.weekday}</span>
                          <span className="text-[13px] font-black mt-0.5">{item.dayNum}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time Slots */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-[#73716B] uppercase tracking-wider">Available Time Slots</label>
                    <span className="text-[10px] text-[#73716B]">90 min block</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                    {slots.length === 0 ? (
                      <p className="col-span-4 text-xs text-[#73716B] text-center py-4">
                        Checking slot availability...
                      </p>
                    ) : (
                      slots.map((slot) => {
                        const isSelected = selectedSlot === slot.time;
                        return (
                          <button
                            key={slot.time}
                            type="button"
                            disabled={!slot.available}
                            onClick={() => setSelectedSlot(slot.time)}
                            className={`py-2.5 rounded-xl text-xs font-bold border transition-all text-center ${
                              !slot.available
                                ? "opacity-30 bg-stone-100 dark:bg-stone-800 border-stone-200 cursor-not-allowed line-through"
                                : isSelected
                                ? "bg-[#002D23] text-white border-[#002D23] shadow-xs"
                                : "bg-[#F7F5EC] dark:bg-[#001F19] text-[#0B1714] dark:text-stone-300 border-[#DDE3DD] dark:border-[#002D23] hover:border-[#002D23]"
                            }`}
                          >
                            {slot.time}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!selectedSlot}
                  onClick={() => setReservationStep(3)}
                  className="w-full py-3.5 rounded-full bg-[#002D23] text-white font-extrabold text-xs shadow-sm disabled:opacity-40 active:scale-98 transition-transform"
                >
                  Continue with {selectedSlot || "a time slot"}
                </button>
              </div>
            )}

            {/* STEP 3: NUMBER OF GUESTS */}
            {reservationStep === 3 && (
              <div className="bg-white dark:bg-[#002D23] rounded-3xl p-5 border border-[#DDE3DD] dark:border-[#002D23] space-y-5 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                <div>
                  <h2 className="text-[18px] font-black text-[#0B1714] dark:text-white">
                    How many guests are joining you?
                  </h2>
                  <p className="text-xs text-[#73716B]">
                    Table capacity is reserved exclusively for your party.
                  </p>
                </div>

                {/* Counter Control */}
                <div className="flex items-center justify-center gap-6 py-6 bg-[#F7F5EC] dark:bg-[#001F19] rounded-2xl border border-[#DDE3DD] dark:border-[#002D23]">
                  <button
                    type="button"
                    disabled={partySize <= (cafe.reservationsConfig?.minGuests || 1)}
                    onClick={() => setPartySize(Math.max(cafe.reservationsConfig?.minGuests || 1, partySize - 1))}
                    className="w-12 h-12 rounded-full bg-white dark:bg-[#002D23] border border-[#DDE3DD] dark:border-[#002D23] flex items-center justify-center font-bold text-lg text-[#002D23] dark:text-[#34D399] shadow-xs disabled:opacity-30 active:scale-90 transition-transform cursor-pointer"
                  >
                    <Minus className="w-5 h-5 stroke-[2.5]" />
                  </button>

                  <div className="text-center min-w-20">
                    <span className="text-4xl font-black text-[#0B1714] dark:text-white">{partySize}</span>
                    <span className="block text-xs font-semibold text-[#73716B] mt-0.5">
                      {partySize === 1 ? "Guest" : "Guests"}
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={partySize >= (cafe.reservationsConfig?.maxGuests || 12)}
                    onClick={() => setPartySize(Math.min(cafe.reservationsConfig?.maxGuests || 12, partySize + 1))}
                    className="w-12 h-12 rounded-full bg-[#002D23] text-white flex items-center justify-center font-bold text-lg shadow-xs disabled:opacity-30 active:scale-90 transition-transform cursor-pointer"
                  >
                    <Plus className="w-5 h-5 stroke-[2.5]" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setReservationStep(4)}
                  className="w-full py-3.5 rounded-full bg-[#002D23] text-white font-extrabold text-xs shadow-sm active:scale-98 transition-transform"
                >
                  Continue for {partySize} {partySize === 1 ? "Guest" : "Guests"}
                </button>
              </div>
            )}

            {/* STEP 4: SEATING PREFERENCE */}
            {reservationStep === 4 && (
              <div className="bg-white dark:bg-[#002D23] rounded-3xl p-5 border border-[#DDE3DD] dark:border-[#002D23] space-y-4 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                <div>
                  <h2 className="text-[18px] font-black text-[#0B1714] dark:text-white">
                    Where would you like to sit?
                  </h2>
                  <p className="text-xs text-[#73716B]">
                    Options configured specifically for {cafe.name}.
                  </p>
                </div>

                {/* Dynamic Seating Cards */}
                <div className="grid grid-cols-1 gap-2.5">
                  {(cafe.reservationsConfig?.seatingTypes || ["Indoor", "Outdoor"]).map((seat: string) => {
                    const isSelected = seatingPreference.toLowerCase() === seat.toLowerCase();
                    return (
                      <button
                        key={seat}
                        type="button"
                        onClick={() => setSeatingPreference(seat)}
                        className={`flex items-center justify-between p-4 rounded-2xl border text-left transition-all ${
                          isSelected
                            ? "bg-[#E6F0DD] dark:bg-[#002D23]/40 border-[#002D23] shadow-xs"
                            : "bg-[#F7F5EC] dark:bg-[#001F19] border-[#DDE3DD] dark:border-[#002D23] hover:border-[#002D23]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            isSelected ? "bg-[#002D23] text-white" : "bg-white dark:bg-[#002D23] text-[#73716B]"
                          }`}>
                            <Armchair className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="font-extrabold text-sm text-[#0B1714] dark:text-white block">
                              {seat} Seating
                            </span>
                            <span className="text-[11px] text-[#73716B]">
                              {seat === "Indoor" ? "Cozy climate-controlled ambiance" : seat === "Outdoor" ? "Fresh open air atmosphere" : "Comfortable designated seating"}
                            </span>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="w-6 h-6 rounded-full bg-[#002D23] text-white flex items-center justify-center">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => setSeatingPreference("Any available seating")}
                    className={`flex items-center justify-between p-4 rounded-2xl border text-left transition-all ${
                      seatingPreference === "Any available seating"
                        ? "bg-[#E6F0DD] dark:bg-[#002D23]/40 border-[#002D23] shadow-xs"
                        : "bg-[#F7F5EC] dark:bg-[#001F19] border-[#DDE3DD] dark:border-[#002D23] hover:border-[#002D23]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#002D23] flex items-center justify-center text-[#73716B]">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="font-extrabold text-sm text-[#0B1714] dark:text-white block">
                          Any available seating
                        </span>
                        <span className="text-[11px] text-[#73716B]">Host assigns first available table</span>
                      </div>
                    </div>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setReservationStep(5)}
                  className="w-full py-3.5 rounded-full bg-[#002D23] text-white font-extrabold text-xs shadow-sm active:scale-98 transition-transform"
                >
                  Continue with {seatingPreference}
                </button>
              </div>
            )}

            {/* STEP 5: CONTACT DETAILS */}
            {reservationStep === 5 && (
              <div className="bg-white dark:bg-[#002D23] rounded-3xl p-5 border border-[#DDE3DD] dark:border-[#002D23] space-y-4 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                <div>
                  <h2 className="text-[18px] font-black text-[#0B1714] dark:text-white">
                    Contact Details
                  </h2>
                  <p className="text-xs text-[#73716B]">
                    {userProfile ? "Prefilled from your verified CafeFlow account." : "Enter your contact info to receive SMS confirmation."}
                  </p>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[#73716B] mb-1 font-bold">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={bookerName}
                      onChange={(e) => setBookerName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#DDE3DD] dark:border-[#002D23] bg-transparent text-[#0B1714] dark:text-white focus:outline-none focus:border-[#002D23]"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[#73716B] font-bold">Phone Number *</label>
                      <span className="text-[10px] text-stone-400">10-digit mobile number</span>
                    </div>
                    <input
                      type="tel"
                      required
                      value={bookerPhone}
                      onChange={(e) => {
                        // Allow digits, +, spaces, hyphens
                        const val = e.target.value.replace(/[^0-9+\s\-]/g, "");
                        setBookerPhone(val);
                        if (val && !validatePhone(val)) {
                          setPhoneError("Please enter a valid 10-digit mobile number");
                        } else {
                          setPhoneError("");
                        }
                      }}
                      placeholder="+91 98765 43210"
                      className={`w-full px-3.5 py-2.5 rounded-xl border bg-transparent text-[#0B1714] dark:text-white focus:outline-none transition-colors ${
                        phoneError
                          ? "border-rose-500 focus:border-rose-600 bg-rose-50/10"
                          : "border-[#DDE3DD] dark:border-[#002D23] focus:border-[#002D23]"
                      }`}
                    />
                    {phoneError && (
                      <p className="mt-1 text-[11px] text-rose-500 font-semibold">{phoneError}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[#73716B] mb-1 font-bold">Email Address (Optional)</label>
                    <input
                      type="email"
                      value={bookerEmail}
                      onChange={(e) => setBookerEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#DDE3DD] dark:border-[#002D23] bg-transparent text-[#0B1714] dark:text-white focus:outline-none focus:border-[#002D23]"
                    />
                  </div>

                  <div>
                    <label className="block text-[#73716B] mb-1 font-bold">Special Requests (Optional)</label>
                    <input
                      type="text"
                      value={specialRequest}
                      onChange={(e) => setSpecialRequest(e.target.value)}
                      placeholder="e.g. Birthday celebration, quiet corner..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#DDE3DD] dark:border-[#002D23] bg-transparent text-[#0B1714] dark:text-white focus:outline-none focus:border-[#002D23]"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!bookerName.trim() || !bookerPhone.trim() || !validatePhone(bookerPhone)}
                  onClick={() => {
                    if (!userProfile) {
                      setShowAuthModal(true);
                      return;
                    }
                    if (!validatePhone(bookerPhone)) {
                      setPhoneError("Please enter a valid 10-digit mobile number");
                      return;
                    }
                    setReservationStep(6);
                  }}
                  className="w-full py-3.5 rounded-full bg-[#002D23] text-white font-extrabold text-xs shadow-sm disabled:opacity-40 active:scale-98 transition-transform cursor-pointer"
                >
                  Review Reservation
                </button>
              </div>
            )}

            {/* STEP 6: REVIEW YOUR RESERVATION */}
            {reservationStep === 6 && (
              <div className="bg-white dark:bg-[#002D23] rounded-3xl p-5 border border-[#DDE3DD] dark:border-[#002D23] space-y-4 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                <div>
                  <h2 className="text-[18px] font-black text-[#0B1714] dark:text-white">
                    Review Your Reservation
                  </h2>
                  <p className="text-xs text-[#73716B]">
                    Please verify your reservation summary before locking.
                  </p>
                </div>

                <div className="bg-[#F7F5EC] dark:bg-[#001F19] rounded-2xl p-4 text-xs space-y-2.5 border border-[#DDE3DD] dark:border-[#002D23]">
                  <div className="flex justify-between">
                    <span className="text-[#73716B]">Cafe</span>
                    <strong className="text-[#0B1714] dark:text-white">{cafe.name}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#73716B]">Date &amp; Time</span>
                    <strong className="text-[#0B1714] dark:text-white">{bookingDate} at {selectedSlot}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#73716B]">Duration</span>
                    <strong className="text-[#0B1714] dark:text-white">90 Minutes (Occupancy Lock)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#73716B]">Guests</span>
                    <strong className="text-[#0B1714] dark:text-white">{partySize} {partySize === 1 ? "Person" : "People"}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#73716B]">Seating Preference</span>
                    <strong className="text-[#0B1714] dark:text-white">{seatingPreference}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#73716B]">Primary Guest</span>
                    <strong className="text-[#0B1714] dark:text-white">{bookerName} ({bookerPhone})</strong>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-[11px] space-y-1">
                  <p className="font-bold">Reservation Policy:</p>
                  <p>Tables are held for 15 minutes past arrival time. Ordering food requires separate table QR session scan upon arrival.</p>
                </div>

                {bookingError && (
                  <p className="text-rose-600 bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl text-xs font-semibold">
                    {bookingError}
                  </p>
                )}

                <button
                  type="button"
                  disabled={bookingStatus === "loading"}
                  onClick={async (e) => {
                    const success = await handleConfirmBooking(e);
                    if (success) {
                      setReservationStep(7);
                    }
                  }}
                  className="w-full py-4 rounded-full bg-[#002D23] text-white font-extrabold text-sm shadow-md disabled:opacity-50 active:scale-98 transition-transform cursor-pointer"
                >
                  {bookingStatus === "loading" ? "Locking Table..." : "Confirm Reservation"}
                </button>
              </div>
            )}

            {/* STEP 7: CONFIRMATION */}
            {reservationStep === 7 && confirmedReservation && (
              <div className="bg-white dark:bg-[#002D23] rounded-3xl p-6 border border-[#DDE3DD] dark:border-[#002D23] text-center space-y-4 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                <div className="w-14 h-14 rounded-full bg-[#E6F0DD] text-[#002D23] flex items-center justify-center mx-auto shadow-xs">
                  <Check className="w-7 h-7 stroke-[3]" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-[20px] font-black text-[#0B1714] dark:text-white">
                    Reservation Confirmed!
                  </h2>
                  <p className="text-xs text-[#73716B]">
                    Your table is locked and waiting for you at {cafe.name}.
                  </p>
                </div>

                <div className="bg-[#F7F5EC] dark:bg-[#001F19] rounded-2xl p-4 text-xs text-left space-y-2 border border-[#DDE3DD] dark:border-[#002D23]">
                  <div className="flex justify-between">
                    <span className="text-[#73716B]">Reference ID</span>
                    <strong className="text-[#0B1714] dark:text-white font-mono">{confirmedReservation.id}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#73716B]">Arrival</span>
                    <strong className="text-[#0B1714] dark:text-white">{confirmedReservation.date} at {confirmedReservation.time}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#73716B]">Duration</span>
                    <strong className="text-[#0B1714] dark:text-white">90 minutes</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#73716B]">Guests</span>
                    <strong className="text-[#0B1714] dark:text-white">{confirmedReservation.partySize} Guests</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#73716B]">Guest Name</span>
                    <strong className="text-[#0B1714] dark:text-white">{confirmedReservation.customerName}</strong>
                  </div>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("browse");
                      setReservationStep(1);
                      setBookingStatus("idle");
                    }}
                    className="w-full py-3 rounded-full bg-[#002D23] text-white text-xs font-extrabold shadow-sm"
                  >
                    Back to Cafe
                  </button>
                  <Link
                    href={`/cafe/${slug}`}
                    onClick={() => {
                      setMode("browse");
                      setReservationStep(1);
                    }}
                    className="w-full py-3 rounded-full border border-[#002D23] text-[#002D23] dark:text-[#34D399] text-xs font-extrabold text-center"
                  >
                    Explore Menu
                  </Link>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ============================================================ */
          /* MODE A: RESTAURANT DETAIL & IN-CAFE ORDERING PAGE            */
          /* ============================================================ */
          <div className="p-4 space-y-5 animate-in fade-in duration-150">

            {/* ============================================================ */}
            {/* SECTION 2: COMPACT CAFE INFORMATION                           */}
            {/* ============================================================ */}
            <section aria-label="Cafe Information" className="bg-white dark:bg-[#002D23] rounded-2xl p-4 border border-[#DDE3DD] dark:border-[#002D23] shadow-xs space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-[20px] font-black text-[#0B1714] dark:text-white leading-tight truncate">
                      {cafe.name}
                    </h1>
                    {cafe.foodCategory && (
                      <RestaurantCategoryBadge category={cafe.foodCategory} size="sm" />
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-[#73716B] dark:text-stone-300">
                    {cafe.rating !== null ? (
                      <div className="flex items-center gap-1 font-bold text-[#0B1714] dark:text-white">
                        <Star className="w-3.5 h-3.5 fill-[#002D23] text-[#002D23] dark:fill-[#34D399] dark:text-[#34D399]" />
                        <span>{cafe.rating.toFixed(1)}</span>
                        <span className="text-[#73716B] font-normal text-[11px]">({cafe.reviewCount} reviews)</span>
                      </div>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-[#E6F0DD] text-[#002D23] font-extrabold text-[10px]">
                        New on CafeFlow
                      </span>
                    )}
                    <span>•</span>
                    <span className="truncate">{cafe.address || "Partner Cafe"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-[#73716B] pt-0.5">
                    {cafe.isOpen ? (
                      <span className="flex items-center gap-1 font-bold text-[#002D23] dark:text-[#34D399]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#34D399]" />
                        Open now
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 font-bold text-stone-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                        Closed
                      </span>
                    )}
                    {cafe.businessHours && (
                      <>
                        <span>•</span>
                        <span>{cafe.businessHours}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Compact Restaurant Thumbnail */}
                {cafe.logo || cafe.coverImage ? (
                  <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 bg-stone-100 dark:bg-stone-800 border border-[#DDE3DD] dark:border-[#002D23]">
                    <img
                      src={cafe.logo || cafe.coverImage}
                      alt={cafe.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : null}
              </div>

              {/* Table Verification & Ordering Mode Selector */}
              <div className="pt-2 border-t border-[#DDE3DD] dark:border-[#002D23] space-y-2.5">
                {verifyingTable && (
                  <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    <span>Verifying table QR session...</span>
                  </div>
                )}

                {tableVerificationError && (
                  <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 text-xs">
                    {tableVerificationError}
                  </div>
                )}

                {verifiedTable ? (
                  <div className="p-3 rounded-xl bg-[#E6F0DD] dark:bg-[#002D23]/40 border border-[#002D23]/30 text-[#002D23] dark:text-[#34D399] text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 shrink-0 text-[#002D23] dark:text-[#34D399]" />
                      <span className="font-extrabold">Verified Table: {verifiedTable.name}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-[#002D23] text-white text-[10px] font-bold">
                      Dine-in Table Service
                    </span>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-[#1E2E27] border border-amber-200/60 dark:border-[#002D23] text-[#0B1714] dark:text-stone-300 text-xs flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <QrCode className="w-4 h-4 text-[#002D23] dark:text-[#34D399] shrink-0" />
                      <span className="text-[12px] text-[#73716B] dark:text-stone-300">
                        Browsing menu. Scan table QR code to order.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowQrScanner(true)}
                      className="px-3 py-1 rounded-full bg-[#002D23] dark:bg-[#34D399] text-white dark:text-[#001F19] text-[11px] font-bold shrink-0 shadow-2xs active:scale-95 transition-transform cursor-pointer"
                    >
                      Scan QR
                    </button>
                  </div>
                )}
              </div>
            </section>

            {/* ============================================================ */}
            {/* SECTION 3: HORIZONTALLY SCROLLABLE OFFERS                     */}
            {/* Treatment: [ Flat ₹125 OFF ]  ...  [ 6 Offers ⌄ ]            */}
            {/* ============================================================ */}
            {promoList.length > 0 && (
              <section aria-label="Available Offers" className="space-y-2">
                <div className="flex items-center justify-between px-0.5">
                  <div className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-[#002D23] dark:text-[#34D399]" />
                    <span className="text-[13px] font-extrabold text-[#0B1714] dark:text-white">
                      Deals &amp; Offers
                    </span>
                  </div>
                  {/* Dropdown button for all offers */}
                  <button
                    onClick={() => setShowAllOffersSheet(true)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FEF7E8] dark:bg-[#1D2B24] border border-[#F3E5CB] dark:border-[#2D4539] text-[11px] font-bold text-[#B7791F] dark:text-[#E7A642] active:scale-95 transition-transform"
                  >
                    <span>{promoList.length} Offers</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>

                {/* Horizontal Offer Cards Carousel */}
                <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-0.5 snap-x">
                  {promoList.map((promo) => (
                    <div
                      key={promo.id}
                      onClick={() => setShowAllOffersSheet(true)}
                      className="cursor-pointer shrink-0 snap-start w-64 bg-[#FEF7E8] dark:bg-[#1D2B24] border border-[#F3E5CB] dark:border-[#2D4539] rounded-2xl p-3 space-y-1 shadow-2xs hover:border-[#B7791F] transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-md bg-[#002D23] text-white text-[9px] font-extrabold uppercase tracking-wide">
                          {promo.discountText}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-[#73716B]">
                          {promo.code}
                        </span>
                      </div>
                      <p className="text-[12px] font-extrabold text-[#0B1714] dark:text-white leading-tight truncate">
                        {promo.title}
                      </p>
                      <p className="text-[10px] text-[#73716B] dark:text-stone-400 line-clamp-1">
                        {promo.description}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ============================================================ */}
            {/* SECTION 4: OFFERED ITEMS                                     */}
            {/* Products qualifying for active offers                         */}
            {/* ============================================================ */}
            {offeredItems.length > 0 && (
              <section aria-label="Offered Items" className="space-y-2.5">
                <div className="flex items-baseline justify-between px-0.5">
                  <h2 className="text-[16px] font-black text-[#0B1714] dark:text-white tracking-tight flex items-center gap-1.5">
                    Offered Items
                    <Sparkles className="w-3.5 h-3.5 text-[#E7A642]" />
                  </h2>
                  <span className="text-[11px] text-[#73716B] font-medium">
                    Special promotional prices
                  </span>
                </div>

                {/* Horizontal scroll of compact offered food cards */}
                <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1 snap-x">
                  {offeredItems.map((item) => {
                    const inCartQty = cartItems
                      .filter((ci) => ci.id === item.id || ci.id.startsWith(`${item.id}-`))
                      .reduce((sum, ci) => sum + ci.quantity, 0);
                    const isJustAdded = addedItemIds[item.id];

                    return (
                      <div
                        key={item.id}
                        className="w-40 shrink-0 snap-start bg-white dark:bg-[#002D23] rounded-2xl border border-[#DDE3DD] dark:border-[#002D23] overflow-hidden shadow-2xs flex flex-col justify-between"
                      >
                        <div
                          onClick={() => openCustomizationIfApplicable(item)}
                          className="relative aspect-square w-full bg-stone-100 dark:bg-stone-800 overflow-hidden cursor-pointer group"
                        >
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            loading="lazy"
                          />
                          {item.offerBadge && (
                            <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-full bg-[#002D23] text-white text-[8px] font-extrabold uppercase">
                              {item.offerBadge}
                            </span>
                          )}
                        </div>
                        <div className="p-2.5 space-y-1">
                          <h3
                            onClick={() => openCustomizationIfApplicable(item)}
                            className="font-extrabold text-[12px] text-[#0B1714] dark:text-white leading-tight truncate cursor-pointer flex items-center gap-1.5"
                          >
                            <FoodTypeBadge foodType={item.foodType} isVeg={item.isVeg} size="sm" />
                            <span className="truncate">{item.name}</span>
                          </h3>
                          <div className="flex items-center justify-between pt-0.5">
                            <div className="flex items-baseline gap-1">
                              <span className="font-black text-[13px] text-[#0B1714] dark:text-white">
                                {currencySymbol}{item.price}
                              </span>
                              {item.originalPrice && (
                                <span className="text-[10px] text-[#73716B] line-through">
                                  {currencySymbol}{item.originalPrice}
                                </span>
                              )}
                            </div>
                            {verifiedTable ? (
                              inCartQty > 0 ? (
                                <div className="flex items-center gap-1 border border-[#002D23] rounded-full px-1.5 py-0.5 bg-[#E6F0DD] dark:bg-[#002D23]/40 shrink-0">
                                  <button
                                    onClick={() => handleItemDecrement(item)}
                                    className="text-[#002D23] dark:text-[#34D399]"
                                  >
                                    <Minus className="w-2.5 h-2.5 stroke-[2.5]" />
                                  </button>
                                  <span className="text-[10px] font-black text-[#002D23] dark:text-white w-3 text-center">
                                    {inCartQty}
                                  </span>
                                  <button
                                    onClick={() => handleItemAdd(item)}
                                    className="text-[#002D23] dark:text-[#34D399]"
                                  >
                                    <Plus className="w-2.5 h-2.5 stroke-[2.5]" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleItemAdd(item)}
                                  aria-label={`Add ${item.name}`}
                                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 shadow-2xs transition-all active:scale-90 cursor-pointer ${
                                    isJustAdded
                                      ? "bg-[#002D23] text-white"
                                      : "bg-white dark:bg-[#001F19] border border-[#DDE3DD] dark:border-[#002D23] text-[#002D23] dark:text-[#34D399]"
                                  }`}
                                >
                                  {isJustAdded ? <Check className="w-3 h-3 stroke-[2.5]" /> : <Plus className="w-3 h-3 stroke-[2.5]" />}
                                </button>
                              )
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ============================================================ */}
            {/* SECTION 5: ALL ITEMS — COMPLETE CAFE MENU                    */}
            {/* Organized by category chips, real items with variants/addons */}
            {/* ============================================================ */}
            <section id="cafe-menu-section" ref={menuContainerRef} aria-label="Cafe Menu" className="space-y-3 pt-1">
              <div className="flex items-center justify-between px-0.5">
                <h2 className="text-[17px] font-black text-[#0B1714] dark:text-white tracking-tight">
                  All Items
                </h2>
                <span className="text-[11px] text-[#73716B]">
                  {filteredItems.length} items
                </span>
              </div>

              {/* Category Pills Selector & Dietary Filters */}
              <div className="space-y-2">
                {categories && categories.length > 0 && (
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                    <button
                      onClick={() => setSelectedCategory("all")}
                      className={`px-3.5 py-1.5 rounded-full text-[12px] font-bold whitespace-nowrap border transition-all ${
                        selectedCategory === "all"
                          ? "bg-[#002D23] text-white border-[#002D23] shadow-xs"
                          : "bg-white dark:bg-[#002D23] text-[#0B1714] dark:text-stone-300 border-[#DDE3DD] dark:border-[#002D23]"
                      }`}
                    >
                      All Categories
                    </button>
                    {categories.map((cat: any) => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap border transition-all ${
                          selectedCategory === cat.id
                            ? "bg-[#002D23] text-white border-[#002D23] shadow-xs"
                            : "bg-white dark:bg-[#002D23] text-[#0B1714] dark:text-stone-300 border-[#DDE3DD] dark:border-[#002D23]"
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                )}

                {/* Dietary Filter Chips */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                  <button
                    onClick={() => setDietFilter("all")}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-all shrink-0 ${
                      dietFilter === "all"
                        ? "bg-[#002D23] text-white border-[#002D23]"
                        : "bg-white dark:bg-[#002D23] text-[#73716B] border-[#DDE3DD] dark:border-[#002D23]"
                    }`}
                  >
                    All Food
                  </button>

                  <button
                    onClick={() => setDietFilter(dietFilter === "veg" ? "all" : "veg")}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-all shrink-0 flex items-center gap-1.5 ${
                      dietFilter === "veg"
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white dark:bg-[#002D23] text-[#0B1714] dark:text-white border-[#DDE3DD] dark:border-[#002D23]"
                    }`}
                  >
                    <FoodTypeBadge foodType="veg" size="sm" />
                    <span>Veg</span>
                  </button>

                  {cafe.foodCategory !== "pure_veg" && (
                    <button
                      onClick={() => setDietFilter(dietFilter === "egg" ? "all" : "egg")}
                      className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-all shrink-0 flex items-center gap-1.5 ${
                        dietFilter === "egg"
                          ? "bg-amber-600 text-white border-amber-600"
                          : "bg-white dark:bg-[#002D23] text-[#0B1714] dark:text-white border-[#DDE3DD] dark:border-[#002D23]"
                      }`}
                    >
                      <FoodTypeBadge foodType="egg" size="sm" />
                      <span>Egg</span>
                    </button>
                  )}

                  {cafe.foodCategory !== "pure_veg" && cafe.foodCategory !== "veg_egg" && (
                    <button
                      onClick={() => setDietFilter(dietFilter === "non_veg" ? "all" : "non_veg")}
                      className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-all shrink-0 flex items-center gap-1.5 ${
                        dietFilter === "non_veg"
                          ? "bg-red-600 text-white border-red-600"
                          : "bg-white dark:bg-[#002D23] text-[#0B1714] dark:text-white border-[#DDE3DD] dark:border-[#002D23]"
                      }`}
                    >
                      <FoodTypeBadge foodType="non_veg" size="sm" />
                      <span>Non-Veg</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2.5">
                {filteredItems.length === 0 ? (
                  <div className="bg-white dark:bg-[#002D23] rounded-2xl p-8 text-center border border-[#DDE3DD] dark:border-[#002D23] space-y-2">
                    <p className="text-xs font-bold text-[#0B1714] dark:text-white">
                      No menu items match your criteria
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery("")}
                          className="px-3 py-1 bg-[#002D23] text-white text-[11px] font-bold rounded-full"
                        >
                          Clear Search
                        </button>
                      )}
                      {dietFilter !== "all" && (
                        <button
                          onClick={() => setDietFilter("all")}
                          className="px-3 py-1 bg-stone-200 dark:bg-stone-700 text-[#0B1714] dark:text-white text-[11px] font-bold rounded-full"
                        >
                          Clear Diet Filter
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  filteredItems.map((item) => {
                    const inCartQty = cartItems
                      .filter((ci) => ci.id === item.id || ci.id.startsWith(`${item.id}-`))
                      .reduce((sum, ci) => sum + ci.quantity, 0);
                    const isJustAdded = addedItemIds[item.id];
                    const hasVariants = (item.variants && item.variants.length > 0) || (item.addons && item.addons.length > 0);

                    return (
                      <div
                        key={item.id}
                        className="bg-white dark:bg-[#002D23] rounded-2xl p-3 border border-[#DDE3DD] dark:border-[#002D23] shadow-2xs flex items-center justify-between gap-3 hover:border-[#D0CEBF] transition-all"
                      >
                        {/* Food Image (Clickable for customization / details) */}
                        <div
                          onClick={() => openCustomizationIfApplicable(item)}
                          className="relative w-20 h-20 rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-800 shrink-0 cursor-pointer group"
                        >
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            loading="lazy"
                          />
                          {item.offerBadge && (
                            <span className="absolute top-1 left-1 px-1.5 py-0.2 rounded-full bg-[#002D23] text-white text-[8px] font-extrabold uppercase">
                              {item.offerBadge}
                            </span>
                          )}
                        </div>

                        {/* Middle Details (Clickable for customization / details) */}
                        <div
                          onClick={() => openCustomizationIfApplicable(item)}
                          className="flex-1 min-w-0 space-y-0.5 cursor-pointer"
                        >
                          <div className="flex items-center gap-1.5">
                            <FoodTypeBadge foodType={item.foodType} isVeg={item.isVeg} size="sm" />
                            <h3 className="font-extrabold text-[14px] text-[#0B1714] dark:text-white leading-tight truncate">
                              {item.name}
                            </h3>
                            {item.isPopular && (
                              <span className="px-1.5 py-0.2 rounded bg-[#FEF7E8] text-[#E7A642] text-[8px] font-extrabold">
                                Bestseller
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#73716B] dark:text-stone-400 line-clamp-2 leading-tight">
                            {item.description}
                          </p>
                          <div className="flex items-baseline gap-1.5 pt-0.5">
                            <span className="font-black text-[14px] text-[#0B1714] dark:text-white">
                              {currencySymbol}{item.price}
                            </span>
                            {item.originalPrice && (
                              <span className="text-[11px] text-[#73716B] line-through">
                                {currencySymbol}{item.originalPrice}
                              </span>
                            )}
                            {hasVariants && (
                              <span className="text-[9px] font-semibold text-[#002D23] dark:text-[#34D399]">
                                Customisable
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right: Quantity Stepper or Add button - only when verified at table */}
                        {verifiedTable ? (
                          inCartQty > 0 ? (
                            <div className="flex items-center gap-1.5 border border-[#002D23] dark:border-[#34D399] rounded-xl px-2 py-1 bg-[#E6F0DD] dark:bg-[#002D23]/40 shrink-0">
                              <button
                                onClick={() => handleItemDecrement(item)}
                                aria-label={`Decrease ${item.name}`}
                                className="p-0.5 text-[#002D23] dark:text-[#34D399] hover:opacity-75 cursor-pointer"
                              >
                                <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                              </button>
                              <span className="text-xs font-black text-[#002D23] dark:text-white w-4 text-center">
                                {inCartQty}
                              </span>
                              <button
                                onClick={() => handleItemAdd(item)}
                                aria-label={`Increase ${item.name}`}
                                className="p-0.5 text-[#002D23] dark:text-[#34D399] hover:opacity-75 cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleItemAdd(item)}
                              aria-label={`Add ${item.name}`}
                              className={`px-3 py-1.5 rounded-xl border flex items-center justify-center gap-1 shrink-0 active:scale-95 transition-all cursor-pointer ${
                                isJustAdded
                                  ? "bg-[#002D23] text-white border-[#002D23]"
                                  : "bg-white dark:bg-[#001F19] text-[#002D23] dark:text-[#34D399] border-[#DDE3DD] dark:border-[#002D23] hover:border-[#002D23]"
                              }`}
                            >
                              {isJustAdded ? (
                                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                              ) : (
                                <>
                                  <span className="text-[12px] font-black uppercase">Add</span>
                                  <Plus className="w-3 h-3 stroke-[2.5]" />
                                </>
                              )}
                            </button>
                          )
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            </section>

          </div>
        )}

        {/* ============================================================ */}
        {/* SECTION 6: PERSISTENT MODE-SPECIFIC CTA BAR                   */}
        {/* Distinct Mode A (Dine-in Order) and Mode B (Reserve Table)   */}
        {/* ============================================================ */}
        {mode === "browse" && (
          <aside aria-label="Order or Reserve Actions" className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#001F19]/95 backdrop-blur-md border-t border-[#DDE3DD] dark:border-[#002D23] p-3 px-4 safe-area-pb">
            {!verifiedTable ? (
              /* Direct/Normal Visitor: Show Reserve Table and Scan QR Code */
              <div className="max-w-[430px] md:max-w-2xl mx-auto flex items-center gap-2.5">
                {cafe.reservationsConfig?.enabled !== false && (
                  <button
                    onClick={() => {
                      setMode("reserve");
                      setReservationStep(1);
                    }}
                    className="flex-1 py-3 px-3 rounded-full bg-white dark:bg-[#002D23] text-[#002D23] dark:text-[#34D399] border-2 border-[#002D23] dark:border-[#34D399] font-extrabold text-[13px] shadow-xs active:scale-98 transition-transform cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <CalendarDays className="w-4 h-4" />
                    <span>Reserve Table</span>
                  </button>
                )}
                <button
                  onClick={() => setShowQrScanner(true)}
                  className="flex-1 py-3 px-3 rounded-full bg-[#002D23] hover:bg-[#001F19] text-white font-extrabold text-[13px] shadow-md active:scale-98 transition-transform cursor-pointer flex items-center justify-center gap-1.5 text-center"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Scan QR Code</span>
                </button>
              </div>
            ) : (
              /* Verified Table Visitor: Order or View Cart */
              <div className="max-w-[430px] md:max-w-2xl mx-auto flex items-center gap-3">
                <Link
                  href={searchParams.get("table") ? `/cart?table=${searchParams.get("table")}` : "/cart"}
                  className="w-full py-3.5 rounded-full bg-[#002D23] hover:bg-[#001F19] text-white font-extrabold text-[14px] shadow-md flex items-center justify-center gap-2 active:scale-98 transition-transform text-center"
                >
                  <UtensilsCrossed className="w-4 h-4" />
                  <span>
                    {itemCount > 0
                      ? `View Cart (${itemCount}) • ${currencySymbol}${subtotal.toFixed(0)}`
                      : `Order at Table ${verifiedTable.name}`}
                  </span>
                </Link>
              </div>
            )}
          </aside>
        )}

      </div>

      {/* ============================================================ */}
      {/* 6 OFFERS / ALL OFFERS BOTTOM SHEET                           */}
      {/* ============================================================ */}
      {showAllOffersSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-[#002D23] rounded-t-[28px] p-5 space-y-4 max-h-[80vh] overflow-y-auto border-t border-[#DDE3DD] dark:border-[#002D23] shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-[#DDE3DD] dark:border-[#002D23]">
              <div>
                <h3 className="font-black text-[16px] text-[#0B1714] dark:text-white">
                  Available Offers at {cafe.name}
                </h3>
                <p className="text-xs text-[#73716B]">{promoList.length} discounts valid today</p>
              </div>
              <button
                onClick={() => setShowAllOffersSheet(false)}
                className="w-7 h-7 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {promoList.map((promo) => (
                <div
                  key={promo.id}
                  className="bg-[#FEF7E8] dark:bg-[#1D2B24] border border-[#F3E5CB] dark:border-[#2D4539] rounded-2xl p-3.5 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-md bg-[#002D23] text-white text-[10px] font-extrabold uppercase">
                      {promo.discountText}
                    </span>
                    <span className="font-mono text-xs font-bold text-[#002D23] dark:text-[#34D399] bg-white dark:bg-[#001F19] px-2 py-0.5 rounded border border-[#DDE3DD] dark:border-[#002D23]">
                      {promo.code}
                    </span>
                  </div>
                  <h4 className="font-extrabold text-[13px] text-[#0B1714] dark:text-white">
                    {promo.title}
                  </h4>
                  <p className="text-[11px] text-[#73716B] dark:text-stone-400">
                    {promo.description}
                  </p>
                  <div className="pt-1 flex items-center justify-between text-[10px] text-[#73716B]">
                    <span>Min order: {currencySymbol}{promo.min_order_value || 0}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(promo.code);
                        alert(`Copied code: ${promo.code}`);
                      }}
                      className="font-bold text-[#002D23] dark:text-[#34D399] hover:underline"
                    >
                      Copy Code
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* ITEM CUSTOMIZATION MODAL SHEET                               */}
      {/* ============================================================ */}
      {selectedItemForCustomization && (() => {
        const modalBasePrice = Math.max(0, Number(selectedItemForCustomization.price) || 0);
        const modalVariantsDelta = Object.values(selectedVariantOptions).reduce(
          (sum, v: any) => sum + (Number(v?.priceAdjustment) || 0),
          0
        );
        const modalAddonsDelta = selectedAddons.reduce(
          (sum, a) => sum + (Number(a.price) || 0),
          0
        );
        const modalUnitPrice = Math.max(0, modalBasePrice + modalVariantsDelta + modalAddonsDelta);
        const modalTotalPrice = modalUnitPrice * Math.max(1, customizationQty || 1);

        return (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-white dark:bg-[#002D23] rounded-t-3xl sm:rounded-3xl border border-[#DDE3DD] dark:border-[#002D23] p-5 space-y-4 max-h-[88vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom duration-250"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between pb-3 border-b border-[#DDE3DD] dark:border-[#002D23]">
                <div className="space-y-1 pr-3 min-w-0">
                  <div className="flex items-center gap-2">
                    <FoodTypeBadge
                      foodType={selectedItemForCustomization.foodType}
                      isVeg={selectedItemForCustomization.isVeg}
                      size="sm"
                    />
                    <h3 className="font-extrabold text-[17px] text-[#0B1714] dark:text-white leading-tight truncate">
                      Customize {selectedItemForCustomization.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#73716B] dark:text-[#A8A29E]">
                    <span>Base Price: <strong className="text-[#0B1714] dark:text-white">{currencySymbol}{modalBasePrice}</strong></span>
                    <span>•</span>
                    <span>Select options &amp; add-ons</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedItemForCustomization(null)}
                  aria-label="Close"
                  className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 flex items-center justify-center text-stone-600 dark:text-stone-300 transition-colors shrink-0 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Variant Groups */}
              {selectedItemForCustomization.variants && selectedItemForCustomization.variants.length > 0 && (
                <div className="space-y-4">
                  {selectedItemForCustomization.variants.map((vg: any) => {
                    const groupId = vg.id || vg.name;
                    const currentSelection = selectedVariantOptions[groupId];
                    const optionsList: any[] = Array.isArray(vg.options) && vg.options.length > 0
                      ? vg.options
                      : (vg.name ? [{ id: vg.name, name: vg.name, priceAdjustment: Math.max(0, (Number(vg.price) || 0) - modalBasePrice) }] : []);

                    if (optionsList.length === 0) return null;

                    return (
                      <div key={groupId} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-[#52504B] dark:text-[#D1C7B7] uppercase tracking-wider">
                            {vg.name || "Select Variant"}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-[#006B4F] dark:text-emerald-300 border border-emerald-200/60">
                            {vg.required !== false ? "Required · 1 Option" : "Optional"}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {optionsList.map((opt: any) => {
                            const optId = opt.id || opt.name;
                            const isSelected = currentSelection?.optionId === optId;
                            const adj = Number(opt.priceAdjustment) || 0;

                            return (
                              <button
                                key={optId}
                                type="button"
                                onClick={() => {
                                  setSelectedVariantOptions((prev) => ({
                                    ...prev,
                                    [groupId]: {
                                      groupId,
                                      groupName: vg.name,
                                      optionId: optId,
                                      optionName: opt.name,
                                      priceAdjustment: adj
                                    }
                                  }));
                                }}
                                className={`flex items-center justify-between p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                                  isSelected
                                    ? "border-[#002D23] bg-[#E6F0DD] dark:bg-[#002D23]/30 text-[#002D23] dark:text-[#6EE7B7] shadow-xs"
                                    : "border-[#DDE3DD] dark:border-[#2A483B] hover:border-[#B5B0A4] text-[#0B1714] dark:text-[#EAE6DF] bg-stone-50/50 dark:bg-[#1A3329]/40"
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div
                                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                      isSelected
                                        ? "border-[#002D23] bg-[#002D23] text-white"
                                        : "border-stone-400 bg-white dark:bg-stone-900"
                                    }`}
                                  >
                                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                  </div>
                                  <span className="text-xs font-bold truncate">{opt.name}</span>
                                </div>
                                <span className="text-xs font-extrabold shrink-0 ml-2">
                                  {adj === 0 ? "Included" : `+${currencySymbol}${adj}`}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add-ons */}
              {selectedItemForCustomization.addons && selectedItemForCustomization.addons.length > 0 && (
                <div className="space-y-2 pt-1 border-t border-[#DDE3DD] dark:border-[#002D23]">
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-black text-[#52504B] dark:text-[#D1C7B7] uppercase tracking-wider">
                      Add-ons
                    </span>
                    <span className="text-[10px] font-semibold text-[#73716B] dark:text-[#A8A29E]">
                      Optional · Multiple allowed
                    </span>
                  </div>
                  <div className="space-y-2">
                    {selectedItemForCustomization.addons.map((a: any) => {
                      const addonId = a.id || a.name;
                      const addonName = a.name;
                      const addonPrice = Number(a.price) || 0;
                      const isAdded = selectedAddons.some((addon) => (addon.id && addon.id === addonId) || addon.name === addonName);

                      return (
                        <button
                          key={addonId}
                          type="button"
                          onClick={() => {
                            if (isAdded) {
                              setSelectedAddons(selectedAddons.filter((addon) => (addon.id ? addon.id !== addonId : addon.name !== addonName)));
                            } else {
                              setSelectedAddons([...selectedAddons, { id: addonId, name: addonName, price: addonPrice }]);
                            }
                          }}
                          className={`w-full flex items-center justify-between p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                            isAdded
                              ? "border-[#002D23] bg-[#E6F0DD] dark:bg-[#002D23]/30 text-[#002D23] dark:text-[#6EE7B7] shadow-xs"
                              : "border-[#DDE3DD] dark:border-[#2A483B] hover:border-[#B5B0A4] text-[#0B1714] dark:text-[#EAE6DF] bg-stone-50/50 dark:bg-[#1A3329]/40"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-4 h-4 rounded-[5px] border flex items-center justify-center shrink-0 ${
                                isAdded
                                  ? "border-[#002D23] bg-[#002D23] text-white"
                                  : "border-stone-400 bg-white dark:bg-stone-900"
                              }`}
                            >
                              {isAdded && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span className="truncate">{addonName}</span>
                          </div>
                          <span className="shrink-0 font-extrabold ml-2">
                            +{currencySymbol}{addonPrice}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Stepper & Confirm Button */}
              <div className="pt-3 flex items-center justify-between gap-3 border-t border-[#DDE3DD] dark:border-[#002D23]">
                {verifiedTable ? (
                  <>
                    <div className="flex items-center gap-2 border border-[#DDE3DD] dark:border-[#002D23] rounded-xl px-2.5 py-1.5 bg-stone-50 dark:bg-[#001F19]">
                      <button
                        type="button"
                        onClick={() => setCustomizationQty(Math.max(1, customizationQty - 1))}
                        className="p-1 text-[#73716B] hover:text-[#0B1714] dark:hover:text-white"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-extrabold w-4 text-center">{customizationQty}</span>
                      <button
                        type="button"
                        onClick={() => setCustomizationQty(customizationQty + 1)}
                        className="p-1 text-[#73716B] hover:text-[#0B1714] dark:hover:text-white"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleConfirmCustomization}
                      className="flex-1 py-3 px-4 rounded-xl bg-[#002D23] hover:bg-[#001F19] text-white text-xs font-extrabold shadow-sm flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <span>Add to Cart</span>
                      <span>{currencySymbol}{modalTotalPrice}</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedItemForCustomization(null);
                      setShowQrScanner(true);
                    }}
                    className="w-full py-3.5 rounded-xl bg-[#002D23] hover:bg-[#001F19] text-white text-xs font-bold shadow-sm flex items-center justify-center gap-2 active:scale-98 transition-transform cursor-pointer"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Scan Table QR to Order • {currencySymbol}{modalTotalPrice}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Google Authentication Modal */}
      <GoogleAuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={(u) => {
          setUserProfile(u);
          if (u.name) setBookerName(u.name);
          if (u.phone) setBookerPhone(u.phone);
          if (u.email) setBookerEmail(u.email);
          // If in reservation flow and at step 1, advance to step 2 automatically
          if (mode === "reserve" && reservationStep === 1) {
            setReservationStep(2);
          }
        }}
      />

      {/* QR Scanner Modal for Dine-in Table Ordering */}
      <QRScannerModal
        isOpen={showQrScanner}
        onClose={() => setShowQrScanner(false)}
      />
    </div>
  );
}
