const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const accountId = env.match(/CLOUDFLARE_ACCOUNT_ID=(.*)/)[1].trim();
const dbId = env.match(/D1_DATABASE_ID=(.*)/)[1].trim();
const token = env.match(/CLOUDFLARE_API_TOKEN=(.*)/)[1].trim();
const url = 'https://api.cloudflare.com/client/v4/accounts/' + accountId + '/d1/database/' + dbId + '/query';

async function execute(sql) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ sql })
  });
  const data = await res.json();
  console.log(sql.substring(0, 45).replace(/\n/g, ' '), '->', data.success ? 'OK' : data.errors);
}

async function run() {
  await execute("ALTER TABLE cafes ADD COLUMN payout_upi_id TEXT;").catch(() => {});
  await execute("ALTER TABLE cafes ADD COLUMN payout_upi_updated_at INTEGER;").catch(() => {});
  await execute("ALTER TABLE cafes ADD COLUMN payout_upi_updated_by TEXT;").catch(() => {});
  await execute("ALTER TABLE cafes ADD COLUMN payout_upi_verified INTEGER NOT NULL DEFAULT 0;").catch(() => {});

  await execute("ALTER TABLE order_payment_splits ADD COLUMN payout_batch_id TEXT;").catch(() => {});
  await execute("ALTER TABLE order_payment_splits ADD COLUMN payout_item_id TEXT;").catch(() => {});

  await execute("CREATE INDEX IF NOT EXISTS idx_order_splits_payout_batch ON order_payment_splits(payout_batch_id);");
  await execute("CREATE INDEX IF NOT EXISTS idx_order_splits_payout_item ON order_payment_splits(payout_item_id);");

  await execute(`
    CREATE TABLE IF NOT EXISTS cafe_payout_batches (
      id TEXT PRIMARY KEY,
      batch_number TEXT NOT NULL UNIQUE,
      cutoff_time INTEGER NOT NULL,
      timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
      total_cafes INTEGER NOT NULL DEFAULT 0,
      total_orders INTEGER NOT NULL DEFAULT 0,
      total_payout_amount_minor INTEGER NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'INR',
      status TEXT NOT NULL DEFAULT 'draft',
      created_by_email TEXT NOT NULL,
      finalized_at INTEGER,
      completed_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  await execute("CREATE INDEX IF NOT EXISTS idx_payout_batches_status ON cafe_payout_batches(status, created_at DESC);");

  await execute(`
    CREATE TABLE IF NOT EXISTS cafe_payout_items (
      id TEXT PRIMARY KEY,
      batch_id TEXT NOT NULL REFERENCES cafe_payout_batches(id) ON DELETE CASCADE,
      cafe_id TEXT NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
      cafe_name TEXT NOT NULL,
      payout_upi_id TEXT NOT NULL,
      payout_reference TEXT NOT NULL UNIQUE,
      eligible_orders_count INTEGER NOT NULL DEFAULT 0,
      food_subtotal_minor INTEGER NOT NULL DEFAULT 0,
      tax_minor INTEGER NOT NULL DEFAULT 0,
      discount_minor INTEGER NOT NULL DEFAULT 0,
      refund_deductions_minor INTEGER NOT NULL DEFAULT 0,
      adjustments_minor INTEGER NOT NULL DEFAULT 0,
      net_payout_due_minor INTEGER NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'INR',
      upi_qr_payload TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      utr_number TEXT,
      paid_by_email TEXT,
      paid_at INTEGER,
      payment_evidence_notes TEXT,
      failure_reason TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  await execute("CREATE INDEX IF NOT EXISTS idx_payout_items_batch ON cafe_payout_items(batch_id);");
  await execute("CREATE INDEX IF NOT EXISTS idx_payout_items_cafe ON cafe_payout_items(cafe_id, created_at DESC);");
  await execute("CREATE INDEX IF NOT EXISTS idx_payout_items_status ON cafe_payout_items(status);");
  await execute("CREATE INDEX IF NOT EXISTS idx_payout_items_ref ON cafe_payout_items(payout_reference);");

  await execute(`
    CREATE TABLE IF NOT EXISTS cafe_payout_audit_logs (
      id TEXT PRIMARY KEY,
      payout_item_id TEXT,
      batch_id TEXT,
      cafe_id TEXT,
      action TEXT NOT NULL,
      user_email TEXT NOT NULL,
      previous_status TEXT,
      new_status TEXT,
      details_json TEXT,
      created_at INTEGER NOT NULL
    );
  `);

  await execute("CREATE INDEX IF NOT EXISTS idx_payout_audit_cafe ON cafe_payout_audit_logs(cafe_id, created_at DESC);");
  await execute("CREATE INDEX IF NOT EXISTS idx_payout_audit_item ON cafe_payout_audit_logs(payout_item_id);");

  console.log("Migration 0024 applied successfully!");
}

run();
