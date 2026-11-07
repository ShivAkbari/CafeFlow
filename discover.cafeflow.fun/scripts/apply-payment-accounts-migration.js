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
  console.log(sql.substring(0, 40), '->', data.success ? 'OK' : data.errors);
}

async function run() {
  await execute(`
    CREATE TABLE IF NOT EXISTS cafe_payment_accounts (
      id TEXT PRIMARY KEY,
      cafe_id TEXT NOT NULL UNIQUE REFERENCES cafes(id) ON DELETE CASCADE,
      provider TEXT NOT NULL DEFAULT 'razorpay',
      account_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'not_connected',
      business_name TEXT,
      contact_email TEXT,
      contact_phone TEXT,
      split_enabled INTEGER NOT NULL DEFAULT 1,
      transfers_enabled INTEGER NOT NULL DEFAULT 0,
      requirements_json TEXT,
      error_message TEXT,
      last_verified_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  await execute("CREATE INDEX IF NOT EXISTS idx_cafe_payment_accounts_cafe ON cafe_payment_accounts(cafe_id)");
  await execute("CREATE INDEX IF NOT EXISTS idx_cafe_payment_accounts_status ON cafe_payment_accounts(status)");
  await execute("CREATE INDEX IF NOT EXISTS idx_cafe_payment_accounts_acc ON cafe_payment_accounts(account_id)");

  await execute(`
    CREATE TABLE IF NOT EXISTS cafe_payment_account_audit_logs (
      id TEXT PRIMARY KEY,
      cafe_id TEXT NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      user_id TEXT,
      user_email TEXT,
      previous_status TEXT,
      new_status TEXT,
      details_json TEXT,
      created_at INTEGER NOT NULL
    )
  `);

  await execute("CREATE INDEX IF NOT EXISTS idx_cafe_payment_audit_cafe ON cafe_payment_account_audit_logs(cafe_id, created_at DESC)");
}

run();
