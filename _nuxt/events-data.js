/**
 * ============================================================================
 * Chaitanya 2k26 — Official Event Catalog
 * ============================================================================
 * Source: "Event Student Heads" list from the organising committee.
 * Fest days: Day 1 = 30 Oct, Day 2 = 31 Oct, Day 3 = 1 Nov 2026.
 *
 * Fields the committee has not confirmed yet (entry fee, prizes, team size,
 * rules) are marked "To be notified". To open registration for an event, set
 * `entryFeeNum`, `minTeam`/`maxTeam` and `registrationOpen: true` on it.
 */

const TBN = "To be notified";

export const EVENT_CATEGORIES = [
  { id: "all", name: "ALL EVENTS", shortCode: "ALL", count: 20 },
  { id: "tech", name: "CODING & TECH", shortCode: "TECH", count: 6, accent: "#0070f3" },
  { id: "innovation", name: "DESIGN & INNOVATION", shortCode: "BUILD", count: 3, accent: "#ff6b35" },
  { id: "business", name: "BUSINESS & DEBATE", shortCode: "PITCH", count: 3, accent: "#005a3c" },
  { id: "esports", name: "ESPORTS", shortCode: "PLAY", count: 3, accent: "#a048fe" },
  { id: "cultural", name: "CULTURAL & FUN", shortCode: "CULTURE", count: 5, accent: "#e63b7a" },
];

const CATEGORY_NAMES = Object.fromEntries(EVENT_CATEGORIES.map((c) => [c.id, c.name]));

function heads(...names) {
  return names.map((name) => ({ name, role: "Student Head" }));
}

function event(e) {
  return {
    badge: CATEGORY_NAMES[e.category],
    categoryName: CATEGORY_NAMES[e.category],
    format: TBN,
    teamSize: TBN,
    minTeam: 1,
    maxTeam: 1,
    entryFee: TBN,
    entryFeeNum: 0,
    prizePool: TBN,
    venue: TBN,
    date: "Day TBA",
    time: TBN,
    status: "REGISTRATION: TO BE NOTIFIED",
    registrationOpen: false,
    rules: ["Detailed rules and eligibility will be announced soon."],
    rounds: [],
    judgingCriteria: [],
    coordinators: [],
    ...e,
  };
}

export const EVENTS_DATA = [
  // --------------------------------------------------------------------------
  // CODING & TECH
  // --------------------------------------------------------------------------
  event({
    id: "codeforge-reforged",
    title: "CODEFORGE: REFORGED 2.0",
    tagline: "24-hour hackathon: build something real from scratch",
    category: "tech",
    badge: "FLAGSHIP HACKATHON",
    date: "DAY 1 – 2",
    time: "30 Oct, 6:00 PM – 31 Oct, 6:00 PM (24 hrs)",
    venue: "Electrical Labs 307 & 308, 3rd floor",
    overview:
      "The flagship 24-hour hackathon of Chaitanya 2k26. Teams ideate, design and build a working project overnight and present it to the judges at the end of the sprint.",
    coordinators: heads("Priyanshu"),
  }),
  event({
    id: "capture-the-flag",
    title: "CTF: CAPTURE THE FLAG",
    tagline: "Cybersecurity challenges: find the flags, climb the scoreboard",
    category: "tech",
    date: "DAY 3",
    time: "1 Nov, 8:00 AM – 4:00 PM (8 hrs)",
    venue: "3 computer labs (rooms to be announced)",
    overview:
      "An 8-hour capture-the-flag contest with challenges across web security, cryptography, forensics and reverse engineering. Solve challenges to capture flags and score points.",
    coordinators: heads("Ritik Chauhan", "Paras Rana"),
  }),
  event({
    id: "competitive-programming",
    title: "COMPETITIVE PROGRAMMING",
    tagline: "Algorithms against the clock",
    category: "tech",
    date: "DAY 1",
    time: "30 Oct, 10:00 AM – 1:00 PM (3 hrs)",
    venue: "2 computer labs (rooms to be announced)",
    overview:
      "A 3-hour algorithmic programming contest. Solve as many problems as you can, as efficiently as you can, before time runs out.",
    coordinators: heads("Manas Kapoor"),
  }),
  event({
    id: "error-404",
    title: "ERROR 404",
    tagline: "Find the bugs before they find you",
    category: "tech",
    venue: "Rooms 207 & 208",
    overview: "A debugging challenge: track down and fix the errors hidden in the code. Format details will be announced soon.",
    coordinators: heads("Rohit", "Gourav", "Sourav"),
  }),
  event({
    id: "prompt-engineering",
    title: "PROMPT ENGINEERING",
    tagline: "Get the best out of AI with the right prompt",
    category: "tech",
    time: "3 hrs",
    overview: "A 3-hour challenge where participants craft prompts to get AI tools to solve the given tasks as accurately as possible.",
    coordinators: heads("Karan"),
  }),
  event({
    id: "ui-ux-designathon",
    title: "UI/UX DESIGNATHON",
    tagline: "Design the interface, own the experience",
    category: "tech",
    overview: "A design sprint to create user interfaces and experiences for a given problem statement. Details will be announced soon.",
  }),

  // --------------------------------------------------------------------------
  // DESIGN & INNOVATION
  // --------------------------------------------------------------------------
  event({
    id: "cadcraft",
    title: "CADCRAFT",
    tagline: "Model it, engineer it, nail the design",
    category: "innovation",
    date: "DAY 1",
    time: "30 Oct, 1:00 PM – 5:00 PM (4 hrs)",
    venue: "2 computer labs (rooms to be announced)",
    overview: "A 4-hour CAD modelling competition: turn the given problem into a precise, well-engineered 3D design.",
    coordinators: heads("Mahek", "Gargi"),
  }),
  event({
    id: "cube-conquest",
    title: "CUBE CONQUEST",
    tagline: "Speedcubing showdown",
    category: "innovation",
    date: "DAY 2",
    time: "31 Oct, 9:00 AM – 10:00 AM (1 hr)",
    venue: "Open Air Theatre (OAT)",
    overview: "A Rubik's cube solving competition. Bring your fastest hands.",
    coordinators: heads("Sourav", "Ankita"),
  }),
  event({
    id: "innovation-fair",
    title: "INNOVATION FAIR",
    tagline: "Showcase your projects and prototypes",
    category: "innovation",
    overview: "An exhibition for student projects, prototypes and ideas. Display your work and present it to visitors and judges.",
    coordinators: heads("Ankush", "Divyanshi"),
  }),

  // --------------------------------------------------------------------------
  // BUSINESS & DEBATE
  // --------------------------------------------------------------------------
  event({
    id: "pitch-sansad",
    title: "PITCH SANSAD",
    tagline: "Pitch your startup idea to the house",
    category: "business",
    venue: "Conference Hall",
    overview: "A startup pitch competition. Present your idea, defend it under questioning and convince the panel.",
  }),
  event({
    id: "marketmind",
    title: "MARKETMIND: THE PRODUCT CASE CHALLENGE",
    tagline: "Crack the product case, present the strategy",
    category: "business",
    time: "2 hrs",
    venue: "Conference Hall",
    overview: "A 2-hour product and business case challenge. Analyse the case, build a strategy and present your solution.",
  }),
  event({
    id: "model-lok-sabha",
    title: "MODEL LOK SABHA",
    tagline: "Debate, legislate and represent",
    category: "business",
    date: "DAY 1 – 2",
    time: "7 hrs across Day 1 & 2 (timings to be announced)",
    venue: "Conference Hall",
    overview: "A simulation of the Lok Sabha where participants represent members of parliament, debate issues and work through parliamentary procedure.",
    coordinators: heads("Soummya Jamwal", "Ankush"),
  }),

  // --------------------------------------------------------------------------
  // ESPORTS
  // --------------------------------------------------------------------------
  event({
    id: "esports-cs2",
    title: "ESPORTS: COUNTER-STRIKE 2",
    tagline: "Tactical 5v5 on campus",
    category: "esports",
    overview: "A Counter-Strike 2 tournament. Format and schedule will be announced soon.",
    coordinators: heads("Rhythm Rangra"),
  }),
  event({
    id: "esports-bgmi",
    title: "ESPORTS: BGMI",
    tagline: "Battle royale squads, last one standing",
    category: "esports",
    date: "DAY 2",
    time: "8 hrs (timings to be announced)",
    overview: "A BGMI tournament running through Day 2. Squad format and match schedule will be announced soon.",
    coordinators: heads("Praveen", "Anurag"),
  }),
  event({
    id: "esports-free-fire",
    title: "ESPORTS: FREE FIRE",
    tagline: "Fast-paced battle royale",
    category: "esports",
    date: "DAY 1",
    time: "4 hrs (timings to be announced)",
    overview: "A Free Fire tournament on Day 1. Squad format and match schedule will be announced soon.",
    coordinators: heads("Dhruv Rangra", "Ankush"),
  }),

  // --------------------------------------------------------------------------
  // CULTURAL & FUN
  // --------------------------------------------------------------------------
  event({
    id: "nerd-wars",
    title: "NERD WARS",
    tagline: "Quizzes, puzzles and pure nerd power",
    category: "cultural",
    date: "DAY 2",
    time: "2 hrs (timings to be announced)",
    venue: "Open Air Theatre (OAT)",
    overview: "A fun battle of wits for the biggest nerds on campus. Format will be announced soon.",
    coordinators: heads("Shabnam Minhas", "Anshita", "Sourav"),
  }),
  event({
    id: "treasure-hunt",
    title: "TREASURE HUNT",
    tagline: "Follow the clues across campus",
    category: "cultural",
    time: "3 hrs",
    overview: "A 3-hour campus-wide treasure hunt. Decode the clues, race between checkpoints and find the treasure first.",
    coordinators: heads("Mahek", "Gargi", "Aparna Sharma"),
  }),
  event({
    id: "capture-the-moment",
    title: "CAPTURE THE MOMENT",
    tagline: "Photography: tell the fest's story in a frame",
    category: "cultural",
    venue: "Ground floor",
    overview: "A photography competition. Capture the best moments of Chaitanya 2k26.",
    coordinators: heads("Dhruv Rangra", "Kartik"),
  }),
  event({
    id: "cultural-walk",
    title: "CULTURAL WALK",
    tagline: "A walk through the cultures of India",
    category: "cultural",
    overview: "A cultural parade celebrating traditions, attire and heritage. Details will be announced soon.",
    coordinators: heads("Ankita Thakur", "Dhruv", "Gargi"),
  }),
  event({
    id: "dance-competition",
    title: "DANCE COMPETITION",
    tagline: "Own the stage",
    category: "cultural",
    overview: "Solo and group dance performances. Categories and rules will be announced soon.",
    coordinators: heads("Ankita Thakur", "Gargi"),
  }),
];

export function getEventCatalog() {
  return EVENTS_DATA;
}

export function getEventById(id) {
  if (!id) return null;
  return EVENTS_DATA.find((ev) => ev.id.toLowerCase() === id.toLowerCase()) || null;
}

export function getCategories() {
  return EVENT_CATEGORIES;
}

export function isRegistrationOpen(ev) {
  return Boolean(ev && ev.registrationOpen);
}

export function filterEvents(category = "all", searchQuery = "") {
  let list = EVENTS_DATA;

  if (category && category !== "all") {
    list = list.filter((ev) => ev.category === category);
  }

  if (searchQuery && searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    list = list.filter((ev) =>
      [ev.title, ev.tagline, ev.categoryName, ev.venue, ev.badge, ev.format, ...(ev.coordinators || []).map((c) => c.name)]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q))
    );
  }

  return list;
}
