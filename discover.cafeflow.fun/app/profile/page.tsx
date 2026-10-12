"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Phone,
  Mail,
  Heart,
  MapPin,
  Check,
  Save,
  ShoppingBag,
  Calendar,
  ChevronRight,
  ArrowLeft,
  Sparkles,
  ShieldCheck
} from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [dietary, setDietary] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);

  useEffect(() => {
    fetch("/api/user/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setProfile(data.user);
          setName(data.user.name || "");
          setPhone(data.user.phone || "");
          setDietary(data.user.dietaryPreferences || []);
        }
      })
      .catch(console.error);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedMessage(false);

    try {
      const res = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          dietaryPreferences: dietary
        })
      });
      if (res.ok) {
        setSavedMessage(true);
        setTimeout(() => setSavedMessage(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const dietOptions = ["Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free", "Halal", "Keto"];

  const toggleDiet = (opt: string) => {
    setDietary((prev) =>
      prev.includes(opt) ? prev.filter((d) => d !== opt) : [...prev, opt]
    );
  };

  return (
    <div className="min-h-screen bg-[#FAF8F4] dark:bg-[#111413] text-[#191D1B] dark:text-[#F5F7F6]">
      <main className="max-w-[430px] md:max-w-xl mx-auto px-4 sm:px-6 pt-3 pb-24 md:pb-12 space-y-4">
        
        {/* Top Header */}
        <header className="flex items-center justify-between pt-1">
          <button
            onClick={() => router.back()}
            aria-label="Back"
            className="w-8 h-8 rounded-full bg-white dark:bg-[#181C1A] border border-[#E9E8E2] dark:border-[#242B27] flex items-center justify-center text-[#191D1B] dark:text-white shadow-subtle shrink-0 active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="text-center">
            <h1 className="font-extrabold text-[15px] leading-tight">My Profile</h1>
            <p className="text-[11px] text-[#777D79]">Account & preferences</p>
          </div>
          <div className="w-8 h-8" />
        </header>

        {/* Quick Navigation Cards */}
        <div className="grid grid-cols-2 gap-2.5">
          <Link
            href="/orders"
            className="p-3.5 rounded-[18px] bg-white dark:bg-[#181C1A] border border-[#E9E8E2] dark:border-[#242B27] shadow-subtle flex items-center gap-3 hover:border-[#064E3B]/40 transition-colors"
          >
            <div className="w-9 h-9 rounded-[12px] bg-[#EAF3EC] dark:bg-[#064E3B]/20 flex items-center justify-center text-[#064E3B] dark:text-[#34D399] shrink-0">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <div className="font-extrabold text-[13px] text-[#191D1B] dark:text-white">Orders</div>
              <div className="text-[10px] text-[#777D79]">Track & receipts</div>
            </div>
          </Link>

          <Link
            href="/reservations"
            className="p-3.5 rounded-[18px] bg-white dark:bg-[#181C1A] border border-[#E9E8E2] dark:border-[#242B27] shadow-subtle flex items-center gap-3 hover:border-[#064E3B]/40 transition-colors"
          >
            <div className="w-9 h-9 rounded-[12px] bg-[#FFF0D5] flex items-center justify-center text-[#9A6B00] shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <div className="font-extrabold text-[13px] text-[#191D1B] dark:text-white">Bookings</div>
              <div className="text-[10px] text-[#777D79]">Table reserves</div>
            </div>
          </Link>
        </div>

        {/* Customer Profile Card */}
        <form
          onSubmit={handleSave}
          className="rounded-[22px] bg-white dark:bg-[#181C1A] border border-[#E9E8E2] dark:border-[#242B27] p-5 shadow-subtle space-y-4"
        >
          <div className="flex items-center gap-3 pb-3 border-b border-[#E9E8E2]/60 dark:border-[#242B27]">
            <div className="w-12 h-12 rounded-full bg-[#EAF3EC] dark:bg-[#064E3B]/20 flex items-center justify-center text-[#064E3B] dark:text-[#34D399] font-black text-[16px]">
              {name ? name.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="font-extrabold text-[15px] text-[#191D1B] dark:text-white">
                {name || "Customer Account"}
              </h2>
              <p className="text-[11px] text-[#777D79]">Saved details for faster checkout</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-[#191D1B] dark:text-white mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Morgan"
                className="w-full px-3.5 py-2.5 rounded-[14px] border border-[#E9E8E2] dark:border-[#242B27] bg-[#FAF8F4]/50 dark:bg-[#111413] text-[12px] text-[#191D1B] dark:text-white focus:outline-none focus:border-[#064E3B]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#191D1B] dark:text-white mb-1">
                Phone Number (for order updates)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 98765 43210"
                className="w-full px-3.5 py-2.5 rounded-[14px] border border-[#E9E8E2] dark:border-[#242B27] bg-[#FAF8F4]/50 dark:bg-[#111413] text-[12px] text-[#191D1B] dark:text-white focus:outline-none focus:border-[#064E3B]"
              />
            </div>

            {profile?.email && (
              <div>
                <label className="block text-[11px] font-bold text-[#777D79] mb-1">
                  Email
                </label>
                <input
                  type="text"
                  disabled
                  value={profile.email}
                  className="w-full px-3.5 py-2.5 rounded-[14px] border border-[#E9E8E2] dark:border-[#242B27] bg-stone-100 dark:bg-stone-800/40 text-[12px] text-[#777D79] cursor-not-allowed"
                />
              </div>
            )}

            {/* Dietary Tags */}
            <div>
              <label className="block text-[11px] font-bold text-[#191D1B] dark:text-white mb-1.5">
                Food & Dietary Preferences
              </label>
              <div className="flex flex-wrap gap-1.5">
                {dietOptions.map((opt) => {
                  const isChecked = dietary.includes(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => toggleDiet(opt)}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                        isChecked
                          ? "bg-[#064E3B] text-white shadow-xs"
                          : "bg-[#FAF8F4] dark:bg-[#111413] text-[#777D79] border border-[#E9E8E2] dark:border-[#242B27] hover:border-stone-300"
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {savedMessage && (
            <div className="p-3 rounded-[14px] bg-[#EAF3EC] dark:bg-[#064E3B]/20 text-[#064E3B] dark:text-[#34D399] text-[11px] font-bold flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 stroke-[3]" /> Preferences updated successfully!
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-full bg-[#064E3B] hover:bg-[#043B2C] text-white font-bold text-[12px] shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "Saving..." : "Save Preferences"}
          </button>
        </form>

      </main>
    </div>
  );
}
