"use client";

import { useState } from "react";
import { MapPin, Navigation, Compass, Store, UtensilsCrossed, ChevronRight, X, AlertCircle, Truck } from "lucide-react";
import type { DiscoverOrderMode } from "@/lib/cart-context";
import { MapLocationSelectorModal } from "./map-location-selector-modal";

interface WelcomeLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMode: (mode: DiscoverOrderMode) => void;
  onLocationResolved: (coords: { lat: number; lng: number } | null, city?: string) => void;
  currentMode: DiscoverOrderMode;
}

export function WelcomeLocationModal({
  isOpen,
  onClose,
  onSelectMode,
  onLocationResolved,
  currentMode
}: WelcomeLocationModalProps) {
  const [step, setStep] = useState<"location" | "mode">("location");
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [showMapSelector, setShowMapSelector] = useState(false);

  const availableCities = ["Ahmedabad", "Mumbai", "Bengaluru", "Delhi NCR", "Pune"];

  if (!isOpen) return null;

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }

    setLocating(true);
    setLocationError("");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        onLocationResolved({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        }, "Nearby Cafes");
        setStep("mode");
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError("Location permission denied. You can select your area manually below.");
        } else {
          setLocationError("Unable to detect current location. Please choose manually.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  };

  const handleSelectCity = (city: string) => {
    setSelectedCity(city);
    onLocationResolved(null, city);
    setStep("mode");
  };

  const handleModeChoice = (mode: DiscoverOrderMode) => {
    onSelectMode(mode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white dark:bg-[#15231D] rounded-3xl p-6 border border-[#DDE3DD] dark:border-[#002D23] shadow-2xl relative text-[#0B1714] dark:text-white">
        
        {step === "location" ? (
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#E6F0DD] dark:bg-[#002D23]/60 flex items-center justify-center text-[#002D23] dark:text-[#34D399] mx-auto shadow-xs">
              <Compass className="w-6 h-6 stroke-[2.2]" />
            </div>

            <div className="text-center space-y-1.5">
              <h2 className="text-[18px] font-extrabold tracking-tight">
                Discover cafes around you
              </h2>
              <p className="text-[12px] text-[#73716B] dark:text-stone-300 leading-relaxed px-1">
                Find nearby cafes, check their menus, and discover places worth visiting.
              </p>
            </div>

            {locationError && (
              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <span>{locationError}</span>
              </div>
            )}

            <button
              onClick={handleUseCurrentLocation}
              disabled={locating}
              className="w-full py-3 px-4 rounded-full bg-[#002D23] hover:bg-[#001F19] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              <Navigation className={`w-4 h-4 ${locating ? "animate-spin" : ""}`} />
              <span>{locating ? "Detecting location..." : "Use my current location"}</span>
            </button>

            {/* Select on Map Option */}
            <button
              type="button"
              onClick={() => setShowMapSelector(true)}
              className="w-full py-2.5 px-4 rounded-full border border-[#002D23] text-[#002D23] dark:text-[#34D399] dark:border-[#34D399] font-bold text-xs flex items-center justify-center gap-2 hover:bg-[#E6F0DD]/40 transition-all active:scale-[0.98] cursor-pointer"
            >
              <MapPin className="w-4 h-4" />
              <span>Select location on map</span>
            </button>

            <div className="pt-2">
              <p className="text-[11px] font-semibold text-[#73716B] uppercase tracking-wider mb-2 text-center">
                Or select city
              </p>
              <div className="grid grid-cols-2 gap-2">
                {availableCities.map((city) => (
                  <button
                    key={city}
                    onClick={() => handleSelectCity(city)}
                    className="p-2.5 rounded-xl border border-[#DDE3DD] dark:border-[#002D23] hover:border-[#002D23] bg-[#FAF8F4] dark:bg-[#182B23] text-xs font-semibold text-[#0B1714] dark:text-stone-200 text-center transition-all active:scale-95 cursor-pointer"
                  >
                    {city}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <h2 className="text-[18px] font-extrabold tracking-tight">
                Choose your experience
              </h2>
              <p className="text-[12px] text-[#73716B] dark:text-stone-300">
                You can switch anytime during your session.
              </p>
            </div>

            <div className="space-y-3 pt-1">
              {/* Dine-in Option */}
              <button
                type="button"
                onClick={() => handleModeChoice("dine-in")}
                className={`w-full p-4 rounded-2xl border text-left flex items-start gap-3.5 transition-all active:scale-[0.98] ${
                  currentMode === "dine-in"
                    ? "border-[#002D23] bg-[#E6F0DD]/40 dark:bg-[#002D23]/30 shadow-xs"
                    : "border-[#DDE3DD] dark:border-[#002D23] bg-white dark:bg-[#002D23] hover:border-stone-400"
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-[#002D23] text-white flex items-center justify-center shrink-0">
                  <UtensilsCrossed className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-[14px]">Dine in</span>
                    {currentMode === "dine-in" && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#002D23] text-white">
                        Selected
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#73716B] dark:text-stone-300 mt-1 leading-snug">
                    Discover nearby cafes, reserve a table, or order at your table.
                  </p>
                </div>
              </button>

              {/* Takeaway Option */}
              <button
                type="button"
                onClick={() => handleModeChoice("takeaway")}
                className={`w-full p-4 rounded-2xl border text-left flex items-start gap-3.5 transition-all active:scale-[0.98] ${
                  currentMode === "takeaway"
                    ? "border-[#002D23] bg-[#E6F0DD]/40 dark:bg-[#002D23]/30 shadow-xs"
                    : "border-[#DDE3DD] dark:border-[#002D23] bg-white dark:bg-[#002D23] hover:border-stone-400"
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-[#34D399] text-[#002D23] flex items-center justify-center shrink-0">
                  <Store className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-[14px]">Takeaway</span>
                    {currentMode === "takeaway" && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#002D23] text-white">
                        Selected
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#73716B] dark:text-stone-300 mt-1 leading-snug">
                    Browse menus and order for quick counter pickup.
                  </p>
                </div>
              </button>

              {/* Delivery Option */}
              <button
                type="button"
                onClick={() => handleModeChoice("delivery")}
                className={`w-full p-4 rounded-2xl border text-left flex items-start gap-3.5 transition-all active:scale-[0.98] ${
                  currentMode === "delivery"
                    ? "border-[#002D23] bg-[#002D23]/5 dark:bg-[#002D23]/30 shadow-xs"
                    : "border-[#DDE3DD] dark:border-[#002D23] bg-white dark:bg-[#002D23] hover:border-stone-400"
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-[#002D23] text-white flex items-center justify-center shrink-0">
                  <Truck className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-[14px]">Delivery</span>
                      <span className="text-[9px] font-black uppercase tracking-wider bg-[#002D23]/10 dark:bg-[#002D23]/40 text-[#002D23] dark:text-[#B99A5B] px-1.5 py-0.5 rounded-md border border-[#002D23]/20 dark:border-[#B99A5B]/30">
                        Shiprocket Quick
                      </span>
                    </div>
                    {currentMode === "delivery" && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#002D23] text-white">
                        Selected
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#73716B] dark:text-stone-300 mt-1 leading-snug">
                    Hyperlocal food delivery to your doorstep in 30–45 mins.
                  </p>
                </div>
              </button>
            </div>

            <div className="pt-2 text-center">
              <button
                onClick={onClose}
                className="text-xs font-semibold text-[#73716B] hover:text-[#0B1714] dark:hover:text-white"
              >
                Skip for now
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Map Location Selector Modal */}
      <MapLocationSelectorModal
        isOpen={showMapSelector}
        onClose={() => setShowMapSelector(false)}
        onSelectLocation={(loc) => {
          setShowMapSelector(false);
          setSelectedCity(loc.city || "Pin Location");
          onLocationResolved(
            { lat: loc.lat, lng: loc.lng },
            loc.city || "Pin Location"
          );
          setStep("mode");
        }}
        title="Pin Location on Map"
      />
    </div>
  );
}
