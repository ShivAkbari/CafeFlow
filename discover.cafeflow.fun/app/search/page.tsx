"use client";

import { useEffect, useState, useRef, useTransition, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  ArrowLeft,
  X,
  SlidersHorizontal,
  Clock,
  Star,
  MapPin,
  Heart,
  Tag,
  ArrowRight,
  Coffee,
  Check,
  ChevronDown,
  Navigation,
  Utensils
} from "lucide-react";
import { FoodTypeBadge, RestaurantCategoryBadge } from "@/components/ui/food-type-badge";
import { getFeeConfigByCurrency } from "@/lib/country-fees";
import type { FoodType, RestaurantFoodCategory } from "@/lib/food-classification";

interface Cafe {
  id: string;
  name: string;
  slug: string;
  address: string;
  logo: string;
  coverImage: string;
  foodCategory?: RestaurantFoodCategory;
  cuisines: string[];
  priceRange: string;
  rating: number | null;
  reviewCount: number;
  distanceKm: number | null;
  currency: string;
  isOpen: boolean;
  offer?: {
    code: string;
    title: string;
    discountText: string;
    minOrder?: string;
  } | null;
}

interface Dish {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  isVeg: boolean;
  foodType?: FoodType;
  cafeName: string;
  cafeSlug: string;
  currency?: string;
}

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const initialCuisine = searchParams.get("cuisine") || "all";

  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [suggestions, setSuggestions] = useState<{ cafes: Cafe[]; cuisines: string[]; dishes: Dish[] }>({ cafes: [], cuisines: [], dishes: [] });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Filters State
  const [selectedFilter, setSelectedFilter] = useState<string>("all"); // 'near_me', 'open_now', 'top_rated', 'offers'
  const [selectedSort, setSelectedSort] = useState<string>("relevance"); // 'relevance', 'rating', 'distance', 'price_asc'
  const [selectedCuisine, setSelectedCuisine] = useState<string>(initialCuisine);
  const [dietFilter, setDietFilter] = useState<"all" | "veg" | "non_veg" | "egg">("all");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);

  // Recent Searches
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("cafeflow_recent_searches");
      if (stored) setRecentSearches(JSON.parse(stored));
    } catch {}
  }, []);

  // Save query to recent searches
  const saveRecentSearch = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    const next = [trimmed, ...recentSearches.filter((s) => s.toLowerCase() !== trimmed.toLowerCase())].slice(0, 6);
    setRecentSearches(next);
    try {
      localStorage.setItem("cafeflow_recent_searches", JSON.stringify(next));
    } catch {}
  };

  const removeRecentSearch = (e: React.MouseEvent, term: string) => {
    e.stopPropagation();
    const next = recentSearches.filter((s) => s !== term);
    setRecentSearches(next);
    try {
      localStorage.setItem("cafeflow_recent_searches", JSON.stringify(next));
    } catch {}
  };

  const clearAllRecent = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem("cafeflow_recent_searches");
    } catch {}
  };

  // Load user profile & favorites
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

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 250);
    return () => clearTimeout(handler);
  }, [query]);

  // Request location for "Near me" filter
  const requestLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
        setLocating(false);
        setSelectedFilter("near_me");
      },
      () => setLocating(false)
    );
  };

  // Perform search request with abort control to avoid stale responses
  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(false);

    const params = new URLSearchParams();
    if (debouncedQuery) params.append("q", debouncedQuery);
    if (selectedCuisine && selectedCuisine !== "all") params.append("category", selectedCuisine);
    if (selectedFilter === "open_now") params.append("openNow", "true");
    if (selectedFilter === "offers") params.append("hasOffer", "true");
    if (selectedFilter === "top_rated") params.append("minRating", "4.5");

    if (userLocation) {
      params.append("lat", userLocation.lat.toString());
      params.append("lng", userLocation.lng.toString());
    }

    if (selectedSort !== "relevance") {
      params.append("sort", selectedSort);
    }

    fetch(`/api/cafes?${params.toString()}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Search request failed");
        return res.json();
      })
      .then((data) => {
        const foundCafes: Cafe[] = data.cafes || [];
        const foundDishes: Dish[] = data.dishes || [];
        setCafes(foundCafes);
        setDishes(foundDishes);

        // Derive suggestions when query is short and user is actively typing
        if (debouncedQuery.trim().length >= 2) {
          const lowerQ = debouncedQuery.toLowerCase();
          const matchedCuisines = Array.from(
            new Set(
              foundCafes
                .flatMap((c) => c.cuisines || [])
                .filter((c) => c.toLowerCase().includes(lowerQ))
            )
          ).slice(0, 3);

          setSuggestions({
            cafes: foundCafes.slice(0, 3),
            cuisines: matchedCuisines,
            dishes: foundDishes.slice(0, 3)
          });
        } else {
          setSuggestions({ cafes: [], cuisines: [], dishes: [] });
        }

        setLoading(false);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("Search fetch error:", err);
          setError(true);
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [debouncedQuery, selectedCuisine, selectedFilter, selectedSort, userLocation]);

  // Filter dishes by dietFilter
  const filteredDishes = (dishes || []).filter((d) => {
    if (dietFilter === "all") return true;
    const type = d.foodType || (d.isVeg ? "veg" : "non_veg");
    return type === dietFilter;
  });

  // Filter cafes by dietFilter
  const filteredCafes = (cafes || []).filter((c) => {
    if (dietFilter === "all") return true;
    const cat = c.foodCategory || "veg_non_veg";
    if (dietFilter === "veg") {
      return cat === "pure_veg" || cat === "veg_egg" || cat === "veg_non_veg";
    }
    if (dietFilter === "egg") {
      return cat === "veg_egg" || cat === "veg_non_veg" || cat === "non_veg";
    }
    if (dietFilter === "non_veg") {
      return cat === "veg_non_veg" || cat === "non_veg";
    }
    return true;
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    if (query.trim()) {
      saveRecentSearch(query);
      const url = new URL(window.location.href);
      url.searchParams.set("q", query.trim());
      router.replace(url.pathname + url.search);
    }
  };

  // Popular search tags for quick browsing
  const popularTags = [
    { label: "Specialty Coffee", query: "coffee" },
    { label: "Sourdough & Bakery", query: "bakery" },
    { label: "Italian Bistro", query: "italian" },
    { label: "Matcha Latte", query: "matcha" },
    { label: "Brunch", query: "brunch" },
    { label: "Desserts", query: "dessert" }
  ];

  // Quick filter pills matching Screen 2
  const quickFilters = [
    {
      id: "near_me",
      label: "Near me",
      action: () => {
        if (!userLocation) requestLocation();
        else setSelectedFilter(selectedFilter === "near_me" ? "all" : "near_me");
      }
    },
    {
      id: "open_now",
      label: "Open now",
      action: () => setSelectedFilter(selectedFilter === "open_now" ? "all" : "open_now")
    },
    {
      id: "top_rated",
      label: "Ratings",
      action: () => setSelectedFilter(selectedFilter === "top_rated" ? "all" : "top_rated")
    },
    {
      id: "cuisine",
      label: "Cuisine",
      action: () => setShowFilterModal(true)
    }
  ];

  const hasSuggestions =
    showSuggestions &&
    query.trim().length >= 2 &&
    (suggestions.cafes.length > 0 || suggestions.cuisines.length > 0 || suggestions.dishes.length > 0);

  return (
    <div className="min-h-screen bg-[#F7F5EC] dark:bg-[#001F19] text-[#0B1714] dark:text-[#F7F5EC]">
      <main className="max-w-[430px] md:max-w-3xl mx-auto px-4 sm:px-6 pt-3 pb-24 md:pb-12 space-y-3.5">

        {/* 1. SEARCH HEADER: Inline Back Button + Search Pill + Filter Icon matching Screen 2 */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => router.back()}
            aria-label="Back to previous page"
            className="w-8 h-8 rounded-full bg-transparent flex items-center justify-center text-[#0B1714] dark:text-white shrink-0 active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </button>

          {/* Search Pill Input */}
          <form
            onSubmit={handleSearchSubmit}
            className="flex-1 relative flex items-center bg-white dark:bg-[#002D23] rounded-full border border-[#DDE3DD] dark:border-[#002D23] shadow-sm px-3.5 py-1.5 focus-within:border-[#002D23] transition-colors"
          >
            <Search className="w-4 h-4 text-[#73716B] shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="coffee"
              className="w-full bg-transparent px-2.5 text-[14px] text-[#0B1714] dark:text-white placeholder-[#73716B] focus:outline-none"
              autoFocus
            />

            {/* Clear Button */}
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setShowSuggestions(false);
                  inputRef.current?.focus();
                }}
                aria-label="Clear search"
                className="w-5 h-5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 hover:text-stone-800 flex items-center justify-center shrink-0 mr-1"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </form>

          {/* Filter Sheet Trigger Icon */}
          <button
            type="button"
            onClick={() => setShowFilterModal(true)}
            aria-label="Open filter options"
            className="w-9 h-9 rounded-full bg-white dark:bg-[#002D23] border border-[#DDE3DD] dark:border-[#002D23] flex items-center justify-center text-[#0B1714] dark:text-white shrink-0 shadow-xs hover:border-[#002D23] transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* 2. LIVE SEARCH SUGGESTIONS DROPDOWN */}
        {hasSuggestions && (
          <div className="bg-white dark:bg-[#002D23] rounded-2xl shadow-lg border border-[#DDE3DD] dark:border-[#002D23] p-2 z-40 space-y-1">
            {/* Cuisine suggestions */}
            {suggestions.cuisines.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setSelectedCuisine(c.toLowerCase());
                  setShowSuggestions(false);
                  saveRecentSearch(c);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl hover:bg-[#E6F0DD] text-[#0B1714] dark:text-stone-300 transition-colors text-left"
              >
                <Utensils className="w-3.5 h-3.5 text-[#002D23]" />
                <span>Cuisine: <strong>{c}</strong></span>
              </button>
            ))}

            {/* Restaurant name suggestions */}
            {suggestions.cafes.map((c) => (
              <Link
                key={c.id}
                href={`/cafe/${c.slug}`}
                onClick={() => saveRecentSearch(c.name)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800 text-[#0B1714] dark:text-white transition-colors"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Coffee className="w-3.5 h-3.5 text-[#002D23]" />
                  <span className="font-semibold truncate">{c.name}</span>
                </div>
                <span className="text-[10px] text-[#73716B] shrink-0">{c.cuisines[0]}</span>
              </Link>
            ))}

            {/* Dish suggestions */}
            {suggestions.dishes.map((d) => (
              <Link
                key={d.id}
                href={`/cafe/${d.cafeSlug}`}
                onClick={() => saveRecentSearch(d.name)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl hover:bg-stone-50 dark:hover:bg-stone-800 text-[#0B1714] dark:text-white transition-colors"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span className={`w-2 h-2 rounded-full ${d.isVeg ? "bg-emerald-500" : "bg-red-500"}`} />
                  <span className="truncate">{d.name} <span className="text-[#73716B]">at {d.cafeName}</span></span>
                </div>
                <span className="font-bold text-[#002D23] shrink-0">
                  {getFeeConfigByCurrency(d.currency)?.symbol || d.currency || "₹"}{d.price}
                </span>
              </Link>
            ))}
          </div>
        )}

        {/* 3. HORIZONTAL QUICK FILTER CHIPS matching Screen 2 */}
        <section aria-label="Search Filters" className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          {quickFilters.map((filter) => {
            const isActive = selectedFilter === filter.id;
            return (
              <button
                key={filter.id}
                onClick={filter.action}
                className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold tracking-tight whitespace-nowrap transition-all border ${
                  isActive
                    ? "bg-[#002D23] text-white border-[#002D23] shadow-sm"
                    : "bg-white dark:bg-[#002D23] text-[#0B1714] dark:text-stone-300 border-[#DDE3DD] dark:border-[#002D23] hover:border-[#D0CEBF]"
                }`}
              >
                {filter.id === "near_me" && locating ? "Locating..." : filter.label}
              </button>
            );
          })}

          {/* Cuisine Pill */}
          {selectedCuisine !== "all" && (
            <button
              onClick={() => setSelectedCuisine("all")}
              className="px-3.5 py-1.5 rounded-full text-[12px] font-semibold tracking-tight whitespace-nowrap bg-[#002D23] text-white border border-[#002D23] shadow-sm flex items-center gap-1.5"
            >
              <span className="capitalize">{selectedCuisine}</span>
              <X className="w-3 h-3" />
            </button>
          )}

          {/* Dietary Filter Pills */}
          <div className="flex items-center gap-1.5 pl-1 border-l border-[#DDE3DD] dark:border-[#002D23]">
            <button
              type="button"
              onClick={() => setDietFilter(dietFilter === "veg" ? "all" : "veg")}
              className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-all shrink-0 flex items-center gap-1.5 ${
                dietFilter === "veg"
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                  : "bg-white dark:bg-[#002D23] text-[#0B1714] dark:text-stone-300 border-[#DDE3DD] dark:border-[#002D23]"
              }`}
            >
              <FoodTypeBadge foodType="veg" size="sm" />
              <span>Veg Only</span>
            </button>

            <button
              type="button"
              onClick={() => setDietFilter(dietFilter === "non_veg" ? "all" : "non_veg")}
              className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-all shrink-0 flex items-center gap-1.5 ${
                dietFilter === "non_veg"
                  ? "bg-red-600 text-white border-red-600 shadow-xs"
                  : "bg-white dark:bg-[#002D23] text-[#0B1714] dark:text-stone-300 border-[#DDE3DD] dark:border-[#002D23]"
              }`}
            >
              <FoodTypeBadge foodType="non_veg" size="sm" />
              <span>Non-Veg</span>
            </button>

            <button
              type="button"
              onClick={() => setDietFilter(dietFilter === "egg" ? "all" : "egg")}
              className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-all shrink-0 flex items-center gap-1.5 ${
                dietFilter === "egg"
                  ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                  : "bg-white dark:bg-[#002D23] text-[#0B1714] dark:text-stone-300 border-[#DDE3DD] dark:border-[#002D23]"
              }`}
            >
              <FoodTypeBadge foodType="egg" size="sm" />
              <span>Egg</span>
            </button>
          </div>
        </section>

        {/* Recent Searches Pills if query is empty */}
        {!query.trim() && recentSearches.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            <span className="text-[11px] font-bold text-[#73716B] shrink-0 uppercase tracking-wider">Recent:</span>
            {recentSearches.map((term) => (
              <button
                key={term}
                onClick={() => {
                  setQuery(term);
                  setShowSuggestions(false);
                }}
                className="px-3 py-1 rounded-full bg-white dark:bg-[#002D23] border border-[#DDE3DD] dark:border-[#002D23] text-[11px] font-medium text-[#0B1714] dark:text-stone-300 hover:border-[#002D23] shrink-0 flex items-center gap-1.5 transition-colors"
              >
                <span>{term}</span>
                <span
                  onClick={(e) => removeRecentSearch(e, term)}
                  className="hover:text-red-500"
                >
                  <X className="w-2.5 h-2.5" />
                </span>
              </button>
            ))}
          </div>
        )}

        {/* 6. RESULTS SECTION */}
        <div className="space-y-4 pt-1">
            {/* Header: Result Count */}
            {!loading && (
              <div className="flex items-center justify-between px-1 text-[13px] text-[#777D79]">
                <span>
                  <strong>{filteredCafes.length + filteredDishes.length}</strong> {filteredCafes.length + filteredDishes.length === 1 ? "spot found" : "spots found"}
                  {debouncedQuery ? ` for “${debouncedQuery}”` : ""}
                </span>
                {(selectedFilter !== "all" || selectedCuisine !== "all" || dietFilter !== "all") && (
                  <button
                    onClick={() => {
                      setSelectedFilter("all");
                      setSelectedCuisine("all");
                      setDietFilter("all");
                    }}
                    className="text-[#064E3B] dark:text-[#34D399] font-bold hover:underline"
                  >
                    Reset filters
                  </button>
                )}
              </div>
            )}

            {/* Loading Skeletons */}
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="p-3 rounded-2xl bg-white dark:bg-[#181C1A] border border-[#E9E8E2] dark:border-[#242B27] flex gap-3.5 animate-pulse shadow-subtle"
                  >
                    <div className="w-28 h-28 rounded-xl bg-stone-200 dark:bg-stone-800 shrink-0" />
                    <div className="flex-1 space-y-2.5 py-1">
                      <div className="h-4 bg-stone-200 dark:bg-stone-800 rounded w-2/3" />
                      <div className="h-3 bg-stone-200 dark:bg-stone-800 rounded w-1/3" />
                      <div className="h-3 bg-stone-200 dark:bg-stone-800 rounded w-1/2 pt-2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              /* Error State */
              <div className="p-8 rounded-2xl bg-white dark:bg-[#181C1A] border border-[#E9E8E2] dark:border-[#242B27] text-center space-y-3 shadow-card">
                <p className="text-sm font-semibold text-[#191D1B] dark:text-white">
                  We couldn&apos;t load results. Try again.
                </p>
                <button
                  onClick={() => setDebouncedQuery(query + " ")}
                  className="px-4 py-2 bg-[#064E3B] text-white text-xs font-bold rounded-xl hover:bg-[#043B2C] transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : filteredCafes.length === 0 && filteredDishes.length === 0 ? (
              /* No Results State */
              <div className="p-8 rounded-2xl bg-white dark:bg-[#181C1A] border border-[#E9E8E2] dark:border-[#242B27] text-center space-y-3 shadow-card animate-fade-in">
                <div className="w-12 h-12 rounded-full bg-[#EAF3EC] text-[#064E3B] flex items-center justify-center mx-auto">
                  <Search className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-[16px] text-[#191D1B] dark:text-white">
                  No spots found matching your filters.
                </h3>
                <p className="text-[12px] text-[#777D79] max-w-xs mx-auto leading-relaxed">
                  Try clearing your dietary filter or search for another dish, cafe, or cuisine.
                </p>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    onClick={() => {
                      setQuery("");
                      setSelectedFilter("all");
                      setSelectedCuisine("all");
                      setDietFilter("all");
                    }}
                    className="px-4 py-2 bg-[#064E3B] text-white text-[12px] font-bold rounded-xl shadow-sm hover:bg-[#043B2C] transition-colors"
                  >
                    Clear All Filters
                  </button>
                </div>
              </div>
            ) : (
              /* Populated Results Feed */
              <div className="space-y-3.5">
                {/* 1. Dish-level results if matching items were returned */}
                {filteredDishes.length > 0 && (
                  <div className="space-y-2 pb-1">
                    <h3 className="text-[13px] font-bold text-[#777D79] uppercase tracking-wider px-0.5">
                      Matching Dishes
                    </h3>
                    <div className="grid grid-cols-1 gap-2">
                      {filteredDishes.map((dish) => (
                        <Link
                          key={dish.id}
                          href={`/cafe/${dish.cafeSlug}`}
                          className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-[#181C1A] border border-[#E9E8E2] dark:border-[#242B27] shadow-subtle hover:border-[#064E3B] transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={dish.image}
                              alt={dish.name}
                              className="w-12 h-12 rounded-xl object-cover"
                            />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <FoodTypeBadge foodType={dish.foodType} isVeg={dish.isVeg} size="sm" />
                                <h4 className="font-bold text-[14px] text-[#191D1B] dark:text-white group-hover:text-[#064E3B] transition-colors">
                                  {dish.name}
                                </h4>
                              </div>
                              <p className="text-[11px] text-[#777D79]">
                                at <span className="font-semibold text-stone-700 dark:text-stone-300">{dish.cafeName}</span>
                              </p>
                            </div>
                          </div>
                          <span className="font-bold text-[14px] text-[#064E3B] dark:text-[#34D399]">
                            {getFeeConfigByCurrency(dish.currency)?.symbol || dish.currency || "₹"}{dish.price}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Restaurant Result Cards matching Screen 2 */}
                <div className="space-y-4">
                  {filteredCafes.map((cafe) => {
                    const isFav = favorites.includes(cafe.id);
                    return (
                      <Link
                        key={cafe.id}
                        href={`/cafe/${cafe.slug}`}
                        className="block group bg-white dark:bg-[#002D23] rounded-[22px] border border-[#DDE3DD] dark:border-[#002D23] overflow-hidden shadow-sm hover:border-[#D0CEBF] transition-all duration-200"
                      >
                        {/* Cover Image on Top */}
                        <div className="relative w-full h-44 bg-stone-100 dark:bg-stone-800 overflow-hidden">
                          <img
                            src={cafe.coverImage}
                            alt={cafe.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                            loading="lazy"
                          />

                          {/* Top Badges */}
                          <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                            <span className="px-2.5 py-0.5 rounded-full bg-[#002D23]/90 backdrop-blur-sm text-[10px] font-bold text-white tracking-wide flex items-center gap-1 shadow-sm">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#34D399]" />
                              Open
                            </span>
                            {cafe.foodCategory && (
                              <RestaurantCategoryBadge category={cafe.foodCategory} size="sm" />
                            )}
                          </div>

                          <button
                            onClick={(e) => toggleFavorite(e, cafe.id)}
                            aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
                            className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/90 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center shadow-sm hover:scale-110 active:scale-95 transition-transform"
                          >
                            <Heart
                              className={`w-3.5 h-3.5 ${
                                isFav ? "fill-rose-500 text-rose-500" : "text-[#0B1714] dark:text-white"
                              }`}
                            />
                          </button>
                        </div>

                        {/* Card Content below image */}
                        <div className="p-3.5 space-y-1">
                          <h3 className="font-extrabold text-[16px] text-[#0B1714] dark:text-white group-hover:text-[#002D23] transition-colors leading-tight">
                            {cafe.name}
                          </h3>

                          <p className="text-[12px] text-[#73716B] dark:text-stone-400 font-medium truncate">
                            {cafe.cuisines.join(" • ")}
                          </p>

                          {/* Rating & Distance */}
                          <div className="flex items-center gap-3 pt-0.5 text-[12px]">
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

                            {cafe.distanceKm !== null && (
                              <div className="flex items-center gap-1 text-[#73716B]">
                                <MapPin className="w-3 h-3 text-[#73716B]" />
                                <span>{cafe.distanceKm} km</span>
                              </div>
                            )}
                          </div>

                          {/* Offer badge & price tier */}
                          <div className="pt-2 flex items-center justify-between border-t border-[#F2ECE1] dark:border-[#002D23] text-[11px]">
                            {cafe.offer ? (
                              <div className="flex items-center gap-1.5">
                                <span className="px-2 py-0.5 rounded bg-[#E6F0DD] text-[#002D23] font-bold text-[10px]">
                                  {cafe.offer.discountText}
                                </span>
                                <span className="text-[#73716B]">
                                  Use code: <strong className="text-[#0B1714] dark:text-white">{cafe.offer.code}</strong>
                                </span>
                              </div>
                            ) : (
                              <span className="text-[#73716B]">Specialty Cafe</span>
                            )}
                            <span className="text-[11px] font-semibold text-[#73716B]">
                              {cafe.priceRange}
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

        {/* 7. FILTER BOTTOM SHEET MODAL */}
        {showFilterModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="w-full max-w-md bg-white dark:bg-[#002D23] rounded-t-[28px] sm:rounded-[28px] p-5 space-y-4 max-h-[85vh] overflow-y-auto border border-[#DDE3DD] dark:border-[#002D23] shadow-xl">
              <div className="flex items-center justify-between pb-2 border-b border-[#DDE3DD] dark:border-[#002D23]">
                <h3 className="font-bold text-[16px] text-[#0B1714] dark:text-white">
                  Filters
                </h3>
                <button
                  onClick={() => setShowFilterModal(false)}
                  className="w-7 h-7 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-[#73716B] dark:text-stone-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Cuisine Section */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-[#73716B] uppercase tracking-wide">
                  Cuisine
                </span>
                <div className="flex flex-wrap gap-2">
                  {["all", "cafe", "fine dining", "fast food", "desserts", "bakery"].map((c) => (
                    <button
                      key={c}
                      onClick={() => setSelectedCuisine(c)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize border transition-colors ${
                        selectedCuisine === c
                          ? "bg-[#002D23] text-white border-[#002D23]"
                          : "bg-white dark:bg-[#002D23] text-[#0B1714] dark:text-stone-300 border-[#DDE3DD] dark:border-[#002D23]"
                      }`}
                    >
                      {c === "all" ? "All Cuisines" : c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preferences Section */}
              <div className="space-y-2 pt-1">
                <span className="text-xs font-bold text-[#73716B] uppercase tracking-wide">
                  Preferences
                </span>
                <div className="space-y-1.5">
                  {[
                    { id: "open_now", label: "Open Now" },
                    { id: "offers", label: "Active Offers Available" },
                    { id: "top_rated", label: "Top Rated (4.5+)" }
                  ].map((pref) => {
                    const isChecked = selectedFilter === pref.id;
                    return (
                      <button
                        key={pref.id}
                        onClick={() => setSelectedFilter(isChecked ? "all" : pref.id)}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl border border-[#DDE3DD] dark:border-[#002D23] text-left text-xs font-medium hover:border-[#002D23]/40 transition-colors"
                      >
                        <span className="text-[#0B1714] dark:text-white">{pref.label}</span>
                        <div
                          className={`w-4 h-4 rounded-md flex items-center justify-center border ${
                            isChecked ? "bg-[#002D23] border-[#002D23] text-white" : "border-[#DDE3DD]"
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-3 flex gap-2 border-t border-[#DDE3DD] dark:border-[#002D23]">
                <button
                  onClick={() => {
                    setSelectedFilter("all");
                    setSelectedCuisine("all");
                    setShowFilterModal(false);
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-[#DDE3DD] text-xs font-bold text-[#73716B] hover:bg-stone-50 transition-colors"
                >
                  Clear All
                </button>
                <button
                  onClick={() => setShowFilterModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[#002D23] text-white text-xs font-bold shadow-sm hover:bg-[#001F19] transition-colors"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 8. SORT BOTTOM SHEET MODAL */}
        {showSortModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="w-full max-w-md bg-white dark:bg-[#002D23] rounded-t-[28px] sm:rounded-[28px] p-5 space-y-3 border border-[#DDE3DD] dark:border-[#002D23] shadow-xl">
              <div className="flex items-center justify-between pb-1 border-b border-[#DDE3DD] dark:border-[#002D23]">
                <h3 className="font-bold text-[16px] text-[#0B1714] dark:text-white">
                  Sort By
                </h3>
                <button
                  onClick={() => setShowSortModal(false)}
                  className="w-7 h-7 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-[#73716B] dark:text-stone-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1">
                {[
                  { id: "relevance", label: "Relevance" },
                  { id: "rating", label: "Highest Rated" },
                  { id: "distance", label: "Distance (Nearest First)" },
                  { id: "price_asc", label: "Price (Low to High)" }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setSelectedSort(opt.id);
                      setShowSortModal(false);
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl text-left text-xs font-semibold transition-colors ${
                      selectedSort === opt.id
                        ? "bg-[#E6F0DD] text-[#002D23]"
                        : "hover:bg-stone-50 dark:hover:bg-stone-800 text-[#0B1714] dark:text-stone-300"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {selectedSort === opt.id && <Check className="w-4 h-4 text-[#002D23]" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAF8F4] flex items-center justify-center text-xs text-stone-400">Loading...</div>}>
      <SearchPageContent />
    </Suspense>
  );
}
