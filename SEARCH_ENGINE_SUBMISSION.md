# CAFEFLOW — MULTI-ENGINE SUBMISSION & SEARCH CRAWLER VERIFICATION GUIDE

**Document Version:** 2.0  
**Target Engines:** Google Search Console, Bing Webmaster Tools, IndexNow Protocol (Bing, Yandex, Seznam, Naver), OpenAI, Anthropic, Perplexity  

---

## 1. GOOGLE SEARCH CONSOLE (GSC) VERIFICATION & SUBMISSION

### 1.1 Property Setup & Domain Verification
CafeFlow operates two distinct public properties requiring individual GSC property records:
1. **Domain Property:** `cafeflow.fun` (Captures `cafeflow.fun`, `www.cafeflow.fun`, `discover.cafeflow.fun`, `app.cafeflow.fun`).
2. **URL Prefix Properties:**
   - `https://cafeflow.fun/`
   - `https://discover.cafeflow.fun/`

### 1.2 Verification Methods
* **Method 1: DNS TXT Record (Recommended via Cloudflare DNS)**
  - Name: `@`
  - Type: `TXT`
  - Value: `google-site-verification=[YOUR_GSC_TOKEN]`
* **Method 2: HTML Meta Tag**
  - Add to `<head>` via `app/layout.tsx`:
    ```tsx
    verification: {
      google: "google-site-verification-token",
    }
    ```

### 1.3 Sitemap Submissions in GSC
Submit the following XML sitemaps inside the GSC Sitemaps console:
* `https://cafeflow.fun/sitemap.xml`
* `https://discover.cafeflow.fun/sitemap.xml`

---

## 2. BING WEBMASTER TOOLS & MICROSOFT COPILOT

### 2.1 Verification
* **Meta Tag Verification:**  
  Present on `cafeflow.fun`:
  `<meta name="msvalidate.01" content="A7CA0FA8F6309FA8BB01C87968BB7D9B" />`
* **Authentication File:**  
  Present at `https://cafeflow.fun/BingSiteAuth.xml`
* **Copilot Grounding:** Bing Webmaster Tools directly feeds Microsoft Copilot. Verifying both `cafeflow.fun` and `discover.cafeflow.fun` ensures real-time Copilot answers include CafeFlow.

---

## 3. INDEXNOW PROTOCOL IMPLEMENTATION

IndexNow immediately notifies Microsoft Bing, Yandex, Seznam.cz, and Naver whenever URLs are published or updated, bypassing standard crawl delays.

### 3.1 Verification Key File
* **Key:** `e7a2b9f3c1d84e5692a0b4f8c3d1e7a5`
* **File Location 1:** `https://cafeflow.fun/e7a2b9f3c1d84e5692a0b4f8c3d1e7a5.txt`
* **File Location 2:** `https://discover.cafeflow.fun/e7a2b9f3c1d84e5692a0b4f8c3d1e7a5.txt`

### 3.2 Automated Submission Endpoint
An automated API route exists at `https://cafeflow.fun/api/indexnow`:
* **HTTP Method:** `POST`
* **Trigger via cURL:**
  ```bash
  curl -X POST https://cafeflow.fun/api/indexnow \
    -H "Content-Type: application/json"
  ```
* **Direct IndexNow API POST Request:**
  ```json
  POST https://api.indexnow.org/IndexNow
  Content-Type: application/json; charset=utf-8

  {
    "host": "cafeflow.fun",
    "key": "e7a2b9f3c1d84e5692a0b4f8c3d1e7a5",
    "keyLocation": "https://cafeflow.fun/e7a2b9f3c1d84e5692a0b4f8c3d1e7a5.txt",
    "urlList": [
      "https://cafeflow.fun",
      "https://cafeflow.fun/features",
      "https://cafeflow.fun/pricing",
      "https://cafeflow.fun/what-is-cafeflow",
      "https://cafeflow.fun/best-free-cafe-management-software",
      "https://cafeflow.fun/restaurant-management-software",
      "https://cafeflow.fun/free-restaurant-pos",
      "https://cafeflow.fun/qr-ordering-software",
      "https://cafeflow.fun/kitchen-display-system",
      "https://cafeflow.fun/restaurant-inventory-management-software",
      "https://cafeflow.fun/restaurant-billing-software"
    ]
  }
  ```

---

## 4. AI SEARCH CRAWLER MANUAL VERIFICATION TESTS

To verify that AI crawlers can fetch pages without being blocked by Cloudflare WAF:

```bash
# 1. Test OpenAI SearchBot
curl -I -A "OAI-SearchBot" https://cafeflow.fun/what-is-cafeflow

# 2. Test Anthropic Claude-SearchBot
curl -I -A "Claude-SearchBot" https://cafeflow.fun/best-free-cafe-management-software

# 3. Test PerplexityBot
curl -I -A "PerplexityBot" https://cafeflow.fun/pricing

# 4. Test Discover Cafe Page
curl -I -A "Googlebot" https://discover.cafeflow.fun
```
*Expected Response:* `HTTP/1.1 200 OK` (No 403 Forbidden, No 503, No Cloudflare Challenge interstitial).

