# Phase D: Go Live — Embedded Checkout & End-to-End Testing

> **Status:** Planning — to be implemented after Phase C (Visual Polish) is deployed and validated on `app.timelinestudio.io`.

## Context

Phases A (scaffolding), B (enforcement), and C (visual polish) are complete. The licensing system is live with `_LICENSING_ENABLED = true`. Free users see PRO badges, gated toasts with "Upgrade" actions, and a "License & Upgrades" section in Settings with a link to `timelinestudio.io/#pricing`. But the purchase flow still requires leaving the app — the user clicks "Purchase a license", buys on the external site, receives a key via email, then returns to the app to activate. Phase D closes that loop by embedding a Lemon Squeezy checkout directly in the app, enabling one-click purchase without leaving Timeline Studio.

## Goals

1. **Embedded checkout**: User clicks "Purchase" in Settings → Lemon Squeezy overlay/iframe opens → user completes payment → key is auto-applied → tier upgrades instantly
2. **End-to-end testing**: Full purchase → activate → deactivate → reactivate flow validated across browsers
3. **Error handling**: Network failures, payment cancellations, invalid keys, expired licenses
4. **Analytics readiness**: Track conversion funnel (gate toast → Settings → checkout → purchase)

---

## Component 1: Lemon Squeezy Checkout Embed

### Approach
Lemon Squeezy provides an [overlay checkout](https://docs.lemonsqueezy.com/help/checkout/overlay-checkout) that can be triggered via JavaScript. This opens a modal-style checkout on top of the app — no redirect, no new tab.

### Implementation Plan

1. **Add Lemon Squeezy JS snippet** to `index.html`:
   ```html
   <script src="https://app.lemonsqueezy.com/js/lemon.js" defer></script>
   ```
   - Must respect the 3-file architecture — this is an external dependency loaded via CDN, not a local file
   - Load with `defer` to avoid blocking render
   - Guard all LS calls with `if(window.LemonSqueezy)` for offline/blocked scenarios

2. **Replace purchase link in `#lic-free-info`** with a checkout button:
   - Keep the `<a>` link as fallback for users who block third-party scripts
   - Add a "Buy Now" button that calls `LemonSqueezy.Url.Open(checkoutUrl)`
   - Checkout URL includes the product variant ID for Boardroom tier
   - Pass `checkout[custom][email]` if available from a previous license

3. **Listen for checkout success**:
   - Lemon Squeezy fires a `message` event on `window` when checkout completes
   - Extract the license key from the success payload
   - Auto-call `_activateLicense(key)` → tier updates → badges disappear → toast confirms

4. **Handle checkout dismissal**:
   - User closes overlay without purchasing → no action needed
   - User's payment fails → LS handles retry within the overlay

### Checkout URL Construction
```js
_buildCheckoutUrl() {
  const base = 'https://STORE.lemonsqueezy.com/checkout/buy/VARIANT_ID';
  const params = new URLSearchParams();
  // Pre-fill email if known from previous license
  const cached = this._getCachedLicense();
  if (cached?.customerEmail) params.set('checkout[email]', cached.customerEmail);
  // Embed mode
  params.set('embed', '1');
  return base + '?' + params.toString();
}
```

### UI Mockup — Settings > License & Upgrades (with embedded checkout)
```
LICENSE & UPGRADES
┌──────────────────────────────────────────────────────────┐
│  Free Plan                          [Free]               │
└──────────────────────────────────────────────────────────┘

License Key
┌──────────────────────────────┐  ┌──────────┐
│                              │  │ Activate │
└──────────────────────────────┘  └──────────┘

─────────────────────────────────────────────── divider

┌──────────────────────────────────────────────────────────┐
│  ★ Upgrade to Boardroom                                  │
│                                                          │
│  Unlock the full Timeline Studio experience:             │
│  ✓ All themes   ✓ CSV import & export   ...             │
│                                                          │
│  ┌────────────────────────────────┐                      │
│  │   🛒  Purchase License — $XX  │  ← styled button     │
│  └────────────────────────────────┘                      │
│                                                          │
│  Already have a key? Enter it above.                     │
│  Or purchase at timelinestudio.io →  (fallback link)     │
└──────────────────────────────────────────────────────────┘
```

---

## Component 2: Auto-Activation After Purchase

### Flow
1. User clicks "Purchase License" button in Settings
2. Lemon Squeezy overlay opens (payment form)
3. User completes payment
4. LS overlay fires success event with order data
5. App extracts license key from event payload
6. `_activateLicense(key)` validates via API
7. On success:
   - License cached (localStorage + IDB + storage.persist)
   - `_resolvedTier` updated to `boardroom`
   - `_populateLicenseSection()` re-renders (shows "Boardroom [Active]", hides upgrade box)
   - `_applyMenuGating()` removes all PRO badges from menus
   - Success toast: "License activated! Welcome to Boardroom."
8. If Settings is open, it live-updates (tier card, badges, upgrade box visibility)

### Error Handling
- **LS event missing key**: Show toast "Purchase completed — check your email for the license key, then enter it above"
- **Validation API fails**: Cache key locally, attempt background revalidation, show "License key saved — we'll verify it shortly"
- **Network offline during purchase**: LS overlay handles this (won't complete payment)

---

## Component 3: End-to-End Test Matrix

### Manual Test Scenarios

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 1 | Fresh free user → purchase | Open app → click gated feature → toast → Upgrade → Purchase → complete payment | Auto-activated, all badges gone |
| 2 | Purchase → close → reopen | Complete purchase → close browser → reopen app | License restored from cache, Boardroom tier |
| 3 | Purchase → clear cache → reopen | Complete purchase → clear localStorage → reopen | License recovered from IDB |
| 4 | Purchase → clear all storage → reopen | Clear localStorage + IDB → reopen with saved .tlproj | License recovered from project file |
| 5 | Deactivate → reactivate | Licensed user → deactivate → enters same key → activate | Re-validated, Boardroom restored |
| 6 | Expired license | Modify cached expiry to past date → reopen | Background revalidation, toast if truly expired |
| 7 | Invalid key | Enter garbage key → Activate | Error toast, stays on Free |
| 8 | Offline with valid cache | Disconnect network → open app | Cached license honored (within 30 days) |
| 9 | Offline with stale cache | Disconnect + cache >30 days old → open | Falls back to Free, toast "License expired" |
| 10 | GitHub Pages | Visit adrotar21.github.io | No license UI, beta_boardroom tier, all features unlocked |
| 11 | Kill switch OFF | Set `_LICENSING_ENABLED=false` | No badges, no gates, all features work |

### Browser Coverage
- Chrome (Windows, Mac)
- Edge (Windows)
- Safari (Mac) — LS overlay compatibility
- Firefox — LS overlay compatibility

---

## Component 4: Analytics & Conversion Tracking (Future)

> Not required for Phase D launch, but planned for post-launch iteration.

### Funnel Events (via LS webhooks or client-side)
1. Gate toast shown (feature name)
2. "Upgrade" clicked on toast
3. Settings > License & Upgrades viewed
4. "Purchase License" button clicked
5. LS checkout opened
6. Payment completed
7. License activated

### Implementation Options
- Lemon Squeezy webhooks (server-side, requires backend)
- Client-side events via `localStorage` counters (privacy-friendly, no server needed)
- Google Analytics events (if GA is added later)

---

## Implementation Order

1. Add Lemon Squeezy JS to `index.html` (with offline guard)
2. Add "Purchase License" button to `#lic-free-info` upgrade box
3. Wire button to `LemonSqueezy.Url.Open()` with constructed checkout URL
4. Add `window.addEventListener('message', ...)` handler for LS success event
5. Auto-activate license on successful purchase
6. Test full flow with LS test mode / sandbox
7. Switch to production LS credentials
8. Run full end-to-end test matrix
9. Deploy to `app.timelinestudio.io`

## Dependencies

- Lemon Squeezy store setup (product, variant, pricing) — **must be configured before implementation**
- LS checkout overlay JS compatibility with the app's modal system (Settings modal stays open behind overlay)
- LS sandbox/test mode for development

## Open Questions

1. **Pricing**: What is the Boardroom license price? One-time or subscription?
2. **LS product/variant IDs**: Need actual IDs from the Lemon Squeezy dashboard
3. **Checkout success event payload**: Need to verify the exact structure of the LS success message event — does it include the license key directly, or does a separate API call need to fetch it?
4. **Multiple variants**: If Execution tier is added later, the checkout flow needs a variant selector or separate buttons
5. **Refund handling**: When a license is refunded via LS, should the app detect this on next revalidation and downgrade? Current `_revalidateLicense` would handle this if LS returns `status: 'refunded'`
