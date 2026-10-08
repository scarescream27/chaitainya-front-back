/**
 * ============================================================================
 * File: teams-data.js
 * Purpose: The organising teams, shared by /about, /organisers and the
 * "Organised by" block of every event. Real names only.
 * ============================================================================
 */

// Source: "Chaitanya Teams 2026". Names and roles only. Order is the order
// on /organisers and in the home organisers slider: the coordinators of the
// whole fest, then the website developers, then the team coordinators below.
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

// The fest's organising teams and their student coordinators, in the order of
// "Chaitanya Teams 2026". Names only (no contact or roll numbers on the site).
// Event student heads are listed on the events page only.
export const ORG_TEAMS = [
  { id: "team-technical", name: "Technical Team", coordinators: ["Manas Kapoor"] },
  { id: "team-finance", name: "Finance Team", coordinators: ["Krish Kanha"] },
  { id: "team-disciplinary", name: "Disciplinary Team", coordinators: ["Akhil Thakur"] },
  { id: "team-design", name: "Design Team", coordinators: ["Lavanya Chambial"] },
  { id: "team-marketing", name: "Marketing Team", coordinators: ["Kashish Chandel"] },
  { id: "team-requirements", name: "Requirement Gathering & Maintenance Team", coordinators: ["Shahid Ansari"] },
  { id: "team-cultural", name: "Cultural Management Team", coordinators: ["Ankita Thakur"] },
  { id: "team-decor", name: "Decor Team", coordinators: ["Ishita Parmar"] },
  { id: "team-activity", name: "Activity Planning Team", coordinators: ["Rohit Kumar"] },
  { id: "team-pr", name: "PR Team", coordinators: ["Shriya Verma"] },
  { id: "team-stage", name: "Stage Handling Team", coordinators: ["Lata"] },
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
 * Everyone on /organisers, in page order, merged by name:
 * { slug, name, roles, teams, events }. Event coordinators, website
 * developers, then team coordinators. events stays empty: event student
 * heads are listed on the events page only.
 */
export function allPeople() {
  const by = new Map();
  const add = (name, role, team) => {
    const p = by.get(name) || { slug: personSlug(name), name, roles: [], teams: [], events: [] };
    if (!p.roles.includes(role)) p.roles.push(role);
    if (!p.teams.some((t) => t.id === team.id)) p.teams.push({ id: team.id, name: team.name });
    by.set(name, p);
  };
  for (const tm of TEAMS) for (const m of tm.people) add(m.name, m.role, { id: tm.id, name: tm.name });
  for (const tm of teamGroups()) for (const m of tm.people) add(m.name, m.role, tm);
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

const TEAM_TINTS = ["var(--cat-tech)", "var(--cat-innovation)", "var(--cat-business)", "var(--cat-esports)", "var(--cat-cultural)"];

/**
 * The organising teams with their coordinators as people, e.g.
 * { id: "team-technical", name: "Technical Team", accent, people: [{ name, role }] }.
 */
export function teamGroups() {
  return ORG_TEAMS.map((t, i) => ({
    id: t.id,
    name: t.name,
    accent: TEAM_TINTS[i % TEAM_TINTS.length],
    people: t.coordinators.map((name) => ({ name, role: `${t.name.replace(/ Team$/, "")} Coordinator` })),
  }));
}

/** "Organised by" on an event: the fest's organising teams on /organisers. */
export function organiserFor() {
  return { name: "Chaitanya 2k26 Organising Teams", href: "/organisers" };
}
