"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Clock,
  Plus,
  Minus,
  Check,
  Star,
  ShoppingBag,
  ArrowRight,
  Sparkles,
  Utensils,
  X,
  Flame,
  CheckCircle2,
  Tag
} from "lucide-react";

interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  image: string;
  isVeg: boolean;
  isSpicy: boolean;
  isChefSpecial: boolean;
  isPopular: boolean;
  inStock: boolean;
  variants: Array<{ name: string; price: number }>;
  addons: Array<{ name: string; price: number }>;
}

export default function CafeProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  // Reservation State
  const [bookingDate, setBookingDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [partySize, setPartySize] = useState<number>(2);
  const [slots, setSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [bookingModal, setBookingModal] = useState<boolean>(false);
  const [bookerName, setBookerName] = useState("");
  const [bookerPhone, setBookerPhone] = useState("");
  const [bookerEmail, setBookerEmail] = useState("");
  const [bookingStatus, setBookingStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [bookingError, setBookingError] = useState("");

  // Customization Modal State
  const [selectedItemForCustomization, setSelectedItemForCustomization] = useState<MenuItem | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<{ name: string; price: number } | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<Array<{ name: string; price: number }>>([]);
  const [customizationQty, setCustomizationQty] = useState(1);

  const { addItem, updateQuantity, items: cartItems, itemCount, subtotal } = useCart();

  // Load cafe details
  useEffect(() => {
    fetch(`/api/cafes/${slug}`)
      .then((res) => res.json())
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [slug]);

  // Load reservation slots
  useEffect(() => {
    if (!data?.cafe?.id) return;
    fetch(`/api/reservations?cafeId=${data.cafe.id}&date=${bookingDate}&partySize=${partySize}`)
      .then((res) => res.json())
      .then((res) => {
        setSlots(res.slots || []);
      })
      .catch(console.error);
  }, [data?.cafe?.id, bookingDate, partySize]);

  const handleBookTable = async (e: React.FormEvent) => {
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
          time: selectedSlot
        })
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Failed to confirm reservation");
      }

      setBookingStatus("success");
    } catch (err: any) {
      setBookingStatus("error");
      setBookingError(err.message || "Reservation failed");
    }
  };

  const handleItemAddClick = (item: MenuItem) => {
    // If item has variants or addons, open customization sheet
    if ((item.variants && item.variants.length > 0) || (item.addons && item.addons.length > 0)) {
      setSelectedItemForCustomization(item);
      setSelectedVariant(item.variants?.[0] || null);
      setSelectedAddons([]);
      setCustomizationQty(1);
    } else {
      addItem(
        {
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
          image: item.image
        },
        {
          id: data.cafe.id,
          name: data.cafe.name,
          slug: data.cafe.slug,
          currency: data.cafe.currency
        }
      );
    }
  };

  const handleConfirmCustomization = () => {
    if (!selectedItemForCustomization) return;

    const basePrice = selectedVariant ? selectedVariant.price : selectedItemForCustomization.price;
    const addonsTotal = selectedAddons.reduce((sum, a) => sum + a.price, 0);
    const finalPrice = basePrice + addonsTotal;

    const variantKey = selectedVariant ? `-${selectedVariant.name}` : "";
    const customId = `${selectedItemForCustomization.id}${variantKey}`;

    addItem(
      {
        id: customId,
        name: `${selectedItemForCustomization.name}${selectedVariant ? ` (${selectedVariant.name})` : ""}`,
        price: finalPrice,
        quantity: customizationQty,
        image: selectedItemForCustomization.image,
        selectedVariant,
        selectedAddons
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

  if (loading) {
    return (
      <div className="max-w-[430px] md:max-w-4xl mx-auto px-4 py-8 space-y-4 animate-pulse">
        <div className="h-44 rounded-2xl bg-stone-200 dark:bg-stone-800" />
        <div className="h-6 w-1/3 bg-stone-200 dark:bg-stone-800 rounded" />
        <div className="space-y-3 pt-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-stone-200 dark:bg-stone-800" />
          ))}
        </div>
      </div>
    );
  }

  if (!data?.cafe) {
    return (
      <div className="max-w-md mx-auto text-center py-20 px-4 space-y-3">
        <h2 className="text-lg font-bold text-[#191D1B] dark:text-white">Cafe Not Found</h2>
        <p className="text-xs text-[#777D79]">This venue is currently unavailable.</p>
        <Link
          href="/"
          className="inline-block px-4 py-2 rounded-xl bg-[#064E3B] text-white text-xs font-bold shadow-sm"
        >
          Return to Discover
        </Link>
      </div>
    );
  }

  const { cafe, categories, items } = data;
  const filteredItems = activeCategory === "all" ? items : items.filter((i: MenuItem) => i.categoryId === activeCategory);

  return (
    <div className="min-h-screen bg-[#FAF8F4] dark:bg-[#111413] text-[#191D1B] dark:text-[#F5F7F6]">
      <main className="max-w-[430px] md:max-w-4xl mx-auto px-4 sm:px-6 pt-3 pb-28 md:pb-12 space-y-4">

        {/* 1. COMPACT RESTAURANT HEADER */}
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={() => router.back()}
            aria-label="Back"
            className="w-8 h-8 rounded-full bg-white dark:bg-[#181C1A] border border-[#E9E8E2] dark:border-[#242B27] flex items-center justify-center text-[#191D1B] dark:text-white shadow-subtle shrink-0 active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="font-extrabold text-[15px] tracking-tight truncate max-w-[200px]">
            {cafe.name}
          </span>
          <Link
            href="/cart"
            aria-label="View Cart"
            className="relative w-8 h-8 rounded-full bg-white dark:bg-[#181C1A] border border-[#E9E8E2] dark:border-[#242B27] flex items-center justify-center text-[#191D1B] dark:text-white shadow-subtle shrink-0"
          >
            <ShoppingBag className="w-4 h-4 text-[#064E3B] dark:text-[#34D399]" />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#064E3B] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </Link>
        </div>

        {/* 2. RESTAURANT IDENTITY HERO */}
        <section className="relative rounded-[22px] overflow-hidden shadow-subtle bg-white dark:bg-[#181C1A] border border-[#E9E8E2] dark:border-[#242B27]">
          <div className="relative h-44 sm:h-52 w-full overflow-hidden bg-stone-100 dark:bg-stone-800">
            <img
              src={cafe.coverImage || cafe.logo || "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1000&q=80"}
              alt={cafe.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            <div className="absolute bottom-3.5 left-3.5 right-3.5 text-white space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-full bg-[#064E3B] text-white text-[10px] font-bold">
                  Verified Cafe
                </span>
                <div className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm text-[10px] font-semibold">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span>4.8 (120+)</span>
                </div>
              </div>
              <h1 className="text-xl sm:text-2xl font-black leading-tight drop-shadow-sm">
                {cafe.name}
              </h1>
              <p className="text-[11px] text-white/85 flex items-center gap-1 truncate">
                <MapPin className="w-3 h-3 text-[#86EFAC] shrink-0" />
                {cafe.address || "Ahmedabad, India"}
              </p>
            </div>
          </div>
        </section>

        {/* 3. MENU CATEGORIES: Horizontal tabs matching Discover styling */}
        <section className="sticky top-0 z-30 bg-[#FAF8F4]/95 dark:bg-[#111413]/95 backdrop-blur-md py-2 -mx-4 px-4 border-b border-[#E9E8E2] dark:border-[#242B27]">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveCategory("all")}
              className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold tracking-tight whitespace-nowrap transition-colors border ${
                activeCategory === "all"
                  ? "bg-[#064E3B] text-white border-[#064E3B] shadow-sm"
                  : "bg-white dark:bg-[#181C1A] text-[#191D1B] dark:text-stone-300 border-[#E9E8E2] dark:border-[#242B27]"
              }`}
            >
              All Items ({items.length})
            </button>
            {categories.map((cat: any) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold tracking-tight whitespace-nowrap transition-colors border ${
                  activeCategory === cat.id
                    ? "bg-[#064E3B] text-white border-[#064E3B] shadow-sm"
                    : "bg-white dark:bg-[#181C1A] text-[#191D1B] dark:text-stone-300 border-[#E9E8E2] dark:border-[#242B27]"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </section>

        {/* 4. MENU ITEMS FEED */}
        <section className="space-y-3">
          {filteredItems.map((item: MenuItem) => {
            const inCartQty = cartItems
              .filter((ci) => ci.id.startsWith(item.id))
              .reduce((sum, ci) => sum + ci.quantity, 0);

            return (
              <div
                key={item.id}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-[#181C1A] border border-[#E9E8E2] dark:border-[#242B27] shadow-card hover:border-[#D0CEBF] transition-all group"
              >
                {/* Details */}
                <div className="flex-1 pr-3 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-3.5 h-3.5 rounded-xs border flex items-center justify-center shrink-0 ${
                        item.isVeg ? "border-emerald-600" : "border-rose-600"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          item.isVeg ? "bg-emerald-600" : "bg-rose-600"
                        }`}
                      />
                    </span>
                    <h3 className="font-bold text-[14px] text-[#191D1B] dark:text-white leading-snug">
                      {item.name}
                    </h3>
                    {item.isPopular && (
                      <span className="px-1.5 py-0.5 rounded bg-[#FFF0D5] text-[#9A6700] text-[9px] font-extrabold uppercase">
                        Bestseller
                      </span>
                    )}
                  </div>

                  {item.description && (
                    <p className="text-[12px] text-[#777D79] dark:text-stone-400 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  )}

                  <div className="pt-1 flex items-baseline gap-2">
                    <span className="font-extrabold text-[14px] text-[#191D1B] dark:text-white">
                      {cafe.currency} {item.price.toFixed(2)}
                    </span>
                    {((item.variants && item.variants.length > 0) || (item.addons && item.addons.length > 0)) && (
                      <span className="text-[10px] text-[#777D79] font-medium">Customizable</span>
                    )}
                  </div>
                </div>

                {/* Thumbnail & Add Button */}
                <div className="flex flex-col items-center gap-2 shrink-0">
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-18 h-18 rounded-xl object-cover bg-stone-100 dark:bg-stone-800 shadow-subtle"
                    />
                  )}
                  <button
                    onClick={() => handleItemAddClick(item)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 flex items-center gap-1 border shadow-xs ${
                      inCartQty > 0
                        ? "bg-[#064E3B] text-white border-[#064E3B]"
                        : "bg-white dark:bg-[#181C1A] text-[#064E3B] dark:text-[#34D399] border-[#064E3B]"
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{inCartQty > 0 ? `Added (${inCartQty})` : "Add"}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </section>

        {/* 5. TABLE BOOKING SECTION (Preserved genuine floor reservation logic) */}
        <section className="pt-4 border-t border-[#E9E8E2] dark:border-[#242B27] space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[16px] font-bold text-[#191D1B] dark:text-white">
                Reserve a Table
              </h2>
              <p className="text-[11px] text-[#777D79]">
                Live availability check on cafe seating
              </p>
            </div>
            <span className="text-[11px] font-bold text-[#064E3B] dark:text-[#34D399] bg-[#EAF3EC] px-2 py-0.5 rounded-full">
              Instant Confirm
            </span>
          </div>

          <div className="bg-white dark:bg-[#181C1A] p-4 rounded-2xl border border-[#E9E8E2] dark:border-[#242B27] shadow-card space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-[#777D79] mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={bookingDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-[#E9E8E2] text-xs font-medium focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#777D79] mb-1">
                  Party Size
                </label>
                <div className="flex gap-1">
                  {[2, 4, 6].map((sz) => (
                    <button
                      key={sz}
                      onClick={() => setPartySize(sz)}
                      className={`flex-1 py-1 rounded-xl text-xs font-bold border ${
                        partySize === sz
                          ? "bg-[#064E3B] text-white border-[#064E3B]"
                          : "border-[#E9E8E2] text-[#191D1B]"
                      }`}
                    >
                      {sz}p
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Slots */}
            <div>
              <label className="block text-[11px] font-semibold text-[#777D79] mb-1">
                Available Timeslots
              </label>
              <div className="grid grid-cols-3 gap-1.5 max-h-36 overflow-y-auto">
                {slots.map((s) => (
                  <button
                    key={s.time}
                    disabled={!s.available}
                    onClick={() => setSelectedSlot(s.time)}
                    className={`py-1.5 text-[11px] rounded-lg font-medium border ${
                      selectedSlot === s.time
                        ? "bg-[#064E3B] text-white border-[#064E3B]"
                        : s.available
                        ? "border-[#EAF3EC] bg-[#EAF3EC] text-[#064E3B]"
                        : "opacity-40 border-[#E9E8E2]"
                    }`}
                  >
                    {s.time}
                  </button>
                ))}
              </div>
            </div>

            <button
              disabled={!selectedSlot}
              onClick={() => setBookingModal(true)}
              className="w-full py-2.5 rounded-xl bg-[#064E3B] hover:bg-[#043B2C] disabled:opacity-50 text-white font-bold text-xs shadow-sm transition-all"
            >
              {selectedSlot ? `Book for ${selectedSlot}` : "Select a Time"}
            </button>
          </div>
        </section>

        {/* 6. FLOATING CART SUMMARY BAR */}
        {itemCount > 0 && (
          <div className="fixed bottom-4 left-4 right-4 z-40 max-w-[400px] md:max-w-2xl mx-auto">
            <Link
              href="/cart"
              className="flex items-center justify-between p-3.5 rounded-full bg-[#064E3B] text-white shadow-float active:scale-98 transition-transform"
            >
              <div className="flex items-center gap-2 pl-2">
                <span className="w-6 h-6 rounded-full bg-white/20 text-[11px] font-extrabold flex items-center justify-center">
                  {itemCount}
                </span>
                <span className="text-[13px] font-bold">
                  View Cart &bull; {cafe.currency} {subtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[13px] font-bold pr-2">
                <span>Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
          </div>
        )}

        {/* 7. ITEM CUSTOMIZATION MODAL SHEET */}
        {selectedItemForCustomization && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="w-full max-w-md bg-white dark:bg-[#181C1A] rounded-t-[28px] sm:rounded-[28px] p-5 space-y-4 max-h-[85vh] overflow-y-auto border border-[#E9E8E2] dark:border-[#242B27] shadow-xl">
              <div className="flex items-start justify-between pb-2 border-b border-[#E9E8E2]">
                <div>
                  <h3 className="font-extrabold text-[16px] text-[#191D1B] dark:text-white">
                    Customize {selectedItemForCustomization.name}
                  </h3>
                  <p className="text-xs text-[#777D79]">
                    Select size and options
                  </p>
                </div>
                <button
                  onClick={() => setSelectedItemForCustomization(null)}
                  className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center text-stone-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Variants */}
              {selectedItemForCustomization.variants?.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-[#777D79] uppercase">Choose Variant</span>
                  <div className="space-y-1.5">
                    {selectedItemForCustomization.variants.map((v) => (
                      <button
                        key={v.name}
                        onClick={() => setSelectedVariant(v)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold ${
                          selectedVariant?.name === v.name
                            ? "border-[#064E3B] bg-[#EAF3EC] text-[#064E3B]"
                            : "border-[#E9E8E2] text-[#191D1B]"
                        }`}
                      >
                        <span>{v.name}</span>
                        <span>{cafe.currency} {v.price}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Addons */}
              {selectedItemForCustomization.addons?.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-[#777D79] uppercase">Add-ons</span>
                  <div className="space-y-1.5">
                    {selectedItemForCustomization.addons.map((a) => {
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
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold ${
                            isAdded
                              ? "border-[#064E3B] bg-[#EAF3EC] text-[#064E3B]"
                              : "border-[#E9E8E2] text-[#191D1B]"
                          }`}
                        >
                          <span>{a.name}</span>
                          <span>+{cafe.currency} {a.price}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quantity and Confirm Button */}
              <div className="pt-2 flex items-center justify-between gap-3 border-t border-[#E9E8E2]">
                <div className="flex items-center gap-2 border border-[#E9E8E2] rounded-xl px-2 py-1">
                  <button
                    onClick={() => setCustomizationQty(Math.max(1, customizationQty - 1))}
                    className="p-1 text-[#777D79]"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-bold w-4 text-center">{customizationQty}</span>
                  <button
                    onClick={() => setCustomizationQty(customizationQty + 1)}
                    className="p-1 text-[#777D79]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={handleConfirmCustomization}
                  className="flex-1 py-2.5 rounded-xl bg-[#064E3B] text-white text-xs font-bold shadow-sm"
                >
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 8. RESERVATION CONFIRMATION MODAL */}
        {bookingModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="w-full max-w-sm bg-white dark:bg-[#181C1A] rounded-3xl p-5 space-y-4 border border-[#E9E8E2] shadow-xl">
              <h3 className="font-extrabold text-[16px] text-[#191D1B] dark:text-white">
                Confirm Booking at {cafe.name}
              </h3>

              {bookingStatus === "success" ? (
                <div className="text-center py-4 space-y-2">
                  <div className="w-10 h-10 rounded-full bg-[#EAF3EC] text-[#064E3B] flex items-center justify-center mx-auto">
                    <Check className="w-5 h-5 stroke-[3]" />
                  </div>
                  <h4 className="font-bold text-sm">Table Confirmed!</h4>
                  <p className="text-xs text-[#777D79]">
                    {bookerName} &bull; {bookingDate} at {selectedSlot} for {partySize} guests.
                  </p>
                  <button
                    onClick={() => {
                      setBookingModal(false);
                      setBookingStatus("idle");
                    }}
                    className="mt-3 px-5 py-2 rounded-xl bg-[#064E3B] text-white text-xs font-bold"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={handleBookTable} className="space-y-2.5 text-xs">
                  <div>
                    <label className="block font-semibold text-[#777D79] mb-1">Your Name</label>
                    <input
                      type="text"
                      required
                      value={bookerName}
                      onChange={(e) => setBookerName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full px-3 py-2 rounded-xl border border-[#E9E8E2] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#777D79] mb-1">Phone Number</label>
                    <input
                      type="tel"
                      required
                      value={bookerPhone}
                      onChange={(e) => setBookerPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full px-3 py-2 rounded-xl border border-[#E9E8E2] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#777D79] mb-1">Email (Optional)</label>
                    <input
                      type="email"
                      value={bookerEmail}
                      onChange={(e) => setBookerEmail(e.target.value)}
                      placeholder="john@example.com"
                      className="w-full px-3 py-2 rounded-xl border border-[#E9E8E2] focus:outline-none"
                    />
                  </div>

                  {bookingError && (
                    <p className="text-rose-600 bg-rose-50 p-2 rounded-lg text-[11px]">{bookingError}</p>
                  )}

                  <div className="pt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setBookingModal(false)}
                      className="flex-1 py-2 rounded-xl border border-[#E9E8E2] font-semibold text-[#777D79]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={bookingStatus === "loading"}
                      className="flex-1 py-2 rounded-xl bg-[#064E3B] text-white font-bold disabled:opacity-50"
                    >
                      {bookingStatus === "loading" ? "Confirming..." : "Confirm"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
