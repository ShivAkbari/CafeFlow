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

interface Cafe {
  id: string;
  name: string;
  slug: string;
  address: string;
  logo: string;
  coverImage: string;
  cuisines: string[];
  priceRange: string;
  rating: number;
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
  cafeName: string;
  cafeSlug: string;
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Filters State
  const [selectedFilter, setSelectedFilter] = useState<string>("all"); // 'near_me', 'open_now', 'top_rated', 'offers'
  const [selectedSort, setSelectedSort] = useState<string>("relevance"); // 'relevance', 'rating', 'distance', 'price_asc'
  const [selectedCuisine, setSelectedCuisine] = useState<string>(initialCuisine);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);

  // Recent Searches
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);

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
    }, 280);
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

  // Perform search request
  useEffect(() => {
    // Only search if user typed a query or applied a non-default filter/cuisine
    const hasFilter = selectedFilter !== "all" || selectedCuisine !== "all";
    if (!debouncedQuery && !hasFilter) {
      setCafes([]);
      setDishes([]);
      setLoading(false);
      return;
    }

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

    fetch(`/api/cafes?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Search request failed");
        return res.json();
      })
      .then((data) => {
        setCafes(data.cafes || []);
        setDishes(data.dishes || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(true);
        setLoading(false);
      });
  }, [debouncedQuery, selectedFilter, selectedCuisine, selectedSort, userLocation]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      saveRecentSearch(query);
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

  // Quick filter pills matching the reference screen
  const quickFilters = [
    { id: "near_me", label: "Near me", action: () => { if (!userLocation) requestLocation(); else setSelectedFilter(selectedFilter === "near_me" ? "all" : "near_me"); } },
    { id: "open_now", label: "Open now", action: () => setSelectedFilter(selectedFilter === "open_now" ? "all" : "open_now") },
    { id: "top_rated", label: "Ratings 4.5+", action: () => setSelectedFilter(selectedFilter === "top_rated" ? "all" : "top_rated") },
    { id: "offers", label: "Offers", action: () => setSelectedFilter(selectedFilter === "offers" ? "all" : "offers") }
  ];

  return (
    <div className="min-h-screen bg-[#FAF8F4] dark:bg-[#111413] text-[#191D1B] dark:text-[#F5F7F6]">
      <main className="max-w-[430px] md:max-w-3xl mx-auto px-4 sm:px-6 pt-3 pb-24 md:pb-12 space-y-4">

        {/* 1. COMPACT SEARCH HEADER & INPUT */}
        <header className="space-y-3 pt-1">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => router.back()}
              aria-label="Back to previous page"
              className="w-9 h-9 rounded-full bg-white dark:bg-[#181C1A] border border-[#E9E8E2] dark:border-[#242B27] flex items-center justify-center text-[#191D1B] dark:text-white shadow-subtle shrink-0 active:scale-95 transition-transform"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            {/* Pill Search Input matching the reference */}
            <form
              onSubmit={handleSearchSubmit}
              className="relative flex-1 flex items-center bg-white dark:bg-[#181C1A] rounded-full border border-[#E9E8E2] dark:border-[#242B27] shadow-search p-1 pl-3.5 pr-2 focus-within:border-[#064E3B] transition-colors"
            >
              <Search className="w-4 h-4 text-[#777D79] shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Restaurants, dishes, cuisines..."
                className="w-full bg-transparent px-2.5 py-1.5 text-[14px] text-[#191D1B] dark:text-[#F5F7F6] placeholder-[#777D79] focus:outline-none"
                autoFocus
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    inputRef.current?.focus();
                  }}
                  aria-label="Clear search"
                  className="w-6 h-6 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 hover:text-stone-800 flex items-center justify-center shrink-0 mr-1"
                >
                  <X className="w-3 h-3" />
                </button>
              )}

              {/* Filter Sheet Trigger Icon */}
              <button
                type="button"
                onClick={() => setShowFilterModal(true)}
                aria-label="Open filter options"
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                  selectedFilter !== "all" || selectedCuisine !== "all"
                    ? "bg-[#064E3B] text-white"
                    : "bg-stone-100 dark:bg-stone-800 text-[#777D79] hover:text-[#191D1B]"
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

          {/* 2. HORIZONTAL QUICK FILTER CHIPS */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            {quickFilters.map((filter) => {
              const isActive = selectedFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  onClick={filter.action}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-semibold tracking-tight whitespace-nowrap transition-all border ${
                    isActive
                      ? "bg-[#064E3B] text-white border-[#064E3B] shadow-sm"
                      : "bg-white dark:bg-[#181C1A] text-[#191D1B] dark:text-stone-300 border-[#E9E8E2] dark:border-[#242B27] hover:border-[#D0CEBF]"
                  }`}
                >
                  {filter.id === "near_me" && locating ? "Locating..." : filter.label}
                </button>
              );
            })}

            {/* Sort Dropdown Chip */}
            <button
              onClick={() => setShowSortModal(true)}
              className="px-3 py-1.5 rounded-full text-[12px] font-semibold tracking-tight whitespace-nowrap bg-white dark:bg-[#181C1A] text-[#191D1B] dark:text-stone-300 border border-[#E9E8E2] dark:border-[#242B27] flex items-center gap-1 shrink-0"
            >
              <span>Sort</span>
              <ChevronDown className="w-3 h-3 text-[#777D79]" />
            </button>
          </div>
        </header>

        {/* 3. INITIAL DISCOVERY STATE (Shown when no search query has been entered) */}
        {!query.trim() && selectedFilter === "all" && selectedCuisine === "all" ? (
          <div className="space-y-6 pt-2">
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <section className="space-y-2.5">
                <div className="flex items-center justify-between px-0.5">
                  <h2 className="text-[13px] font-bold text-[#777D79] uppercase tracking-wider">
                    Recent searches
                  </h2>
                  <button
                    onClick={clearAllRecent}
                    className="text-[12px] font-medium text-[#777D79] hover:text-[#191D1B] dark:hover:text-white"
                  >
                    Clear all
                  </button>
                </div>

                <div className="space-y-1">
                  {recentSearches.map((term) => (
                    <div
                      key={term}
                      onClick={() => setQuery(term)}
                      className="flex items-center justify-between p-2.5 rounded-2xl bg-white dark:bg-[#181C1A] border border-[#E9E8E2] dark:border-[#242B27] shadow-subtle hover:border-[#064E3B]/40 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2.5 text-stone-700 dark:text-stone-300">
                        <Clock className="w-3.5 h-3.5 text-[#777D79]" />
                        <span className="text-[13px] font-medium">{term}</span>
                      </div>
                      <button
                        onClick={(e) => removeRecentSearch(e, term)}
                        aria-label={`Remove ${term} from recents`}
                        className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Popular Searches / Quick Browse */}
            <section className="space-y-2.5">
              <h2 className="text-[13px] font-bold text-[#777D79] uppercase tracking-wider px-0.5">
                Popular searches
              </h2>
              <div className="flex flex-wrap gap-2">
                {popularTags.map((tag) => (
                  <button
                    key={tag.label}
                    onClick={() => {
                      setQuery(tag.query);
                      saveRecentSearch(tag.query);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#181C1A] border border-[#E9E8E2] dark:border-[#242B27] text-[13px] font-medium text-[#191D1B] dark:text-stone-200 hover:border-[#064E3B] transition-colors shadow-subtle flex items-center gap-1.5"
                  >
                    <Search className="w-3 h-3 text-[#777D79]" />
                    {tag.label}
                  </button>
                ))}
              </div>
            </section>
          </div>
        ) : (
          /* 4. RESULTS SECTION */
          <div className="space-y-4 pt-1">
            {/* Header: Result Count */}
            {!loading && (
              <div className="flex items-center justify-between px-1 text-[13px] text-[#777D79]">
                <span>
                  {cafes.length + dishes.length} {cafes.length + dishes.length === 1 ? "result" : "results"} found
                  {query ? ` for “${query}”` : ""}
                </span>
                {selectedFilter !== "all" && (
                  <button
                    onClick={() => {
                      setSelectedFilter("all");
                      setSelectedCuisine("all");
                    }}
                    className="text-[#064E3B] dark:text-[#34D399] font-semibold hover:underline"
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
                    className="p-3 rounded-2xl bg-white dark:bg-[#181C1A] border border-[#E9E8E2] dark:border-[#242B27] flex gap-3 animate-pulse"
                  >
                    <div className="w-24 h-24 rounded-xl bg-stone-200 dark:bg-stone-800 shrink-0" />
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-4 bg-stone-200 dark:bg-stone-800 rounded w-2/3" />
                      <div className="h-3 bg-stone-200 dark:bg-stone-800 rounded w-1/3" />
                      <div className="h-3 bg-stone-200 dark:bg-stone-800 rounded w-1/2 pt-2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              /* Error State */
              <div className="p-8 rounded-2xl bg-white dark:bg-[#181C1A] border border-[#E9E8E2] dark:border-[#242B27] text-center space-y-3">
                <p className="text-sm font-semibold text-[#191D1B] dark:text-white">
                  We couldn&apos;t load results. Try again.
                </p>
                <button
                  onClick={() => setDebouncedQuery(query + " ")}
                  className="px-4 py-1.5 bg-[#064E3B] text-white text-xs font-bold rounded-xl"
                >
                  Retry
                </button>
              </div>
            ) : cafes.length === 0 && dishes.length === 0 ? (
              /* No Results State */
              <div className="p-8 rounded-2xl bg-white dark:bg-[#181C1A] border border-[#E9E8E2] dark:border-[#242B27] text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#EAF3EC] text-[#064E3B] flex items-center justify-center mx-auto">
                  <Search className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-[15px] text-[#191D1B] dark:text-white">
                  No spots found just yet.
                </h3>
                <p className="text-[12px] text-[#777D79] max-w-xs mx-auto">
                  Try another restaurant, dish, or cuisine.
                </p>
                <div className="flex items-center justify-center gap-2 pt-1">
                  <button
                    onClick={() => {
                      setQuery("");
                      setSelectedFilter("all");
                      setSelectedCuisine("all");
                    }}
                    className="px-4 py-2 bg-[#064E3B] text-white text-[12px] font-bold rounded-xl shadow-sm hover:bg-[#043B2C] transition-colors"
                  >
                    Clear Search
                  </button>
                </div>
              </div>
            ) : (
              /* Populated Results Feed */
              <div className="space-y-3">
                {/* 1. Dish-level results if matching items were returned */}
                {dishes.length > 0 && (
                  <div className="space-y-2 pb-2">
                    <h3 className="text-[13px] font-bold text-[#777D79] uppercase tracking-wider px-0.5">
                      Matching Dishes
                    </h3>
                    <div className="grid grid-cols-1 gap-2">
                      {dishes.map((dish) => (
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
                                <span className={`w-2 h-2 rounded-full ${dish.isVeg ? "bg-emerald-500" : "bg-red-500"}`} />
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
                            ₹{dish.price}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Restaurant Result Cards */}
                {cafes.map((cafe) => {
                  const isFav = favorites.includes(cafe.id);
                  return (
                    <Link
                      key={cafe.id}
                      href={`/cafe/${cafe.slug}`}
                      className="flex gap-3 p-3 rounded-2xl bg-white dark:bg-[#181C1A] border border-[#E9E8E2] dark:border-[#242B27] shadow-card hover:border-[#D0CEBF] transition-all group"
                    >
                      {/* Left Thumbnail with Favorite button */}
                      <div className="relative w-28 h-28 rounded-xl overflow-hidden shrink-0 bg-stone-100 dark:bg-stone-800">
                        <img
                          src={cafe.coverImage}
                          alt={cafe.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                        <button
                          onClick={(e) => toggleFavorite(e, cafe.id)}
                          aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-white/90 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center shadow-sm"
                        >
                          <Heart
                            className={`w-3.5 h-3.5 ${
                              isFav ? "fill-rose-500 text-rose-500" : "text-[#191D1B] dark:text-white"
                            }`}
                          />
                        </button>
                      </div>

                      {/* Right Details */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                        <div className="space-y-1">
                          <div className="flex items-start justify-between gap-1">
                            <h3 className="font-bold text-[15px] text-[#191D1B] dark:text-white group-hover:text-[#064E3B] transition-colors leading-tight truncate">
                              {cafe.name}
                            </h3>
                            <span className="text-[11px] font-semibold text-[#777D79] shrink-0">
                              {cafe.priceRange}
                            </span>
                          </div>

                          <p className="text-[12px] text-[#777D79] dark:text-stone-400 font-medium truncate">
                            {cafe.cuisines.join(" • ")}
                          </p>
                        </div>

                        {/* Rating, Distance & Offer Badge */}
                        <div className="space-y-1.5 pt-1">
                          <div className="flex items-center gap-3 text-[11px]">
                            <div className="flex items-center gap-1 font-bold text-[#191D1B] dark:text-white">
                              <Star className="w-3 h-3 fill-[#064E3B] text-[#064E3B] dark:fill-[#34D399] dark:text-[#34D399]" />
                              <span>{cafe.rating.toFixed(1)}</span>
                              <span className="text-[#777D79] font-normal">({cafe.reviewCount})</span>
                            </div>

                            {cafe.distanceKm !== null && (
                              <div className="flex items-center gap-0.5 text-[#777D79]">
                                <MapPin className="w-3 h-3" />
                                <span>{cafe.distanceKm} km</span>
                              </div>
                            )}
                          </div>

                          {cafe.offer ? (
                            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#FFF0D5] text-[#9A6700] text-[10px] font-bold">
                              <Tag className="w-2.5 h-2.5" />
                              <span>{cafe.offer.discountText}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-[#064E3B] dark:text-[#34D399] font-bold">
                              Table Booking Available
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 5. FILTER BOTTOM SHEET MODAL */}
        {showFilterModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="w-full max-w-md bg-white dark:bg-[#181C1A] rounded-t-[28px] sm:rounded-[28px] p-5 space-y-4 max-h-[85vh] overflow-y-auto border border-[#E9E8E2] dark:border-[#242B27] shadow-xl">
              <div className="flex items-center justify-between pb-2 border-b border-[#E9E8E2] dark:border-[#242B27]">
                <h3 className="font-bold text-[16px] text-[#191D1B] dark:text-white">
                  Filters
                </h3>
                <button
                  onClick={() => setShowFilterModal(false)}
                  className="w-7 h-7 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-600 dark:text-stone-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Cuisine Section */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-[#777D79] uppercase tracking-wide">
                  Cuisine
                </span>
                <div className="flex flex-wrap gap-2">
                  {["all", "cafe", "fine dining", "fast food", "desserts", "bakery"].map((c) => (
                    <button
                      key={c}
                      onClick={() => setSelectedCuisine(c)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize border ${
                        selectedCuisine === c
                          ? "bg-[#064E3B] text-white border-[#064E3B]"
                          : "bg-white dark:bg-[#181C1A] text-stone-700 dark:text-stone-300 border-[#E9E8E2] dark:border-[#242B27]"
                      }`}
                    >
                      {c === "all" ? "All Cuisines" : c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status & Perks Section */}
              <div className="space-y-2 pt-1">
                <span className="text-xs font-bold text-[#777D79] uppercase tracking-wide">
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
                        className="w-full flex items-center justify-between p-2.5 rounded-xl border border-[#E9E8E2] dark:border-[#242B27] text-left text-xs font-medium"
                      >
                        <span>{pref.label}</span>
                        <div
                          className={`w-4 h-4 rounded-md flex items-center justify-center border ${
                            isChecked ? "bg-[#064E3B] border-[#064E3B] text-white" : "border-stone-300"
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
              <div className="pt-3 flex gap-2 border-t border-[#E9E8E2] dark:border-[#242B27]">
                <button
                  onClick={() => {
                    setSelectedFilter("all");
                    setSelectedCuisine("all");
                    setShowFilterModal(false);
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-[#E9E8E2] text-xs font-bold text-[#777D79] hover:bg-stone-50"
                >
                  Clear All
                </button>
                <button
                  onClick={() => setShowFilterModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[#064E3B] text-white text-xs font-bold shadow-sm"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 6. SORT BOTTOM SHEET MODAL */}
        {showSortModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="w-full max-w-md bg-white dark:bg-[#181C1A] rounded-t-[28px] sm:rounded-[28px] p-5 space-y-3 border border-[#E9E8E2] dark:border-[#242B27] shadow-xl">
              <div className="flex items-center justify-between pb-1 border-b border-[#E9E8E2] dark:border-[#242B27]">
                <h3 className="font-bold text-[16px] text-[#191D1B] dark:text-white">
                  Sort By
                </h3>
                <button
                  onClick={() => setShowSortModal(false)}
                  className="w-7 h-7 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-600 dark:text-stone-300"
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
                        ? "bg-[#EAF3EC] text-[#064E3B]"
                        : "hover:bg-stone-50 dark:hover:bg-stone-800 text-[#191D1B] dark:text-stone-300"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {selectedSort === opt.id && <Check className="w-4 h-4" />}
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
