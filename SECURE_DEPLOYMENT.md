# CafeFlow Secure Production Deployment Procedure

**Target:** `app.cafeflow.fun` (Owner Application & POS Engine)  
**Deployment Target:** Cloudflare Workers + Cloudflare D1 + Cloudflare R2  
**Hardening Standard:** BLA Counter-REA Verified (Defense Score $\ge 90/100$)  

---

## 1. Prerequisites & Environment Check

Before initiating a production deployment:

1. **Node.js Environment:**
   Ensure Node.js 22.23.4+ or 24.x is active:
   ```bash
   node -v
   # Required: v22.23.4+ or v24.x (Active: v24.14.1)
   ```

2. **Cloudflare Authentication:**
   Verify Wrangler CLI is authenticated to the CafeFlow Cloudflare account:
   ```bash
   npx wrangler whoami
   ```

3. **Cloudflare Secrets Synchronization:**
   Ensure all production secrets are uploaded to Cloudflare Workers (never hardcoded in `wrangler.jsonc` `vars`):
   ```bash
   cd app.cafeflow.fun
   npm run secrets:cloudflare
   ```

---

## 2. Repeatable Production Build & Hardening Procedure

Deployments must follow the 8-stage gate pipeline:

```
[1. Clean] ──> [2. Next.js Build] ──> [3. OpenNext Cloudflare Package]
                                                 │
                                                 ▼
[6. Verify & Gate] <── [5. Apply BLA Shield] <── [4. Identify Artifacts]
         │
         ├──> [PASS] ──> [7. Deploy to Cloudflare] ──> [8. Post-Deploy Smoke Test]
         │
         └──> [FAIL] ──> [Rollback to Original] ──> [Abort with Exit 1]
```

### Complete One-Command Protected Deployment:
```bash
npm --prefix app.cafeflow.fun run deploy:protected
```

---

## 3. Step-by-Step Execution Details

### Step 1: Pre-Build Environment Sync
```bash
cd app.cafeflow.fun
node scripts/patch-protobuf.mjs
```
*Purpose:* Synchronizes `.env.production` into `.env.production.local` and applies compatibility patches for Cloudflare Workers unenv polyfills.

### Step 2: Build Next.js & OpenNext Cloudflare Worker
```bash
opennextjs-cloudflare build --dangerouslyUseUnsupportedNextVersion
```
*Artifacts Generated:*
- `.open-next/assets/`: Client-side assets and `_next/static/chunks/`
- `.open-next/worker.js`: Cloudflare Worker entrypoint
- `.open-next/server-functions/default/handler.mjs`: Server function runtime

### Step 3: Run Anti-REA Protection Pipeline
```bash
node scripts/anti-rea-pipeline.mjs
```
*What this automated script does:*
1. **Safety Backup:** Copies `.open-next/` to `.open-next.bak/` before making any modifications.
2. **Target Identification:** Locates all eligible production JavaScript bundles (`.open-next/assets/_next/static/chunks/**/*.js`) and the entrypoint (`.open-next/worker.js`).
3. **Applies BLA Adversarial Shield:** Injects number-theoretic opaque predicates, combinatorial string branching, and algorithmic tarpits using the project-specific seed stored in `.blarc`.
4. **Verifies Invariants:** Runs `bla verify` across shielded artifacts to ensure defense score $\ge 90/100$ and token amplification $\ge 10\times$.
5. **Syntax & Equivalence Gate:** Validates AST syntax using `node -c`.
6. **Safety Gate:** If any check fails, immediately restores from `.open-next.bak/` and exits with an error.

### Step 4: Deploy to Cloudflare Workers
Only after Step 3 passes verification:
```bash
npx wrangler deploy
```

---

## 4. Verification & Audit Commands

Run these commands anytime to audit production artifacts:

```bash
# 1. Check for accidental source map or symbol exposure
npx bla-agents inspect-release app.cafeflow.fun/.open-next/assets

# 2. Audit REA exposure score on a specific production bundle
npx bla-agents audit app.cafeflow.fun/.open-next/assets/_next/static/chunks/app/page-*.js

# 3. Verify Counter-REA invariants on protected build
node scripts/anti-rea-pipeline.mjs --verify-only
```

---

## 5. Emergency Rollback Procedure

If any issue arises in production after deployment:

### Instant Cloudflare Worker Rollback (Zero Rebuild Required):
Cloudflare Workers retains versioned deployments. To roll back to the previously active version:
```bash
cd app.cafeflow.fun
npm run rollback:app
```
*(Or via Wrangler CLI: `npx wrangler rollback`)*

### Local Build Rollback:
If a build fails verification during the hardening pipeline, the pipeline automatically restores `.open-next` from `.open-next.bak/`. To manually revert local artifacts:
```bash
cd app.cafeflow.fun
if (Test-Path .open-next.bak) {
  Remove-Item -Recurse -Force .open-next
  Copy-Item -Recurse .open-next.bak .open-next
  Write-Host "Restored original unhardened build."
}
```

---

## 6. Deployment Health Checklist

After deploying to production (`https://app.cafeflow.fun`):

- [ ] Owner login & session cookie issuance (`cafeflow_session`).
- [ ] Owner dashboard and real-time statistics load.
- [ ] POS terminal loads and cart calculation displays correct totals.
- [ ] Test order creation verifies server-side total calculation.
- [ ] Kitchen Display System (KDS) renders active tickets.
- [ ] Table QR ordering and customer session validation function smoothly.
- [ ] Wallet balance and transaction ledger display correctly.
- [ ] No browser console syntax errors or hydration failures.

