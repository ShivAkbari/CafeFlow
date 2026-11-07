"use client";

import React, { useState, useEffect, useId, useMemo } from "react";
import { Mail, ChevronDown, Check, AlertCircle } from "lucide-react";

export const PRESET_EMAIL_DOMAINS = [
  "@gmail.com",
  "@yahoo.com",
  "@outlook.com",
  "@hotmail.com",
  "@icloud.com",
  "@live.com",
  "@yahoo.co.in",
  "@proton.me",
  "@protonmail.com"
] as const;

export interface SmartEmailInputProps {
  value?: string;
  onChange: (fullEmail: string) => void;
  disabled?: boolean;
  required?: boolean;
  label?: string;
  placeholder?: string;
  helperText?: string;
  className?: string;
  id?: string;
}

export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  const trimmed = email.trim();
  if (trimmed.length < 5 || trimmed.length > 254) return false;
  return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/.test(trimmed);
}

export function SmartEmailInput({
  value = "",
  onChange,
  disabled = false,
  required = false,
  label,
  placeholder = "username (e.g. rahul123)",
  helperText,
  className = "",
  id
}: SmartEmailInputProps) {
  const generatedId = useId();
  const inputId = id || generatedId;

  // Split external value into username & domain
  const parsed = useMemo(() => {
    const raw = (value || "").trim();
    if (!raw) return { username: "", domain: "@gmail.com", isCustom: false, customDomain: "" };

    const atIndex = raw.lastIndexOf("@");
    if (atIndex <= 0) {
      return { username: raw, domain: "@gmail.com", isCustom: false, customDomain: "" };
    }

    const u = raw.slice(0, atIndex);
    const d = raw.slice(atIndex);
    const matchedPreset = PRESET_EMAIL_DOMAINS.find(
      (preset) => preset.toLowerCase() === d.toLowerCase()
    );

    if (matchedPreset) {
      return { username: u, domain: matchedPreset, isCustom: false, customDomain: "" };
    } else {
      return { username: u, domain: "custom", isCustom: true, customDomain: d.replace(/^@/, "") };
    }
  }, [value]);

  const [username, setUsername] = useState(parsed.username);
  const [selectedDomain, setSelectedDomain] = useState(parsed.domain);
  const [customDomain, setCustomDomain] = useState(parsed.customDomain);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    setUsername(parsed.username);
    setSelectedDomain(parsed.domain);
    setCustomDomain(parsed.customDomain);
  }, [parsed]);

  const emitFullEmail = (newUsername: string, newDomain: string, newCustomDomain: string) => {
    const cleanUser = newUsername.trim();
    if (!cleanUser) {
      onChange("");
      return;
    }

    if (newDomain === "custom") {
      const cleanCustom = newCustomDomain.trim().replace(/^@+/, "");
      if (cleanCustom) {
        onChange(`${cleanUser}@${cleanCustom}`);
      } else {
        onChange(cleanUser);
      }
    } else {
      onChange(`${cleanUser}${newDomain}`);
    }
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;

    if (rawVal.includes("@")) {
      const parts = rawVal.split("@");
      const cleanU = parts[0];
      const rest = parts.slice(1).join("@");
      const detectedDomain = `@${rest.toLowerCase()}`;

      const matched = PRESET_EMAIL_DOMAINS.find((p) => p.toLowerCase() === detectedDomain);
      if (matched) {
        setUsername(cleanU);
        setSelectedDomain(matched);
        setCustomDomain("");
        emitFullEmail(cleanU, matched, "");
        return;
      } else if (rest.length > 0) {
        setUsername(cleanU);
        setSelectedDomain("custom");
        setCustomDomain(rest);
        emitFullEmail(cleanU, "custom", rest);
        return;
      }
    }

    const sanitizedUser = rawVal.replace(/\s+/g, "");
    setUsername(sanitizedUser);
    emitFullEmail(sanitizedUser, selectedDomain, customDomain);
  };

  const handleDomainChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDomain = e.target.value;
    setSelectedDomain(newDomain);
    emitFullEmail(username, newDomain, customDomain);
  };

  const handleCustomDomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleanCustom = e.target.value.replace(/^@+/, "").replace(/\s+/g, "");
    setCustomDomain(cleanCustom);
    emitFullEmail(username, selectedDomain, cleanCustom);
  };

  const fullConstructedEmail = useMemo(() => {
    if (!username.trim()) return "";
    if (selectedDomain === "custom") {
      const cleanCust = customDomain.trim().replace(/^@+/, "");
      return cleanCust ? `${username.trim()}@${cleanCust}` : username.trim();
    }
    return `${username.trim()}${selectedDomain}`;
  }, [username, selectedDomain, customDomain]);

  const hasValue = username.trim().length > 0;
  const isEmailValid = hasValue ? isValidEmail(fullConstructedEmail) : true;
  const showError = touched && hasValue && !isEmailValid;

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label htmlFor={inputId} className="block text-[11px] font-semibold text-[#73716B] dark:text-stone-300">
            {label}
            {required ? (
              <span className="text-rose-500 ml-1 font-bold">*</span>
            ) : (
              <span className="text-[#9E9B93] dark:text-stone-500 font-normal ml-1.5 text-[10px]">(Optional for bill)</span>
            )}
          </label>
          {hasValue && isEmailValid && (
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
              <Check className="w-3 h-3 stroke-[2.5]" /> Valid
            </span>
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-stretch gap-1.5">
        <div className="relative flex-1 min-w-0">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
            <Mail className="w-3.5 h-3.5" />
          </div>
          <input
            id={inputId}
            type="text"
            disabled={disabled}
            value={username}
            onChange={handleUsernameChange}
            onBlur={() => setTouched(true)}
            placeholder={placeholder}
            autoComplete="email"
            className={`w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border bg-stone-50/50 dark:bg-[#001F19] text-stone-900 dark:text-stone-100 placeholder-stone-400 transition-colors focus:outline-none ${
              showError
                ? "border-rose-400 dark:border-rose-700 focus:border-rose-500"
                : "border-[#DDE3DD] dark:border-[#002D23] focus:border-[#002D23]"
            } disabled:opacity-50 disabled:cursor-not-allowed font-medium`}
          />
        </div>

        <div className="relative shrink-0 sm:w-44">
          <select
            disabled={disabled}
            value={selectedDomain}
            onChange={handleDomainChange}
            onBlur={() => setTouched(true)}
            className="w-full appearance-none px-3 pr-8 py-2.5 text-xs font-semibold rounded-xl border border-[#DDE3DD] dark:border-[#002D23] bg-white dark:bg-[#002D23] text-stone-800 dark:text-stone-200 focus:outline-none focus:border-[#002D23] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {PRESET_EMAIL_DOMAINS.map((domain) => (
              <option key={domain} value={domain}>
                {domain}
              </option>
            ))}
            <option value="custom">Custom domain...</option>
          </select>
          <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-stone-400">
            <ChevronDown className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {selectedDomain === "custom" && (
        <div className="flex items-center gap-1.5 pt-0.5 animate-fadeIn">
          <span className="text-xs font-semibold text-stone-400 pl-1">@</span>
          <input
            type="text"
            disabled={disabled}
            value={customDomain}
            onChange={handleCustomDomainChange}
            onBlur={() => setTouched(true)}
            placeholder="company.com or your email provider"
            className="flex-1 px-3 py-2 text-xs rounded-xl border border-[#DDE3DD] dark:border-[#002D23] bg-white dark:bg-[#001F19] text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:border-[#002D23] font-medium"
          />
        </div>
      )}

      {showError ? (
        <p className="text-[10px] text-rose-500 flex items-center gap-1 pt-0.5">
          <AlertCircle className="w-3 h-3 shrink-0" />
          Please enter a valid complete email address
        </p>
      ) : helperText ? (
        <p className="text-[10px] text-[#8C887E] dark:text-stone-500 pt-0.5">{helperText}</p>
      ) : null}
    </div>
  );
}
