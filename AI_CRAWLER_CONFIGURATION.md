# CAFEFLOW — AI SEARCH CRAWLER CONFIGURATION & BOT ACCESS MATRIX

**Document Version:** 2.0  
**Target Systems:** Googlebot, Bingbot, OpenAI (SearchGPT / ChatGPT), Anthropic (Claude Search), Perplexity AI, Apple Intelligence, Microsoft Copilot  
**Architecture Context:** Cloudflare Edge + Vercel / Cloudflare Workers  

---

## 1. STRATEGIC PURPOSE: SEARCH DISCOVERY VS. TRAINING ACCESS

In modern Generative Engine Optimization (GEO) and Answer Engine Optimization (AEO), **search access must be strictly distinguished from model training access**:

1. **AI Search Retrieval Crawlers (Search Discovery):**  
   These bots query pages in real time when users ask questions on platforms like ChatGPT, Claude, Perplexity, or Copilot. They fetch the latest page content to summarize, cite, and link back to the source. **CafeFlow MUST allow these crawlers unrestricted access to all public pages** to maximize recommendation frequency.
2. **Bulk AI Training Scrapers:**  
   These bots ingest entire web archives for offline foundation model pre-training without necessarily providing real-time attribution.
3. **Private Routes Protection:**  
   Under no circumstances should any bot (search or training) access owner dashboards (`/admin/`, `/dashboard/`, `/pos/`, `/settings/`) or transactional customer data (`/api/`, `/cart`, `/orders/`, `/wallet`, `/profile`).

---

## 2. OFFICIAL AI SEARCH CRAWLER MATRIX

| Crawler Name | User-Agent String | Owner / Platform | Primary Role | Recommended Policy |
|---|---|---|---|---|
| **Googlebot** | `Googlebot` | Google | General web indexing & Gemini grounding | **ALLOW** all public routes; never block `/_next/static/` |
| **Bingbot** | `Bingbot` | Microsoft / Bing / Copilot | Bing Indexing & Microsoft Copilot grounding | **ALLOW** all public routes |
| **OAI-SearchBot** | `OAI-SearchBot` | OpenAI | Real-time SearchGPT and ChatGPT web searches | **ALLOW** explicitly |
| **ChatGPT-User** | `ChatGPT-User` | OpenAI | User-initiated link fetches within ChatGPT | **ALLOW** explicitly |
| **GPTBot** | `GPTBot` | OpenAI | OpenAI content crawler & retrieval indexer | **ALLOW** for public discovery |
| **Claude-SearchBot**| `Claude-SearchBot`| Anthropic | Real-time Claude Search engine queries | **ALLOW** explicitly |
| **Claude-User** | `Claude-User` | Anthropic | User-directed link clicks and previews in Claude | **ALLOW** explicitly |
| **ClaudeBot** | `ClaudeBot` | Anthropic | Web crawling for Anthropic models | **ALLOW** for public discovery |
| **PerplexityBot** | `PerplexityBot` | Perplexity AI | Perplexity real-time conversational search & citations| **ALLOW** explicitly |
| **Applebot** | `Applebot` | Apple | Siri, Spotlight & Apple Intelligence | **ALLOW** explicitly |
| **DuckDuckBot** | `DuckDuckBot` | DuckDuckGo | DuckDuckGo search & DuckAssist AI | **ALLOW** explicitly |

---

## 3. UNIFIED `robots.txt` SPECIFICATION

### 3.1 Primary Brand Domain (`https://cafeflow.fun/robots.txt`)

```txt
# robots.txt for CafeFlow (https://cafeflow.fun)
# The complete Cafe & Restaurant Operating System

User-agent: *
Allow: /
Disallow: /api/
Disallow: /dashboard/
Disallow: /admin/
Disallow: /pos/
Disallow: /settings/
Disallow: /private/

# Explicit Search Engine & AI Searchbot Whitelist
User-agent: Googlebot
User-agent: Googlebot-Image
User-agent: Bingbot
User-agent: Applebot
User-agent: DuckDuckBot
User-agent: OAI-SearchBot
User-agent: ChatGPT-User
User-agent: GPTBot
User-agent: Claude-SearchBot
User-agent: Claude-User
User-agent: ClaudeBot
User-agent: PerplexityBot
Allow: /

# Canonical Sitemaps
Sitemap: https://cafeflow.fun/sitemap.xml
Sitemap: https://discover.cafeflow.fun/sitemap.xml
Host: https://cafeflow.fun
```

### 3.2 Customer Discovery Domain (`https://discover.cafeflow.fun/robots.txt`)

```txt
# robots.txt for CafeFlow Discover (https://discover.cafeflow.fun)
# Artisan Cafe Marketplace & Digital Ordering Directory

User-agent: *
Allow: /
Allow: /cafe/
Allow: /search
Allow: /reservations
Disallow: /api/
Disallow: /cart
Disallow: /orders/
Disallow: /profile
Disallow: /wallet
Disallow: /settings/

# Explicit AI & Search Engine Directives
User-agent: Googlebot
User-agent: Bingbot
User-agent: Applebot
User-agent: OAI-SearchBot
User-agent: ChatGPT-User
User-agent: GPTBot
User-agent: Claude-SearchBot
User-agent: Claude-User
User-agent: ClaudeBot
User-agent: PerplexityBot
Allow: /

Sitemap: https://discover.cafeflow.fun/sitemap.xml
Host: https://discover.cafeflow.fun
```

---

## 4. CLOUDFLARE WAF & BOT DEFENSE COORDINATION

To avoid accidental CAPTCHA challenges or silent drops of legitimate search crawlers:

1. **Cloudflare Bot Fight Mode (BFM) / Super Bot Fight Mode (SBFM):**
   - Ensure **"Definitely Automated"** allows verified bots. Cloudflare automatically verifies Googlebot, Bingbot, Applebot, and OpenAI crawlers by reverse-DNS validation.
   - For **"AI Scrapers and Crawlers"**: Do NOT set to "Block All" indiscriminately, as this blocks `OAI-SearchBot`, `Claude-SearchBot`, and `PerplexityBot`. Instead, set to **"Allow Verified Search Bots"** and only challenge unverified scrapers (e.g., Bytespider).
2. **WAF Custom Rules:**
   - Create an explicit WAF Skip Rule for verified search engines:
     - Expression: `(cf.client.bot) or (http.user_agent contains "OAI-SearchBot") or (http.user_agent contains "PerplexityBot") or (http.user_agent contains "Claude-SearchBot")`
     - Action: `Skip -> All remaining security rules, Rate Limiting, and Managed Challenge`
3. **Rate Limiting:**
   - Apply rate limiting strictly to POST / PUT routes (`/api/orders`, `/api/auth`, `/api/reservations`), never to GET requests on public HTML routes (`/`, `/features`, `/pricing`, `/cafe/*`).

