// Firestore rules check: stored markup is rejected, normal data still passes.
// Run with the emulator (needs Java):
//   npx firebase-tools emulators:exec --only firestore --project demo-chaitanya "node scripts/test-rules-no-markup.mjs"
import assert from "node:assert/strict";

const HOST = process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";
const BASE = `http://${HOST}/v1/projects/demo-chaitanya/databases/(default)/documents`;
const UID = "u1testuser";

// Unsigned ID token: the emulator accepts it and fills request.auth.
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const token = (uid) =>
  `${b64({ alg: "none", typ: "JWT" })}.${b64({
    iss: "https://securetoken.google.com/demo-chaitanya", aud: "demo-chaitanya", sub: uid, user_id: uid,
    email: `${uid}@example.com`, email_verified: true, iat: 1, exp: 9999999999, auth_time: 1,
    firebase: { sign_in_provider: "google.com" },
  })}.`;

// Plain JS -> Firestore REST value.
const val = (v) =>
  v === null ? { nullValue: null }
  : Array.isArray(v) ? { arrayValue: { values: v.map(val) } }
  : typeof v === "object" ? { mapValue: { fields: fields(v) } }
  : typeof v === "boolean" ? { booleanValue: v }
  : Number.isInteger(v) ? { integerValue: String(v) }
  : typeof v === "number" ? { doubleValue: v }
  : { stringValue: v };
const fields = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, val(v)]));

let n = 0;
async function write(path, data, { uid = UID, expect }) {
  const [col, id] = path.split("/");
  const res = await fetch(`${BASE}/${col}?documentId=${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(uid ? { Authorization: `Bearer ${token(uid)}` } : {}) },
    body: JSON.stringify({ fields: fields(data) }),
  });
  const ok = res.ok;
  n++;
  assert.equal(ok, expect === "allow", `${path} expected ${expect}, got ${ok ? "allow" : "deny"}: ${ok ? "" : (await res.text()).slice(0, 160)}`);
  // Clean up so the same id can be reused.
  if (ok) await fetch(`${BASE}/${path}`, { method: "DELETE", headers: { Authorization: "Bearer owner" } });
}

const XSS = `<img src=x onerror=alert("hacked")>`;
const user = (o = {}) => ({
  uid: UID, email: `${UID}@example.com`, displayName: "Riya Sharma", college: "A&M College",
  year: "2nd", phone: "9876543210", studentId: "CH26-ABCDEFGH", photoURL: "https://lh3.googleusercontent.com/a/abc123", ...o,
});
const team = (o = {}) => ({
  id: `team_ctf_${UID}`, eventId: "ctf", leaderUid: UID, leader_id: UID, memberUids: [UID],
  linkedMembers: [{ uid: UID, name: "Riya Sharma" }], members: [{ name: "Riya Sharma", role: "Leader" }, { name: "Aman K", role: "Member" }],
  maxTeamSize: 4, teamSize: 2, teamName: "Byte Busters", team_name: "Byte Busters", teamCode: "BYTE-4F8K",
  leaderName: "Riya Sharma", college: "A&M College", paymentStatus: "pending", ...o,
});
const reg = (o = {}) => ({
  id: `reg_ctf_${UID}`, user_id: UID, user_name: "Riya Sharma", user_college: "A&M College", user_year: "2nd",
  user_phone: "9876543210", event_id: "ctf", participation_type: "individual", registration_status: "registered",
  registration_qr_id: "CH26-ABCD-1234567", payment_status: "pending_verification", team_members: [], ...o,
});
const pay = (o = {}) => ({
  paymentId: `pay_${UID}_1700000000000`, payerUid: UID, payerName: "Riya Sharma", payerPhone: "9876543210",
  items: [{ eventId: "ctf", amount: 100, teamName: "Byte Busters" }], amount: 100, method: "razorpay",
  transactionRef: "pay_AbCdEf12345678", status: "pending_verification", verifiedAt: null, verifiedBy: null, ...o,
});
const query = (o = {}) => ({
  id: "q1", user_id: null, name: "Riya", email: "riya@example.com", phone: "", team_name: "",
  subject: "Question", message: "I <3 this fest, and 2 < 3", status: "open", ...o,
});

// users
await write(`users/${UID}`, user(), { expect: "allow" });
await write(`users/${UID}`, user({ displayName: XSS }), { expect: "deny" });
await write(`users/${UID}`, user({ college: "<script>alert(1)</script>" }), { expect: "deny" });
await write(`users/${UID}`, user({ photoURL: `https://x.com/a.png" onerror="alert(1)` }), { expect: "deny" });
await write(`users/${UID}`, user({ photoURL: "javascript:alert(1)" }), { expect: "deny" });
// teams
await write(`teams/team_ctf_${UID}`, team(), { expect: "allow" });
await write(`teams/team_ctf_${UID}`, team({ teamName: "</b>Pwned" }), { expect: "deny" });
await write(`teams/team_ctf_${UID}`, team({ members: [{ name: "Riya", role: "Leader" }, { name: XSS, role: "Member" }] }), { expect: "deny" });
// registrations
await write(`registrations/reg_ctf_${UID}`, reg(), { expect: "allow" });
await write(`registrations/reg_ctf_${UID}`, reg({ user_name: XSS }), { expect: "deny" });
await write(`registrations/reg_ctf_${UID}`, reg({ team_members: [{ name: "Aman", email: "<svg onload=alert(1)>" }] }), { expect: "deny" });
// payments
await write(`payments/pay_${UID}_1700000000000`, pay(), { expect: "allow" });
await write(`payments/pay_${UID}_1700000000000`, pay({ payerName: XSS }), { expect: "deny" });
await write(`payments/pay_${UID}_1700000000000`, pay({ items: [{ eventId: "ctf", amount: 100, teamName: "<!-- x" }] }), { expect: "deny" });
// queries (contact form works without sign-in)
await write("queries/q1", query(), { uid: null, expect: "allow" });
await write("queries/q1", query({ message: "hello <script>steal()</script>" }), { uid: null, expect: "deny" });
await write("queries/q1", query({ name: XSS }), { uid: null, expect: "deny" });

console.log(`ok: ${n} rule checks passed (normal data allowed, markup rejected)`);
