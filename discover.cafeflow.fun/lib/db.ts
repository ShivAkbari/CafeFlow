/**
 * Cloudflare D1 Client Adapter for Discover
 * Seamlessly connects to cafeflow-db (c852877d-9557-4607-90dd-33f1c89569b0)
 * Works both locally (via D1 REST API) and in production (via Cloudflare OpenNext DB binding)
 */

const DEFAULT_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || process.env.R2_ACCOUNT_ID || "e1b6dfb0739cd186459c8b8c54ad68a0";
const DEFAULT_DATABASE_ID = process.env.D1_DATABASE_ID || "c852877d-9557-4607-90dd-33f1c89569b0";

function getCloudflareApiToken(): string {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token) {
    throw new Error(
      "Cloudflare D1 Connection Error: Missing CLOUDFLARE_API_TOKEN. Set in .env.local to access remote D1 database."
    );
  }
  return token.trim();
}

async function getNativeBinding(): Promise<any> {
  if (process.env.NODE_ENV === "development") {
    return null;
  }
  const g = globalThis as any;
  if (g.DB && typeof g.DB.prepare === "function") return g.DB;
  if (g.__env?.DB && typeof g.__env.DB.prepare === "function") return g.__env.DB;
  if (g.cloudflare?.env?.DB && typeof g.cloudflare.env.DB.prepare === "function") return g.cloudflare.env.DB;
  if (g.__cloudflare_context__?.env?.DB && typeof g.__cloudflare_context__.env.DB.prepare === "function") return g.__cloudflare_context__.env.DB;

  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const ctx = await getCloudflareContext({ async: true });
    const env = ctx?.env as any;
    if (env?.DB && typeof env.DB.prepare === "function") {
      return env.DB;
    }
  } catch {}

  return null;
}

/**
 * Execute SQL query via Cloudflare D1 REST API (Localhost / Node environment)
 */
async function executeRemoteRest(sql: string, params: any[] = []): Promise<any> {
  const accountId = DEFAULT_ACCOUNT_ID;
  const databaseId = DEFAULT_DATABASE_ID;
  const token = getCloudflareApiToken();

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      sql,
      params
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cloudflare D1 REST query failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(`Cloudflare D1 error: ${JSON.stringify(data.errors)}`);
  }

  const firstResult = data.result?.[0];
  return {
    results: firstResult?.results || [],
    success: true,
    meta: firstResult?.meta || {}
  };
}

export async function d1Query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const binding = await getNativeBinding();
  if (binding) {
    const stmt = binding.prepare(sql).bind(...params);
    const { results } = await stmt.all();
    return (results as T[]) || [];
  }
  const res = await executeRemoteRest(sql, params);
  return (res.results as T[]) || [];
}

export async function d1QueryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await d1Query<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export async function d1Exec(sql: string, params: any[] = []): Promise<{ success: boolean; changes?: number }> {
  const binding = await getNativeBinding();
  if (binding) {
    const stmt = binding.prepare(sql).bind(...params);
    const result = await stmt.run();
    return { success: result.success, changes: result.meta?.changes };
  }
  const res = await executeRemoteRest(sql, params);
  return { success: res.success, changes: res.meta?.changes };
}
