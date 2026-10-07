/**
 * ============================================================================
 * File: teams-data.js
 * Purpose: The organising teams, shared by /about, /organisation and the
 * "Organised by" block of every event. Real names only.
 * ============================================================================
 */
import { EVENT_CATEGORIES, EVENTS_DATA } from "./events-data.js";

// Source: "Chaitanya Teams 2026". Names and roles only.
export const TEAMS = [
  {
    id: "event-coordinators",
    name: "Event Coordinators",
    people: [
      { name: "Aman Singh Ranawat", role: "Event Coordinator" },
      { name: "Krish Kanha", role: "Event Coordinator" },
    ],
  },
  {
    id: "website-developers",
    name: "Website Developers",
    people: [
      { name: "Aditya Verma", role: "Website Developer" },
      { name: "Manas Kapoor", role: "Website Developer" },
    ],
  },
];

// Optional photos, keyed by the exact name used above or in events-data.js.
// Drop square images (min 300x300) in images/team/ at the site root, named
// lowercase-hyphenated, e.g. images/team/aditya-verma.jpg, then add:
//   "Aditya Verma": "/images/team/aditya-verma.jpg",
// Anyone without an entry keeps the initials avatar.
export const PHOTOS = {};

export function initials(name) {
  return name
    .replace(/^(Mr|Mrs|Ms|Dr|Er)\.\s*/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}

/** Anchor id of a category team on /organisation, e.g. "team-tech". */
export const categoryTeamId = (categoryId) => `team-${categoryId}`;

/**
 * One team per event category: its events and their student heads (from
 * events-data.js), e.g. { id: "team-tech", name: "Coding & Tech Team", ... }.
 */
export function categoryTeams() {
  return EVENT_CATEGORIES.filter((c) => c.id !== "all").map((c) => {
    const events = EVENTS_DATA.filter((ev) => ev.category === c.id);
    const seen = new Set();
    const heads = [];
    for (const ev of events) {
      for (const p of ev.coordinators || []) {
        if (seen.has(p.name)) continue;
        seen.add(p.name);
        heads.push({ name: p.name, role: p.role, events: events.filter((x) => (x.coordinators || []).some((q) => q.name === p.name)).map((x) => x.title) });
      }
    }
    return { id: categoryTeamId(c.id), categoryId: c.id, name: `${titleCase(c.name)} Team`, accent: c.accent, events, people: heads };
  });
}

/** The team that organises an event: { name, href } for its "Organised by" block. */
export function organiserFor(ev) {
  const c = EVENT_CATEGORIES.find((x) => x.id === ev.category);
  return {
    name: c ? `${titleCase(c.name)} Team` : "Organising Committee",
    href: c ? `/organisation#${categoryTeamId(c.id)}` : "/organisation",
  };
}

function titleCase(s) {
  return s.toLowerCase().replace(/(^|[\s&])([a-z])/g, (m, sep, ch) => sep + ch.toUpperCase());
}
