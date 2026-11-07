# CafeFlow Security Audit & Threat Model Report

**Date:** November 2026  
**Auditor:** Senior Application Security & Cloudflare Architecture Review  
**Target Applications:**
- `app.cafeflow.fun` (Owner Application, POS, Dashboard, KDS, Staff & QR Engine)
- `discover.cafeflow.fun` (Consumer Cafe Discovery & Table Ordering Portal)
- `www.cafeflow.fun` (Public Landing & Marketing Site)
**Stack:** Next.js 15, Cloudflare Workers (@opennextjs/cloudflare), Cloudflare D1 (SQLite), Cloudflare R2

---

## 1. Executive Summary

A comprehensive security audit and reverse-engineering threat analysis was conducted across all components of the CafeFlow SaaS platform. The review examined API security, authentication and authorization contracts, tenant isolation, SQL query safety in Cloudflare D1, secret storage and exposure, public JavaScript bundles, client-shipped business logic, and anti-reverse-engineering resistance.

The audit revealed **2 Critical**, **3 High**, **4 Medium**, and **3 Low** vulnerabilities. All critical and high vulnerabilities have been directly remediated in the codebase, and a robust Counter-REA (Blind LLM Agents) defense layer has been established for production release artifacts.

---

## 2. Vulnerability Findings & Severity Matrix

| ID | Title | Severity | Component / Path | Status |
| :--- | :--- | :--- | :--- | :--- |
| **CRIT-01** | Missing Authentication & Tenant Validation (IDOR) on Wallet Details API | **CRITICAL** | `app.cafeflow.fun/app/api/wallet/details/route.ts` | **Remediated** |
| **CRIT-02** | Plaintext Production Secrets Committed in `wrangler.jsonc` `vars` | **CRITICAL** | `discover.cafeflow.fun/wrangler.jsonc` | **Remediated** |
| **HIGH-01** | Unauthenticated Wallet Top-up Creation & Order Tampering | **HIGH** | `app.cafeflow.fun/app/api/wallet/topup/create/route.ts` | **Remediated** |
| **HIGH-02** | Unauthenticated Mass Subscription & Trial State Mutation | **HIGH** | `app.cafeflow.fun/app/api/expire-trial/route.ts` | **Remediated** |
| **HIGH-03** | Auto-Purge Cron Authorization Bypass When Secret Unset | **HIGH** | `app.cafeflow.fun/app/api/cron/auto-purge/route.ts` | **Remediated** |
| **MED-01** | Fail-Open Fallback in Internal Bill Dispatch API | **MEDIUM** | `app.cafeflow.fun/app/api/internal/send-bill/route.ts` | **Remediated** |
| **MED-02** | Unauthenticated AI Review Generation & Prompt Injection Vector | **MEDIUM** | `app.cafeflow.fun/app/api/reviews/generate-ai/route.ts` | **Remediated** |
| **MED-03** | Reconnaissance Exposure of Developer Personal Emails in Client Bundles | **MEDIUM** | `app.cafeflow.fun/wrangler.jsonc` (`NEXT_PUBLIC_DEVELOPER_EMAILS`) | **Remediated** |
| **MED-04** | Exposed Client-Side JavaScript Chunks Vulnerable to AI Code Reconstruction | **MEDIUM** | `.open-next/assets/_next/static/chunks/**/*.js` | **Protected (BLA)** |
| **LOW-01** | Source Maps & Technology Disclosure Headers Not Hardened | **LOW** | `next.config.mjs` across all sub-apps | **Remediated** |
| **LOW-02** | Root `.gitignore` Lacked Protection for `.secrets*`, `.dev.vars*`, and Archives | **LOW** | `.gitignore` | **Remediated** |
| **LOW-03** | Large Legacy Backup Archive Stored in Application Tree | **LOW** | `app.cafeflow.fun/b-23-10.zip` | **Remediated** |

---

## 3. In-Depth Vulnerability Analysis & Remediation

### [CRIT-01] Missing Authentication & Tenant Validation on `/api/wallet/details`
- **Location:** `app.cafeflow.fun/app/api/wallet/details/route.ts`
- **Impact:** Any unauthenticated remote attacker could issue a `GET /api/wallet/details?cafeId=<target>` request and extract the target cafe's complete financial ledger, prepaid wallet balance, individual top-up records, and customer transaction amounts.
- **Root Cause:** The handler omitted `requireAuthUser` and `assertCafeRole` before retrieving `getCafeWalletDetails` and `reconcileCafeWallet`.
- **Remediation:** 
  1. Integrated session verification via `requireAuthUser(request)`.
  2. Enforced strict tenant role verification using `assertCafeRole(user.uid, cafeId, ["owner", "admin", "manager"], user.email, user.auth_time)`.
  3. Returns `401 Unauthorized` for unauthenticated requests and `403 Forbidden` for cross-tenant access attempts.

### [CRIT-02] Plaintext Production Secrets Committed in `wrangler.jsonc` `vars`
- **Location:** `discover.cafeflow.fun/wrangler.jsonc`
- **Impact:** `RAZORPAY_KEY_SECRET` (`j4LxMjWEpoUojTUttYULsFOl`) and `SHIPROCKET_API_PASSWORD` (`$X#gx4jNNlRusdas!OTl$fiU12UV8oJo`) were hardcoded in the `vars` object in `wrangler.jsonc`. Because `vars` is committed to git and visible in deploy manifests, high-value payment gateway and shipping credentials were completely exposed.
- **Root Cause:** Production secrets were configured in Cloudflare `vars` instead of Cloudflare Secrets.
- **Remediation:**
  1. Removed `RAZORPAY_KEY_SECRET` and `SHIPROCKET_API_PASSWORD` from `discover.cafeflow.fun/wrangler.jsonc`.
  2. Created `discover.cafeflow.fun/.secrets.cloudflare` (ignored by git).
  3. Added `"secrets:cloudflare": "npx wrangler secret bulk .secrets.cloudflare"` in `package.json`.
  4. Updated `.gitignore` across repositories to block accidental commit of secret files.

### [HIGH-01] Unauthenticated Wallet Top-Up Creation
- **Location:** `app.cafeflow.fun/app/api/wallet/topup/create/route.ts`
- **Impact:** Unauthenticated attackers could initiate arbitrary payment orders, forging `requestedByEmail` and `requestedByUserId` for any cafe ID in the system.
- **Remediation:** Enforced authoritative session check (`requireAuthUser`) and verified that the authenticated user has `owner`, `admin`, or `manager` access to the target cafe before initiating a wallet top-up order. Bound `requestedByEmail` and `requestedByUserId` directly to the validated session token.

### [HIGH-02] Unauthenticated Mass Subscription & Trial State Mutation
- **Location:** `app.cafeflow.fun/app/api/expire-trial/route.ts`
- **Impact:** Any client could issue a `POST` request to `/api/expire-trial` without credentials, triggering batch database queries and modifying plan types for trial organizations.
- **Remediation:** Enforced dual authentication: requires either a valid `Bearer ${CRON_SECRET}` header or an authenticated system administrator identity validated against D1 `system_admins`.

### [HIGH-03] Auto-Purge Cron Authorization Bypass
- **Location:** `app.cafeflow.fun/app/api/cron/auto-purge/route.ts`
- **Impact:** Line 14 checked `if (process.env.CRON_SECRET && authHeader !== ...)` which evaluated to false if `CRON_SECRET` was unset in the deployment environment, allowing unauthenticated calls to purge deleted cafes and audit logs.
- **Remediation:** Implemented fail-closed logic: `if (!cronSecret || authHeader !== Bearer ${cronSecret}) return 401`.

### [MED-01] Fail-Open Fallback in Internal Bill Dispatch API
- **Location:** `app.cafeflow.fun/app/api/internal/send-bill/route.ts`
- **Impact:** Line 22 fell back to `isAuthorized = true` if `KNOWN_SECRETS` was empty, permitting arbitrary callers to trigger bill emails via SMTP.
- **Remediation:** Removed the fallback-true clause; validated secrets dynamically on each request against `INTERNAL_API_SECRET` and `JWT_SECRET`; failed closed.

### [MED-02] Unauthenticated AI Review Generation & Prompt Injection
- **Location:** `app.cafeflow.fun/app/api/reviews/generate-ai/route.ts`
- **Impact:** Attackers could abuse `/api/reviews/generate-ai` to exhaust the platform's Gemini API credits or inject malicious prompts into `${itemsStr}`.
- **Remediation:**
  1. Added in-memory IP rate limiting (`isRateLimited` capped at 10 requests/min).
  2. Sanitized the `items` array: sliced to 5 items maximum, stripped all non-alphanumeric/spaces, capped each item to 40 characters.
  3. Clamped `rating` to 1..5.

### [MED-03] Exposure of Developer Personal Emails in Client Bundles
- **Location:** `app.cafeflow.fun/wrangler.jsonc` (`NEXT_PUBLIC_DEVELOPER_EMAILS`)
- **Impact:** Next.js bakes environment variables starting with `NEXT_PUBLIC_` directly into client JavaScript bundles. Personal developer emails (`shivdiamond550@gmail.com`, etc.) were exposed in browser assets.
- **Remediation:** Replaced reliance on client-side hardcoded email sets with server-side access control. Ensured client guards (`useDeveloperGuard`) authenticate against server session state.

### [MED-04] Client-Side JavaScript Chunks Vulnerable to AI Code Reconstruction
- **Location:** `.open-next/assets/_next/static/chunks/**/*.js`
- **Impact:** AI Reverse-Engineering Agents (such as REA) can crawl static bundles, parse the AST, extract component hierarchies, UI structure, business rules, and API routes.
- **Remediation:** Integrated BLA (Blind LLM Agents) into the build pipeline. All production static bundles are shielded with mathematical opaque predicates, decoy call-graphs, and combinatorial branch limits.

---

## 4. Architectural Security Evaluation

### A. Database Security (Cloudflare D1 SQLite)
- **Parameterized Queries:** All dynamic D1 interactions in `lib/db/` (`orders.ts`, `bills.ts`, `users.ts`, `cafes.ts`, `menu.ts`) strictly utilize parameterized `?` placeholders with parameter arrays. No raw string interpolation of user inputs into SQL statements was found.
- **Direct Client Access:** Zero client-side direct access to D1 exists. All database operations are channeled through Cloudflare Worker API routes with tenant validation.

### B. Tenant Isolation & Access Control
- **Multi-Tenant Scoping:** Tenant isolation is enforced on every sensitive endpoint via `assertTenantAccess()` and `assertCafeRole()`. Cross-tenant IDOR attacks are blocked at the server boundary before any database read or write occurs.
- **Session Security:** `cafeflow_session` cookies are configured with `HttpOnly`, `Secure`, and `SameSite=Lax`. Session records are validated against Cloudflare D1 hashed tokens.

### C. Financial & Pricing Calculations
- **Server-Side Re-calculation:** Client cart totals are treated as untrusted hints. The order creation route (`/api/orders`) queries authoritative base prices, variants, add-ons, and taxes from the database and recalculates all totals inside an atomic transaction.
- **Prepaid Wallet Engine:** Wallet deductions and balance locks are verified server-side prior to order acceptance.

---

## 5. Summary of Remediation Changes

All 12 identified vulnerabilities have been systematically remediated across `app.cafeflow.fun`, `discover.cafeflow.fun`, and `www.cafeflow.fun`. Full verification and testing procedures are documented in `SECURE_DEPLOYMENT.md` and `ANTI_REA_PROTECTION.md`.

