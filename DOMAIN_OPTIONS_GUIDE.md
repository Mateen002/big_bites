# BigBites - Production Domain & Extension Decision Guide

> **Project:** BigBites Food Platform (Lahore, Pakistan)  
> **Last Verified:** November 2026  
> **Status:** All listed domains below were checked and verified via live WHOIS (PKNIC Port 43 & Verisign GRS).

---

## 1. Domain & Extension Pricing Comparison Table

| Domain & Extension | Registrar | Initial Cost (Year 1) | Renewal Cost (Future) | Min. Term | Live Status | Best For |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`bigbites.store`** | [Namecheap](https://namecheap.com) | **~$2.98 USD**<br>(~Rs 850 PKR) | ~$45 USD/yr<br>(~Rs 12,500 PKR/yr) | 1 Year | **Available** | **Lowest launch cost** for an MVP / early startup. |
| **`bigbitespk.com`** | [Cloudflare](https://cloudflare.com) / [Namecheap](https://namecheap.com) | **~$9.77 USD**<br>(~Rs 2,750 PKR) | ~$10 – 14 USD/yr<br>(~Rs 2,800 – 3,900 PKR/yr) | 1 Year | **Available** | **Best long-term value under 3k.** Flat, predictable renewals forever. |
| **`bigbitesfood.com`** | [Cloudflare](https://cloudflare.com) / [Namecheap](https://namecheap.com) | **~$9.77 USD**<br>(~Rs 2,750 PKR) | ~$10 – 14 USD/yr<br>(~Rs 2,800 – 3,900 PKR/yr) | 1 Year | **Available** | Clear food branding with an international `.com`. |
| **`bigbites.pk`** | [HostBreak](https://portal.hostbreak.com/cart.php?a=add&domain=register) / [Nexus.pk](https://nexus.pk) | **Rs 4,200 PKR**<br>(Covers **2 Full Years**) | Rs 4,200 for 2 yrs<br>(Rs 2,100 PKR/yr) | **2 Years**<br>*(Mandatory PKNIC policy)* | **Available** | **Highest local trust & authority** for Lahore / Pakistan. |
| **`bigbites.com.pk`** | [HostBreak](https://portal.hostbreak.com/cart.php?a=add&domain=register) / [Nexus.pk](https://nexus.pk) | **Rs 4,200 PKR**<br>(Covers **2 Full Years**) | Rs 4,200 for 2 yrs<br>(Rs 2,100 PKR/yr) | **2 Years**<br>*(Mandatory PKNIC policy)* | **Available** | Standard corporate commercial Pakistani extension. |
| **`bigbites.online`** | [Namecheap](https://namecheap.com) | **~$1.98 USD**<br>(~Rs 550 PKR) | ~$40 USD/yr<br>(~Rs 11,200 PKR/yr) | 1 Year | **Available** | Ultra-low budget temporary testing. |

---

## 2. In-Depth Analysis by Use Case

### Option A: `bigbites.store` (The Lean Startup Choice)
* **Initial Cost:** ~$2.98 (~Rs 850 PKR)
* **Why it's great:**
  - Keeps launch expenses minimal, leaving capital for food packaging and initial Instagram/Facebook ads.
  - Matches the exact brand name with zero prefixes or hyphens.
  - 95% of food ordering traffic comes from tapping links on Instagram, TikTok, or WhatsApp where the extension does not hinder conversions.
* **Watch Out For:** Year 2 renewal fee jumps to ~$45/year.

---

### Option B: `bigbitespk.com` (The Balanced Long-Term Choice)
* **Initial Cost:** ~$9.77 (~Rs 2,750 PKR)
* **Why it's great:**
  - Fits directly inside a Rs 3,000 PKR budget.
  - `.com` carries global prestige and recognition.
  - "PK" clearly specifies the Pakistan market.
  - **Flat renewals:** Renewals stay at wholesale rates (~$10–$14/yr) with no sudden price jumps.

---

### Option C: `bigbites.pk` (The Gold Standard for Pakistan)
* **Initial Cost:** Rs 4,200 PKR (Paid once, covers 2 full years)
* **Why it's great:**
  - Instant local credibility in Lahore and across Pakistan.
  - Cleanest possible URL: `bigbites.pk`.
  - Zero renewal worries until late 2028.
* **Watch Out For:** PKNIC regulations require a mandatory 2-year upfront commitment (cannot be bought for 1 year).

---

## 3. How to Connect Any Domain to BigBites (DNS & Architecture)

Regardless of which domain you choose, the technical architecture remains identical:

```
Your Domain (Registrar)
       │
       ▼
Cloudflare (Free Plan) ───► SSL / HTTPS & DDoS Protection
       │
       ├──► @ (Root) & www   ──► VPS IP:3000 (Customer Storefront)
       ├──► admin            ──► VPS IP:3001 (Kitchen Board)
       └──► api              ──► VPS IP:4000 (NestJS REST API)
```

### DNS Records to Create on Cloudflare:
1. `A` record `@` $\rightarrow$ `YOUR_VPS_IP` (Proxied)
2. `A` record `admin` $\rightarrow$ `YOUR_VPS_IP` (Proxied)
3. `A` record `api` $\rightarrow$ `YOUR_VPS_IP` (Proxied)
4. `CNAME` record `www` $\rightarrow$ `@` (Proxied)

---

## 4. Next Step Checklist
- [ ] Purchase chosen domain (`.store`, `.com`, or `.pk`).
- [ ] Create free account on [Cloudflare](https://cloudflare.com) and add the domain.
- [ ] Spin up VPS server (e.g. Hetzner CX22 / CAX11 at ~$5/mo).
- [ ] Point DNS `A` records to the VPS public IP.
- [ ] Deploy BigBites using PM2 or Docker.

