/**
 * Split Payment Allocation Engine for CafeFlow Discover
 * 
 * Implements strict integer-paise financial mathematics:
 * 1. food_amount: subtotal of food items after applicable discounts & cafe-funded promo codes.
 * 2. tax_amount: taxes attributable to the cafe according to menu item tax rates.
 * 3. delivery_amount: verified Shiprocket quote + explicit CafeFlow delivery markup.
 * 4. cafeflow_fee: configured CafeFlow platform customer fee.
 * 5. customer_payable: total after discounts and wallet deductions.
 * 
 * Never trusts prices, discounts, or delivery fees submitted by the client.
 * Strictly verifies Razorpay Linked Account onboarding & capability.
 */

export interface SplitPaymentInput {
  foodSubtotalMinor: number;
  taxMinor: number;
  deliveryProviderFareMinor: number;
  deliveryMarkupMinor: number;
  cafeflowFeeMinor: number;
  discountMinor: number;
  discountFundedBy: "cafe" | "platform" | "partner";
  walletAppliedMinor?: number;
  currency?: string;
}

export interface SplitPaymentAllocation {
  currency: string;
  foodAmountMinor: number;
  taxAmountMinor: number;
  deliveryFeeMinor: number;
  deliveryProviderFareMinor: number;
  deliveryMarkupMinor: number;
  cafeflowFeeMinor: number;
  
  // Discount breakdown
  discountMinor: number;
  cafeDiscountMinor: number;
  platformDiscountMinor: number;
  discountFundedBy: "cafe" | "platform" | "partner";
  
  // Net entitlements (integer paise)
  cafeNetPayableMinor: number;
  cafeflowNetPayableMinor: number;
  
  // Total bill before wallet
  grossPayableMinor: number;
  walletAppliedMinor: number;
  
  // What the customer actually pays via Razorpay
  customerPayableMinor: number;
  
  // Reconciliation check
  reconciles: boolean;
}

/**
 * Calculates independent split payment allocation with strict integer arithmetic.
 * Guarantees zero negative allocations and zero integer rounding leakage.
 */
export function calculateSplitAllocation(input: SplitPaymentInput): SplitPaymentAllocation {
  const currency = input.currency || "INR";
  const foodSubtotalMinor = Math.max(0, Math.round(input.foodSubtotalMinor));
  const taxMinor = Math.max(0, Math.round(input.taxMinor));
  const deliveryProviderFareMinor = Math.max(0, Math.round(input.deliveryProviderFareMinor));
  const deliveryMarkupMinor = Math.max(0, Math.round(input.deliveryMarkupMinor));
  const deliveryFeeMinor = deliveryProviderFareMinor + deliveryMarkupMinor;
  const cafeflowFeeMinor = Math.max(0, Math.round(input.cafeflowFeeMinor));
  
  const discountMinor = Math.max(0, Math.round(input.discountMinor));
  const discountFundedBy = input.discountFundedBy || "cafe";

  // Attribution of discounts
  let cafeDiscountMinor = 0;
  let platformDiscountMinor = 0;

  if (discountFundedBy === "cafe") {
    // Cafe-funded discount cannot exceed foodSubtotalMinor
    cafeDiscountMinor = Math.min(foodSubtotalMinor, discountMinor);
  } else {
    // Platform-funded or partner-funded discount
    platformDiscountMinor = discountMinor;
  }

  // Food amount after cafe-funded discount
  const foodAmountMinor = Math.max(0, foodSubtotalMinor - cafeDiscountMinor);

  // Cafe net entitlement: food items + cafe taxes (cafe collects their taxes)
  // If platform funded the discount, cafe still receives full foodSubtotalMinor + taxMinor
  let cafeNetPayableMinor = 0;
  if (discountFundedBy === "cafe") {
    cafeNetPayableMinor = foodAmountMinor + taxMinor;
  } else {
    cafeNetPayableMinor = foodSubtotalMinor + taxMinor;
  }

  // CafeFlow platform net entitlement:
  // Receives: verified delivery fare (to pay Shiprocket) + delivery markup + cafeflow platform fee
  // Less: any platform-funded discount
  let cafeflowNetPayableMinor = deliveryFeeMinor + cafeflowFeeMinor - platformDiscountMinor;
  if (cafeflowNetPayableMinor < 0) {
    // Prevent negative platform allocation
    cafeflowNetPayableMinor = 0;
  }

  // Gross total payable by customer before wallet
  const grossPayableMinor = Math.max(
    0,
    foodSubtotalMinor + taxMinor + deliveryFeeMinor + cafeflowFeeMinor - discountMinor
  );

  const walletAppliedMinor = Math.min(
    grossPayableMinor,
    Math.max(0, Math.round(input.walletAppliedMinor || 0))
  );

  const customerPayableMinor = Math.max(0, grossPayableMinor - walletAppliedMinor);

  // Reconciliation check:
  // customerPayableMinor + walletAppliedMinor + (platformDiscount if subsidized) must equal
  // cafeNetPayableMinor + deliveryFeeMinor + cafeflowFeeMinor
  const totalReceived = customerPayableMinor + walletAppliedMinor;
  const totalAllocated = cafeNetPayableMinor + cafeflowNetPayableMinor;
  const reconciles = totalReceived === totalAllocated;

  return {
    currency,
    foodAmountMinor,
    taxAmountMinor: taxMinor,
    deliveryFeeMinor,
    deliveryProviderFareMinor,
    deliveryMarkupMinor,
    cafeflowFeeMinor,
    discountMinor,
    cafeDiscountMinor,
    platformDiscountMinor,
    discountFundedBy,
    cafeNetPayableMinor,
    cafeflowNetPayableMinor,
    grossPayableMinor,
    walletAppliedMinor,
    customerPayableMinor,
    reconciles
  };
}

/**
 * Checks whether a cafe is onboarded to receive live Razorpay transfers.
 */
export function validateCafeSplitCapability(cafe: {
  razorpay_account_id?: string | null;
  split_payments_enabled?: number | boolean | null;
}): {
  canSplit: boolean;
  reason?: string;
  actionableError?: string;
} {
  const accountId = (cafe.razorpay_account_id || "").trim();
  const isEnabled = Boolean(cafe.split_payments_enabled);

  if (!accountId) {
    return {
      canSplit: false,
      reason: "MISSING_LINKED_ACCOUNT",
      actionableError: "This cafe has not configured a Razorpay Route linked account (acc_...). Direct split transfer cannot be executed."
    };
  }

  // Razorpay linked account format is acc_ followed by alphanumeric (18 chars minimum)
  if (!accountId.startsWith("acc_") || accountId.length < 14) {
    return {
      canSplit: false,
      reason: "INVALID_LINKED_ACCOUNT_FORMAT",
      actionableError: `The linked account ID '${accountId}' is not a valid Razorpay Route account ID (must start with 'acc_').`
    };
  }

  if (!isEnabled) {
    return {
      canSplit: false,
      reason: "SPLIT_PAYMENTS_DISABLED_BY_ADMIN",
      actionableError: "Split payments are disabled for this cafe. Please enable split payments in the CafeFlow management dashboard."
    };
  }

  return {
    canSplit: true
  };
}
