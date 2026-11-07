"use client";

import React from "react";
import { FoodType, FOOD_TYPES } from "@/lib/food-classification";

interface FoodTypeBadgeProps {
  foodType?: FoodType | string | null;
  isVeg?: boolean | number | null;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

/**
 * Standard Zomato/Swiggy-style Food Classification Indicator.
 * - Veg: green square with green filled dot
 * - Non-Veg: red square with red filled dot / triangle
 * - Contains Egg: amber square with amber filled dot and clear egg label/indicator
 * Includes accessible aria-label and sr-only/visible text so meaning is never color-alone.
 */
export function FoodTypeBadge({
  foodType,
  isVeg,
  size = "md",
  showLabel = false,
  className = ""
}: FoodTypeBadgeProps) {
  const resolvedType: FoodType =
    foodType === "egg" || foodType === "contains_egg"
      ? "egg"
      : foodType === "non_veg" || foodType === "non-veg" || isVeg === false || isVeg === 0
      ? "non_veg"
      : "veg";

  const meta = FOOD_TYPES[resolvedType] || FOOD_TYPES.veg;

  const boxDim = size === "sm" ? "w-3 h-3" : size === "lg" ? "w-4 h-4" : "w-3.5 h-3.5";
  const dotDim = size === "sm" ? "w-1.5 h-1.5" : size === "lg" ? "w-2 h-2" : "w-1.5 h-1.5";
  const textSize = size === "sm" ? "text-[9px]" : size === "lg" ? "text-xs" : "text-[10px]";

  return (
    <span
      className={`inline-flex items-center gap-1.5 select-none shrink-0 ${className}`}
      title={meta.label}
      role="img"
      aria-label={meta.label}
    >
      <span
        className={`relative ${boxDim} rounded-[3px] border-[1.5px] ${meta.borderColor} bg-white dark:bg-[#121212] flex items-center justify-center shrink-0 shadow-2xs`}
      >
        {resolvedType === "egg" ? (
          <span className={`${dotDim} rounded-full ${meta.fillColor} transform scale-y-110`} />
        ) : (
          <span className={`${dotDim} rounded-full ${meta.fillColor}`} />
        )}
      </span>

      {showLabel && (
        <span className={`font-bold ${textSize} ${meta.textColor} uppercase tracking-wider`}>
          {meta.shortLabel}
        </span>
      )}
      <span className="sr-only">({meta.label})</span>
    </span>
  );
}

/**
 * Restaurant Category Pill / Badge for Cards & Detail Pages
 */
export function RestaurantCategoryBadge({
  category,
  size = "md",
  className = ""
}: {
  category?: string | null;
  size?: "sm" | "md";
  className?: string;
}) {
  const normCat = (category || "veg_non_veg").toLowerCase().trim();

  let label = "Veg & Non-Veg";
  let badgeColor = "bg-stone-500/10 text-stone-700 dark:text-stone-300 border-stone-500/20";
  let dotType: FoodType = "non_veg";

  if (normCat === "pure_veg" || normCat === "pure veg") {
    label = "Pure Veg";
    badgeColor = "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25";
    dotType = "veg";
  } else if (normCat === "veg_egg" || normCat === "veg & egg") {
    label = "Veg & Egg";
    badgeColor = "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25";
    dotType = "egg";
  } else if (normCat === "non_veg" || normCat === "non veg") {
    label = "Non-Veg";
    badgeColor = "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25";
    dotType = "non_veg";
  }

  const px = size === "sm" ? "px-2 py-0.5 text-[9px]" : "px-2.5 py-0.5 text-[10px]";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-bold border ${badgeColor} ${px} tracking-wide select-none shrink-0 ${className}`}
      title={`Restaurant Food Category: ${label}`}
    >
      <FoodTypeBadge foodType={dotType} size="sm" />
      <span>{label}</span>
    </span>
  );
}
