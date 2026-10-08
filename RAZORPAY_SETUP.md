# Razorpay setup (TEST MODE ONLY, no server)

Online payments use Razorpay **test mode**. Test mode never charges real money, and the
site refuses any key that doesn't start with `rzp_test_`. Everything below works on the free
Spark plan: there are no Cloud Functions.

## 1. Turn it on

1. Razorpay dashboard → switch to **Test Mode** → Account & Settings → API Keys → generate keys.
   Copy only the **key id** (`rzp_test_...`). It is public and safe in site code.
   Never put the key secret anywhere in this repo.
2. In `_nuxt/fest-config.js`: set `razorpay.keyId` to that key id and `razorpay.enabled: true`.
3. Razorpay (Test Mode) → Account & Settings → Payment capture → turn on **automatic capture**.
4. Deploy:
   ```sh
   firebase deploy --only hosting,firestore:rules
   ```

## 2. Try a paid event

All events are free by default. Give ONE event a test fee in BOTH places:

1. `_nuxt/events-data.js` → set `entryFeeNum` (rupees) on that event.
2. Firestore: admin page → **Setup** → sync events, so `events/{id}.entryFeeNum` matches.

Pay with the test cards / test UPI ids listed in Razorpay's docs ("Test card details").

## 3. Confirm payments (admins)

Without a server the checkout signature can't be verified, so **admin confirmation is the
security step** (same as UPI today). A Razorpay payment lands as `pending_verification` with
`transactionRef` = the Razorpay payment id (`pay_...`).

For each one: Razorpay test dashboard → Payments → search the `pay_...` id → check it is
**captured** and the amount matches → approve it in the admin **Payments** tab. Reject it otherwise.

## Later: automatic verification

A free Vercel or Netlify serverless function (the repo already has `vercel.json` /
`netlify.toml`) can create orders and check the signature with the key secret, then mark
payments verified. Until then, keep confirming by hand.
