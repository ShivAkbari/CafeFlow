"use client";

import { useState, useEffect, useRef } from "react";
import {
  MapPin,
  Search,
  Check,
  X,
  Plus,
  Minus,
  Navigation,
  Loader2,
  Compass,
  Crosshair
} from "lucide-react";

interface MapLocationSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLocation: (location: {
    lat: number;
    lng: number;
    address: string;
    city?: string;
  }) => void;
  initialLat?: number;
  initialLng?: number;
  title?: string;
}

const POPULAR_AREAS = [
  { name: "Bodakdev", city: "Ahmedabad", lat: 23.0384, lng: 72.5119 },
  { name: "Vastrapur", city: "Ahmedabad", lat: 23.035, lng: 72.5293 },
  { name: "Navrangpura", city: "Ahmedabad", lat: 23.0373, lng: 72.5564 },
  { name: "Prahlad Nagar", city: "Ahmedabad", lat: 23.0135, lng: 72.5085 },
  { name: "Sardardham", city: "Ahmedabad", lat: 23.0178, lng: 72.4645 },
  { name: "Bandra West", city: "Mumbai", lat: 19.0596, lng: 72.8295 },
  { name: "Koramangala", city: "Bengaluru", lat: 12.9352, lng: 77.6245 },
  { name: "Indiranagar", city: "Bengaluru", lat: 12.9784, lng: 77.6408 },
  { name: "Connaught Place", city: "Delhi NCR", lat: 28.6315, lng: 77.2167 },
  { name: "Koregaon Park", city: "Pune", lat: 18.5362, lng: 73.894 }
];

export function MapLocationSelectorModal({
  isOpen,
  onClose,
  onSelectLocation,
  initialLat = 23.0225,
  initialLng = 72.5714,
  title = "Pin Location"
}: MapLocationSelectorModalProps) {
  if (!isOpen) return null;

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const debounceTimerRef = useRef<any>(null);

  const [lat, setLat] = useState<number>(initialLat);
  const [lng, setLng] = useState<number>(initialLng);
  const [addressText, setAddressText] = useState<string>("Locating address...");
  const [cityName, setCityName] = useState<string>("Ahmedabad");
  const [geocoding, setGeocoding] = useState<boolean>(false);
  const [isMapMoving, setIsMapMoving] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searching, setSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Reverse geocodes coordinates into real address
  const resolveAddress = async (targetLat: number, targetLng: number) => {
    setGeocoding(true);
    try {
      const res = await fetch(
        `/api/user/addresses/geocode?lat=${targetLat.toFixed(5)}&lng=${targetLng.toFixed(5)}`
      );
      const data = await res.json();
      if (data && data.formattedAddress) {
        setAddressText(data.formattedAddress);

        const parts = data.formattedAddress.split(",").map((p: string) => p.trim());
        const matchedCity =
          parts.find((p: string) =>
            ["Ahmedabad", "Mumbai", "Bengaluru", "Bangalore", "Delhi", "Pune", "Gurugram", "Noida"].some(
              (c) => p.toLowerCase().includes(c.toLowerCase())
            )
          ) || parts[parts.length - 2] || "Ahmedabad";

        setCityName(matchedCity);
      } else {
        setAddressText(`Pin at ${targetLat.toFixed(4)}, ${targetLng.toFixed(4)}`);
      }
    } catch {
      setAddressText(`Pin at ${targetLat.toFixed(4)}, ${targetLng.toFixed(4)}`);
    } finally {
      setGeocoding(false);
    }
  };

  // Initialize interactive Leaflet map when opened
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    let isCancelled = false;

    // Dynamically import leaflet to guarantee browser execution without SSR errors
    import("leaflet").then((L) => {
      if (isCancelled || !mapContainerRef.current) return;

      // Clean up previous instance if any
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const map = L.map(mapContainerRef.current, {
        center: [initialLat || 23.0225, initialLng || 72.5714],
        zoom: 16,
        zoomControl: false
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19
      }).addTo(map);

      mapInstanceRef.current = map;

      // Invalidate size once DOM layout completes
      setTimeout(() => {
        map.invalidateSize();
      }, 200);

      resolveAddress(initialLat || 23.0225, initialLng || 72.5714);

      // Listen to drag/move events smoothly
      map.on("movestart", () => {
        setIsMapMoving(true);
      });

      map.on("move", () => {
        const center = map.getCenter();
        setLat(center.lat);
        setLng(center.lng);
      });

      map.on("moveend", () => {
        setIsMapMoving(false);
        const center = map.getCenter();
        setLat(center.lat);
        setLng(center.lng);

        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => {
          resolveAddress(center.lat, center.lng);
        }, 400);
      });
    });

    return () => {
      isCancelled = true;
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}&countrycodes=in&limit=4`,
        {
          headers: {
            "Accept-Language": "en"
          }
        }
      );
      const data = await res.json();
      setSearchResults(Array.isArray(data) ? data : []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectSearchResult = (result: any) => {
    const newLat = parseFloat(result.lat);
    const newLng = parseFloat(result.lon);
    setLat(newLat);
    setLng(newLng);
    setSearchResults([]);
    setSearchQuery("");

    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([newLat, newLng], 17, { duration: 1.2 });
    }
  };

  const handleSelectArea = (area: (typeof POPULAR_AREAS)[0]) => {
    setLat(area.lat);
    setLng(area.lng);
    setCityName(area.city);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([area.lat, area.lng], 16, { duration: 1.2 });
    }
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const uLat = pos.coords.latitude;
        const uLng = pos.coords.longitude;
        setLat(uLat);
        setLng(uLng);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([uLat, uLng], 17, { duration: 1.2 });
        }
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleConfirm = () => {
    onSelectLocation({
      lat,
      lng,
      address: addressText,
      city: cityName
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-[#001F19] text-[#0B1714] dark:text-white animate-in fade-in duration-200 overflow-hidden"
    >
      {/* Top Floating App Bar */}
      <header className="absolute top-0 left-0 right-0 z-[1000] p-3 sm:p-4 bg-gradient-to-b from-black/60 via-black/30 to-transparent pointer-events-none">
        <div className="max-w-xl mx-auto flex items-center gap-2 pointer-events-auto">
          {/* Back / Close button */}
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white dark:bg-[#002D23] shadow-md flex items-center justify-center text-[#0B1714] dark:text-white shrink-0 hover:bg-stone-50 active:scale-95 transition-all cursor-pointer"
            aria-label="Close map"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Search Bar */}
          <form
            onSubmit={handleSearch}
            className="flex-1 relative flex items-center shadow-lg rounded-full"
          >
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search area, landmark, or street..."
              className="w-full pl-10 pr-20 py-2.5 rounded-full text-xs bg-white dark:bg-[#002D23] text-[#0B1714] dark:text-white placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#002D23] border border-stone-200 dark:border-[#002D23]"
            />
            <button
              type="submit"
              disabled={searching}
              className="absolute right-1.5 px-3 py-1.5 rounded-full bg-[#002D23] hover:bg-[#001F19] text-white text-[11px] font-bold shadow-xs transition-transform active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Search"}
            </button>
          </form>
        </div>

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="max-w-xl mx-auto mt-2 pointer-events-auto bg-white dark:bg-[#002D23] rounded-2xl border border-[#DDE3DD] dark:border-[#002D23] shadow-2xl divide-y divide-stone-100 dark:divide-stone-800 overflow-hidden text-xs">
            {searchResults.map((res, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSelectSearchResult(res)}
                className="w-full p-3 text-left hover:bg-stone-50 dark:hover:bg-stone-800 flex items-start gap-2.5 transition-colors cursor-pointer"
              >
                <MapPin className="w-4 h-4 text-[#002D23] dark:text-[#34D399] shrink-0 mt-0.5" />
                <span className="line-clamp-2 leading-tight">{res.display_name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Quick Area Pill Filter */}
        <div className="max-w-xl mx-auto mt-2 pointer-events-auto overflow-x-auto no-scrollbar flex items-center gap-1.5 py-1">
          {POPULAR_AREAS.map((area) => (
            <button
              key={area.name}
              type="button"
              onClick={() => handleSelectArea(area)}
              className="px-3 py-1 rounded-full text-[11px] font-bold bg-white/95 dark:bg-[#002D23]/95 text-[#0B1714] dark:text-stone-200 shadow-md backdrop-blur-md border border-stone-200 dark:border-stone-700 hover:border-[#002D23] hover:text-[#002D23] shrink-0 active:scale-95 transition-all cursor-pointer"
            >
              {area.name}
            </button>
          ))}
        </div>
      </header>

      {/* Fullscreen Interactive Leaflet Map View */}
      <div className="relative flex-1 w-full h-full cursor-grab active:cursor-grabbing">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Fixed Center Pin Marker with Animated Elevation on Drag */}
        <div className="absolute inset-0 z-[500] flex items-center justify-center pointer-events-none">
          <div
            className={`relative flex flex-col items-center transition-transform duration-200 ${
              isMapMoving ? "-translate-y-9 scale-110" : "-translate-y-5 scale-100"
            }`}
          >
            {/* Center Label Pill */}
            <div className="mb-1 px-2.5 py-0.5 rounded-full bg-[#002D23] text-white text-[10px] font-extrabold tracking-wide shadow-lg border border-white/40 whitespace-nowrap">
              {isMapMoving ? "Release to pin" : "Order arrives here"}
            </div>

            {/* Premium Pin Head */}
            <div className="w-10 h-10 rounded-full bg-[#002D23] text-white flex items-center justify-center shadow-2xl border-2 border-white">
              <MapPin className="w-5 h-5 fill-white stroke-[#002D23]" />
            </div>

            {/* Pin Shadow on Ground */}
            <div
              className={`rounded-full bg-black/40 blur-[1.5px] transition-all duration-200 mt-0.5 ${
                isMapMoving ? "w-2 h-1 opacity-20" : "w-3 h-1.5 opacity-60"
              }`}
            />
          </div>
        </div>

        {/* Quick GPS Location Target Button */}
        <div className="absolute right-4 bottom-44 sm:bottom-40 z-[500] flex flex-col gap-2">
          <button
            type="button"
            onClick={handleLocateMe}
            className="w-11 h-11 rounded-full bg-white dark:bg-[#002D23] text-[#002D23] dark:text-[#34D399] shadow-xl border border-stone-200 dark:border-stone-700 flex items-center justify-center hover:bg-stone-50 active:scale-95 transition-all cursor-pointer"
            title="Locate me"
          >
            <Crosshair className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => mapInstanceRef.current?.zoomIn()}
            className="w-11 h-11 rounded-full bg-white dark:bg-[#002D23] text-[#0B1714] dark:text-white shadow-xl border border-stone-200 dark:border-stone-700 flex items-center justify-center hover:bg-stone-50 active:scale-95 transition-all cursor-pointer font-bold text-lg"
            title="Zoom in"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => mapInstanceRef.current?.zoomOut()}
            className="w-11 h-11 rounded-full bg-white dark:bg-[#002D23] text-[#0B1714] dark:text-white shadow-xl border border-stone-200 dark:border-stone-700 flex items-center justify-center hover:bg-stone-50 active:scale-95 transition-all cursor-pointer font-bold text-lg"
            title="Zoom out"
          >
            −
          </button>
        </div>
      </div>

      {/* Bottom Pinned Address Card */}
      <footer className="absolute bottom-0 left-0 right-0 z-[1000] p-4 sm:p-5 bg-white/95 dark:bg-[#15231D]/95 backdrop-blur-md border-t border-[#DDE3DD] dark:border-[#002D23] shadow-2xl safe-area-pb">
        <div className="max-w-xl mx-auto space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#E6F0DD] dark:bg-[#002D23]/40 text-[#002D23] dark:text-[#34D399] flex items-center justify-center shrink-0 mt-0.5">
              <MapPin className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#73716B] dark:text-stone-400">
                  Selected Location
                </span>
                {geocoding && (
                  <span className="text-[10px] text-stone-400 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Fetching street details...
                  </span>
                )}
              </div>
              <p className="text-[13px] font-extrabold text-[#0B1714] dark:text-white line-clamp-2 leading-snug mt-0.5">
                {isMapMoving ? "Dragging map..." : addressText}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-full border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 font-bold text-xs hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors cursor-pointer text-center"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={geocoding || isMapMoving}
              className="flex-[2] py-3 rounded-full bg-[#002D23] hover:bg-[#001F19] text-white font-extrabold text-xs shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Confirm Location</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
