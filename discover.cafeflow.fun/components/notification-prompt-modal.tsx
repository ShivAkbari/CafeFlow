"use client";

import { useState, useEffect } from "react";
import { Bell, X, Sparkles, Check } from "lucide-react";

/**
 * Converts a base64url string to Uint8Array for PushManager subscription applicationServerKey.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function NotificationPromptModal() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [subscribedSuccess, setSubscribedSuccess] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Only run on client
    if (typeof window === "undefined") return;

    const supported = "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
    setIsSupported(supported);

    if (!supported) return;

    // If permission already decided, do not show prompt
    if (Notification.permission === "granted" || Notification.permission === "denied") {
      return;
    }

    // Check if dismissed previously in localStorage
    try {
      const dismissed = localStorage.getItem("cafeflow_notif_prompt_dismissed");
      if (dismissed) return;
    } catch {}

    // Delay prompt slightly after user has interacted with the page
    const timer = setTimeout(() => {
      setShowPrompt(true);
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setShowPrompt(false);
    try {
      localStorage.setItem("cafeflow_notif_prompt_dismissed", "true");
    } catch {}
  };

  const handleEnableNotifications = async () => {
    try {
      setSubscribing(true);

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setShowPrompt(false);
        try {
          localStorage.setItem("cafeflow_notif_prompt_dismissed", "true");
        } catch {}
        return;
      }

      // Fetch VAPID public key from backend
      const res = await fetch("/api/notifications");
      const data = await res.json();
      const vapidKey = data.vapidPublicKey;

      if (!vapidKey) {
        throw new Error("Missing VAPID public key");
      }

      // Ensure service worker is registered and ready
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey) as any
        });
      }

      // Send subscription to backend
      const subJson = subscription.toJSON();
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "subscribe",
          subscription: subJson
        })
      });

      setSubscribedSuccess(true);
      setTimeout(() => {
        setShowPrompt(false);
      }, 1800);
    } catch (err) {
      console.error("[Notification Prompt] Subscription failed:", err);
      setShowPrompt(false);
    } finally {
      setSubscribing(false);
    }
  };

  if (!showPrompt || !isSupported) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="bg-white dark:bg-[#002D23] rounded-2xl p-4 border border-[#DDE3DD] dark:border-[#002D23] shadow-2xl relative space-y-3">
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1 text-[#73716B] hover:text-[#0B1714] dark:hover:text-white"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3 pr-6">
          <div className="w-10 h-10 rounded-xl bg-[#E6F0DD] dark:bg-[#002D23] text-[#002D23] dark:text-[#34D399] flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-extrabold text-[14px] text-[#0B1714] dark:text-white flex items-center gap-1.5">
              <span>Special Offers &amp; Deals</span>
              <Sparkles className="w-3.5 h-3.5 text-[#E7A642]" />
            </h4>
            <p className="text-[11px] text-[#73716B] dark:text-stone-300 mt-0.5 leading-snug">
              Get cafe offers, discount coupons, and special deals near you. Never spam, maximum one message a day.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleDismiss}
            disabled={subscribing}
            className="flex-1 py-2 rounded-xl text-xs font-semibold text-[#73716B] hover:text-[#0B1714] dark:hover:text-white transition-colors"
          >
            Not Now
          </button>
          <button
            onClick={handleEnableNotifications}
            disabled={subscribing || subscribedSuccess}
            className="flex-1 py-2 px-3 rounded-xl bg-[#002D23] hover:bg-[#001F19] text-white text-xs font-bold shadow-xs transition-all active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            {subscribedSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Enabled!</span>
              </>
            ) : subscribing ? (
              <span>Enabling...</span>
            ) : (
              <span>Enable Notifications</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
