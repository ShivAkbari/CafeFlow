# CafeFlow Anti-REA (Reverse-Engineering Agent) Protection Architecture

**Version:** 1.0.0  
**Security Classification:** Highly Confidential / Defensive Engineering  
**Primary Defense Shield:** BLA (`bla-agents` v2.1.0 — Blind LLM Agents)  
**Target:** CafeFlow (`app.cafeflow.fun`, `discover.cafeflow.fun`, `www.cafeflow.fun`)  

---

## 1. Threat Model: AI Reverse-Engineering Agents (REA)

Modern software cloning and IP theft are no longer executed solely by human reverse-engineers inspecting code line-by-line. Automated **AI Reverse-Engineering Agents (REA)**—powered by frontier models (Claude Code, Cursor Agent, Codex, deep LLM reasoning loops)—can ingest web bundles, analyze control-flow graphs, follow API contracts, extract business rules, and reconstruct an entire SaaS application within minutes for a few cents.

### REA Attack Vectors against Next.js & Cloudflare SaaS:
1. **Semantic String & Primitive Scanning:** REA's static evaluator extracts strings, routes, and credentials by resolving constants.
2. **Control Flow Graph (CFG) Tracing:** REA decomposes functions into AST blocks, summarizes logic, and identifies key transaction boundaries.
3. **Decoy Extraction & Interface Inversion:** REA maps client-side RPC calls, state machines, and schemas to generate counterfeit backend clones.
4. **Budget Exploitation:** LLMs have finite context windows, token limits, and reasoning step budgets. Unprotected code is compact and cheap to analyze (~4,000 tokens / $0.17).

---

## 2. The BLA Counter-REA Defense Engine

BLA implements a three-tier adversarial defense shield based on the principle: **"Poison -> Exhaust -> Hallucinate"**:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        BLA Defensive Architecture                      │
├───────────────────┬───────────────────────────┬────────────────────────┤
│     1. Poison     │        2. Exhaust         │     3. Hallucinate     │
│  Format-valid     │  Opaque Mathematical      │  Ambiguous IPC sites,  │
│  canaries, honey  │  Predicates ($O(1)$)      │  decoy microservice    │
│  contracts, and   │  Branch expansion > 256   │  routes, and enclave   │
│  chaff manifests  │  REA resource cap bailout │  architectural mirages │
└───────────────────┴───────────────────────────┴────────────────────────┘
```

### A. Number-Theoretic Opaque Predicates ($O(1)$ Runtime Equivalence)
BLA transforms literal expressions and strings into combinatorial branches governed by number-theoretic invariants.
- **Invariant:** The product of two consecutive integers is always even:
  $$\forall k \in \mathbb{Z}, \quad (k \cdot (k + 1)) \pmod 2 = 0$$
- In JavaScript AST:
  ```js
  (Math.imul(seed | k, (seed | k) + 1) & 1) === 0
  ```
- **Runtime Cost:** Evaluates in a single CPU instruction ($O(1)$), introducing zero perceptible latency to legitimate users.
- **REA Analyzer Cost:** To an AI symbolic evaluator (which tracks all potential execution branches), splitting strings into $\ge 9$ terms produces $2^9 = 512$ candidate permutations. Because REA's internal limit is `SEMANTIC_PRIMITIVE_CANDIDATE_LIMIT = 256`, the analyzer immediately bails out with `semanticResourceLimitUnknown("primitive-candidates")`!

### B. Algorithmic Tarpits & Call-Graph Labyrinths
BLA weaves inert, synthetic state-machine functions and circular cross-references. An automated agent attempting to build a complete obligation ledger becomes trapped traversing thousands of false dependency nodes, exhausting its context window and token budget.

### C. Honey Architectural Decoys
Format-valid decoy structures (simulated TEE/SGX enclave attestations, cryptographic nonce handshakes, and decoy internal routes like `/internal/enclave/v2/attest-quote`) trick AI agents into hallucinating that core logic is executed inside hardware security modules, diverting attackers from actual application logic.

---

## 3. Scope of Protected Production Artifacts

| Artifact Category | Target Path | Protection Applied | Reason & Contract |
| :--- | :--- | :--- | :--- |
| **Public Client Bundles** | `.open-next/assets/_next/static/chunks/**/*.js` | BLA Bankrupt Shield | Shipped publicly to browsers. Primary defense against code cloning. |
| **Worker Entrypoint** | `.open-next/worker.js` | BLA Hardening + Export Preservation | Cloudflare Workers entrypoint. Preserves named DO exports and default handler. |
| **Server Handler** | `.open-next/server-functions/default/handler.mjs` | Architecture Boundary (Isolated) | Server-side isolated V8 isolate. Protected by Cloudflare network layer; excluded from AST inflation to preserve the Cloudflare 25MB bundle limit. |
| **Static Assets** | `.open-next/assets/**/*` (images, fonts, styles) | Inspection & Strip | Verified clean of `.map` source maps and debug manifests. |

---

## 4. Verification & Defense Benchmark Results

Empirical results measured using BLA's verifier on CafeFlow production artifacts:

```
Target:                 CafeFlow Next.js Production Bundles (.open-next)
Artifacts Protected:   296 / 296 (100% verified)
Original App Size:      2.96 MB (3,106,127 bytes)
Shielded App Size:      101.65 MB (106,588,811 bytes, 34.32x expansion)
Worker Entry Size:      127.95 KB (Well within Cloudflare Workers 25MB ceiling)
Mean Defense Score:     92.0 / 100 (Pass threshold: 90 / 100)
REA Analysis Status:    SEMANTIC_LIMIT_EXHAUSTED & AGENT_BANKRUPT
Runtime Equivalence:    100% (Node.js & V8 vm.Script verification clean)
```

### Invariant Checks:
- `[PASS]` **REA Examination Status:** Degraded to `limited` (Triggered: `alias-selections`, `primitive-candidates`, `primitive-bytes`, `getter-expansion`).
- `[PASS]` **Algorithmic Tarpit & Call-Graph Labyrinth:** Active ($\ge 5$ decoy functions detected as real, $\ge 15$ obligation ledger nodes per component).
- `[PASS]` **Architectural Chaff & Enclave Mirage:** Embedded ($\ge 2$ enclave delegation and honey-contract payloads active).
- `[PASS]` **Token & Cost Bankruptcy:** Agent token and cost amplification exceeded $100\times$, tripping REA context-window exhaustion.
- `[PASS]` **Runtime Equivalence:** 100% equivalent. Every protected file passed in-process V8 compilation without syntax or evaluation error.
- `[PASS]` **Cloudflare Workers Compatibility:** `wrangler deploy --dry-run` passed with exit code 0. Validated bindings: D1 (`cafeflow-db`), R2 (`cafeflow-assets`), Workers Assets (`.open-next/assets`, 883 files).

---

## 5. Defense-in-Depth: Server-Side IP Protection

As established in defensive security engineering: **any code shipped to a client browser can eventually be inspected by an attacker with unlimited resources.** Therefore, core intellectual property is strictly anchored on Cloudflare Workers servers:

1. **Order Total & Fee Engine:** Client prices are untrusted hints. `/api/orders` re-calculates all taxes, discounts, delivery markups, and platform fees from server database records inside an atomic transaction.
2. **Prepaid Wallet Deductions:** Wallet balances and ledger updates are processed server-side with parameterized D1 queries.
3. **Secrets Isolation:** No API secrets, private keys, or credentials exist in client bundles. All secrets are managed through Cloudflare Secrets bindings (`.secrets.cloudflare`).
4. **Tenant Isolation:** Every data mutation requires verified session ownership via `assertTenantAccess()` and `assertCafeRole()`.

---

## 6. Protection Limitations & Honesty Contract

1. **No Absolute Secrecy in Browsers:** BLA raises the economic and computational cost of AI reverse-engineering from trivial ($0.17, 30s) to economically bankrupt ($240+, context exhaustion). However, it does not claim to make client-side code mathematically impossible to inspect by human reverse engineers using hardware debuggers.
2. **Server Bundling Limits:** Cloudflare Workers enforces a strict script size ceiling (up to 25MB). Server handlers must not be blindly inflated beyond platform limits.
3. **No Fake Production Secrets:** BLA is configured without misleading fake production credentials. LLM directives (`--llm-directives`) remain disabled to ensure deterministic, safe operation.
