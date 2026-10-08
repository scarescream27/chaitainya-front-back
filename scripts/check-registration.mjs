// Run: node scripts/check-registration.mjs
// Registration closes at the overall deadline or when the event starts,
// whichever comes first (and everywhere while REGISTRATIONS_CLOSED is true).
import assert from "node:assert/strict";
import { EVENTS_DATA, REGISTRATIONS_CLOSED, REGISTRATION_DEADLINE, isPastDeadline } from "../_nuxt/events-data.js";

const t = (iso) => Date.parse(iso);
const ev = { deadline: "2026-10-29T23:59:00+05:30", startsAt: "2026-10-29T10:00:00+05:30" };

if (REGISTRATIONS_CLOSED) {
  assert.equal(isPastDeadline(ev, t("2026-10-01T00:00:00+05:30")), true, "kill switch closes everything");
  console.log("REGISTRATIONS_CLOSED is ON: every event is closed.");
} else {
  assert.equal(isPastDeadline(ev, t("2026-10-20T00:00:00+05:30")), false, "open well before");
  assert.equal(isPastDeadline(ev, t("2026-10-29T10:00:00+05:30")), true, "closes the moment it starts");
  assert.equal(isPastDeadline({ deadline: ev.deadline }, t("2026-10-29T12:00:00+05:30")), false, "no start time: deadline only");
  assert.equal(isPastDeadline({ deadline: ev.deadline }, t("2026-10-30T00:00:00+05:30")), true, "past the deadline");
  const open = EVENTS_DATA.filter((e) => !isPastDeadline(e)).length;
  console.log(`ok: registration closes at start or deadline (${REGISTRATION_DEADLINE}); ${open}/${EVENTS_DATA.length} events open now.`);
}
