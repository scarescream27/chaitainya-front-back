/**
 * ============================================================================
 * Chaitanya 2k26 — Event cart
 * ============================================================================
 * Holds the events a participant has picked before checkout. Stored in this
 * browser per signed-in user (or for a guest until they sign in). Each item
 * remembers whether the participant chose solo or team entry.
 */

import { getEventById, isRegistrationOpen } from "./events-data.js";

const KEY_PREFIX = "chaitanya_cart_v1_";
let ownerId = "guest";
let listeners = [];

function storageKey() {
  return KEY_PREFIX + ownerId;
}

function read() {
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey()) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function write(items) {
  try {
    localStorage.setItem(storageKey(), JSON.stringify(items));
  } catch {}
  listeners.forEach((cb) => {
    try {
      cb(getCartItems());
    } catch (e) {
      console.error("Cart listener error:", e);
    }
  });
}

/**
 * Switch the cart to a user (merges any guest cart into theirs).
 */
export function setCartOwner(uid) {
  const next = uid || "guest";
  if (next === ownerId) return;
  const guestItems = ownerId === "guest" ? read() : [];
  ownerId = next;
  if (guestItems.length && next !== "guest") {
    const merged = read();
    guestItems.forEach((g) => {
      if (!merged.some((m) => m.eventId === g.eventId)) merged.push(g);
    });
    try {
      localStorage.removeItem(KEY_PREFIX + "guest");
    } catch {}
    write(merged);
  } else {
    write(read());
  }
}

function defaultMode(ev) {
  return ev.registrationType === "team" ? "team" : "solo";
}

/**
 * Cart items enriched with event data. Events that no longer exist are dropped.
 */
export function getCartItems() {
  return read()
    .map((item) => {
      const ev = getEventById(item.eventId);
      if (!ev) return null;
      const mode = ev.registrationType === "both" ? item.mode || "solo" : defaultMode(ev);
      return { eventId: ev.id, mode, event: ev, amount: Number(ev.entryFeeNum) || 0, addedAt: item.addedAt };
    })
    .filter(Boolean);
}

export function isInCart(eventId) {
  return read().some((i) => i.eventId === eventId);
}

export function addToCart(eventId, mode) {
  const ev = getEventById(eventId);
  if (!ev) throw new Error("Unknown event.");
  if (!isRegistrationOpen(ev)) throw new Error("Registration for this event is not open.");
  const items = read();
  if (items.some((i) => i.eventId === eventId)) return;
  items.push({ eventId, mode: mode || defaultMode(ev), addedAt: Date.now() });
  write(items);
}

export function removeFromCart(eventId) {
  write(read().filter((i) => i.eventId !== eventId));
}

export function setCartItemMode(eventId, mode) {
  const ev = getEventById(eventId);
  if (!ev || ev.registrationType !== "both" || !["solo", "team"].includes(mode)) return;
  write(read().map((i) => (i.eventId === eventId ? { ...i, mode } : i)));
}

export function clearCart(eventIds = null) {
  write(eventIds ? read().filter((i) => !eventIds.includes(i.eventId)) : []);
}

export function getCartTotal(items = getCartItems()) {
  return items.reduce((sum, i) => sum + i.amount, 0);
}

export function subscribeCart(cb) {
  listeners.push(cb);
  try {
    cb(getCartItems());
  } catch {}
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}
