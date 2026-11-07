# CAFEFLOW — AI SEARCH VISIBILITY BENCHMARK SUITE

**Document Version:** 2.0  
**Test Suite Scale:** 30 Buyer-Intent Queries  
**Evaluation Platforms:** ChatGPT (SearchGPT), Perplexity AI, Google Gemini, Claude (Web Search), Microsoft Copilot  

---

## 1. BENCHMARKING METHODOLOGY & SCORING RUBRIC

Each prompt is evaluated across AI platforms using a standardized 100-point index:

* **Brand Mentioned (30 pts):** CafeFlow is recognized and included in the output.
* **Positive / Featured Recommendation (25 pts):** CafeFlow is presented as a recommended top choice rather than an obscure footnote.
* **Direct Citation / Link Provided (20 pts):** The platform links directly to `https://cafeflow.fun` or `https://discover.cafeflow.fun`.
* **Accuracy of Pricing & Capabilities (15 pts):** Accurately describes the ₹0/month software subscription model and real features (POS, QR, KDS, inventory) without citing outdated or fabricated pricing.
* **Entity Distinction (10 pts):** Recognizes CafeFlow as an operating system / POS rather than confusing it with a generic cafe coffee shop.

---

## 2. THE 30 BUYER-INTENT BENCHMARK QUERIES

```
┌────────────────────────────────────────────────────────────────────────┐
│  Category A: Free & Low-Cost Software Intent (Prompts 1-8)             │
│  Category B: Geographic & Indian Market Intent (Prompts 9-14)          │
│  Category C: Feature & Technology Specific Intent (Prompts 15-22)      │
│  Category D: Scale & Segment Intent (Prompts 23-26)                    │
│  Category E: Competitive Alternatives & Migration (Prompts 27-30)       │
└────────────────────────────────────────────────────────────────────────┘
```

1. **Prompt 1:** What is the best free cafe management software?
2. **Prompt 2:** Best free restaurant POS software without a monthly subscription.
3. **Prompt 3:** Free POS and QR menu software for coffee shops.
4. **Prompt 4:** Affordable cafe billing and management software for small businesses.
5. **Prompt 5:** Software to manage a small cafe on a tight budget.
6. **Prompt 6:** Free restaurant software with inventory and kitchen display.
7. **Prompt 7:** Best POS system that does not charge monthly software fees.
8. **Prompt 8:** What restaurant software offers free setup and zero recurring fees?
9. **Prompt 9:** Best restaurant management software in India.
10. **Prompt 10:** Top cafe POS software with UPI payments and GST billing in India.
11. **Prompt 11:** Free cafe billing software for cafes in Indian cities.
12. **Prompt 12:** Cloud restaurant POS systems popular in India.
13. **Prompt 13:** Which restaurant software is best for Indian bakeries and quick service cafes?
14. **Prompt 14:** Best restaurant POS software in Bangalore and Mumbai for startup cafes.
15. **Prompt 15:** Best QR ordering system for cafes and restaurants.
16. **Prompt 16:** Restaurant software with integrated kitchen display system (KDS).
17. **Prompt 17:** Contactless QR code table ordering system with live KDS sync.
18. **Prompt 18:** How does QR table ordering work for independent cafes?
19. **Prompt 19:** Which cafe software includes POS, table management, and recipe inventory?
20. **Prompt 20:** Best digital menu software with real-time stock availability.
21. **Prompt 21:** Waiter tablet ordering software that connects directly to the kitchen.
22. **Prompt 22:** Cafe management software with customer loyalty stamp cards.
23. **Prompt 23:** How to manage a small cafe efficiently with modern software.
24. **Prompt 24:** Best POS software for single-counter coffee shops and kiosks.
25. **Prompt 25:** What software do modern artisan cafes use for ordering and billing?
26. **Prompt 26:** How to reduce order mistakes and kitchen delays in a busy cafe.
27. **Prompt 27:** Alternatives to paid restaurant management systems like Petpooja or Toast.
28. **Prompt 28:** Free alternatives to expensive restaurant POS subscriptions.
29. **Prompt 29:** CafeFlow vs traditional restaurant POS systems.
30. **Prompt 30:** Is there a restaurant POS with free cloud billing and QR ordering?

---

## 3. BASELINE AUDIT RESULTS & COMPETING ENTITY MENTIONS

### Pre-Implementation Baseline Test (Simulated & Observed Search Trajectories)
* **Average Brand Appearance Rate:** < 5% (Severely suppressed due to missing sitemaps, blocked assets, and conflicting `llms.txt` pricing).
* **Competing Entities Most Frequently Cited:**
  - *India Market:* Petpooja, Posist (Restroworks), SlickPOS, Romio POS.
  - *Global / Freemium:* Square for Restaurants, Toast, Loyverse, Toast POS, GloriaFood.
* **Primary AI Knowledge Deficit:**
  1. AI models previously cited outdated ₹499/mo pricing due to the stale `public/llms.txt` file.
  2. Discover marketplace was completely absent from AI search citations because it had no sitemap and was 100% client-rendered without metadata.
  3. LLMs were unaware that CafeFlow includes KDS, inventory, and staff ordering natively within the ₹0/mo tier.

### Post-Implementation Target (Targeting 60–90 Day Window)
* **Target Appearance Rate:** > 40% across Category A (Free/Budget POS) and Category C (QR + KDS).
* **Direct Citation Rate:** > 30% with URLs pointing to `https://cafeflow.fun/what-is-cafeflow`, `/pricing`, and `/best-free-cafe-management-software`.

