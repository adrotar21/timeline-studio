# Timeline Studio — Monetization, Licensing & Documentation Plan

## Context

Timeline Studio (v0.44.27) has been validated by beta testers and is generating internal recognition. Adam received Lemon Squeezy approval and is ready to monetize. This plan covers three areas:

1. **License Key Integration** — Lemon Squeezy license validation in the app
2. **Pricing & Monetization Strategy** — Whether to charge from day 1 vs. beta-first
3. **Documentation & Training** — Video series structure and docs page on timelinestudio.io

---

## Part 1: License Key Integration (Code Changes)

### 1.1 Lemon Squeezy Fulfillment — How It Works

**What "Fulfillment" means in your Lemon Squeezy context:**
- Lemon Squeezy is the **Merchant of Record** — they handle payments, taxes, refunds
- "Fulfillment" = what the buyer gets instantly after purchase. Manish's note ("everything must be download ready the second the buyer clicks purchase") means: **no manual steps after checkout**
- For Timeline Studio, fulfillment = **automatic license key delivery via email**. The buyer pays → Lemon Squeezy generates a license key → buyer receives it via email → enters it in the app → features unlock. Zero manual intervention.

**How it connects your app to Lemon Squeezy:**
1. You create **Products** in Lemon Squeezy (one per tier: Boardroom, Execution)
2. Each product has **Variants** (annual subscription)
3. When someone buys, Lemon Squeezy generates a **license key** tied to that variant
4. Your app calls Lemon Squeezy's **License Validation API** (`POST https://api.lemonsqueezy.com/v1/licenses/validate`) with the key
5. The API returns: validity, product/variant info, expiration, activation count
6. Your app maps the variant to a tier and unlocks features

### 1.2 Settings UI — New "License" Section

Add **"License"** as the **first nav item** in the Settings modal (before "Project").

**Files to modify:**
- `index.html` — Add nav link + section HTML (~lines 361-376)
- `app.js` — Add license validation logic, feature gating, settings population
- `styles.css` — Add license-specific styles (status badge, tier card)

**UI Layout:**
```
┌─ License ─────────────────────────────────┐
│                                            │
│  Current Plan                              │
│  ┌──────────────────────────────────────┐  │
│  │ ★ Boardroom          Active          │  │
│  │   Expires: Mar 10, 2027              │  │
│  │   Key: ****-****-****-A3F2           │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  License Key                               │
│  ┌──────────────────────────────────────┐  │
│  │ [Enter license key...          ] [▶] │  │
│  └──────────────────────────────────────┘  │
│  [Deactivate]                              │
│                                            │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │
│  Free plan: 5 swimlanes, 25 items,        │
│  watermarked export                        │
│  Upgrade → timelinestudio.io/pricing       │
│                                            │
└────────────────────────────────────────────┘
```

**For Free tier users:** Shows "Free Plan" with limits summary and upgrade link.
**For Licensed users:** Shows tier name, expiry, masked key, and deactivate button.
**For Beta users:** Shows "Beta Access" badge with note about upcoming transition.

### 1.3 License Validation Flow

```
App loads → init()
  ├─ Check localStorage for cached license (tls3_license)
  ├─ If cached & not expired → use cached tier (instant, no network)
  ├─ If cached but stale (>3 days since last check) → background revalidate
  │   ├─ API call succeeds → update cache
  │   └─ API call fails (offline) → keep using cached tier (grace period)
  └─ If no cache → free tier

User enters key in Settings:
  ├─ POST to Lemon Squeezy validate API
  ├─ Success → activate instance, cache response, set tier, toast "Activated!"
  └─ Failure → show error message (invalid key, expired, etc.)
```

**Key design principles:**
- **Offline-first**: Never lock out a user because of network issues
- **Grace period**: Cached license valid for 30 days without revalidation
- **Single API call**: Only external network call in the entire app
- **No phone-home on every action**: Validate on load (if stale) and on key entry only

### 1.4 localStorage Schema

```javascript
// New key: tls3_license
{
  key: "XXXXX-XXXXX-XXXXX-XXXXX",     // license key (stored for display)
  tier: "boardroom",                     // resolved tier name
  valid: true,                           // last known validity
  variant: "boardroom_annual",           // Lemon Squeezy variant name
  instanceId: "ins_xxxx",               // activation instance ID
  expiresAt: "2027-03-10T00:00:00Z",   // subscription expiry
  lastChecked: "2026-03-10T12:00:00Z", // last successful API validation
  customerEmail: "user@example.com"      // for display only
}

// Existing keys preserved:
// tls3_tier → still used as runtime tier (updated from license data)
// tls3_ref → kept for beta tracking during transition
```

### 1.5 Feature Gating

**Approach:** A single `_checkTier(feature)` method that returns true/false. Called at enforcement points throughout the app.

**Free Tier Limits:**
| Feature | Free | Boardroom | Execution |
|---------|------|-----------|-----------|
| Swimlanes | 5 | Unlimited | Unlimited |
| Items (total) | 25 | Unlimited | Unlimited |
| Themes | Warm + Cool | All 4 | All 4 |
| Export SVG/PNG | Watermarked | Clean | Clean |
| CSV Export | No | Yes | Yes |
| CSV Import | No | Yes | Yes |
| Critical Path | No | Yes | Yes |
| Auto-Scheduling | No | Yes | Yes |
| Dependencies | Basic (FS only) | All types | All types |
| Presenter Mode | No | Yes | Yes |

**Enforcement points in app.js:**
- Swimlane creation (`showSwM()`) — check count limit
- Item creation (add milestone/task) — check count limit per swimlane
- Theme selection (settings) — grey out locked themes with lock icon
- Export functions (`exportSVG`, `exportPNG`) — force watermark text for free tier
- CSV import (`doAdvancedImport`) — show upgrade prompt
- Critical path toggle — show upgrade prompt
- Scheduling mode switch — show upgrade prompt

**UX for gated features:** Don't hide features — show them but with a subtle lock icon and "Upgrade to unlock" tooltip. This lets users see the value they'd get, driving conversions.

### 1.6 Beta Migration Path

During transition period (beta → paid):
1. Existing `?tier=beta_boardroom&ref=gm` URL activation **continues to work**
2. Beta users get a `tls3_tier = 'beta_boardroom'` which maps to Boardroom features
3. When beta ends: send email via Lemon Squeezy email marketing with purchase link
4. Add a banner in app for beta users: "Beta ending [date] — enter license key to continue"
5. After cutoff date: beta tier degrades to free (controlled by a hardcoded date constant)

### 1.7 Implementation Steps (Phased)

**Phase A: License UI & Validation (next implementation session)**
1. Add `sect-license` section to `index.html` settings nav (first position)
2. Add license section HTML with key input, status display, activate/deactivate buttons
3. Add `_validateLicense()`, `_activateLicense()`, `_deactivateLicense()` methods to app.js
4. Add `_checkTier()` gating helper
5. Add localStorage caching logic
6. Add CSS for license status badge, tier cards
7. Wire up init() to check cached license on load

**Phase B: Feature Gating (follow-up)**
1. Add enforcement at each gating point
2. Add upgrade prompts/toasts for gated features
3. Add watermark enforcement for free tier exports
4. Test all gating scenarios

**Phase C: Beta Sunset (when ready)**
1. Add beta expiry date constant
2. Add beta transition banner
3. Coordinate with Lemon Squeezy email campaign

---

## Part 2: Pricing & Monetization Strategy

### The Strategic Question

You're weighing speed vs. safety. Here's the synthesis given your four concerns:

**Concern 1: Quickly validating willingness to pay**
Free beta doesn't validate this at all. You could have 1,000 free users and still not know if anyone would pay $1. The only way to validate willingness to pay is to charge. Every week of free beta is a week of delayed learning.

**Concern 2: Stickiness and word-of-mouth quality**
Your beta testers are already doing this — they're loving the app and pushing you to share it. That's organic word-of-mouth happening right now. Paid users are actually *more* likely to evangelize than free users because (a) they have skin in the game, (b) they've committed, and (c) recommending something you pay for carries more weight than recommending something free.

**Concern 3: Quality for a paid app**
At v0.44.27 with 538 passing tests, 4 themes, dependency scheduling, presenter mode, CSV import with tool presets (Jira, Smartsheet, Asana, Monday.com), and critical path analysis — this is already more feature-complete than most paid tools at launch. Your 30-day refund policy mitigates any remaining quality concerns. If someone pays and doesn't find value, they get their money back. That's the safety net.

**Concern 4: SaaS disruption in 6-9 months**
This is the most important factor and it changes the calculus entirely. If AI tooling could commoditize project visualization in 6-9 months, then **every month you spend in free beta is a month of potential revenue you'll never recover**. The window for capturing value from a differentiated product is finite. You need to be charging while the product has clear competitive advantage.

### Recommendation: Hybrid — Founding Member Launch (Option 3)

**Launch pricing:**
- **Free Tier** — $0 forever (5 swimlanes, 25 items, watermarked export)
- **Boardroom Founding Member** — **$99/yr** (first 100 licenses or first 90 days, whichever comes first)
- **Boardroom Standard** — $149/yr (after founding period ends)
- **Execution** — "Coming Soon" with email waitlist

**Why this works for all four concerns:**

1. **Validates willingness to pay**: Day 1. Real money, real signal. If 100 people hit your site and 0 buy at $99/yr, you learn something critical. If 5 buy, you know the model works.

2. **Drives stickiness + word of mouth**: The founding member framing creates a community identity ("I was one of the first 100"). Founding members become your most passionate advocates because they feel like insiders. And $99/yr is low enough that recommending it to a coworker isn't a hard ask.

3. **Mitigates quality concerns**: $99/yr (not $149) feels like a "get in early while it's growing" price, not a "this should be perfect" price. Combined with 30-day refunds, the risk for buyers is essentially zero. You're saying: "This is a real product, it's worth money, and we're rewarding people who believe in it early."

4. **Maximizes revenue window**: You start generating revenue immediately. If the SaaS landscape shifts in 6-9 months, you've captured value during the window. The founding member urgency ("only 100 slots" or "ends June 30") also creates conversion pressure that pure $149/yr pricing doesn't.

**Tactical execution:**
1. Set up Boardroom product in Lemon Squeezy at $99/yr
2. Create a coupon/variant for the founding member price
3. When founding period ends, new purchases are $149/yr; existing founders stay at $99/yr
4. Your existing beta users get a "thank you" email with founding member pricing (they get first access)
5. New users from LinkedIn/social see both free tier and founding member pricing

### What to NOT do
- Don't do an extended free beta with email signups → delays payment validation
- Don't launch at full $149/yr → the founding member discount creates urgency and lowers friction for first buyers
- Don't offer monthly pricing yet → annual-only simplifies your launch and ensures committed users (add monthly later once you have traction)
- Don't gate too aggressively → the free tier at 5 swimlanes / 25 items lets people build real timelines and experience real value before upgrading

---

## Part 3: Documentation & Training Strategy

### 3.1 Video Series Structure

Your proposed video series structure is solid. Here's a refined version with suggested content flow:

**Video 1: Getting Started (3-5 min)**
- What Timeline Studio is and who it's for
- License key activation (for paid users)
- Theme selection and basic layout overview
- The three views: Timeline, Data Table, Split
- Opening, saving, and managing project files (.tlproj)
- Basic navigation (zoom, pan, scroll)

**Video 2: Building Your First Timeline — Phase 1 (5-7 min)**
- Creating swimlanes and sub-swimlanes
- Adding milestones and tasks
- Drag-and-drop positioning
- Color coding and status assignment
- Basic formatting (labels, dates, text colors)

**Video 3: Team Planning — Phase 2 (5-7 min)**
- Dependencies (FS, SS, FF, SF) with lag
- Auto-scheduling mode vs. manual mode
- Working days, holidays, and non-working day handling
- Duration modes (calendar vs. working days)
- Pinning and locking items
- Critical path analysis

**Video 4: Presenting & Sharing — Phase 3 (4-6 min)**
- Export options (SVG, PNG, CSV, JSON)
- Screenshots (viewport, full timeline)
- Share links
- Presenter mode (laser pointer, drawing, highlighter)
- Watermark customization
- Themes for different audiences

**Video 5: Advanced — Power User Deep Dive (6-8 min)**
- CSV/Excel import with column mapping
- Source tool presets (Jira, Smartsheet, Asana, Monday.com)
- Format Painter
- Keyboard shortcuts and customization
- Data table bulk editing
- Lasso selection and bulk operations
- Status customization
- URL links on items

### 3.2 Docs Page on timelinestudio.io

**Recommended structure for `timelinestudio.io/docs`:**

```
/docs
  /getting-started      ← Maps to Video 1
    - activation
    - themes-and-layout
    - views
    - file-management
  /building-timelines   ← Maps to Video 2
    - swimlanes
    - milestones-and-tasks
    - formatting
    - status-tracking
  /team-planning        ← Maps to Video 3
    - dependencies
    - scheduling
    - holidays
    - critical-path
  /presenting           ← Maps to Video 4
    - exporting
    - sharing
    - presenter-mode
    - themes
  /advanced             ← Maps to Video 5
    - importing-data
    - keyboard-shortcuts
    - format-painter
    - bulk-operations
  /faq
  /changelog
```

Each doc page should:
- Embed the relevant YouTube video at the top
- Provide step-by-step written instructions below (for searchability and quick reference)
- Include screenshots showing the feature in action
- Link to related pages

**Platform recommendation:** Use a lightweight static site generator (Docusaurus, VitePress, or even plain HTML like the app itself) hosted alongside timelinestudio.io. Keep it simple — you don't need a CMS.

---

## Files to Modify (License Integration Only)

| File | Changes |
|------|---------|
| `index.html` | Add License nav link (line 362), add `sect-license` section HTML (before `sect-project`) |
| `app.js` | Add `_validateLicense()`, `_activateLicense()`, `_deactivateLicense()`, `_checkTier()`, `_loadLicense()` methods. Update `init()` for license check. Add element IDs to `$` cache. Wire settings populate/apply for license section. |
| `styles.css` | Add `.license-status`, `.tier-badge`, `.license-key-input`, `.license-action-btn`, `.tier-card`, `.feature-locked` styles |

## Verification

1. **License activation**: Enter a test key → verify API call, toast, tier change, settings display
2. **Offline handling**: Disconnect network → reload app → verify cached tier persists
3. **Feature gating**: Switch to free tier → verify limits enforced at each gate point
4. **Beta migration**: Load with `?tier=beta_boardroom&ref=gm` → verify still works
5. **Settings UI**: Open Settings → verify License is first section, displays correctly for free/paid/beta
6. **Tests**: Run `node tests/run-all.js` — all existing tests must pass
7. **Lemon Squeezy test mode**: Use LS test mode for all purchase testing (per Manish's note — never use real cards for testing)
