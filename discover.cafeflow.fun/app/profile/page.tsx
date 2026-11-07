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
  ShieldCheck,
  Wallet,
  Bell,
  AlertCircle,
  Trash2
} from "lucide-react";
import { GoogleAuthModal } from "@/components/google-login-modal";
import { DeleteAccountModal } from "@/components/delete-account-modal";

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [wallets, setWallets] = useState<any[]>([]);
  const [totalWalletBalance, setTotalWalletBalance] = useState<number>(0);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [dietary, setDietary] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);

  // Notification Preferences States
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [browserPerm, setBrowserPerm] = useState<string>("default");
  const [updatingNotif, setUpdatingNotif] = useState(false);

  useEffect(() => {
    fetch("/api/user/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setProfile(data.user);
          setName(data.user.name || "");
          setPhone(data.user.phone || "");
          setDietary(data.user.dietaryPreferences || []);
          setWallets(data.user.wallets || []);
          setTotalWalletBalance(Number(data.user.totalWalletBalance) || 0);
        }
      })
      .catch(console.error);

    // Fetch notification preferences
    fetch("/api/notifications")
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.promotionalEnabled === "boolean") {
          setNotifEnabled(data.promotionalEnabled);
        }
      })
      .catch(console.error);

    if (typeof window !== "undefined" && "Notification" in window) {
      setBrowserPerm(Notification.permission);
    }
  }, []);

  const handleToggleNotification = async () => {
    const nextState = !notifEnabled;
    setUpdatingNotif(true);

    try {
      if (nextState) {
        // If enabling and permission is default, request it
        if (typeof window !== "undefined" && "Notification" in window && Notification.permission !== "granted") {
          const perm = await Notification.requestPermission();
          setBrowserPerm(perm);
          if (perm !== "granted") {
            setUpdatingNotif(false);
            return;
          }
        }
      }

      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_preference",
          promotionalEnabled: nextState
        })
      });

      if (res.ok) {
        setNotifEnabled(nextState);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingNotif(false);
    }
  };

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
    <div className="min-h-screen bg-[#F7F5EC] dark:bg-[#001F19] text-[#0B1714] dark:text-[#F7F5EC]">
      <main className="max-w-[430px] md:max-w-xl mx-auto px-4 sm:px-6 pt-3 pb-28 md:pb-12 space-y-4">
        
        {/* Top Header */}
        <header className="flex items-center justify-between pt-1">
          <button
            onClick={() => router.back()}
            aria-label="Back"
            className="w-8 h-8 rounded-full bg-transparent flex items-center justify-center text-[#0B1714] dark:text-white shrink-0 active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </button>
          <div className="text-center">
            <h1 className="font-extrabold text-[16px] leading-tight text-[#0B1714] dark:text-white">My Profile</h1>
            <p className="text-[11px] text-[#73716B]">Account &amp; preferences</p>
          </div>
          <div className="w-8 h-8" />
        </header>

        {/* Quick Navigation Cards */}
        <div className="grid grid-cols-3 gap-2">
          <Link
            href="/orders"
            className="p-3 rounded-[18px] bg-white dark:bg-[#002D23] border border-[#DDE3DD] dark:border-[#002D23] shadow-xs flex flex-col items-center text-center gap-1.5 hover:border-[#002D23]/40 transition-colors"
          >
            <div className="w-8 h-8 rounded-xl bg-[#E6F0DD] dark:bg-[#002D23]/30 flex items-center justify-center text-[#002D23] dark:text-[#34D399] shrink-0">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <div className="font-extrabold text-[12px] text-[#0B1714] dark:text-white">Orders</div>
              <div className="text-[9px] text-[#73716B]">Live tracking</div>
            </div>
          </Link>

          <Link
            href="/reservations"
            className="p-3 rounded-[18px] bg-white dark:bg-[#002D23] border border-[#DDE3DD] dark:border-[#002D23] shadow-xs flex flex-col items-center text-center gap-1.5 hover:border-[#002D23]/40 transition-colors"
          >
            <div className="w-8 h-8 rounded-xl bg-[#FEF7E8] flex items-center justify-center text-[#E7A642] shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <div className="font-extrabold text-[12px] text-[#0B1714] dark:text-white">Bookings</div>
              <div className="text-[9px] text-[#73716B]">Table reserves</div>
            </div>
          </Link>

          <Link
            href="/wallet"
            className="p-3 rounded-[18px] bg-white dark:bg-[#002D23] border border-[#DDE3DD] dark:border-[#002D23] shadow-xs flex flex-col items-center text-center gap-1.5 hover:border-[#002D23]/40 transition-colors"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <div className="font-extrabold text-[12px] text-[#0B1714] dark:text-white">Wallet</div>
              <div className="text-[9px] text-[#73716B]">Balance &amp; topup</div>
            </div>
          </Link>
        </div>

        {/* Customer Profile Card */}
        <form
          onSubmit={handleSave}
          className="rounded-[22px] bg-white dark:bg-[#002D23] border border-[#DDE3DD] dark:border-[#002D23] p-5 shadow-xs space-y-4"
        >
          <div className="flex items-center gap-3 pb-3 border-b border-[#DDE3DD] dark:border-[#002D23]">
            <div className="w-12 h-12 rounded-full bg-[#E6F0DD] dark:bg-[#002D23]/30 flex items-center justify-center text-[#002D23] dark:text-[#34D399] font-black text-[16px]">
              {name ? name.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="font-extrabold text-[15px] text-[#0B1714] dark:text-white">
                {name || "Customer Account"}
              </h2>
              <p className="text-[11px] text-[#73716B]">Saved details for faster checkout</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-[#0B1714] dark:text-white mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Morgan"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DDE3DD] dark:border-[#002D23] bg-transparent text-[12px] text-[#0B1714] dark:text-white focus:outline-none focus:border-[#002D23]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#0B1714] dark:text-white mb-1">
                Phone Number (for order updates)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 98765 43210"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#DDE3DD] dark:border-[#002D23] bg-transparent text-[12px] text-[#0B1714] dark:text-white focus:outline-none focus:border-[#002D23]"
              />
            </div>

            {profile?.email && (
              <div>
                <label className="block text-[11px] font-bold text-[#73716B] mb-1">
                  Email
                </label>
                <input
                  type="text"
                  disabled
                  value={profile.email}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#DDE3DD] dark:border-[#002D23] bg-stone-100 dark:bg-stone-800/40 text-[12px] text-[#73716B] cursor-not-allowed"
                />
              </div>
            )}

            {/* Dietary Tags */}
            <div>
              <label className="block text-[11px] font-bold text-[#0B1714] dark:text-white mb-1.5">
                Food &amp; Dietary Preferences
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
                          ? "bg-[#002D23] text-white shadow-xs"
                          : "bg-[#F7F5EC] dark:bg-[#001F19] text-[#73716B] border border-[#DDE3DD] dark:border-[#002D23] hover:border-stone-300"
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
            <div className="p-3 rounded-xl bg-[#E6F0DD] dark:bg-[#002D23]/30 text-[#002D23] dark:text-[#34D399] text-[11px] font-bold flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 stroke-[3]" /> Preferences updated successfully!
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-full bg-[#002D23] hover:bg-[#001F19] text-white font-bold text-[12px] shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "Saving..." : "Save Preferences"}
          </button>
        </form>

        {/* Notifications & Promotions Preferences Card */}
        <div className="rounded-[22px] bg-white dark:bg-[#002D23] border border-[#DDE3DD] dark:border-[#002D23] p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-[13px] text-[#0B1714] dark:text-white leading-tight">
                  Promotional Notifications
                </h3>
                <p className="text-[11px] text-[#73716B]">
                  Special deals, discounts &amp; cafe updates
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={notifEnabled}
              disabled={updatingNotif}
              onClick={handleToggleNotification}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden disabled:opacity-50 ${
                notifEnabled ? "bg-[#002D23] dark:bg-[#34D399]" : "bg-neutral-300 dark:bg-neutral-700"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  notifEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <div className="pt-1 border-t border-[#DDE3DD]/60 dark:border-[#002D23]/60 flex items-center justify-between text-[11px]">
            <span className="text-[#73716B]">Device Permission</span>
            <span
              className={`font-semibold capitalize px-2 py-0.5 rounded-md ${
                browserPerm === "granted"
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                  : browserPerm === "denied"
                  ? "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400"
                  : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
              }`}
            >
              {browserPerm}
            </span>
          </div>

          {browserPerm === "denied" && (
            <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-[10px] flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>
                Notifications are blocked in your browser. To receive cafe offers, allow notifications in your site settings.
              </span>
            </div>
          )}
        </div>

        {/* Account Authentication State & Sign-out */}
        <div className="rounded-[22px] bg-white dark:bg-[#002D23] border border-[#DDE3DD] dark:border-[#002D23] p-4 shadow-xs text-xs space-y-3">
          {profile?.email ? (
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-[#0B1714] dark:text-white block">Connected with Google</span>
                <span className="text-[11px] text-[#73716B]">{profile.email}</span>
              </div>
              <button
                type="button"
                onClick={async () => {
                  await fetch("/api/auth/logout", { method: "POST" });
                  window.location.reload();
                }}
                className="px-3 py-1.5 rounded-full border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 font-bold hover:bg-red-50 text-[11px] transition-colors"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="space-y-2 text-center py-2">
              <span className="font-bold text-[#0B1714] dark:text-white block">
                Sign in to sync saved cafes and orders
              </span>
              <p className="text-[11px] text-[#73716B]">
                Access your past orders, reservations, and profile across all devices.
              </p>
              <div className="max-w-xs mx-auto pt-1">
                <button
                  type="button"
                  onClick={() => setShowAuthModal(true)}
                  className="w-full py-2.5 px-4 rounded-full bg-[#002D23] text-white font-bold text-xs shadow-xs hover:bg-[#001F19] transition-all"
                >
                  Sign in with Google
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Danger Zone: Account Deletion & Data Wipe */}
        {profile?.email && (
          <div className="rounded-[22px] bg-white dark:bg-[#002D23] border border-red-200 dark:border-red-900/40 p-4 shadow-xs text-xs space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-extrabold text-[13px]">
                  <Trash2 className="w-4 h-4 shrink-0" />
                  <span>Delete Account &amp; Wipe Data</span>
                </div>
                <p className="text-[11px] text-[#73716B] leading-relaxed">
                  Permanently delete your profile, preferences, past bookings, and erase all personal data from CafeFlow.
                </p>
                {totalWalletBalance > 0 && (
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 font-bold text-[10.5px] mt-1">
                    <Wallet className="w-3 h-3 shrink-0" />
                    <span>Active wallet balance: ₹{totalWalletBalance.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="px-3.5 py-2 rounded-full bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-950/70 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 font-bold text-[11px] shrink-0 transition-colors cursor-pointer"
              >
                Delete Account
              </button>
            </div>
          </div>
        )}

        {/* Delete Account & Wipe Data Modal */}
        <DeleteAccountModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          wallets={wallets}
          totalWalletBalance={totalWalletBalance}
          userEmail={profile?.email}
          onAccountDeleted={() => {
            setProfile(null);
            setName("");
            setPhone("");
            setWallets([]);
            setTotalWalletBalance(0);
          }}
        />

        {/* Google Authentication Modal */}
        <GoogleAuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onSuccess={(u) => {
            setProfile(u);
            if (u.name) setName(u.name);
            if (u.phone) setPhone(u.phone);
          }}
        />

      </main>
    </div>
  );
}
