/**
 * ============================================================================
 * Chaitanya 2k26 — Firebase Schema & Catalog Seeder
 * ============================================================================
 * Translates and applies 'chaitanya_schema.sql' relational schema into
 * Cloud Firestore collections and seeds initial fest datasets.
 */

import { EVENTS_DATA } from "./events-data.js";
import { getFirebaseConfig, isFirebaseConfigured } from "./firebase-config.js";

export const SCHEMA_COLLECTIONS = [
  { name: "users", sqlTable: "users", description: "Attendee and admin identity profiles" },
  { name: "events", sqlTable: "events", description: "Fest events with schedule, venue and fees" },
  { name: "teams", sqlTable: "teams", description: "Squad registry with team codes & leader IDs" },
  { name: "team_members", sqlTable: "team_members", description: "Mapping between teams and participant users" },
  { name: "registrations", sqlTable: "registrations", description: "Official participation passes & QR tracking" },
  { name: "event_analytics", sqlTable: "event_analytics", description: "Aggregated counters for registrations & teams" },
  { name: "event_daily_analytics", sqlTable: "event_daily_analytics", description: "Daily registration velocity metrics" },
  { name: "faqs", sqlTable: "faqs", description: "Frequently asked questions with publish status" },
  { name: "queries", sqlTable: "queries", description: "Contact form & support inquiries" },
];

export const DEFAULT_FAQS = [
  {
    id: "faq_eligibility",
    question: "Who is eligible to participate in Chaitanya 2k26?",
    answer: "All bona fide undergraduate and postgraduate students from recognized colleges, universities, and polytechnics possessing a valid student ID card are eligible to participate.",
    display_order: 1,
    published: true,
  },
  {
    id: "faq_team_creation",
    question: "How do team registrations and codes work?",
    answer: "The team leader registers the team (and pays the team fee) and receives a unique team code (e.g. BYTE-4F8K). Teammates sign in and join the team by entering this code on the same event.",
    display_order: 2,
    published: true,
  },
  {
    id: "faq_payments",
    question: "How do I pay the registration fee via UPI?",
    answer: "Pay the entry fee to the official fest UPI ID shown in the registration form, then enter the 12-digit UTR from your payment receipt. The fest team verifies every UTR against the bank statement; your pass shows the verification status.",
    display_order: 3,
    published: true,
  },
  {
    id: "faq_accommodation",
    question: "Will accommodation and dining be provided for external participants?",
    answer: "Yes, subsidized campus hostel accommodation and mess facilities are available at HPTU Hamirpur campus upon prior registration. Contact the hospitality desk upon arrival.",
    display_order: 4,
    published: true,
  },
  {
    id: "faq_multiple_events",
    question: "Can I participate in multiple events?",
    answer: "Yes, participants may register for multiple competitions and workshops as long as the scheduled timings do not conflict.",
    display_order: 5,
    published: true,
  },
  {
    id: "faq_prizes",
    question: "When and how will prize pools and certificates be disbursed?",
    answer: "Official certificates of excellence and cash awards will be distributed during the closing ceremony on the final day of the fest. Digital verifiable certificates will also be issued to all registered attendees.",
    display_order: 6,
    published: true,
  },
];

/**
 * Apply and seed schema collections to Cloud Firestore
 */
export async function applySchemaToFirestore(onProgress = () => {}) {
  const config = getFirebaseConfig();
  if (!isFirebaseConfigured(config)) {
    throw new Error("Firebase configuration missing or invalid. Check _nuxt/firebase-config.js.");
  }

  const { initializeApp, getApps, getApp } = await import(
    "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js"
  );
  const { getFirestore, doc, setDoc } = await import(
    "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js"
  );

  const app = getApps().length === 0 ? initializeApp(config) : getApp();
  const db = getFirestore(app);

  const results = {
    eventsCreated: 0,
    analyticsCreated: 0,
    faqsCreated: 0,
    metadataCreated: 1,
    errors: [],
  };

  // 1. Seed Events matching 'events' table
  onProgress({ stage: "events", message: `Seeding ${EVENTS_DATA.length} events to the events collection...` });
  for (const ev of EVENTS_DATA) {
    try {
      const eventDoc = {
        id: ev.id,
        title: ev.title,
        type: ev.category === "workshops" ? "workshop" : "competition",
        description: ev.overview || ev.tagline || "",
        venue: ev.venue || "HPTU Hamirpur",
        // Filled in once the official schedule is announced.
        day: ev.date || null,
        time: ev.time || null,
        start_time: null,
        end_time: null,
        registration_deadline: null,
        capacity: 100,
        status: "published",
        created_by: "system_admin",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // UI & catalog metadata
        category: ev.category,
        categoryName: ev.categoryName,
        tagline: ev.tagline,
        entryFee: ev.entryFee,
        entryFeeNum: ev.entryFeeNum || 0,
        prizePool: ev.prizePool,
        minTeam: ev.minTeam || 1,
        maxTeam: ev.maxTeam || 1,
        rules: ev.rules || [],
        rounds: ev.rounds || [],
        judgingCriteria: ev.judgingCriteria || [],
        coordinators: ev.coordinators || [],
      };

      await setDoc(doc(db, "events", ev.id), eventDoc, { merge: true });
      results.eventsCreated++;

      // Seed corresponding 'event_analytics'
      const analyticsDoc = {
        event_id: ev.id,
        total_registrations: 0,
        individual_registrations: 0,
        team_registrations: 0,
        total_teams: 0,
        last_updated: new Date().toISOString(),
      };
      await setDoc(doc(db, "event_analytics", ev.id), analyticsDoc, { merge: true });
      results.analyticsCreated++;
    } catch (err) {
      results.errors.push(`Event ${ev.id}: ${err.message}`);
    }
  }

  // 2. Seed FAQs matching 'faqs' table
  onProgress({ stage: "faqs", message: "Seeding fest FAQs to 'faqs' collection..." });
  for (const faq of DEFAULT_FAQS) {
    try {
      const faqDoc = {
        ...faq,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await setDoc(doc(db, "faqs", faq.id), faqDoc, { merge: true });
      results.faqsCreated++;
    } catch (err) {
      results.errors.push(`FAQ ${faq.id}: ${err.message}`);
    }
  }

  // 3. Seed Schema Metadata
  onProgress({ stage: "metadata", message: "Recording schema version metadata..." });
  try {
    const metaDoc = {
      schema_name: "Chaitanya Website Database Schema",
      version: "1.0.0",
      source_sql: "chaitanya_schema.sql",
      backend: "Firebase Cloud Firestore",
      collections: SCHEMA_COLLECTIONS.map((c) => c.name),
      applied_at: new Date().toISOString(),
      status: "active",
      total_collections: SCHEMA_COLLECTIONS.length,
    };
    await setDoc(doc(db, "_schema_metadata", "chaitanya_v1"), metaDoc, { merge: true });
  } catch (err) {
    results.errors.push(`Metadata: ${err.message}`);
  }

  onProgress({ stage: "complete", message: "Firebase schema applied successfully!", results });
  return results;
}
