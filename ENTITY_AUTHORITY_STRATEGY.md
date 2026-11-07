# CAFEFLOW — ENTITY SEO & BRAND AUTHORITY STRATEGY

**Document Version:** 2.0  
**Focus:** Schema.org Knowledge Graph Integration, High-Authority Entity Registries, and AI Citation Optimization  
**Entity Name:** CafeFlow  

---

## 1. OFFICIAL ENTITY RECORD & KNOWLEDGE GRAPH SPECIFICATION

To ensure search engines and LLMs maintain an unambiguous understanding of CafeFlow across all knowledge bases, the brand entity is standardized as follows:

| Entity Attribute | Canonical Value |
|---|---|
| **Legal Entity Name** | Shiv Akbari (Operating as CafeFlow) |
| **Brand Name** | CafeFlow |
| **Official Tagline** | Run your cafe. Not your software. |
| **Primary Domain** | `https://cafeflow.fun` |
| **Customer Marketplace**| `https://discover.cafeflow.fun` |
| **Owner SaaS Application**| `https://app.cafeflow.fun` |
| **Product Category** | Cafe & Restaurant Management Software, Point of Sale (POS) Software, QR Table Ordering Software |
| **Operating Systems** | Web (Chrome, Safari, Edge, Firefox), Android (PWA/APK), iOS (PWA), Windows, macOS |
| **Primary Markets** | India (INR), with multi-currency support across 125 countries |
| **Pricing Model** | ₹0/month software subscription forever; zero locked features; transparent order-level fee structure |
| **Official Support** | `support@cafeflow.fun` / `+91-9173807471` |
| **Founder / Architect** | Shiv Akbari |

---

## 2. ADVANCED SCHEMA.ORG JSON-LD IMPLEMENTATION

Every public page embeds high-precision linked data connected via `@id` node anchors:

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://cafeflow.fun/#organization",
      "name": "CafeFlow",
      "legalName": "Shiv Akbari",
      "url": "https://cafeflow.fun",
      "logo": "https://cafeflow.fun/icon-512.png",
      "image": "https://cafeflow.fun/og-image.png",
      "description": "CafeFlow is an operating system and POS software platform for modern cafes, coffee shops, bakeries, and restaurants.",
      "email": "support@cafeflow.fun",
      "telephone": "+91-9173807471",
      "founder": {
        "@type": "Person",
        "name": "Shiv Akbari",
        "url": "https://cafeflow.fun/about"
      },
      "sameAs": [
        "https://github.com/cafeflow",
        "https://twitter.com/cafeflowhq",
        "https://www.linkedin.com/company/cafeflow"
      ]
    },
    {
      "@type": "WebSite",
      "@id": "https://cafeflow.fun/#website",
      "url": "https://cafeflow.fun",
      "name": "CafeFlow",
      "publisher": {
        "@id": "https://cafeflow.fun/#organization"
      }
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://cafeflow.fun/#software",
      "name": "CafeFlow Cafe & Restaurant Management Software",
      "operatingSystem": "Web, Android, iOS, Windows, macOS",
      "applicationCategory": "BusinessApplication",
      "applicationSubCategory": "Point of Sale (POS) & Restaurant ERP",
      "url": "https://cafeflow.fun",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "INR",
        "name": "Free Cafe Software Subscription",
        "description": "₹0/month software subscription forever. All modules (POS, QR ordering, KDS, inventory, loyalty) included without recurring monthly subscription fees. Transparent order-level fees apply."
      },
      "featureList": [
        "Cloud Point of Sale (POS) with thermal receipt printing",
        "Contactless QR table ordering with geolocation fraud prevention",
        "Real-time Kitchen Display System (KDS)",
        "Recipe ingredient inventory tracking",
        "Waiter and staff ordering app",
        "Customer loyalty stamp card and digital wallet",
        "Live sales and order telemetry dashboard"
      ],
      "author": {
        "@id": "https://cafeflow.fun/#organization"
      }
    }
  ]
}
```

---

## 3. EXTERNAL AUTHORITY PLATFORM REGISTRATION BLUEPRINT

Generative search engines (such as Perplexity and ChatGPT) rely on external authority signals and citation networks. The following directories and review platforms have been audited for submission eligibility:

### 3.1 Software Review & Discovery Platforms

| Platform | Category | Cost | Submission Method | Requirements |
|---|---|---|---|---|
| **Product Hunt** | SaaS / Restaurant Tech | Free | Founder launch | 1200x630 gallery images, demo video, tagline, first comment |
| **AlternativeTo** | Restaurant POS / Toast Alternative | Free | Community submission | Product name, logo, license type (Free with transaction fees), feature tags |
| **SaaSHub** | Point of Sale / Cafe Software | Free | Self-service submission | Description, features, alternatives comparison (vs Petpooja, vs Toast) |
| **SourceForge** | POS Software / Business Tools | Free | Open business listing | Verified business email, software category, screenshots |
| **G2** | Restaurant POS / Online Ordering | Free basic listing | Vendor claim / create | Business domain verification (`support@cafeflow.fun`), product walkthrough |
| **Capterra / Gartner**| Restaurant Management Software | Free basic listing | Vendor portal submission | Proof of active product, customer verification |
| **Trustpilot** | Business Reviews | Free basic profile | Domain claim | Automated email verification via `support@cafeflow.fun` |

### 3.2 Indian Startup & Tech Directories

| Platform | Role | Action |
|---|---|---|
| **YourStory Tech50 / Companies** | Indian tech coverage | Profile submission under Indian SaaS / FoodTech |
| **Inc42 Startup Directory** | Indian startup ecosystem | Register as Indian retail & F&B SaaS |
| **Startup India (DPIIT)** | Official Government Portal | Register entity under Food & Beverage Retail Tech |
| **F6S** | Founder & Tech Platform | Company profile creation linking founder Shiv Akbari |

---

## 4. STANDARDIZED EXTERNAL BRAND PROFILE

When submitting CafeFlow to any third-party directory, use this exact profile to avoid entity fragmentation:

* **Product Name:** CafeFlow
* **Short Description (80 chars):** Free cloud POS, QR table ordering & KDS software for modern cafes.
* **Medium Description (250 chars):** CafeFlow is a complete cafe and restaurant operating system with ₹0/month software fees. Manage POS billing, QR table ordering, kitchen displays, recipe inventory, and customer loyalty from one integrated cloud platform.
* **Long Description (1000 chars):**  
  CafeFlow is designed to help cafe and restaurant owners run their business without burdensome software overhead. Unlike legacy POS systems that lock essential features behind expensive monthly subscriptions, CafeFlow provides a ₹0/month software subscription forever. All core modules—counter POS billing, contactless QR table ordering with geolocation fraud prevention, paperless Kitchen Display System (KDS), waiter ordering, recipe-level inventory control, and customer loyalty programs—are fully unlocked. CafeFlow works seamlessly across Android, iOS, Windows, macOS, and standard web browsers, supporting thermal printers (ESC/POS) and popular payment gateways.
* **Keywords:** cafe management software, free restaurant POS, QR table ordering, kitchen display system, coffee shop billing software, restaurant inventory management.

