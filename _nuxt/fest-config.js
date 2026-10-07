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

  // Fest dates shown in the events hero and passes (null shows "DATES TBA").
  datesLabel: "30 OCT – 1 NOV 2026",
  festDays: 3,

  // UPI collection account. Leave upiId null until the account is verified
  // by the committee: paid registrations will show "payment details coming
  // soon" and stay closed so nobody pays the wrong account.
  upiId: null,
  upiPayeeName: "Chaitanya HPTU",
  // Optional: path to the official bank-issued QR image (e.g. "/images/upi-qr.png").
  // When null, only the UPI ID + a "Pay with UPI app" button are shown.
  upiQrImage: null,
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
export function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
