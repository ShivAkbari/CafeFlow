// Standalone test script for centralized payments and daily payouts calculations
function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${message}`);
}

function calculateSplitAllocation(input) {
  const currency = input.currency || "INR";
  const foodSubtotalMinor = Math.max(0, Math.round(input.foodSubtotalMinor));
  const taxMinor = Math.max(0, Math.round(input.taxMinor));
  const deliveryProviderFareMinor = Math.max(0, Math.round(input.deliveryProviderFareMinor));
  const deliveryMarkupMinor = Math.max(0, Math.round(input.deliveryMarkupMinor));
  const deliveryFeeMinor = deliveryProviderFareMinor + deliveryMarkupMinor;
  const cafeflowFeeMinor = Math.max(0, Math.round(input.cafeflowFeeMinor));
  
  const discountMinor = Math.max(0, Math.round(input.discountMinor));
  const discountFundedBy = input.discountFundedBy || "cafe";

  let cafeDiscountMinor = 0;
  let platformDiscountMinor = 0;

  if (discountFundedBy === "cafe") {
    cafeDiscountMinor = Math.min(foodSubtotalMinor, discountMinor);
  } else {
    platformDiscountMinor = discountMinor;
  }

  const foodAmountMinor = Math.max(0, foodSubtotalMinor - cafeDiscountMinor);

  let cafeNetPayableMinor = 0;
  if (discountFundedBy === "cafe") {
    cafeNetPayableMinor = foodAmountMinor + taxMinor;
  } else {
    cafeNetPayableMinor = foodSubtotalMinor + taxMinor;
  }

  let cafeflowNetPayableMinor = deliveryFeeMinor + cafeflowFeeMinor - platformDiscountMinor;
  if (cafeflowNetPayableMinor < 0) {
    cafeflowNetPayableMinor = 0;
  }

  const grossPayableMinor = Math.max(
    0,
    foodSubtotalMinor + taxMinor + deliveryFeeMinor + cafeflowFeeMinor - discountMinor
  );

  const walletAppliedMinor = Math.min(
    grossPayableMinor,
    Math.max(0, Math.round(input.walletAppliedMinor || 0))
  );

  const customerPayableMinor = Math.max(0, grossPayableMinor - walletAppliedMinor);
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

function buildUpiPaymentUri(params) {
  const vpa = params.payeeVpa.trim();
  const name = params.payeeName.trim().slice(0, 50);
  const amountStr = params.amountMajor.toFixed(2);
  const cur = params.currency || "INR";
  const note = params.transactionNote.trim().slice(0, 80);

  const queryParts = [
    `pa=${encodeURIComponent(vpa)}`,
    `pn=${encodeURIComponent(name)}`,
    `am=${encodeURIComponent(amountStr)}`,
    `cu=${encodeURIComponent(cur)}`,
    `tn=${encodeURIComponent(note)}`
  ];

  if (params.transactionRef) {
    queryParts.push(`tr=${encodeURIComponent(params.transactionRef.slice(0, 35))}`);
  }

  return `upi://pay?${queryParts.join("&")}`;
}

console.log("=== CAFELOW CENTRALIZED PAYMENTS & DAILY PAYOUTS TEST SUITE ===\n");

// TEST 1: Centralized Customer Payment Allocation
console.log("[Test 1: Centralized Payment Calculation]");
{
  const allocation = calculateSplitAllocation({
    foodSubtotalMinor: 50000,          // ₹500.00
    taxMinor: 2500,                    // ₹25.00
    deliveryProviderFareMinor: 4500,   // ₹45.00
    deliveryMarkupMinor: 500,          // ₹5.00
    cafeflowFeeMinor: 100,             // ₹1.00
    discountMinor: 0,
    discountFundedBy: "cafe",
    walletAppliedMinor: 0,
    currency: "INR"
  });

  assert(allocation.customerPayableMinor === 57600, "Customer pays total: ₹576.00");
  assert(allocation.cafeNetPayableMinor === 52500, "Cafe entitlement is ₹525.00 (food + tax)");
  assert(allocation.cafeflowNetPayableMinor === 5100, "CafeFlow entitlement is ₹51.00 (delivery + fee)");
  assert(allocation.reconciles === true, "Ledger reconciles completely");
}

// TEST 2: UPI ID Validation
console.log("\n[Test 2: UPI ID Format Validation]");
{
  const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
  assert(upiRegex.test("cafe@okhdfcbank") === true, "cafe@okhdfcbank is valid");
  assert(upiRegex.test("shiv.flow-123@icici") === true, "shiv.flow-123@icici is valid");
  assert(upiRegex.test("invalid-upi") === false, "invalid-upi without @ is rejected");
  assert(upiRegex.test("user@") === false, "user@ with missing handle is rejected");
  assert(upiRegex.test("@bank") === false, "@bank with missing prefix is rejected");
}

// TEST 3: Standard UPI Payment URI Generation
console.log("\n[Test 3: Standard UPI QR Payment URI Specification]");
{
  const uri = buildUpiPaymentUri({
    payeeVpa: "mycafe@okaxis",
    payeeName: "Artisan Coffee Cafe",
    amountMajor: 525.00,
    currency: "INR",
    transactionNote: "CafeFlow Daily Payout CFPAY-001",
    transactionRef: "CFPAY-001"
  });

  assert(uri.startsWith("upi://pay?"), "URI starts with upi://pay?");
  assert(uri.includes("pa=mycafe%40okaxis"), "Payee VPA is encoded properly");
  assert(uri.includes("am=525.00"), "Amount formatted with exact decimals");
  assert(uri.includes("cu=INR"), "Currency is INR");
  assert(uri.includes("tr=CFPAY-001"), "Transaction reference included");
}

// TEST 4: Daily Payout Aggregation & Refund Deductions
console.log("\n[Test 4: Daily Payout Net Calculations with Refunds]");
{
  const splits = [
    { foodSubtotalMinor: 20000, taxMinor: 1000, refundMinor: 0, cafeNetPayableMinor: 21000 },
    { foodSubtotalMinor: 30000, taxMinor: 1500, refundMinor: 5000, cafeNetPayableMinor: 31500 }
  ];

  let totalDueMinor = 0;
  for (const s of splits) {
    const net = Math.max(0, s.cafeNetPayableMinor - s.refundMinor);
    totalDueMinor += net;
  }

  assert(totalDueMinor === 47500, "Net payout due after refund deductions equals ₹475.00");
}

console.log("\n🎉 ALL CENTRALIZED PAYMENT & DAILY PAYOUT TESTS PASSED!\n");
