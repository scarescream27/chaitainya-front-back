/**
 * ============================================================================
 * Chaitanya 2k26 — Firebase Schema & Catalog CLI Seeder
 * ============================================================================
 * Usage: node scripts/apply-schema-firebase.mjs
 */

import fs from "fs";
import os from "os";
import path from "path";
import { EVENTS_DATA } from "../_nuxt/events-data.js";

const PROJECT_ID = "chaitainya-hptu";
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

function getCliAccessToken() {
  try {
    const configPath = path.join(os.homedir(), ".config", "configstore", "firebase-tools.json");
    if (fs.existsSync(configPath)) {
      const parsed = JSON.parse(fs.readFileSync(configPath, "utf8"));
      return parsed?.tokens?.access_token || null;
    }
  } catch (e) {}
  return null;
}

function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === "boolean") return { booleanValue: val };
  if (typeof val === "number") {
    if (Number.isInteger(val)) return { integerValue: val.toString() };
    return { doubleValue: val };
  }
  if (typeof val === "string") return { stringValue: val };
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.map((v) => toFirestoreValue(v)),
      },
    };
  }
  if (typeof val === "object") {
    const fields = {};
    for (const [k, v] of Object.entries(val)) {
      fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function objectToFirestoreFields(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) {
    fields[k] = toFirestoreValue(v);
  }
  return { fields };
}

async function saveDocument(collection, docId, data, token) {
  const url = `${BASE_URL}/${collection}/${encodeURIComponent(docId)}`;
  const body = JSON.stringify(objectToFirestoreFields(data));
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url, {
    method: "PATCH",
    headers,
    body: body,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

async function run() {
  console.log("=================================================");
  console.log("  Chaitanya 2k26 — Firebase Schema CLI Migration");
  console.log("  Target Project:", PROJECT_ID);
  console.log("  Source Schema: chaitanya_schema.sql");
  console.log("=================================================\n");

  const token = getCliAccessToken();
  if (token) {
    console.log("✓ Authenticated via Firebase CLI credentials\n");
  } else {
    console.warn("⚠️ No CLI auth token detected, attempting unauthenticated...\n");
  }

  // 1. Events collection
  console.log("1. Seeding 'events' collection (12 Flagship Competitions & Workshops)...");
  let eventSuccess = 0;
  for (const ev of EVENTS_DATA) {
    const eventDoc = {
      id: ev.id,
      title: ev.title,
      type: ev.category === "workshops" ? "workshop" : "competition",
      description: ev.overview || ev.tagline || "",
      venue: ev.venue || "HPTU Hamirpur",
      start_time: "2026-03-26T10:00:00Z",
      end_time: "2026-03-27T18:00:00Z",
      registration_deadline: "2026-03-25T23:59:59Z",
      capacity: 100,
      status: "published",
      created_by: "system_admin",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      category: ev.category,
      categoryName: ev.categoryName,
      entryFee: ev.entryFee,
      entryFeeNum: ev.entryFeeNum || 0,
      prizePool: ev.prizePool,
    };
    try {
      await saveDocument("events", ev.id, eventDoc, token);
      eventSuccess++;
      process.stdout.write(`   ✓ Event [${ev.id}]\n`);

      // Analytics document for each event
      await saveDocument("event_analytics", ev.id, {
        event_id: ev.id,
        total_registrations: 0,
        individual_registrations: 0,
        team_registrations: 0,
        total_teams: 0,
        last_updated: new Date().toISOString(),
      }, token);
    } catch (e) {
      console.error(`   ✗ Event [${ev.id}] failed:`, e.message);
    }
  }

  // 2. FAQs collection
  console.log("\n2. Seeding 'faqs' collection...");
  const faqs = [
    {
      id: "faq_eligibility",
      question: "Who is eligible to participate in Chaitanya 2k26?",
      answer: "All students from recognized colleges and universities with valid college IDs.",
      display_order: 1,
      published: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "faq_teams",
      question: "How do team registrations work?",
      answer: "Team leaders create a squad, get a team code, and teammates use the code to join.",
      display_order: 2,
      published: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "faq_upi",
      question: "How to complete payment verification?",
      answer: "Pay via University SBI UPI QR and enter your 12-digit transaction UTR number.",
      display_order: 3,
      published: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  for (const faq of faqs) {
    try {
      await saveDocument("faqs", faq.id, faq, token);
      console.log(`   ✓ FAQ [${faq.id}]`);
    } catch (e) {
      console.error(`   ✗ FAQ [${faq.id}] failed:`, e.message);
    }
  }

  // 3. Schema metadata
  console.log("\n3. Writing schema audit metadata...");
  try {
    await saveDocument("_schema_metadata", "v1", {
      schema_name: "chaitanya_schema.sql",
      version: "1.0.0",
      applied_at: new Date().toISOString(),
      database: "Cloud Firestore",
      collections: [
        "users",
        "events",
        "teams",
        "team_members",
        "registrations",
        "event_analytics",
        "event_daily_analytics",
        "faqs",
        "queries",
      ],
    }, token);
    console.log("   ✓ Metadata recorded successfully.");
  } catch (e) {
    console.error("   ✗ Metadata write failed:", e.message);
  }

  console.log("\n=================================================");
  console.log(`  MIGRATION SUMMARY: ${eventSuccess}/12 Events Synced`);
  console.log("=================================================\n");
}

run().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
