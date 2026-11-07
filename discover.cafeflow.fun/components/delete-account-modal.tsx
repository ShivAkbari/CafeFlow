"use client";

import { useState } from "react";
import {
  Trash2,
  X,
  AlertTriangle,
  ArrowLeft,
  Wallet,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  ArrowRight
} from "lucide-react";

export interface WalletBreakdown {
  cafeId: string;
  cafeName: string;
  balance: number;
}

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallets: WalletBreakdown[];
  totalWalletBalance: number;
  userEmail?: string;
  onAccountDeleted?: () => void;
}

const CONCERN_OPTIONS = [
  { id: "not_using", label: "I'm not using CafeFlow anymore" },
  { id: "privacy", label: "Privacy or data security concerns" },
  { id: "notifications", label: "Too many notifications or promotional emails" },
  { id: "technical", label: "Having technical issues or difficulty using the app" },
  { id: "duplicate", label: "I created a duplicate or wrong account" },
  { id: "other", label: "Other reason" }
];

export function DeleteAccountModal({
  isOpen,
  onClose,
  wallets,
  totalWalletBalance,
  userEmail,
  onAccountDeleted
}: DeleteAccountModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [feedback, setFeedback] = useState<string>("");
  const [confirmed, setConfirmed] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [isDeletedSuccess, setIsDeletedSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleClose = () => {
    if (isDeleting) return;
    setStep(1);
    setSelectedReason("");
    setFeedback("");
    setConfirmed(false);
    setError("");
    setIsDeletedSuccess(false);
    onClose();
  };

  const handleProceedToStep2 = () => {
    if (!selectedReason) {
      setError("Please select a reason to let us know your concern.");
      return;
    }
    setError("");
    setStep(2);
  };

  const handleDeleteAccount = async () => {
    if (!confirmed) {
      setError("Please check the confirmation box to proceed.");
      return;
    }

    setIsDeleting(true);
    setError("");

    const reasonLabel = CONCERN_OPTIONS.find((o) => o.id === selectedReason)?.label || selectedReason;

    try {
      const res = await fetch("/api/user/profile", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: reasonLabel,
          feedback: feedback.trim()
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete account. Please try again.");
      }

      setIsDeletedSuccess(true);
      onAccountDeleted?.();

      setTimeout(() => {
        // Full reload to clear client cache and redirect home
        window.location.href = "/";
      }, 2000);
    } catch (err: any) {
      console.error("[Delete Account Error]", err);
      setError(err.message || "An unexpected error occurred while deleting your account.");
      setIsDeleting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="w-full max-w-md rounded-[24px] bg-white dark:bg-[#002D23] border border-[#DDE3DD] dark:border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-[#EDF1EF] dark:border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-[15px] text-[#0B1714] dark:text-white leading-tight">
                {step === 1 ? "Delete CafeFlow Account" : "Confirm Data Wipe"}
              </h3>
              <p className="text-[11px] text-[#73716B]">
                {step === 1 ? "Step 1 of 2: Share your concern" : "Step 2 of 2: Review balance & confirm"}
              </p>
            </div>
          </div>

          {!isDeleting && !isDeletedSuccess && (
            <button
              onClick={handleClose}
              className="w-7 h-7 rounded-full hover:bg-stone-100 dark:hover:bg-white/10 text-[#73716B] flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          
          {isDeletedSuccess ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="font-extrabold text-base text-[#0B1714] dark:text-white">
                  Account Permanently Deleted
                </h4>
                <p className="text-xs text-[#73716B] max-w-xs mx-auto">
                  All your personal data, wallet balances, and preferences have been completely wiped. Redirecting you to the home page...
                </p>
              </div>
              <div className="pt-2">
                <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#002D23] dark:text-[#34D399]" />
              </div>
            </div>
          ) : step === 1 ? (
            /* STEP 1: ASK CONCERN PROPERLY */
            <div className="space-y-3.5">
              <div className="bg-[#FAF8F4] dark:bg-[#001F19]/60 border border-[#E8EEE8] dark:border-white/5 rounded-2xl p-3 text-[11px] text-[#73716B] leading-relaxed">
                We are sorry to see you leave. Please let us know why you wish to delete your account so we can improve our services:
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-[#0B1714] dark:text-white">
                  Reason for deleting account <span className="text-red-500">*</span>
                </label>
                <div className="space-y-1.5">
                  {CONCERN_OPTIONS.map((opt) => {
                    const isSelected = selectedReason === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setSelectedReason(opt.id);
                          setError("");
                        }}
                        className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center gap-2.5 cursor-pointer ${
                          isSelected
                            ? "bg-red-50/50 dark:bg-red-950/20 border-red-300 dark:border-red-900/60 text-[#0B1714] dark:text-white font-semibold"
                            : "bg-white dark:bg-[#002D23]/60 border-[#DDE3DD] dark:border-white/10 text-[#64736D] hover:border-stone-300 dark:hover:border-white/20"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? "border-red-600 bg-red-600 dark:border-red-400 dark:bg-red-400"
                              : "border-stone-300 dark:border-stone-600"
                          }`}
                        >
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <span className="text-[11.5px] leading-tight">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-[#0B1714] dark:text-white">
                  Any additional feedback? (Optional)
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Tell us what could have been better or what made you leave..."
                  rows={2}
                  className="w-full p-2.5 rounded-xl border border-[#DDE3DD] dark:border-white/10 bg-transparent text-[11.5px] text-[#0B1714] dark:text-white placeholder:text-[#8F9E98] focus:outline-none focus:border-[#002D23] dark:focus:border-[#34D399]"
                />
              </div>

              {error && (
                <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-[11px] font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          ) : (
            /* STEP 2: WALLET BALANCE & DELETION WARNING */
            <div className="space-y-3.5">
              
              {/* WALLET BALANCE ALERT */}
              {totalWalletBalance > 0 ? (
                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-800 dark:text-amber-300 block">
                        Active Wallet Balance Detected
                      </span>
                      <div className="text-lg font-black text-amber-900 dark:text-amber-200">
                        ₹{totalWalletBalance.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {wallets.length > 0 && (
                    <div className="bg-white/80 dark:bg-black/20 rounded-xl p-2 border border-amber-200/60 dark:border-amber-900/30 space-y-1">
                      <div className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-tight">
                        Balances across your cafes:
                      </div>
                      <div className="space-y-0.5 divide-y divide-amber-100 dark:divide-white/5">
                        {wallets.map((w, idx) => (
                          <div key={idx} className="flex items-center justify-between pt-1 text-[11px]">
                            <span className="text-[#0B1714] dark:text-white font-medium truncate max-w-[200px]">
                              {w.cafeName}
                            </span>
                            <span className="font-bold text-[#0B1714] dark:text-white shrink-0">
                              ₹{w.balance.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="p-2.5 rounded-xl bg-red-100/70 dark:bg-red-950/60 border border-red-300 dark:border-red-900 text-red-700 dark:text-red-300 text-[11px] font-bold leading-relaxed flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                    <span>
                      Are you sure you want to delete your account and erase all data? You have ₹{totalWalletBalance.toFixed(2)} in your wallet. You cannot recover this money after deletion. It will be permanently forfeited.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-[#73716B]" />
                    <span className="text-[#73716B]">Wallet Balance:</span>
                  </div>
                  <span className="font-extrabold text-[#0B1714] dark:text-white">₹0.00</span>
                </div>
              )}

              {/* DATA WIPE SCOPE NOTICE */}
              <div className="p-3.5 rounded-2xl bg-red-50/50 dark:bg-red-950/20 border border-red-200/60 dark:border-red-900/30 space-y-1.5 text-[11px]">
                <div className="font-extrabold text-red-700 dark:text-red-400 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>The following data will be permanently wiped:</span>
                </div>
                <ul className="space-y-1 text-[#64736D] dark:text-[#94A3B8] pl-5 list-disc text-[10.5px]">
                  <li>Personal details (name, phone, connected Google credentials)</li>
                  <li>Customer preferences, saved delivery addresses &amp; favorites</li>
                  <li>All table reservations, booking records &amp; reviews</li>
                  <li>Active sessions across all your browsers and devices</li>
                  {totalWalletBalance > 0 && (
                    <li className="font-bold text-red-600 dark:text-red-400">
                      Remaining ₹{totalWalletBalance.toFixed(2)} wallet money (irreversible forfeiture)
                    </li>
                  )}
                </ul>
              </div>

              {/* CONFIRMATION CHECKBOX */}
              <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-[#FAF8F4] dark:bg-[#001F19]/60 border border-[#E8EEE8] dark:border-white/10 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => {
                    setConfirmed(e.target.checked);
                    setError("");
                  }}
                  className="mt-0.5 w-4 h-4 rounded border-[#DDE3DD] text-red-600 focus:ring-red-500 cursor-pointer"
                />
                <span className="text-[11px] text-[#0B1714] dark:text-white leading-snug">
                  I understand that this action is irreversible. All my data, order history, and wallet balances will be permanently erased and cannot be recovered.
                </span>
              </label>

              {error && (
                <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-[11px] font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Actions Footer */}
        {!isDeletedSuccess && (
          <div className="p-4 sm:p-5 border-t border-[#EDF1EF] dark:border-white/10 bg-[#FAF8F4] dark:bg-[#001F19]/50 flex items-center justify-between gap-3 shrink-0">
            {step === 1 ? (
              <>
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2.5 rounded-full border border-stone-200 dark:border-white/10 hover:bg-white dark:hover:bg-white/5 text-[#64736D] dark:text-[#94A3B8] font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleProceedToStep2}
                  disabled={!selectedReason}
                  className="px-5 py-2.5 rounded-full bg-[#002D23] hover:bg-[#001F19] text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={isDeleting}
                  className="px-3.5 py-2.5 rounded-full border border-stone-200 dark:border-white/10 hover:bg-white dark:hover:bg-white/5 text-[#64736D] dark:text-[#94A3B8] font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={!confirmed || isDeleting}
                  className="px-5 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Wiping all data...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Permanently Delete</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

