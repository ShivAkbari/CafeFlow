// scripts/apply-split-payments-migration.js
const token = process.env.CLOUDFLARE_API_TOKEN;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const dbId = process.env.D1_DATABASE_ID;

const sqlStatements = [
  // 1. Alter cafes to add Razorpay Linked Account ID & Split Payment status
  "ALTER TABLE cafes ADD COLUMN razorpay_account_id TEXT;",
  "ALTER TABLE cafes ADD COLUMN split_payments_enabled INTEGER NOT NULL DEFAULT 0;",
  
  // 2. Alter promotions to support funded_by ('cafe' | 'platform' | 'partner')
  "ALTER TABLE promotions ADD COLUMN funded_by TEXT NOT NULL DEFAULT 'cafe';",

  // 3. Create order_payment_splits table (Immutable financial ledger per order split)
  `CREATE TABLE IF NOT EXISTS order_payment_splits (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    cafe_id TEXT NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
    order_type TEXT NOT NULL DEFAULT 'delivery',
    currency TEXT NOT NULL DEFAULT 'INR',
    
    -- Integer Paise Amounts
    food_amount_minor INTEGER NOT NULL,
    tax_amount_minor INTEGER NOT NULL,
    delivery_fee_minor INTEGER NOT NULL,
    delivery_provider_fare_minor INTEGER NOT NULL,
    delivery_markup_minor INTEGER NOT NULL,
    cafeflow_fee_minor INTEGER NOT NULL,
    
    -- Discounts & Funding Breakdown
    discount_minor INTEGER NOT NULL DEFAULT 0,
    cafe_discount_minor INTEGER NOT NULL DEFAULT 0,
    platform_discount_minor INTEGER NOT NULL DEFAULT 0,
    discount_funded_by TEXT NOT NULL DEFAULT 'cafe',
    
    -- Recipient Net Entitlements
    cafe_net_payable_minor INTEGER NOT NULL,
    cafeflow_net_payable_minor INTEGER NOT NULL,
    customer_payable_minor INTEGER NOT NULL,
    wallet_applied_minor INTEGER NOT NULL DEFAULT 0,
    
    -- Razorpay Gateway & Transfer Details
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    razorpay_transfer_id TEXT,
    razorpay_account_id TEXT,
    
    -- Gateway Costs & Deductions
    gateway_fee_minor INTEGER NOT NULL DEFAULT 0,
    gateway_tax_minor INTEGER NOT NULL DEFAULT 0,
    transfer_fee_minor INTEGER NOT NULL DEFAULT 0,
    
    -- Status Lifecycles
    payment_status TEXT NOT NULL DEFAULT 'pending',     -- 'pending' | 'captured' | 'failed' | 'refunded'
    transfer_status TEXT NOT NULL DEFAULT 'pending',    -- 'pending' | 'settled' | 'reversed' | 'failed' | 'disabled'
    settlement_status TEXT NOT NULL DEFAULT 'unsettled',-- 'unsettled' | 'settled' | 'partially_settled'
    
    -- Refund & Reconciliation Audit
    refund_amount_minor INTEGER NOT NULL DEFAULT 0,
    refund_status TEXT NOT NULL DEFAULT 'none',         -- 'none' | 'partial' | 'full'
    refund_id TEXT,
    reconciliation_status TEXT NOT NULL DEFAULT 'matched', -- 'matched' | 'discrepancy'
    reconciliation_notes TEXT,
    
    raw_breakdown_json TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
  );`,

  "CREATE INDEX IF NOT EXISTS idx_order_splits_order ON order_payment_splits(order_id);",
  "CREATE INDEX IF NOT EXISTS idx_order_splits_cafe ON order_payment_splits(cafe_id, created_at DESC);",
  "CREATE INDEX IF NOT EXISTS idx_order_splits_rzp_order ON order_payment_splits(razorpay_order_id);",
  "CREATE INDEX IF NOT EXISTS idx_order_splits_rzp_pay ON order_payment_splits(razorpay_payment_id);",
  "CREATE INDEX IF NOT EXISTS idx_order_splits_transfer ON order_payment_splits(transfer_status);",

  // 4. Create payment_discrepancy_logs table for developer dashboard
  `CREATE TABLE IF NOT EXISTS payment_discrepancy_logs (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    discrepancy_type TEXT NOT NULL,
    expected_amount_minor INTEGER NOT NULL,
    actual_amount_minor INTEGER NOT NULL,
    difference_minor INTEGER NOT NULL,
    details_json TEXT,
    status TEXT NOT NULL DEFAULT 'unresolved',
    resolved_by TEXT,
    resolved_at INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
  );`,

  "CREATE INDEX IF NOT EXISTS idx_discrepancies_order ON payment_discrepancy_logs(order_id);",
  "CREATE INDEX IF NOT EXISTS idx_discrepancies_status ON payment_discrepancy_logs(status);"
];

async function applyMigrations() {
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${dbId}/query`;
  console.log(`Connecting to D1 database: ${dbId}`);

  for (const statement of sqlStatements) {
    const cleanStmt = statement.trim();
    if (!cleanStmt) continue;

    console.log(`Executing: ${cleanStmt.substring(0, 60).replace(/\n/g, ' ')}...`);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ sql: cleanStmt })
      });
      const data = await response.json();
      if (!data.success) {
        // Ignore duplicate column errors if migration already applied
        if (data.errors?.[0]?.message?.includes("duplicate column")) {
          console.log(`  -> Column already exists (skipped)`);
        } else {
          console.warn(`  -> D1 Warning/Error:`, JSON.stringify(data.errors));
        }
      } else {
        console.log(`  -> OK`);
      }
    } catch (err) {
      console.error(`  -> Network/Execution Error:`, err);
    }
  }
  console.log("Migration finished.");
}

applyMigrations();
