export type RestaurantFoodCategory = "pure_veg" | "veg_non_veg" | "veg_egg" | "non_veg";

export type FoodType = "veg" | "non_veg" | "egg";

export interface FoodCategoryMeta {
  key: RestaurantFoodCategory;
  label: string;
  shortLabel: string;
  description: string;
  badgeClass: string;
  dotColor: string;
}

export const RESTAURANT_FOOD_CATEGORIES: Record<RestaurantFoodCategory, FoodCategoryMeta> = {
  pure_veg: {
    key: "pure_veg",
    label: "Pure Veg",
    shortLabel: "Pure Veg",
    description: "The restaurant serves vegetarian items only.",
    badgeClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25",
    dotColor: "#10B981"
  },
  veg_non_veg: {
    key: "veg_non_veg",
    label: "Veg & Non-Veg",
    shortLabel: "Veg & Non-Veg",
    description: "The restaurant serves both vegetarian and non-vegetarian items.",
    badgeClass: "bg-stone-500/10 text-stone-700 dark:text-stone-300 border-stone-500/20",
    dotColor: "#78716C"
  },
  veg_egg: {
    key: "veg_egg",
    label: "Veg & Egg",
    shortLabel: "Veg & Egg",
    description: "The restaurant serves vegetarian and egg-containing items, but no meat.",
    badgeClass: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25",
    dotColor: "#F59E0B"
  },
  non_veg: {
    key: "non_veg",
    label: "Non-Veg",
    shortLabel: "Non-Veg",
    description: "The restaurant serves non-vegetarian items. Individual items are classified per dish.",
    badgeClass: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25",
    dotColor: "#EF4444"
  }
};

export interface FoodTypeMeta {
  key: FoodType;
  label: string;
  shortLabel: string;
  borderColor: string;
  fillColor: string;
  badgeBg: string;
  textColor: string;
}

export const FOOD_TYPES: Record<FoodType, FoodTypeMeta> = {
  veg: {
    key: "veg",
    label: "Vegetarian",
    shortLabel: "Veg",
    borderColor: "border-emerald-600 dark:border-emerald-500",
    fillColor: "bg-emerald-600 dark:bg-emerald-500",
    badgeBg: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800/60",
    textColor: "text-emerald-700 dark:text-emerald-400"
  },
  non_veg: {
    key: "non_veg",
    label: "Non-Vegetarian",
    shortLabel: "Non-Veg",
    borderColor: "border-red-600 dark:border-red-500",
    fillColor: "bg-red-600 dark:bg-red-500",
    badgeBg: "bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800/60",
    textColor: "text-red-700 dark:text-red-400"
  },
  egg: {
    key: "egg",
    label: "Contains Egg",
    shortLabel: "Egg",
    borderColor: "border-amber-600 dark:border-amber-500",
    fillColor: "bg-amber-600 dark:bg-amber-500",
    badgeBg: "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800/60",
    textColor: "text-amber-700 dark:text-amber-400"
  }
};

/**
 * Validates whether an item food type is permitted under the restaurant food category.
 */
export function isFoodTypeAllowedForCategory(
  restaurantCategory: RestaurantFoodCategory,
  itemType: FoodType
): boolean {
  if (restaurantCategory === "pure_veg") {
    return itemType === "veg";
  }
  if (restaurantCategory === "veg_egg") {
    return itemType === "veg" || itemType === "egg";
  }
  // "veg_non_veg" and "non_veg" permit veg, non_veg, and egg
  return true;
}

/**
 * Normalizes any legacy string or boolean to a valid FoodType.
 */
export function normalizeFoodType(foodType?: string | null, isVeg?: boolean | number | null): FoodType {
  if (foodType === "egg" || foodType === "contains_egg") return "egg";
  if (foodType === "non_veg" || foodType === "non-veg") return "non_veg";
  if (foodType === "veg") return "veg";

  if (isVeg === false || isVeg === 0) return "non_veg";
  return "veg";
}

/**
 * Normalizes any legacy or custom string to a valid RestaurantFoodCategory.
 */
export function normalizeRestaurantFoodCategory(category?: string | null): RestaurantFoodCategory {
  if (!category) return "veg_non_veg";
  const lower = category.toLowerCase().trim();
  if (lower === "pure_veg" || lower === "pure-veg" || lower === "pure veg") return "pure_veg";
  if (lower === "veg_egg" || lower === "veg-egg" || lower === "veg & egg" || lower === "veg_and_egg") return "veg_egg";
  if (lower === "non_veg" || lower === "non-veg" || lower === "non veg") return "non_veg";
  return "veg_non_veg";
}
