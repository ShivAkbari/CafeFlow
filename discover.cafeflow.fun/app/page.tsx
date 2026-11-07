"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  MapPin,
  ChevronDown,
  ArrowRight,
  Star,
  Heart,
  Plus,
  Minus,
  Check,
  Navigation,
  UtensilsCrossed,
  Sparkles,
  Store,
  Truck,
  X,
  AlertCircle,
  Loader2
} from "lucide-react";
import { useCart, type CartItem, type DiscoverOrderMode } from "@/lib/cart-context";
import { WelcomeLocationModal } from "@/components/welcome-location-modal";
import { MapLocationSelectorModal } from "@/components/map-location-selector-modal";
import {
  RestaurantFoodCategory,
  FoodType,
  FOOD_TYPES,
  RESTAURANT_FOOD_CATEGORIES,
  normalizeFoodType
} from "@/lib/food-classification";
import { FoodTypeBadge, RestaurantCategoryBadge } from "@/components/ui/food-type-badge";
import { getFeeConfigByCurrency } from "@/lib/country-fees";

interface Cafe {
  id: string;
  name: string;
  slug: string;
  address: string;
  logo: string;
  coverImage: string;
  images?: string[];
  cuisines: string[];
  priceRange: string;
  foodCategory?: RestaurantFoodCategory;
  rating: number | null;
  reviewCount: number;
  distanceKm: number | null;
  currency: string;
  isOpen: boolean;
  businessHours?: string | null;
  offer?: {
    code: string;
    title: string;
    discountText: string;
    minOrder?: string;
  } | null;
}

interface RecommendedDish {
  id: string;
  name: string;
  category: string;
  price: number;
  originalPrice?: number | null;
  offerBadge?: string | null;
  rating?: number | null;
  isBestseller?: boolean;
  image: string;
  foodType?: FoodType;
  isVeg?: boolean;
  cafeId: string;
  cafeName: string;
  cafeSlug: string;
  currency: string;
  variants?: Array<{ name: string; price: number }>;
  addons?: Array<{ name: string; price: number }>;
  taxRate?: number;
}

// Food categories per master prompt specification with thumbnail imagery
const FOOD_CATEGORIES = [
  {
    id: "pizza",
    label: "Pizza",
    image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=160&q=80"
  },
  {
    id: "burger",
    label: "Burger",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=160&q=80"
  },
  {
    id: "coffee",
    label: "Coffee",
    image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=160&q=80"
  },
  {
    id: "cake",
    label: "Cake",
    image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=160&q=80"
  },
  {
    id: "biryani",
    label: "Biryani",
    image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=160&q=80"
  },
  {
    id: "sandwich",
    label: "Sandwich",
    image: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=160&q=80"
  },
  {
    id: "desserts",
    label: "Desserts",
    image: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=160&q=80"
  },
  {
    id: "ice cream",
    label: "Ice Cream",
    image: "https://images.unsplash.com/photo-1501443762994-82bd5dace89a?auto=format&fit=crop&w=160&q=80"
  },
  {
    id: "momos",
    label: "Momos",
    image: "https://images.unsplash.com/photo-1625220194771-7ebdea0b70b9?auto=format&fit=crop&w=160&q=80"
  },
  {
    id: "more",
    label: "More",
    icon: UtensilsCrossed
  }
];

export default function DiscoverHomePage() {
  const router = useRouter();
  const { addItem, items: cartItems } = useCart();

  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [recommended, setRecommended] = useState<RecommendedDish[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState("Ahmedabad");
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showMapSelector, setShowMapSelector] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [dietFilter, setDietFilter] = useState<"all" | "veg" | "non_veg" | "egg">("all");
  const [userProfile, setUserProfile] = useState<any>(null);
  const [orderingMode, setOrderingModeLocal] = useState<DiscoverOrderMode>("dine-in");
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [addedItemIds, setAddedItemIds] = useState<Record<string, boolean>>({});
  const [validatingItemId, setValidatingItemId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Customization modal state for dishes with variants/addons
  const [customizingDish, setCustomizingDish] = useState<RecommendedDish | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<{ name: string; price: number } | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<Array<{ name: string; price: number }>>([]);
  const [customizationQty, setCustomizationQty] = useState<number>(1);

  const { orderMode, setOrderMode } = useCart();

  useEffect(() => {
    if (orderMode) {
      setOrderingModeLocal(orderMode);
    }
  }, [orderMode]);

  // Check if first-time visitor in session
  useEffect(() => {
    try {
      const savedMode = localStorage.getItem("cafeflow_ordering_mode") as DiscoverOrderMode;
      if (savedMode === "dine-in" || savedMode === "takeaway" || savedMode === "delivery") {
        setOrderingModeLocal(savedMode);
        setOrderMode(savedMode);
      }
      const hasChosen = sessionStorage.getItem("cafeflow_entry_completed");
      if (!hasChosen) {
        setShowWelcomeModal(true);
      }
    } catch {}
  }, [setOrderMode]);

  const handleSelectOrderingMode = (mode: DiscoverOrderMode) => {
    setOrderingModeLocal(mode);
    setOrderMode(mode);
  };

  const handleLocationResolved = (coords: { lat: number; lng: number } | null, city?: string) => {
    if (coords) {
      setUserLocation(coords);
      setSelectedCity(city || "Current Location");
    } else if (city) {
      setSelectedCity(city);
      setUserLocation(null);
    }
    try {
      sessionStorage.setItem("cafeflow_entry_completed", "true");
    } catch {}
  };

  const cities = ["Ahmedabad", "Mumbai", "Bengaluru", "Delhi NCR", "Pune"];

  // Request user GPS
  const handleGetLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
        setLocating(false);
        setSelectedCity("Current Location");
      },
      () => setLocating(false)
    );
  };

  // Load user profile & saved favorites
  useEffect(() => {
    fetch("/api/user/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUserProfile(data.user);
          if (Array.isArray(data.user.favorites) && data.user.favorites.length > 0) {
            setFavorites(data.user.favorites);
            return;
          }
        }
        try {
          const stored = localStorage.getItem("cafeflow_favorites");
          if (stored) setFavorites(JSON.parse(stored));
        } catch {}
      })
      .catch(() => {
        try {
          const stored = localStorage.getItem("cafeflow_favorites");
          if (stored) setFavorites(JSON.parse(stored));
        } catch {}
      });
  }, []);

  // Toggle favorite
  const toggleFavorite = async (e: React.MouseEvent, cafeId: string) => {
    e.preventDefault();
    e.stopPropagation();

    const next = favorites.includes(cafeId)
      ? favorites.filter((id) => id !== cafeId)
      : [...favorites, cafeId];

    setFavorites(next);
    try {
      localStorage.setItem("cafeflow_favorites", JSON.stringify(next));
    } catch {}

    if (userProfile) {
      try {
        await fetch("/api/user/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ favoriteCafes: next })
        });
      } catch {}
    }
  };

  // Fetch cafes & recommended items
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (userLocation) {
      params.append("lat", userLocation.lat.toString());
      params.append("lng", userLocation.lng.toString());
    } else if (selectedCity && selectedCity !== "Current Location") {
      params.append("city", selectedCity);
    }

    fetch(`/api/cafes?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setCafes(data.cafes || []);
        if (data.recommended && data.recommended.length > 0) {
          setRecommended(data.recommended);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [userLocation, selectedCity]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Perform add-to-cart and navigation after item & cafe details are resolved
  const executeAddToCartAndNavigate = (
    cartItemData: CartItem,
    cafeData: {
      id: string;
      name: string;
      slug: string;
      currency: string;
    }
  ) => {
    const navigateToCafe = () => {
      router.push(`/cafe/${cafeData.slug}`);
    };

    // addItem returns true if added immediately, or false if switch modal was opened
    addItem(cartItemData, cafeData, {
      onSuccess: () => {
        navigateToCafe();
      }
    });

    // Provide immediate visual feedback on the button
    setAddedItemIds((prev) => ({ ...prev, [cartItemData.id]: true }));
    setTimeout(() => {
      setAddedItemIds((prev) => ({ ...prev, [cartItemData.id]: false }));
    }, 1500);
  };

  // Handle adding recommended dish to cart
  const handleAddRecommended = async (dish: RecommendedDish) => {
    // Prevent duplicate triggers if already validating
    if (validatingItemId) return;

    setValidatingItemId(dish.id);

    try {
      // 1. Validate real availability and cafe association with database
      const res = await fetch("/api/cafes/validate-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: dish.id,
          cafeId: dish.cafeId
        })
      });

      const data = await res.json();

      if (!res.ok || !data.available) {
        showToast(data.error || `"${dish.name}" is currently unavailable.`);
        setValidatingItemId(null);
        return;
      }

      const verifiedItem = data.item;
      const verifiedCafe = data.cafe;

      // 2. If item has variants or addons, open customization sheet first
      if (
        (verifiedItem.variants && verifiedItem.variants.length > 0) ||
        (verifiedItem.addons && verifiedItem.addons.length > 0)
      ) {
        setCustomizingDish({
          ...dish,
          variants: verifiedItem.variants,
          addons: verifiedItem.addons,
          taxRate: verifiedItem.taxRate
        });
        setSelectedVariant(verifiedItem.variants?.[0] || null);
        setSelectedAddons([]);
        setCustomizationQty(1);
        setValidatingItemId(null);
        return;
      }

      // 3. Add to cart with real cafe & item data, then navigate to cafe
      const resolvedFoodType = verifiedItem.foodType || (verifiedItem.isVeg ? "veg" : "non_veg");
      executeAddToCartAndNavigate(
        {
          id: verifiedItem.id,
          name: verifiedItem.name,
          price: verifiedItem.price,
          quantity: 1,
          image: verifiedItem.image,
          foodType: resolvedFoodType,
          isVeg: resolvedFoodType === "veg",
          taxRate: verifiedItem.taxRate || 0
        },
        verifiedCafe
      );
    } catch (err: any) {
      console.error("Failed to add item to cart:", err);
      showToast("Could not add item to cart. Please try again.");
    } finally {
      setValidatingItemId(null);
    }
  };

  // Confirm Customization from homepage modal
  const handleConfirmCustomization = () => {
    if (!customizingDish) return;

    const basePrice = selectedVariant ? selectedVariant.price : customizingDish.price;
    const addonsTotal = selectedAddons.reduce((sum, a) => sum + a.price, 0);
    const finalPrice = basePrice + addonsTotal;

    const variantKey = selectedVariant ? `-${selectedVariant.name}` : "";
    const customId = `${customizingDish.id}${variantKey}`;

    const dishToPass = customizingDish;
    setCustomizingDish(null);

    const resolvedFoodType = dishToPass.foodType || (dishToPass.isVeg ? "veg" : "non_veg");
    executeAddToCartAndNavigate(
      {
        id: customId,
        name: selectedVariant
          ? `${dishToPass.name} (${selectedVariant.name})`
          : dishToPass.name,
        price: finalPrice,
        quantity: customizationQty,
        image: dishToPass.image,
        foodType: resolvedFoodType,
        isVeg: resolvedFoodType === "veg",
        taxRate: dishToPass.taxRate || 0,
        selectedVariant,
        selectedAddons
      },
      {
        id: dishToPass.cafeId,
        name: dishToPass.cafeName,
        slug: dishToPass.cafeSlug,
        currency: dishToPass.currency || "INR"
      }
    );
  };

  // Filter recommended items by dietFilter
  const filteredRecommended = useMemo(() => {
    if (dietFilter === "all") return recommended;
    return recommended.filter((dish) => {
      const type = dish.foodType || (dish.isVeg ? "veg" : "non_veg");
      return type === dietFilter;
    });
  }, [recommended, dietFilter]);

  // Filter cafes by dietFilter
  const filteredCafes = useMemo(() => {
    if (dietFilter === "all") return cafes;
    return cafes.filter((cafe) => {
      const cat = cafe.foodCategory || "veg_non_veg";
      if (dietFilter === "veg") {
        // Pure Veg or Veg & Egg or Veg & Non-Veg cafes serve veg food
        return cat === "pure_veg" || cat === "veg_egg" || cat === "veg_non_veg";
      }
      if (dietFilter === "egg") {
        // Veg & Egg or Veg & Non-Veg or Non-Veg cafes serve egg dishes
        return cat === "veg_egg" || cat === "veg_non_veg" || cat === "non_veg";
      }
      if (dietFilter === "non_veg") {
        // Veg & Non-Veg or Non-Veg cafes serve non-veg food (Pure Veg never serves non-veg)
        return cat === "veg_non_veg" || cat === "non_veg";
      }
      return true;
    });
  }, [cafes, dietFilter]);

  return (
    <div className="min-h-screen bg-[#F7F5EC] dark:bg-[#001F19] text-[#0B1714] dark:text-[#F7F5EC]">
      <main className="max-w-[430px] md:max-w-3xl mx-auto px-4 sm:px-6 pt-3 pb-32 md:pb-16 space-y-6">

        {/* TOP BRAND BAR with City & Profile */}
        <header className="flex items-center justify-between pt-1">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl bg-[#002D23] flex items-center justify-center p-1.5 shadow-sm shrink-0">
              <img src="/logos/cafeflow-emblem-white.png" alt="CafeFlow Emblem" className="w-4.5 h-4.5 object-contain" />
            </div>
            <div className="flex items-center gap-1.5">
              <img src="/logos/cafeflow-wordmark-black.png" alt="CafeFlow" className="h-5 w-auto object-contain dark:hidden" />
              <img src="/logos/cafeflow-wordmark-white.png" alt="CafeFlow" className="h-5 w-auto object-contain hidden dark:block" />
              <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-[#002D23]/10 text-[#002D23] dark:bg-emerald-400/15 dark:text-emerald-300 ml-0.5">
                Discover
              </span>
            </div>
          </Link>

          {/* Location Selector & Profile Avatar */}
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <button
                onClick={() => setShowLocationPicker(!showLocationPicker)}
                className="flex flex-col items-end text-right group focus:outline-none"
                aria-label="Change location"
              >
                <span className="text-[10px] text-[#73716B] dark:text-stone-400 flex items-center gap-0.5 font-medium">
                  <MapPin className="w-2.5 h-2.5 text-[#002D23] dark:text-[#34D399]" />
                  Your location
                </span>
                <span className="text-[12px] font-bold text-[#0B1714] dark:text-white flex items-center gap-0.5">
                  {selectedCity}
                  <ChevronDown className="w-3 h-3 text-[#73716B]" />
                </span>
              </button>

              {showLocationPicker && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#002D23] rounded-2xl shadow-lg border border-[#DDE3DD] dark:border-[#002D23] p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 text-[#0B1714] dark:text-white">
                  <button
                    onClick={() => {
                      handleGetLocation();
                      setShowLocationPicker(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#002D23] dark:text-[#34D399] rounded-xl hover:bg-[#E6F0DD] dark:hover:bg-[#001F19] transition-colors cursor-pointer"
                  >
                    <Navigation className={`w-3.5 h-3.5 ${locating ? "animate-spin" : ""}`} />
                    {locating ? "Locating..." : "Use Current Location"}
                  </button>
                  <button
                    onClick={() => {
                      setShowMapSelector(true);
                      setShowLocationPicker(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#002D23] dark:text-[#34D399] rounded-xl hover:bg-[#E6F0DD] dark:hover:bg-[#001F19] transition-colors cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Select on Map</span>
                  </button>
                  <div className="my-1 border-t border-[#DDE3DD] dark:border-[#002D23]" />
                  {cities.map((city) => (
                    <button
                      key={city}
                      onClick={() => {
                        setSelectedCity(city);
                        setUserLocation(null);
                        setShowLocationPicker(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs rounded-xl font-medium transition-colors ${
                        selectedCity === city
                          ? "bg-[#002D23] text-white font-bold"
                          : "hover:bg-stone-50 dark:hover:bg-stone-800"
                      }`}
                    >
                      {city}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Profile Avatar */}
            <Link
              href="/profile"
              className="relative w-8 h-8 rounded-full overflow-hidden border border-[#DDE3DD] dark:border-[#002D23] bg-white dark:bg-[#002D23] shadow-xs flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
              aria-label="User Profile"
            >
              {userProfile?.photoUrl ? (
                <img
                  src={userProfile.photoUrl}
                  alt={userProfile.name || "Customer"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full text-[#002D23] dark:text-[#34D399] font-bold text-[11px] flex items-center justify-center">
                  {userProfile?.name ? userProfile.name.charAt(0).toUpperCase() : "CF"}
                </div>
              )}
            </Link>
          </div>
        </header>



        {/* ============================================================ */}
        {/* SECTION 1: SEARCH BAR                                         */}
        {/* Prominent rounded search bar, taps open dedicated /search     */}
        {/* ============================================================ */}
        <section aria-label="Search" className="pt-0.5">
          <div
            onClick={() => router.push("/search")}
            className="cursor-pointer relative flex items-center bg-white dark:bg-[#002D23] rounded-full border border-[#DDE3DD] dark:border-[#002D23] shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-1.5 pl-4 pr-1.5 transition-all hover:border-[#002D23] active:scale-[0.99]"
          >
            <Search className="w-4 h-4 text-[#002D23] dark:text-[#34D399] shrink-0" />
            <input
              type="text"
              readOnly
              onFocus={() => router.push("/search")}
              placeholder={
                orderingMode === "dine-in"
                  ? "Search cafes for dine-in & table booking..."
                  : orderingMode === "delivery"
                  ? "Search food for doorstep delivery..."
                  : "Search takeaway food & cafes..."
              }
              className="w-full bg-transparent px-2.5 py-1 text-[13px] text-[#0B1714] dark:text-white placeholder-[#73716B] focus:outline-none cursor-pointer"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                router.push("/search");
              }}
              aria-label="Open search screen"
              className="w-8 h-8 rounded-full bg-[#002D23] hover:bg-[#001F19] text-white flex items-center justify-center shrink-0 shadow-sm transition-transform active:scale-95"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Dietary Filter Chips (Veg, Non-Veg, Egg) */}
          <div className="flex items-center gap-2 pt-2.5 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setDietFilter(dietFilter === "all" ? "all" : "all")}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                dietFilter === "all"
                  ? "bg-[#002D23] text-white border-[#002D23] shadow-xs"
                  : "bg-white dark:bg-[#002D23] text-[#73716B] border-[#DDE3DD] dark:border-[#002D23] hover:border-[#002D23]"
              }`}
            >
              <span>All Food</span>
            </button>

            <button
              type="button"
              onClick={() => setDietFilter(dietFilter === "veg" ? "all" : "veg")}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                dietFilter === "veg"
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                  : "bg-white dark:bg-[#002D23] text-[#0B1714] dark:text-white border-[#DDE3DD] dark:border-[#002D23] hover:border-emerald-500"
              }`}
            >
              <FoodTypeBadge foodType="veg" size="sm" />
              <span>Veg Only</span>
            </button>

            <button
              type="button"
              onClick={() => setDietFilter(dietFilter === "non_veg" ? "all" : "non_veg")}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                dietFilter === "non_veg"
                  ? "bg-red-600 text-white border-red-600 shadow-xs"
                  : "bg-white dark:bg-[#002D23] text-[#0B1714] dark:text-white border-[#DDE3DD] dark:border-[#002D23] hover:border-red-500"
              }`}
            >
              <FoodTypeBadge foodType="non_veg" size="sm" />
              <span>Non-Veg</span>
            </button>

            <button
              type="button"
              onClick={() => setDietFilter(dietFilter === "egg" ? "all" : "egg")}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                dietFilter === "egg"
                  ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                  : "bg-white dark:bg-[#002D23] text-[#0B1714] dark:text-white border-[#DDE3DD] dark:border-[#002D23] hover:border-amber-500"
              }`}
            >
              <FoodTypeBadge foodType="egg" size="sm" />
              <span>Contains Egg</span>
            </button>
          </div>
        </section>

        {/* Welcome & Location Permission Modal */}
        <WelcomeLocationModal
          isOpen={showWelcomeModal}
          onClose={() => setShowWelcomeModal(false)}
          onSelectMode={handleSelectOrderingMode}
          onLocationResolved={handleLocationResolved}
          currentMode={orderingMode}
        />

        {/* ============================================================ */}
        {/* SECTION 2: FOOD CATEGORIES                                    */}
        {/* Horizontally scrollable row of food-category shortcuts        */}
        {/* Uniform size and circular shape for all categories            */}
        {/* ============================================================ */}
        <section aria-label="Food Categories" className="space-y-1.5">
          <div className="flex items-center gap-3.5 overflow-x-auto no-scrollbar py-1">
            {FOOD_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    if (cat.id === "more") {
                      router.push("/search");
                    } else {
                      router.push(`/search?cuisine=${encodeURIComponent(cat.label)}`);
                    }
                  }}
                  className="flex flex-col items-center gap-1.5 shrink-0 group focus:outline-none cursor-pointer w-14"
                >
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-white dark:bg-[#002D23] border border-[#DDE3DD] dark:border-[#002D23] p-0.5 shadow-xs transition-transform duration-200 group-hover:scale-105 active:scale-95 flex items-center justify-center shrink-0">
                    {cat.image ? (
                      <img
                        src={cat.image}
                        alt={cat.label}
                        className="w-full h-full object-cover rounded-full aspect-square"
                        loading="lazy"
                      />
                    ) : Icon ? (
                      <div className="w-full h-full rounded-full bg-[#E6F0DD] dark:bg-[#001F19] flex items-center justify-center text-[#002D23] dark:text-[#34D399]">
                        <Icon className="w-5 h-5" />
                      </div>
                    ) : null}
                  </div>
                  <span className="text-[11px] font-semibold tracking-tight text-[#0B1714] dark:text-stone-300 group-hover:text-[#002D23] dark:group-hover:text-[#34D399] transition-colors truncate max-w-full text-center">
                    {cat.label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ============================================================ */}
        {/* SECTION 3: RECOMMENDED FOOD ITEMS (Rendered when D1 items exist) */}
        {/* ============================================================ */}
        {filteredRecommended.length > 0 && (
          <section aria-label="Recommended food items" className="space-y-2.5">
            <div className="flex items-baseline justify-between px-0.5">
              <div>
                <h2 className="text-[18px] font-extrabold text-[#0B1714] dark:text-white tracking-tight flex items-center gap-1.5">
                  Recommended
                  <Sparkles className="w-3.5 h-3.5 text-[#E7A642]" />
                </h2>
                <p className="text-[11px] text-[#73716B] dark:text-stone-400 font-medium">
                  Popular picks and great offers
                </p>
              </div>
              <Link
                href="/search?sort=rating"
                className="text-[12px] font-semibold text-[#002D23] dark:text-[#34D399] hover:underline"
              >
                See all
              </Link>
            </div>

            {/* Two independent horizontally scrollable columns/rows */}
            <div className="space-y-3">
            {/* First Row: Scrolls individually */}
            <div className="flex overflow-x-auto no-scrollbar gap-3 pb-1 pt-0.5 snap-x snap-mandatory">
              {filteredRecommended.slice(0, Math.ceil(filteredRecommended.length / 2)).map((dish) => {
                const inCartQty = cartItems
                  .filter((ci) => ci.id === dish.id)
                  .reduce((sum, ci) => sum + ci.quantity, 0);
                const isJustAdded = addedItemIds[dish.id];

                return (
                  <div
                    key={dish.id}
                    className="w-[165px] sm:w-[190px] shrink-0 snap-start bg-white dark:bg-[#002D23] rounded-[18px] border border-[#DDE3DD] dark:border-[#002D23] overflow-hidden shadow-xs flex flex-col justify-between transition-all duration-200 hover:border-[#D0CEBF]"
                  >
                    {/* Image container with 1:1 aspect ratio */}
                    <div className="relative aspect-square w-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                      <img
                        src={dish.image}
                        alt={dish.name}
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                        loading="lazy"
                      />

                      {/* Offer badge where applicable */}
                      {dish.offerBadge && (
                        <div className="absolute top-2 left-2">
                          <span className="px-2 py-0.5 rounded-full bg-[#002D23] text-white text-[9px] font-extrabold uppercase tracking-wide shadow-xs">
                            {dish.offerBadge}
                          </span>
                        </div>
                      )}

                      {/* Bestseller badge */}
                      {dish.isBestseller && !dish.offerBadge && (
                        <div className="absolute top-2 left-2">
                          <span className="px-2 py-0.5 rounded-full bg-[#FEF7E8] text-[#E7A642] text-[9px] font-extrabold uppercase tracking-wide shadow-xs">
                            Bestseller
                          </span>
                        </div>
                      )}

                      {/* Rating label */}
                      {typeof dish.rating === "number" && (
                        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold flex items-center gap-0.5">
                          <Star className="w-2.5 h-2.5 fill-[#E7A642] text-[#E7A642]" />
                          <span>{dish.rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>

                    {/* Compact Product Details */}
                    <div className="p-2.5 space-y-1 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-extrabold text-[13px] text-[#0B1714] dark:text-white leading-tight line-clamp-1 flex items-center gap-1.5">
                          <FoodTypeBadge foodType={dish.foodType} isVeg={dish.isVeg} size="sm" />
                          <span className="truncate">{dish.name}</span>
                        </h3>
                        <Link
                          href={`/cafe/${dish.cafeSlug}`}
                          className="text-[11px] text-[#73716B] dark:text-stone-400 font-medium truncate block hover:underline"
                        >
                          {dish.cafeName}
                        </Link>
                      </div>

                      {/* Price and Add button */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-baseline gap-1">
                          <span className="font-black text-[14px] text-[#0B1714] dark:text-white">
                            {getFeeConfigByCurrency(dish.currency)?.symbol || dish.currency || "₹"}{dish.price}
                          </span>
                          {dish.originalPrice && (
                            <span className="text-[11px] text-[#73716B] line-through">
                              {getFeeConfigByCurrency(dish.currency)?.symbol || dish.currency || "₹"}{dish.originalPrice}
                            </span>
                          )}
                        </div>

                        <Link
                          href={`/cafe/${dish.cafeSlug}`}
                          aria-label={`View ${dish.name} at ${dish.cafeName}`}
                          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-xs transition-all active:scale-90 cursor-pointer bg-white dark:bg-[#001F19] border border-[#DDE3DD] dark:border-[#002D23] text-[#002D23] dark:text-[#34D399] hover:bg-[#002D23] hover:text-white"
                        >
                          <ArrowRight className="w-3.5 h-3.5 stroke-[2.2]" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Second Row: Scrolls individually */}
            <div className="flex overflow-x-auto no-scrollbar gap-3 pb-1 pt-0.5 snap-x snap-mandatory">
              {filteredRecommended.slice(Math.ceil(filteredRecommended.length / 2)).map((dish) => {
                const inCartQty = cartItems
                  .filter((ci) => ci.id === dish.id)
                  .reduce((sum, ci) => sum + ci.quantity, 0);
                const isJustAdded = addedItemIds[dish.id];

                return (
                  <div
                    key={dish.id}
                    className="w-[165px] sm:w-[190px] shrink-0 snap-start bg-white dark:bg-[#002D23] rounded-[18px] border border-[#DDE3DD] dark:border-[#002D23] overflow-hidden shadow-xs flex flex-col justify-between transition-all duration-200 hover:border-[#D0CEBF]"
                  >
                    {/* Image container with 1:1 aspect ratio */}
                    <div className="relative aspect-square w-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                      <img
                        src={dish.image}
                        alt={dish.name}
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                        loading="lazy"
                      />

                      {/* Offer badge where applicable */}
                      {dish.offerBadge && (
                        <div className="absolute top-2 left-2">
                          <span className="px-2 py-0.5 rounded-full bg-[#002D23] text-white text-[9px] font-extrabold uppercase tracking-wide shadow-xs">
                            {dish.offerBadge}
                          </span>
                        </div>
                      )}

                      {/* Bestseller badge */}
                      {dish.isBestseller && !dish.offerBadge && (
                        <div className="absolute top-2 left-2">
                          <span className="px-2 py-0.5 rounded-full bg-[#FEF7E8] text-[#E7A642] text-[9px] font-extrabold uppercase tracking-wide shadow-xs">
                            Bestseller
                          </span>
                        </div>
                      )}

                      {/* Rating label */}
                      {typeof dish.rating === "number" && (
                        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold flex items-center gap-0.5">
                          <Star className="w-2.5 h-2.5 fill-[#E7A642] text-[#E7A642]" />
                          <span>{dish.rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>

                    {/* Compact Product Details */}
                    <div className="p-2.5 space-y-1 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-extrabold text-[13px] text-[#0B1714] dark:text-white leading-tight line-clamp-1 flex items-center gap-1.5">
                          <FoodTypeBadge foodType={dish.foodType} isVeg={dish.isVeg} size="sm" />
                          <span className="truncate">{dish.name}</span>
                        </h3>
                        <Link
                          href={`/cafe/${dish.cafeSlug}`}
                          className="text-[11px] text-[#73716B] dark:text-stone-400 font-medium truncate block hover:underline"
                        >
                          {dish.cafeName}
                        </Link>
                      </div>

                      {/* Price and Add button */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-baseline gap-1">
                          <span className="font-black text-[14px] text-[#0B1714] dark:text-white">
                            {getFeeConfigByCurrency(dish.currency)?.symbol || dish.currency || "₹"}{dish.price}
                          </span>
                          {dish.originalPrice && (
                            <span className="text-[11px] text-[#73716B] line-through">
                              {getFeeConfigByCurrency(dish.currency)?.symbol || dish.currency || "₹"}{dish.originalPrice}
                            </span>
                          )}
                        </div>

                        <Link
                          href={`/cafe/${dish.cafeSlug}`}
                          aria-label={`View ${dish.name} at ${dish.cafeName}`}
                          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-xs transition-all active:scale-90 cursor-pointer bg-white dark:bg-[#001F19] border border-[#DDE3DD] dark:border-[#002D23] text-[#002D23] dark:text-[#34D399] hover:bg-[#002D23] hover:text-white"
                        >
                          <ArrowRight className="w-3.5 h-3.5 stroke-[2.2]" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

        {/* ============================================================ */}
        {/* SECTION 4: ALL RESTAURANTS                                    */}
        {/* 1 restaurant per column with 8-image auto-sliding carousel     */}
        {/* ============================================================ */}
        <section aria-label="All Restaurants" className="space-y-3">
          <div className="flex items-baseline justify-between px-0.5">
            <h2 className="text-[18px] font-extrabold text-[#0B1714] dark:text-white tracking-tight">
              All Restaurants
            </h2>
            <span className="text-[12px] font-medium text-[#73716B] dark:text-stone-400">
              {filteredCafes.length} {filteredCafes.length === 1 ? "cafe" : "cafes"}
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-3.5">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-[#002D23] rounded-[20px] border border-[#DDE3DD] dark:border-[#002D23] p-3 space-y-2.5 animate-pulse"
                >
                  <div className="aspect-16/9 w-full bg-stone-200 dark:bg-stone-800 rounded-xl" />
                  <div className="h-4 bg-stone-200 dark:bg-stone-800 rounded w-1/2" />
                  <div className="h-3 bg-stone-200 dark:bg-stone-800 rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : cafes.length === 0 ? (
            <div className="bg-white dark:bg-[#002D23] rounded-[18px] p-8 text-center border border-[#DDE3DD] dark:border-[#002D23] shadow-xs space-y-2">
              <p className="text-sm font-bold text-[#0B1714] dark:text-white">
                No restaurants available in {selectedCity}
              </p>
              <button
                onClick={() => setSelectedCity("Ahmedabad")}
                className="px-4 py-1.5 rounded-full bg-[#002D23] text-white text-xs font-bold"
              >
                Switch to Ahmedabad
              </button>
            </div>
          ) : filteredCafes.length === 0 ? (
            <div className="bg-white dark:bg-[#002D23] rounded-[18px] p-8 text-center border border-[#DDE3DD] dark:border-[#002D23] shadow-xs space-y-2">
              <p className="text-sm font-bold text-[#0B1714] dark:text-white">
                No restaurants match your selected dietary filter
              </p>
              <button
                onClick={() => setDietFilter("all")}
                className="px-4 py-1.5 rounded-full bg-[#002D23] text-white text-xs font-bold"
              >
                Clear dietary filter
              </button>
            </div>
          ) : (
            <RestaurantList
              cafes={filteredCafes}
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
            />
          )}
        </section>

      </main>

      {/* Floating Toast Notification for validation and cart feedback */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[90%] animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="p-3.5 rounded-2xl bg-[#0B1714] dark:bg-stone-900 text-white text-xs font-semibold shadow-xl border border-stone-700/50 flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="flex-1">{toastMessage}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="p-1 text-stone-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Item Customization Modal for dishes with variants/addons */}
      {customizingDish && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-[#002D23] rounded-t-[28px] sm:rounded-[28px] p-5 space-y-4 max-h-[85vh] overflow-y-auto border border-[#DDE3DD] dark:border-[#002D23] shadow-2xl">
            <div className="flex items-start justify-between pb-2 border-b border-[#DDE3DD] dark:border-[#002D23]">
              <div>
                <h3 className="font-extrabold text-[16px] text-[#0B1714] dark:text-white">
                  Customize {customizingDish.name}
                </h3>
                <p className="text-xs text-[#73716B] dark:text-stone-300">
                  from {customizingDish.cafeName}
                </p>
              </div>
              <button
                onClick={() => setCustomizingDish(null)}
                className="w-7 h-7 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-600 dark:text-stone-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Variants */}
            {customizingDish.variants && customizingDish.variants.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-[#73716B] dark:text-stone-300 uppercase">
                  Choose Variant
                </span>
                <div className="space-y-1.5">
                  {customizingDish.variants.map((v) => (
                    <button
                      key={v.name}
                      onClick={() => setSelectedVariant(v)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold cursor-pointer ${
                        selectedVariant?.name === v.name
                          ? "border-[#002D23] bg-[#E6F0DD] text-[#002D23] dark:bg-[#002D23]/40 dark:text-white dark:border-[#34D399]"
                          : "border-[#DDE3DD] dark:border-[#002D23] text-[#0B1714] dark:text-stone-200"
                      }`}
                    >
                      <span>{v.name}</span>
                      <span>{getFeeConfigByCurrency(customizingDish.currency)?.symbol || customizingDish.currency || "₹"}{v.price}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Addons */}
            {customizingDish.addons && customizingDish.addons.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-[#73716B] dark:text-stone-300 uppercase">
                  Add-ons
                </span>
                <div className="space-y-1.5">
                  {customizingDish.addons.map((a) => {
                    const isAdded = selectedAddons.some((addon) => addon.name === a.name);
                    return (
                      <button
                        key={a.name}
                        onClick={() => {
                          if (isAdded) {
                            setSelectedAddons(selectedAddons.filter((addon) => addon.name !== a.name));
                          } else {
                            setSelectedAddons([...selectedAddons, a]);
                          }
                        }}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold cursor-pointer ${
                          isAdded
                            ? "border-[#002D23] bg-[#E6F0DD] text-[#002D23] dark:bg-[#002D23]/40 dark:text-white dark:border-[#34D399]"
                            : "border-[#DDE3DD] dark:border-[#002D23] text-[#0B1714] dark:text-stone-200"
                        }`}
                      >
                        <span>{a.name}</span>
                        <span>+{getFeeConfigByCurrency(customizingDish.currency)?.symbol || customizingDish.currency || "₹"}{a.price}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Stepper & Confirm Button */}
            <div className="pt-2 flex items-center justify-between gap-3 border-t border-[#DDE3DD] dark:border-[#002D23]">
              <div className="flex items-center gap-2 border border-[#DDE3DD] dark:border-[#002D23] rounded-xl px-2 py-1">
                <button
                  onClick={() => setCustomizationQty(Math.max(1, customizationQty - 1))}
                  className="p-1 text-[#73716B] dark:text-stone-300 cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-bold w-4 text-center">{customizationQty}</span>
                <button
                  onClick={() => setCustomizationQty(customizationQty + 1)}
                  className="p-1 text-[#73716B] dark:text-stone-300 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={handleConfirmCustomization}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#002D23] hover:bg-[#001F19] text-white text-xs font-bold shadow-sm transition-all active:scale-[0.98] cursor-pointer"
              >
                Add to Cart &amp; View Cafe ({getFeeConfigByCurrency(customizingDish.currency)?.symbol || customizingDish.currency || "₹"}
                {((selectedVariant ? selectedVariant.price : customizingDish.price) +
                  selectedAddons.reduce((sum, a) => sum + a.price, 0)) *
                  customizationQty}
                )
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Map Location Selector Modal */}
      <MapLocationSelectorModal
        isOpen={showMapSelector}
        onClose={() => setShowMapSelector(false)}
        initialLat={userLocation?.lat || 23.0225}
        initialLng={userLocation?.lng || 72.5714}
        onSelectLocation={(loc) => {
          setUserLocation({ lat: loc.lat, lng: loc.lng });
          setSelectedCity(loc.city || "Pin Location");
          setShowMapSelector(false);
          try {
            sessionStorage.setItem("cafeflow_entry_completed", "true");
          } catch {}
        }}
        title="Select Location on Map"
      />
    </div>
  );
}

/**
 * RestaurantList Component
 * Observes which restaurant cards are currently visible on the screen.
 * Only enables auto-sliding for the FIRST visible restaurant in the viewport
 * so that multiple cafes on screen don't all distractingly rotate at once.
 */
function RestaurantList({
  cafes,
  favorites,
  onToggleFavorite
}: {
  cafes: Cafe[];
  favorites: string[];
  onToggleFavorite: (e: React.MouseEvent, id: string) => void;
}) {
  const [activeAutoSlideId, setActiveAutoSlideId] = useState<string | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    // Track visible elements and pick the topmost visible cafe to auto-rotate
    const visibleSet = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const cafeId = entry.target.getAttribute("data-cafe-id");
          if (!cafeId) return;
          if (entry.isIntersecting && entry.intersectionRatio >= 0.35) {
            visibleSet.add(cafeId);
          } else {
            visibleSet.delete(cafeId);
          }
        });

        // Find the first cafe in cafes list that is currently visible in viewport
        const firstVisible = cafes.find((c) => visibleSet.has(c.id));
        setActiveAutoSlideId(firstVisible ? firstVisible.id : null);
      },
      {
        root: null,
        rootMargin: "0px",
        threshold: [0.35, 0.6]
      }
    );

    cardRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [cafes]);

  return (
    <div className="grid grid-cols-1 gap-4">
      {cafes.map((cafe) => (
        <div
          key={cafe.id}
          ref={(el) => {
            if (el) cardRefs.current.set(cafe.id, el);
            else cardRefs.current.delete(cafe.id);
          }}
          data-cafe-id={cafe.id}
        >
          <RestaurantCard
            cafe={cafe}
            isFavorite={favorites.includes(cafe.id)}
            onToggleFavorite={(e) => onToggleFavorite(e, cafe.id)}
            enableAutoSlide={activeAutoSlideId === cafe.id}
          />
        </div>
      ))}
    </div>
  );
}

/**
 * Individual Restaurant Card Component
 * Only auto-advances its 8-image carousel if enableAutoSlide is true
 * (i.e. It is the first visible cafe on the screen).
 * Always supports manual touch swipe and desktop dragging.
 */
function RestaurantCard({
  cafe,
  isFavorite,
  onToggleFavorite,
  enableAutoSlide
}: {
  cafe: Cafe;
  isFavorite: boolean;
  onToggleFavorite: (e: React.MouseEvent) => void;
  enableAutoSlide: boolean;
}) {
  const router = useRouter();

  // Consolidate images (up to 8 valid distinct images)
  const images = (cafe.images && cafe.images.length > 0 ? cafe.images : [cafe.coverImage]).slice(0, 8);
  const imageCount = images.length;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const didSwipeRef = useRef(false);

  // Auto-slide every 3 seconds ONLY if enableAutoSlide is true (the first visible restaurant)
  useEffect(() => {
    if (!enableAutoSlide || imageCount <= 1 || isPaused || isDragging) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % imageCount);
    }, 3000);

    return () => clearInterval(timer);
  }, [enableAutoSlide, imageCount, isPaused, isDragging]);

  // Touch Handlers for Mobile Swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartX(e.touches[0].clientX);
    setDragOffset(0);
    didSwipeRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const diff = e.touches[0].clientX - startX;
    setDragOffset(diff);
    if (Math.abs(diff) > 8) {
      didSwipeRef.current = true;
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (dragOffset > 40) {
      // Swiped right -> go to previous image
      setCurrentIndex((prev) => (prev - 1 + imageCount) % imageCount);
    } else if (dragOffset < -40) {
      // Swiped left -> advance to next image
      setCurrentIndex((prev) => (prev + 1) % imageCount);
    }
    setDragOffset(0);
  };

  // Mouse Handlers for Desktop Drag
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.clientX);
    setDragOffset(0);
    didSwipeRef.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const diff = e.clientX - startX;
    setDragOffset(diff);
    if (Math.abs(diff) > 8) {
      didSwipeRef.current = true;
    }
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (dragOffset > 40) {
      setCurrentIndex((prev) => (prev - 1 + imageCount) % imageCount);
    } else if (dragOffset < -40) {
      setCurrentIndex((prev) => (prev + 1) % imageCount);
    }
    setDragOffset(0);
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false);
      setDragOffset(0);
    }
    setIsPaused(false);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // If the user was swiping or dragging the carousel, do not trigger card navigation
    if (didSwipeRef.current) {
      e.preventDefault();
      e.stopPropagation();
      didSwipeRef.current = false;
      return;
    }
    router.push(`/cafe/${cafe.slug}`);
  };

  return (
    <div
      onClick={handleCardClick}
      className="group cursor-pointer bg-white dark:bg-[#002D23] rounded-[20px] border border-[#DDE3DD] dark:border-[#002D23] overflow-hidden shadow-xs hover:border-[#D0CEBF] transition-all duration-200 flex flex-col justify-between"
    >
      {/* 8-Image Auto-sliding Carousel Container */}
      <div
        className="relative aspect-[16/9] sm:aspect-[2/1] w-full bg-stone-100 dark:bg-stone-800 overflow-hidden select-none"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* Slides Track */}
        <div
          className="flex h-full w-full transition-transform duration-350 ease-out"
          style={{
            transform: `translateX(calc(-${currentIndex * 100}% + ${dragOffset}px))`
          }}
        >
          {images.map((imgUrl, idx) => (
            <div key={idx} className="relative w-full h-full shrink-0">
              <img
                src={imgUrl}
                alt={`${cafe.name} - photo ${idx + 1}`}
                className="w-full h-full object-cover pointer-events-none"
                loading={idx === 0 ? "eager" : "lazy"}
              />
            </div>
          ))}
        </div>

        {/* Top Badges: Open status and Favorite */}
        <div className="absolute top-3 left-3 z-10 pointer-events-none">
          <span className="px-2.5 py-0.5 rounded-full bg-[#002D23]/90 backdrop-blur-xs text-[10px] font-bold text-white tracking-wide flex items-center gap-1 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#34D399]" />
            Open
          </span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(e);
          }}
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full bg-white/90 dark:bg-black/60 backdrop-blur-xs flex items-center justify-center shadow-xs hover:scale-110 active:scale-95 transition-transform"
        >
          <Heart
            className={`w-3.5 h-3.5 ${
              isFavorite ? "fill-rose-500 text-rose-500" : "text-[#0B1714] dark:text-white"
            }`}
          />
        </button>

        {/* Carousel Pagination Dots (when multiple images exist) */}
        {imageCount > 1 && (
          <div className="absolute bottom-2 left-0 right-0 z-10 flex justify-center items-center gap-1 pointer-events-none">
            {images.map((_, dotIdx) => (
              <span
                key={dotIdx}
                className={`h-1 rounded-full transition-all duration-300 ${
                  dotIdx === currentIndex
                    ? "w-3 bg-white shadow-xs"
                    : "w-1 bg-white/60"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Restaurant Details below Carousel */}
      <div className="p-3.5 space-y-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="font-extrabold text-[15px] sm:text-[16px] text-[#0B1714] dark:text-white leading-tight truncate group-hover:text-[#002D23] transition-colors">
              {cafe.name}
            </h3>
            <RestaurantCategoryBadge category={cafe.foodCategory} />
          </div>
          <span className="text-[12px] font-medium text-[#73716B] shrink-0">
            {cafe.priceRange}
          </span>
        </div>

        <p className="text-[12px] text-[#73716B] dark:text-stone-400 font-medium truncate">
          {cafe.cuisines.join(" • ")}
        </p>

        {/* Rating and Distance */}
        <div className="flex items-center justify-between pt-0.5 text-[12px]">
          {cafe.rating !== null ? (
            <div className="flex items-center gap-1 font-bold text-[#0B1714] dark:text-white">
              <Star className="w-3.5 h-3.5 fill-[#002D23] text-[#002D23] dark:fill-[#34D399] dark:text-[#34D399]" />
              <span>{cafe.rating.toFixed(1)}</span>
              <span className="text-[#73716B] font-normal text-[11px]">
                ({cafe.reviewCount})
              </span>
            </div>
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-[#E6F0DD] text-[#002D23] font-extrabold text-[10px]">
              New on CafeFlow
            </span>
          )}

          {cafe.distanceKm !== null ? (
            <div className="flex items-center gap-1 text-[#73716B]">
              <MapPin className="w-3 h-3 text-[#73716B]" />
              <span>{cafe.distanceKm} km</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[#73716B] text-[11px]">
              <MapPin className="w-3 h-3 text-stone-400" />
              <span>Location on map</span>
            </div>
          )}
        </div>

        {/* Offer badge if promo exists */}
        {cafe.offer && (
          <div className="pt-2 border-t border-[#F2ECE1] dark:border-[#002D23] flex items-center justify-between text-[11px]">
            <span className="px-2 py-0.5 rounded bg-[#E6F0DD] text-[#002D23] font-bold text-[10px]">
              {cafe.offer.discountText}
            </span>
            <span className="text-[#73716B] truncate max-w-[140px]">
              {cafe.offer.code}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
