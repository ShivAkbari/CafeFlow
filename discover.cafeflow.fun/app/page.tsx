"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Search,
  MapPin,
  ChevronDown,
  ArrowRight,
  Star,
  Heart,
  Navigation,
  Utensils,
  Coffee,
  Wine,
  Flame,
  Cake,
  Croissant,
  MoreHorizontal
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

interface OfferItem {
  id: string;
  code: string;
  title: string;
  description: string;
  promoType: string;
  value: number;
  discountText: string;
  cafeName: string;
  cafeSlug: string;
}

export default function DiscoverHomePage() {
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedCity, setSelectedCity] = useState("Ahmedabad");
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Available location choices
  const cities = ["Ahmedabad", "Mumbai", "Bengaluru", "Delhi NCR", "Pune"];

  // Exact categories and pastel backgrounds from the reference screenshot
  const categories = [
    { id: "all", label: "All", icon: Utensils, bg: "bg-[#2D3A34]", text: "text-white" },
    { id: "cafe", label: "Café", icon: Coffee, bg: "bg-[#E7F3EC]", text: "text-[#1B4332]" },
    { id: "fine dining", label: "Fine Dining", icon: Wine, bg: "bg-[#EDF2F7]", text: "text-[#2B4365]" },
    { id: "fast food", label: "Fast Food", icon: Flame, bg: "bg-[#FDF0EC]", text: "text-[#9C4221]" },
    { id: "desserts", label: "Desserts", icon: Cake, bg: "bg-[#FDF4EA]", text: "text-[#B7791F]" },
    { id: "bakery", label: "Bakery", icon: Croissant, bg: "bg-[#F5F2EB]", text: "text-[#744210]" }
  ];

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

  // Fetch cafes & offers
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (searchQuery) params.append("q", searchQuery);
    if (selectedCategory && selectedCategory !== "all") params.append("category", selectedCategory);
    if (userLocation) {
      params.append("lat", userLocation.lat.toString());
      params.append("lng", userLocation.lng.toString());
    } else if (selectedCity && selectedCity !== "Current Location") {
      params.append("city", selectedCity);
    }

    const url = `/api/cafes?${params.toString()}`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setCafes(data.cafes || []);
        if (data.offers && data.offers.length > 0) {
          setOffers(data.offers);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [searchQuery, selectedCategory, userLocation, selectedCity]);

  return (
    <div className="min-h-screen bg-[#FAF8F4] dark:bg-[#111413] text-[#191D1B] dark:text-[#F5F7F6]">
      <main className="max-w-[430px] md:max-w-3xl mx-auto px-4 sm:px-6 pt-3 pb-24 md:pb-12 space-y-5">

        {/* 1. HEADER: Compact Brand and Location */}
        <header className="flex items-center justify-between pt-1">
          {/* Brand Mark */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl bg-[#064E3B] flex items-center justify-center text-white shadow-sm">
              <Coffee className="w-4 h-4 text-[#86EFAC]" />
            </div>
            <div className="flex items-baseline">
              <span className="font-extrabold text-[17px] tracking-tight text-[#191D1B] dark:text-white">
                CafeFlow
              </span>
              <span className="text-[12px] font-medium text-[#777D79] dark:text-stone-400 ml-1.5">
                Discover
              </span>
            </div>
          </Link>

          {/* Location Selector & Avatar */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setShowLocationPicker(!showLocationPicker)}
                className="flex flex-col items-end text-right group focus:outline-none"
                aria-label="Change location"
              >
                <span className="text-[10px] text-[#777D79] flex items-center gap-1 font-medium">
                  <MapPin className="w-3 h-3 text-[#064E3B] dark:text-[#34D399]" />
                  Your location
                </span>
                <span className="text-[12px] font-bold text-[#191D1B] dark:text-[#F5F7F6] flex items-center gap-0.5 group-hover:text-[#064E3B] transition-colors">
                  {selectedCity}
                  <ChevronDown className="w-3 h-3 text-[#777D79]" />
                </span>
              </button>

              {/* Location Modal */}
              {showLocationPicker && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#181C1A] rounded-2xl shadow-lg border border-[#E9E8E2] dark:border-[#242B27] p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    onClick={() => {
                      handleGetLocation();
                      setShowLocationPicker(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#064E3B] dark:text-[#34D399] rounded-xl hover:bg-[#EAF3EC] transition-colors"
                  >
                    <Navigation className={`w-3.5 h-3.5 ${locating ? "animate-spin" : ""}`} />
                    {locating ? "Locating..." : "Use Current Location"}
                  </button>
                  <div className="my-1 border-t border-[#E9E8E2] dark:border-[#242B27]" />
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
                          ? "bg-[#064E3B] text-white font-bold"
                          : "text-[#191D1B] dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800"
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
              className="relative w-8 h-8 rounded-full overflow-hidden border border-[#E9E8E2] dark:border-[#242B27] bg-white shadow-sm flex items-center justify-center"
              aria-label="User Profile"
            >
              {userProfile?.photoUrl ? (
                <img
                  src={userProfile.photoUrl}
                  alt={userProfile.name || "Customer"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-[#EAF3EC] dark:bg-[#064E3B]/20 text-[#064E3B] dark:text-[#34D399] font-bold text-[11px] flex items-center justify-center">
                  {userProfile?.name ? userProfile.name.charAt(0).toUpperCase() : "CF"}
                </div>
              )}
            </Link>
          </div>
        </header>

        {/* 2. HERO SECTION: Controlled Warm Food Photography with Headline */}
        <section className="relative rounded-[22px] overflow-hidden shadow-subtle min-h-[195px] flex flex-col justify-between p-5 text-white">
          {/* Warm cafe photography treatment */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1000&q=80')`
            }}
          />
          {/* Subtle gradient overlay allowing image to shine while preserving white text contrast */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/30" />

          {/* Headline & Subtitle */}
          <div className="relative z-10 space-y-1 mt-auto">
            <h1 className="text-[27px] sm:text-[30px] font-extrabold tracking-tight leading-[1.15]">
              Good Food<br />Better Vibes
            </h1>
            <p className="text-[12px] text-white/85 font-medium max-w-[260px] leading-snug">
              Discover the best cafes, restaurants and food spots near you.
            </p>
          </div>
        </section>

        {/* 3. SEARCH BAR: Pill-shaped, subtle border, circular #064E3B button */}
        <section aria-label="Search" className="-mt-1">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (searchQuery.trim()) {
                window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
              } else {
                window.location.href = "/search";
              }
            }}
            className="relative flex items-center bg-white dark:bg-[#181C1A] rounded-full border border-[#E9E8E2] dark:border-[#242B27] shadow-search p-1 pl-4 pr-1.5 focus-within:border-[#064E3B] transition-colors"
          >
            <Search className="w-4 h-4 text-[#777D79] shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for restaurants, cuisines, dishes..."
              className="w-full bg-transparent px-2.5 py-1.5 text-[13px] text-[#191D1B] dark:text-[#F5F7F6] placeholder-[#777D79] focus:outline-none cursor-text"
            />
            <button
              type="submit"
              aria-label="Submit search"
              className="w-8 h-8 rounded-full bg-[#064E3B] hover:bg-[#043B2C] text-white flex items-center justify-center shrink-0 shadow-sm transition-transform active:scale-95"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </section>

        {/* 4. FOOD CATEGORIES: Horizontal row with consistent circular icon containers & pastel backgrounds */}
        <section aria-label="Food Categories" className="space-y-1 pt-1">
          <div className="flex items-center justify-between gap-3 overflow-x-auto no-scrollbar py-1">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className="flex flex-col items-center gap-1 shrink-0 group focus:outline-none"
                >
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
                      isSelected
                        ? "bg-[#064E3B] text-white shadow-sm scale-105"
                        : `${cat.bg} ${cat.text} group-hover:scale-105 active:scale-95`
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span
                    className={`text-[11px] tracking-tight transition-colors ${
                      isSelected
                        ? "font-bold text-[#064E3B] dark:text-[#34D399]"
                        : "font-medium text-[#191D1B] dark:text-stone-300"
                    }`}
                  >
                    {cat.label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 5. TODAY'S SPECIAL OFFERS: Single prominent warm banner */}
        {offers.length > 0 && (
          <section id="offers" className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between px-0.5">
              <h2 className="text-[16px] font-bold text-[#191D1B] dark:text-white tracking-tight">
                Today&apos;s Special Offers
              </h2>
              <Link
                href="/#offers"
                className="text-[12px] font-semibold text-[#064E3B] dark:text-[#34D399] hover:underline"
              >
                View all
              </Link>
            </div>

            {/* Reference Offer Banner: warm cream/amber tone, food photography on left, badge + title + arrow */}
            <div className="relative rounded-[20px] overflow-hidden bg-[#FFF0D5] dark:bg-[#252018] border border-[#F3E2C4] dark:border-[#3D3323] p-4 flex items-center gap-4 shadow-subtle">
              {/* Food thumbnail */}
              <div className="relative w-20 h-20 rounded-2xl overflow-hidden shrink-0 shadow-sm">
                <img
                  src="https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=400&q=80"
                  alt="Special Offer"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Offer details */}
              <div className="flex-1 min-w-0 space-y-1">
                <span className="inline-block px-2 py-0.5 rounded-full bg-[#1B4332] text-white text-[9px] font-extrabold uppercase tracking-wide">
                  {offers[0]?.discountText || "UP TO 40% OFF"}
                </span>
                <h3 className="text-[15px] font-extrabold text-[#191D1B] dark:text-white leading-tight truncate">
                  {offers[0]?.title || "Weekend Brunch Special"}
                </h3>
                <p className="text-[11px] text-[#777D79] dark:text-stone-400 font-medium truncate">
                  Good food, better mood. &bull; Use code: {offers[0]?.code}
                </p>
              </div>

              {/* Action Button */}
              <Link
                href={`/cafe/${offers[0]?.cafeSlug || ""}`}
                aria-label={`Order with ${offers[0]?.code}`}
                className="w-8 h-8 rounded-full bg-white dark:bg-[#181C1A] text-[#191D1B] dark:text-white shadow-sm flex items-center justify-center shrink-0 hover:scale-105 active:scale-95 transition-transform"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </section>
        )}

        {/* 6. POPULAR RESTAURANTS: Photography first, clean metadata, subtle badges */}
        <section className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="text-[16px] font-bold text-[#191D1B] dark:text-white tracking-tight">
              Popular Restaurants
            </h2>
            <button
              onClick={() => {
                setSelectedCategory("all");
                setSearchQuery("");
              }}
              className="text-[12px] font-semibold text-[#064E3B] dark:text-[#34D399] hover:underline"
            >
              View all
            </button>
          </div>

          {loading ? (
            /* Loading skeletons */
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-[#181C1A] rounded-[20px] border border-[#E9E8E2] dark:border-[#242B27] p-3 space-y-3 animate-pulse"
                >
                  <div className="w-full h-40 bg-stone-200 dark:bg-stone-800 rounded-xl" />
                  <div className="h-4 bg-stone-200 dark:bg-stone-800 rounded w-1/2" />
                  <div className="h-3 bg-stone-200 dark:bg-stone-800 rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : cafes.length === 0 ? (
            /* Empty state */
            <div className="bg-white dark:bg-[#181C1A] rounded-[20px] p-8 text-center border border-[#E9E8E2] dark:border-[#242B27] shadow-card space-y-3">
              <div className="w-10 h-10 rounded-full bg-[#EAF3EC] text-[#064E3B] flex items-center justify-center mx-auto">
                <Search className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-[#191D1B] dark:text-white">
                No spots found
              </h3>
              <p className="text-xs text-[#777D79] max-w-xs mx-auto">
                No venues match &ldquo;{searchQuery || selectedCategory}&rdquo;. Try another category.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                }}
                className="px-4 py-1.5 bg-[#064E3B] text-white text-xs font-bold rounded-xl hover:bg-[#043B2C] transition-colors"
              >
                Reset Search
              </button>
            </div>
          ) : (
            /* Restaurant Cards List matching the reference's clean layout */
            <div className="space-y-3.5">
              {cafes.map((cafe) => {
                const isFav = favorites.includes(cafe.id);
                return (
                  <Link
                    key={cafe.id}
                    href={`/cafe/${cafe.slug}`}
                    className="block group bg-white dark:bg-[#181C1A] rounded-[20px] border border-[#E9E8E2] dark:border-[#242B27] overflow-hidden shadow-card hover:border-[#D0CEBF] transition-all"
                  >
                    {/* Cover image container */}
                    <div className="relative w-full h-44 bg-stone-100 dark:bg-stone-800 overflow-hidden">
                      <img
                        src={cafe.coverImage}
                        alt={cafe.name}
                        className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                        loading="lazy"
                      />

                      {/* Top Overlay Badges: Open badge on left, heart on right */}
                      <div className="absolute top-2.5 left-2.5">
                        <span className="px-2.5 py-0.5 rounded-full bg-[#064E3B]/90 backdrop-blur-sm text-[10px] font-bold text-white tracking-wide flex items-center gap-1 shadow-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#34D399]" />
                          Open
                        </span>
                      </div>

                      <button
                        onClick={(e) => toggleFavorite(e, cafe.id)}
                        aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
                        className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-white/90 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center shadow-sm hover:scale-110 active:scale-95 transition-transform"
                      >
                        <Heart
                          className={`w-3.5 h-3.5 ${
                            isFav ? "fill-rose-500 text-rose-500" : "text-[#191D1B] dark:text-white"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Card Content */}
                    <div className="p-3.5 space-y-1.5">
                      <div className="flex items-baseline justify-between">
                        <h3 className="font-bold text-[15px] text-[#191D1B] dark:text-white group-hover:text-[#064E3B] transition-colors leading-tight">
                          {cafe.name}
                        </h3>
                        <span className="text-[12px] font-semibold text-[#777D79]">
                          {cafe.priceRange}
                        </span>
                      </div>

                      <p className="text-[12px] text-[#777D79] dark:text-stone-400 font-medium truncate">
                        {cafe.cuisines.join(" • ")}
                      </p>

                      {/* Rating & Distance */}
                      <div className="flex items-center gap-3 pt-0.5 text-[12px]">
                        <div className="flex items-center gap-1 font-bold text-[#191D1B] dark:text-white">
                          <Star className="w-3.5 h-3.5 fill-[#064E3B] text-[#064E3B] dark:fill-[#34D399] dark:text-[#34D399]" />
                          <span>{cafe.rating.toFixed(1)}</span>
                          <span className="text-[#777D79] font-normal text-[11px]">
                            ({cafe.reviewCount})
                          </span>
                        </div>

                        {cafe.distanceKm !== null && (
                          <div className="flex items-center gap-1 text-[#777D79]">
                            <MapPin className="w-3 h-3 text-[#777D79]" />
                            <span>{cafe.distanceKm} km</span>
                          </div>
                        )}
                      </div>

                      {/* Offer badge if valid promo exists */}
                      {cafe.offer && (
                        <div className="pt-2 flex items-center justify-between border-t border-[#F2F1EB] dark:border-[#242B27] text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded bg-[#EAF3EC] text-[#064E3B] font-bold text-[10px]">
                              {cafe.offer.discountText}
                            </span>
                            <span className="text-[#777D79]">
                              Use code: <strong className="text-[#191D1B] dark:text-white">{cafe.offer.code}</strong>
                            </span>
                          </div>
                          <span className="text-[#064E3B] dark:text-[#34D399] font-bold flex items-center gap-0.5">
                            View <ArrowRight className="w-3 h-3" />
                          </span>
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

      </main>
    </div>
  );
}
