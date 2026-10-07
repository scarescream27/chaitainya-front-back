/**
 * ============================================================================
 * File: teams-data.js
 * Purpose: The organising teams, shared by /about, /organisers and the
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

// Optional profile details for /organisers/<slug>, keyed by exact name, e.g.
//   "Aditya Verma": { department: "CSE, 3rd year", from: "Hamirpur, HP", email: "..." },
// Only fill in what the person has agreed to share; empty fields are hidden.
export const PROFILES = {};

/** URL slug of a person, e.g. "Aditya Verma" -> "aditya-verma". */
export const personSlug = (name) =>
  name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/**
 * Everyone on /organisers, merged by name: { slug, name, roles, teams, events }.
 * events are event objects this person heads.
 */
export function allPeople() {
  const by = new Map();
  const add = (name, role, team, events = []) => {
    const p = by.get(name) || { slug: personSlug(name), name, roles: [], teams: [], events: [] };
    if (!p.roles.includes(role)) p.roles.push(role);
    if (!p.teams.some((t) => t.id === team.id)) p.teams.push({ id: team.id, name: team.name });
    for (const ev of events) if (!p.events.includes(ev)) p.events.push(ev);
    by.set(name, p);
  };
  for (const tm of TEAMS) for (const m of tm.people) add(m.name, m.role, { id: "core-team", name: tm.name });
  for (const tm of categoryTeams())
    for (const m of tm.people)
      add(m.name, m.role, tm, tm.events.filter((ev) => (ev.coordinators || []).some((q) => q.name === m.name)));
  return [...by.values()];
}

export function initials(name) {
  return name
    .replace(/^(Mr|Mrs|Ms|Dr|Er)\.\s*/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}

/** Anchor id of a category team on /organisers, e.g. "team-tech". */
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
    href: c ? `/organisers#${categoryTeamId(c.id)}` : "/organisers",
  };
}

function titleCase(s) {
  return s.toLowerCase().replace(/(^|[\s&])([a-z])/g, (m, sep, ch) => sep + ch.toUpperCase());
}
