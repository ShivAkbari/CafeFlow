"use client";

import { useEffect, useState, useRef } from "react";
import Script from "next/script";
import { X, Loader2 } from "lucide-react";

export function GoogleGLogo({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

const GOOGLE_CLIENT_ID = "200875612169-v61q1hehk7c8u0amrd4q0p170q6g0dph.apps.googleusercontent.com";

interface GoogleLoginProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any) => void;
}

export function GoogleAuthModal({
  isOpen,
  onClose,
  onSuccess
}: GoogleLoginProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [gsiLoaded, setGsiLoaded] = useState(false);
  const gsiButtonRef = useRef<HTMLDivElement>(null);

  // Handle Google credential response (Google One Tap / GIS button)
  const handleCredentialResponse = async (response: any) => {
    if (!response?.credential) {
      setError("No credential returned from Google.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to continue with Google");

      onSuccess(data.user);
      onClose();
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  // Initialize Google Identity Services
  useEffect(() => {
    if (!isOpen) {
      setGsiLoaded(false);
      return;
    }

    let intervalId: any;
    let timeoutId: any;

    const tryInitGsi = () => {
      if (typeof window !== "undefined" && (window as any).google?.accounts?.id && gsiButtonRef.current) {
        try {
          (window as any).google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true
          });

          gsiButtonRef.current.innerHTML = "";
          (window as any).google.accounts.id.renderButton(gsiButtonRef.current, {
            type: "standard",
            shape: "pill",
            theme: "outline",
            text: "continue_with",
            size: "large",
            width: 300,
            logo_alignment: "left"
          });
          setGsiLoaded(true);
          return true;
        } catch (e) {
          console.warn("[Google Identity Services] Initialization warning:", e);
        }
      }
      return false;
    };

    if (!tryInitGsi()) {
      intervalId = setInterval(() => {
        if (tryInitGsi()) {
          clearInterval(intervalId);
        }
      }, 150);

      timeoutId = setTimeout(() => {
        if (intervalId) clearInterval(intervalId);
      }, 3000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isOpen]);

  // Open Popup OAuth flow fallback
  const handleGooglePopup = () => {
    setLoading(true);
    setError("");

    if (typeof window !== "undefined" && (window as any).google?.accounts?.oauth2) {
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: "openid email profile",
        callback: async (tokenResponse: any) => {
          if (tokenResponse.error) {
            setError(tokenResponse.error_description || "Google authorization cancelled");
            setLoading(false);
            return;
          }

          try {
            // Fetch verified user profile with access token
            const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
              headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
            });
            const profile = await userInfoRes.json();

            const res = await fetch("/api/auth/google", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: profile.email,
                name: profile.name,
                photoUrl: profile.picture
              })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Authentication failed");

            onSuccess(data.user);
            onClose();
          } catch (err: any) {
            setError(err.message || "Failed to continue with Google");
          } finally {
            setLoading(false);
          }
        }
      });
      client.requestAccessToken();
    } else if (typeof window !== "undefined" && (window as any).google?.accounts?.id) {
      (window as any).google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          setError("Google Sign-In prompt was closed. Please try again.");
        }
        setLoading(false);
      });
    } else {
      setError("Google Sign-In service is initializing. Please try again in a moment.");
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <Script src="https://accounts.google.com/gsi/client" strategy="lazyOnload" />

      <div className="w-full max-w-sm bg-white dark:bg-[#181C1A] rounded-[24px] p-6 space-y-4 border border-[#E9E8E2] dark:border-[#242B27] shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Google Branding Header */}
        <div className="text-center space-y-2 pt-2">
          <div className="w-12 h-12 rounded-full bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 flex items-center justify-center mx-auto shadow-xs">
            <GoogleGLogo className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-[17px] text-[#191D1B] dark:text-white">
              Sign in with Google
            </h3>
            <p className="text-[12px] text-[#777D79] mt-0.5">
              to continue to <span className="font-semibold text-[#064E3B] dark:text-[#34D399]">CafeFlow Discover</span>
            </p>
          </div>
        </div>

        {error && (
          <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-xs font-medium text-center">
            {error}
          </div>
        )}

        {/* Single Google Sign-in Option */}
        <div className="flex justify-center w-full min-h-[44px] pt-2">
          {/* Official Google Identity Services Rendered Container */}
          <div
            ref={gsiButtonRef}
            className={`w-full flex justify-center ${gsiLoaded ? "" : "absolute -left-[9999px] opacity-0 pointer-events-none"}`}
          />

          {/* Fallback Single Button (shown until GIS renders or if GIS iframe is blocked) */}
          {!gsiLoaded && (
            <button
              type="button"
              onClick={handleGooglePopup}
              disabled={loading}
              className="w-full max-w-[300px] h-[40px] px-4 rounded-full border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#1E2320] hover:bg-stone-50 dark:hover:bg-[#252C28] text-stone-800 dark:text-stone-100 font-bold text-xs shadow-xs flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#064E3B]" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <GoogleGLogo className="w-4 h-4 shrink-0" />
                  <span>Continue with Google</span>
                </>
              )}
            </button>
          )}
        </div>

        <div className="pt-2 text-center">
          <p className="text-[10px] text-stone-400 dark:text-stone-500">
            Secure authentication backed by Cloudflare D1 across CafeFlow.
          </p>
        </div>
      </div>
    </div>
  );
}

export function ContinueWithGoogleButton({
  onClick,
  className = "",
  label = "Continue with Google"
}: {
  onClick: () => void;
  className?: string;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full py-2.5 px-4 rounded-full border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#1E2320] hover:bg-stone-50 dark:hover:bg-[#252C28] text-stone-800 dark:text-stone-100 font-bold text-xs shadow-xs flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] cursor-pointer ${className}`}
    >
      <GoogleGLogo className="w-4 h-4 shrink-0" />
      <span>{label}</span>
    </button>
  );
}
