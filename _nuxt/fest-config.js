/**
 * ============================================================================
 * Chaitanya 2k26 — Fest Configuration (single source of truth)
 * ============================================================================
 * Edit the values below once the organising committee confirms them.
 * Every page (events arena, registration modal, entry pass, contact) reads
 * from here, so nothing else needs to change.
 */

export const FEST_CONFIG = {
  name: "Chaitanya 2k26",
  university: "Himachal Pradesh Technical University (HPTU), Hamirpur",
  contactEmail: "chaitanyahptu@gmail.com",
  // Phone numbers shown next to the email (call or WhatsApp).
  contactPhones: ["+91 85808 78500", "+91 75910 63221"],

  // Fest dates shown in the events hero and passes (null shows "DATES TBA").
  datesLabel: "30 OCT – 1 NOV 2026",
  festDays: 3,

  // UPI collection account. Leave upiId null until the account is verified
  // by the committee: paid registrations will show "payment details coming
  // soon" and stay closed so nobody pays the wrong account.
  upiId: "bilibiryani@ptaxis", // verified by the organisers (8 Oct 2026)
  upiPayeeName: "Chaitanya HPTU",
  // Optional: path to the official bank-issued QR image (e.g. "/images/upi-qr.png").
  // When null, only the UPI ID + a "Pay with UPI app" button are shown.
  upiQrImage: null,

  // Razorpay Checkout. TEST MODE ONLY; see RAZORPAY_SETUP.md. keyId is the
  // public test key id ("rzp_test_..."), never the key secret. When enabled,
  // paid checkouts use Razorpay; the UPI + UTR flow above is the fallback.
  razorpay: { enabled: false, keyId: null },
};

// Sponsors: { name, tier, url, logo }, shown on /about and /sponsors.
// Empty shows the "sponsorship is open" message.
export const SPONSORS = [];

export function getFestDatesLabel() {
  return FEST_CONFIG.datesLabel || "DATES TBA";
}

export function isPaymentConfigured() {
  return Boolean(FEST_CONFIG.upiId && FEST_CONFIG.upiId.includes("@"));
}

// Test-mode guard: only a "rzp_test_" key id switches Razorpay on.
export function isRazorpayEnabled() {
  const rp = FEST_CONFIG.razorpay || {};
  return Boolean(rp.enabled && typeof rp.keyId === "string" && rp.keyId.startsWith("rzp_test_"));
}

/**
 * Build a standard UPI deep link (upi://pay) for the given amount.
 */
export function buildUpiLink(amount, note) {
  if (!isPaymentConfigured()) return null;
  const params = new URLSearchParams({
    pa: FEST_CONFIG.upiId,
    pn: FEST_CONFIG.upiPayeeName,
    am: String(amount),
    cu: "INR",
    tn: (note || FEST_CONFIG.name).slice(0, 60),
  });
  return `upi://pay?${params.toString()}`;
}

/**
 * Escape a value for safe interpolation into innerHTML templates.
 */
/** The contact numbers as tap-to-call links: "<a>…</a> or <a>…</a>". */
export function phoneLinksHtml() {
  return FEST_CONFIG.contactPhones
    .map((p) => `<a href="tel:${p.replace(/\s+/g, "")}" style="color:inherit;text-decoration:underline;white-space:nowrap;">${escapeHtml(p)}</a>`)
    .join(" or ");
}

export function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
