/**
 * ============================================================================
 * Chaitanya 2k26 — Official Event Catalog
 * ============================================================================
 * Source: "Event Student Heads" list from the organising committee.
 * Fest days: Day 1 = 30 Oct, Day 2 = 31 Oct, Day 3 = 1 Nov 2026.
 *
 * Fields the committee has not confirmed yet (entry fee, prizes, rules) are
 * marked "To be notified". Team limits below are PROVISIONAL.
 *
 * To open registration for an event: set `entryFeeNum` (0 = free) and
 * `registrationOpen: true`. Set FEST_REGISTRATION_OPEN below to open all.
 *
 * registrationType: "solo" | "team" | "both" (solo or team).
 * startsAt / endsAt: ISO times in IST, used for "Add to Google Calendar".
 */

// Master switch: true opens every event that doesn't set registrationOpen itself.
export const FEST_REGISTRATION_OPEN = true;

// Kill switch: set to true to shut down registration for EVERY event at once
// (e.g. on the fest day). Overrides everything else; shows "REGISTRATION CLOSED".
export const REGISTRATIONS_CLOSED = false;

// Temporary pause: no registrations or bookings until this moment (IST); they
// reopen by themselves afterwards, no redeploy needed. Shows "REGISTRATION
// SOON". Set to null for no pause. Keep in sync with registrationsPaused()
// in firestore.rules. (Paused 8 Oct 2026 after the site link leaked early.)
export const REGISTRATIONS_PAUSED_UNTIL = null;

export function isRegistrationPaused(now = Date.now()) {
  return Boolean(REGISTRATIONS_PAUSED_UNTIL) && now < Date.parse(REGISTRATIONS_PAUSED_UNTIL);
}
export const REGISTRATION_DEADLINE = "2026-10-29T23:59:00+05:30";

const TBN = "To be notified";

// Events that have a poster: images/events/<event id>.webp (900px wide,
// square or 4:5) plus <event id>-bg.webp, a tiny blurred copy that fills the
// rest of a box so the whole poster shows with no cropping and no black bars.
// To add one, drop both files in and add the id here; events without a
// poster keep the category glyph.
// Bump when a poster file is replaced under the same name: images are cached
// for 7 days (firebase.json), so a new ?v= makes browsers fetch the new one.
const POSTER_V = "3";
const POSTERS = new Set([
  "codeforge-reforged",
  "capture-the-flag",
  "error-404",
  "prompt-engineering",
  "cube-conquest",
  "esports-cs2",
  "treasure-hunt",
  "cultural-walk",
  "dance-competition",
  "pitch-sansad",
  "capture-the-moment",
  "nerd-wars",
  "ui-ux-designathon",
  "innovation-fair",
]);

// Accents are the --cat-* tokens in tokens.css (rendered as inline CSS colours);
// they pass WCAG AA (4.5:1) for 12px labels on the cards. Change the hues in
// tokens.css, not here.
export const EVENT_CATEGORIES = [
  { id: "all", name: "ALL", shortCode: "ALL", count: 20 },
  { id: "tech", name: "CODING & TECH", shortCode: "TECH", count: 6, accent: "var(--cat-tech)" },
  { id: "innovation", name: "DESIGN & INNOVATION", shortCode: "BUILD", count: 3, accent: "var(--cat-innovation)" },
  { id: "business", name: "BUSINESS & DEBATE", shortCode: "PITCH", count: 3, accent: "var(--cat-business)" },
  { id: "esports", name: "ESPORTS", shortCode: "PLAY", count: 3, accent: "var(--cat-esports)" },
  { id: "cultural", name: "CULTURAL & FUN", shortCode: "CULTURE", count: 5, accent: "var(--cat-cultural)" },
];

const CATEGORY_NAMES = Object.fromEntries(EVENT_CATEGORIES.map((c) => [c.id, c.name]));

function heads(...names) {
  return names.map((name) => ({ name, role: "Student Head" }));
}

function formatLabel(type, min, max) {
  const size = min === max ? `${max}` : `${min}–${max}`;
  if (type === "solo") return "Solo";
  if (type === "team") return `Team (${size} members)`;
  return `Solo or team (up to ${max})`;
}

function event(e) {
  const type = e.registrationType || "solo";
  const minTeam = e.minTeam || 1;
  const maxTeam = type === "solo" ? 1 : e.maxTeam || 4;
  return {
    badge: CATEGORY_NAMES[e.category],
    categoryName: CATEGORY_NAMES[e.category],
    registrationType: type,
    minTeam,
    maxTeam,
    format: formatLabel(type, minTeam, maxTeam),
    teamSize: type === "solo" ? "1" : `${minTeam}–${maxTeam}`,
    deadline: REGISTRATION_DEADLINE,
    startsAt: null,
    endsAt: null,
    entryFee: TBN,
    entryFeeNum: 0,
    prizePool: TBN,
    venue: TBN,
    date: "Day TBA",
    time: TBN,
    status: "REGISTRATION: TO BE NOTIFIED",
    rules: ["Full rules and who can take part will be shared soon."],
    rounds: [],
    judgingCriteria: [],
    coordinators: [],
    ...e,
    poster: POSTERS.has(e.id) ? `/images/events/${e.id}.webp?v=${POSTER_V}` : null,
    posterBg: POSTERS.has(e.id) ? `/images/events/${e.id}-bg.webp?v=${POSTER_V}` : null,
    registrationType: type,
    minTeam,
    maxTeam,
    registrationOpen: e.registrationOpen ?? FEST_REGISTRATION_OPEN,
  };
}

export const EVENTS_DATA = [
  // --------------------------------------------------------------------------
  // CODING & TECH
  // --------------------------------------------------------------------------
  event({
    id: "codeforge-reforged",
    entryFeeNum: 199, entryFee: "₹199", prizePool: "1st ₹7,000 · 2nd ₹4,500 · 3rd ₹3,500",
    registrationType: "team", minTeam: 2, maxTeam: 4, startsAt: "2026-10-30T18:00:00+05:30", endsAt: "2026-10-31T18:00:00+05:30",
    title: "CODEFORGE: REFORGED 2.0",
    tagline: "24-hour open-source hackathon: build something real from scratch",
    category: "tech",
    badge: "FLAGSHIP HACKATHON",
    date: "DAY 1 – 2",
    time: "30 Oct, 6:00 PM – 31 Oct, 6:00 PM (24 hrs)",
    venue: "Electrical Labs 307 & 308, 3rd floor",
    overview:
      "The main hackathon of Chaitanya 2k26. Teams get 24 hours to plan, design and build a working open-source project through the night. When time is up, they show it to the judges.",
    coordinators: heads("Priyanshu"),
  }),
  event({
    id: "capture-the-flag",
    entryFeeNum: 199, entryFee: "₹199", prizePool: "1st ₹4,000 · 2nd ₹3,000 · 3rd ₹2,000",
    registrationType: "both", maxTeam: 3, startsAt: "2026-11-01T08:00:00+05:30", endsAt: "2026-11-01T16:00:00+05:30",
    title: "CTF: CAPTURE THE FLAG",
    tagline: "Hacking puzzles: find the flags, climb the scoreboard",
    category: "tech",
    date: "DAY 3",
    time: "1 Nov, 8:00 AM – 4:00 PM (8 hrs)",
    venue: "3 computer labs (rooms to be announced)",
    overview:
      "Eight hours of security puzzles. Topics: web security, code-breaking (cryptography), digital detective work (forensics) and taking programs apart (reverse engineering). Solve a puzzle to find its hidden flag, then submit the flag for points.",
    coordinators: heads("Ritik Chauhan", "Paras Rana"),
  }),
  event({
    id: "competitive-programming",
    entryFeeNum: 49, entryFee: "₹49", prizePool: "Mementos for the top 3",
    registrationType: "solo", startsAt: "2026-10-31T10:00:00+05:30", endsAt: "2026-10-31T13:00:00+05:30",
    title: "COMPETITIVE PROGRAMMING",
    tagline: "Solve coding problems against the clock",
    category: "tech",
    date: "DAY 2",
    time: "31 Oct, 10:00 AM – 1:00 PM (3 hrs)",
    venue: "2 computer labs (rooms to be announced)",
    overview:
      "Solve as many coding problems as you can in 3 hours. Your code must give the right answer and run fast. Solo entry.",
    coordinators: heads("Manas Kapoor"),
  }),
  event({
    id: "error-404",
    entryFeeNum: 20, entryFee: "₹20", prizePool: "1st Memento · 2nd Memento · 3rd Medal",
    registrationType: "solo", startsAt: "2026-11-01T10:00:00+05:30", endsAt: "2026-11-01T12:00:00+05:30",
    title: "ERROR 404",
    tagline: "Code not found. Find it. Fix it. Finish it.",
    category: "tech",
    badge: "C++ DEBUGGING",
    date: "DAY 3",
    time: "1 Nov, 10:00 AM – 12:00 PM (2 hrs, all rounds)",
    venue: "Rooms 207 & 208 (computer lab)",
    overview:
      "A C++ contest where you fix and finish code. It is also listed as Glitch Code. Each round shows code on a big screen. Find the bug, fix it or write the missing part, faster and better than everyone else. Solo entry, C++ only. There are three rounds, and each one is harder than the last.",
    rules: [
      "Solo event: one person per entry, no teams.",
      "Use only C++ in every round.",
      "No mobile phones at all during the event.",
      "No internet, AI tools or outside help of any kind.",
      "Do not talk to or copy from other participants.",
      "Time limits are strict. Once time is up, no answers are accepted.",
      "Code and questions on screen are secret. Do not write them down or share them.",
      "The judges and coordinators have the final say.",
      "Anyone caught cheating or breaking the rules is removed at once.",
      "Be on time and always follow the coordinators' instructions.",
    ],
    rounds: [
      {
        name: "Round 1: Bug Hunt (easy)",
        time: "1 min",
        description:
          "A C++ program with many errors is shown on screen. Find as many errors as you can. Send them through the Google Form given at the venue. About the top half (~50%) move on. A tie at the cut-off is broken with a harder 30-second code.",
      },
      {
        name: "Round 2: Fix & Run (medium)",
        time: "2 min",
        description: "Find the error in a new program, fix it and show the right output. Faster right answers rank higher. About the top half (~50%) of those left move on.",
      },
      {
        name: "Round 3: Complete the Code (hard)",
        time: "3 min",
        description: "Finish an incomplete C++ pattern program and show the output. The code itself is your hint. The top 3 win.",
      },
    ],
    coordinators: heads("Rohit", "Gourav", "Sourav"),
  }),
  event({
    id: "prompt-engineering",
    entryFeeNum: 49, entryFee: "₹49", prizePool: "1st ₹1,000 · 2nd ₹750 · 3rd ₹500",
    registrationType: "solo",
    title: "PROMPT ENGINEERING",
    tagline: "Write the prompt that gets AI to the right answer",
    category: "tech",
    time: "3 hrs (date to be announced)",
    overview: "You get 3 hours and a set of tasks. Write prompts that get AI tools to solve each task as correctly as possible.",
    coordinators: heads("Karan"),
  }),
  event({
    id: "ui-ux-designathon",
    entryFeeNum: 49, entryFee: "₹49", prizePool: "1st Memento · 2nd Memento · 3rd Medal",
    registrationType: "both", maxTeam: 2, startsAt: "2026-11-01T14:00:00+05:30", endsAt: "2026-11-01T17:00:00+05:30",
    title: "UI/UX DESIGNATHON",
    tagline: "Design app screens that solve a given problem",
    category: "tech",
    date: "DAY 3",
    time: "1 Nov, 2:00 PM – 5:00 PM (3 hrs)",
    venue: "Room 108",
    overview: "A 3-hour design contest for one person or a pair. Design the screens, and how people will use them, for a given problem. Full details to be announced.",
  }),

  // --------------------------------------------------------------------------
  // DESIGN & INNOVATION
  // --------------------------------------------------------------------------
  event({
    id: "cadcraft",
    entryFeeNum: 49, entryFee: "₹49", prizePool: "Mementos for the top 3",
    registrationType: "solo", startsAt: "2026-10-30T13:00:00+05:30", endsAt: "2026-10-30T17:00:00+05:30",
    title: "CADCRAFT",
    tagline: "CAD modelling: build it in 3D and get the design right",
    category: "innovation",
    date: "DAY 1",
    time: "30 Oct, 1:00 PM – 5:00 PM (4 hrs)",
    venue: "2 computer labs (rooms to be announced)",
    overview: "A 4-hour solo contest in CAD (computer design software). Read the problem, then turn it into an exact, well-built 3D model.",
    coordinators: heads("Mahek", "Gargi"),
  }),
  event({
    id: "cube-conquest",
    entryFeeNum: 25, entryFee: "₹25", prizePool: "Medals for the top 3",
    registrationType: "solo", startsAt: "2026-10-31T09:00:00+05:30", endsAt: "2026-10-31T10:00:00+05:30",
    title: "CUBE CONQUEST",
    tagline: "Speedcubing: three rounds, one Mirror Cube final",
    category: "innovation",
    badge: "SPEED CUBING",
    date: "DAY 2",
    time: "31 Oct, 9:00 AM – 10:00 AM (1 hr)",
    venue: "Open Air Theatre (OAT)",
    overview:
      "Three rounds of speedcubing. Each round has two sub-rounds. Cubers move up round by round, and the Mirror Cube final picks the winners. The organisers give every puzzle, timer and scramble card.",
    rules: [
      "Each cuber gets 1 try per sub-round.",
      "You get 15 seconds to look at the puzzle (inspection) before every solve. You may hold it and turn it around in your hands, but make no moves.",
      "The organisers mix up (scramble) the puzzles. Everyone in the same group gets the same scramble.",
      "The timer starts when you lift both hands off the cube/timer pad. It stops when you put both hands back.",
      "When the timer stops, the puzzle must be fully solved (or fully in the asked pattern). Any visible mistake is a DNF (did not finish).",
      "In each sub-round, you are ranked by your best single time.",
      "Penalties: inspection over 15 s = +2 s; over 17 s = DNF; making a move during inspection = DNF.",
      "Cheating, using a puzzle that is not allowed, or disturbing others gets you removed.",
      "The organisers give all the puzzles. Bring your own cube only if the judges say yes beforehand.",
      "Do not talk to or coach a cuber while they are solving. Viewers must stay behind the marked line.",
      "The judges have the final say.",
    ],
    rounds: [
      { name: "Round 1", time: "2x2 cube · Pyramid", description: "First round. Cubers who beat the cut-off time move to Round 2." },
      { name: "Round 2", time: "3x3 cube · Pattern on 3x3", description: "Solve the Rubik's Cube. Then make the announced pattern (like a checkerboard) from a solved cube. The cut-off time decides who moves on." },
      { name: "Round 3 (Final)", time: "Mirror Cube", description: "This cube is solved by shape, not colour. All finalists get the same scramble. The fastest correct time wins." },
    ],
    coordinators: heads("Sourav", "Ankita"),
  }),
  event({
    id: "innovation-fair",
    entryFeeNum: 0, entryFee: "Free", prizePool: "1st ₹1,500 · 2nd ₹1,000 · 3rd ₹500",
    registrationType: "team", minTeam: 1, maxTeam: 4,
    title: "INNOVATION FAIR",
    tagline: "Project show: bring what you built and explain it",
    category: "innovation",
    overview: "A show of student projects, working models and ideas. Set up your work and explain it to visitors and judges. Come solo or in a team of up to 4.",
    coordinators: heads("Ankush", "Divyanshi"),
  }),

  // --------------------------------------------------------------------------
  // BUSINESS & DEBATE
  // --------------------------------------------------------------------------
  event({
    id: "pitch-sansad",
    entryFeeNum: 199, entryFee: "₹199", prizePool: "1st ₹1,000 · 2nd ₹600 · 3rd ₹400",
    registrationType: "team", minTeam: 1, maxTeam: 4, startsAt: "2026-11-01T10:00:00+05:30", endsAt: "2026-11-01T12:00:00+05:30",
    title: "AD IN HUSTLE",
    tagline: "Pitch contest: present your startup idea to the house",
    category: "business",
    date: "DAY 3",
    time: "1 Nov, 10:00 AM – 12:00 PM (2 hrs)",
    venue: "Conference Hall & labs",
    overview: "Pitch your startup idea to the panel. Answer their questions and win their vote. Enter solo or as a team of up to 4.",
  }),
  event({
    id: "marketmind",
    entryFeeNum: 199, entryFee: "₹199", prizePool: "1st ₹1,000 · 2nd ₹600 · 3rd ₹400",
    registrationType: "team", minTeam: 1, maxTeam: 3,
    title: "MARKETMIND: THE PRODUCT CASE CHALLENGE",
    tagline: "Solve a product problem and present your plan",
    category: "business",
    time: "2 hrs (date to be announced)",
    venue: "Conference Hall",
    overview: "Teams of up to 3 get a product and business problem, and 2 hours to solve it. Study the problem, make a plan and present your answer.",
  }),
  event({
    id: "model-lok-sabha",
    entryFeeNum: 49, entryFee: "₹49", prizePool: "Mementos for the top 3",
    registrationType: "both", maxTeam: 2, startsAt: "2026-10-31T14:00:00+05:30", endsAt: "2026-10-31T17:00:00+05:30",
    title: "MODEL LOK SABHA",
    tagline: "Mock Indian Parliament: play an MP, debate and make laws",
    category: "business",
    badge: "PARLIAMENTARY MUN",
    date: "DAY 2",
    time: "31 Oct, 2:00 PM – 5:00 PM (3 hrs)",
    venue: "Open Air Theatre (OAT)",
    overview:
      "A mock Parliament (MUN) that follows the Lok Sabha (House of the People) format. Each delegate plays a current MP and follows Lok Sabha rules. Topic: The Public Examinations (Prevention of Unfair Means) Legislation, and the problem of paper leaks and cheating in national and state exams like NEET, UGC-NET and state PSC exams. Debate in English or Hindi. Register alone or as a pair (double delegation). The secretariat (organisers) decides which MP you play.",
    rules: [
      "Call the Chair \"Hon'ble Speaker\" or \"Mr./Madam Speaker\". Call other members \"Hon'ble Member\" or \"Hon'ble Minister\". Speak only through the Chair.",
      "Stand when you speak. Stay seated while the Chair or another member speaks, unless you are raising a point.",
      "No rude language. That means no personal attacks and no abusive, communal, casteist, sexist or insulting remarks. Do not disrespect any religion, community, region or language.",
      "Dress code: formal Indian or Western clothes (Indian formals are welcome). Keep your MP name placard in view. No party symbols, slogans or campaign material.",
      "Each speech gets 60 seconds. If you go over time again and again, you may get a penalty.",
      "Points of Order, Information, Personal Privilege and Parliamentary Inquiry, and procedural motions, follow the rulebook. A procedural motion passes if more than half vote for it.",
      "Bills and resolutions must be typed, your own work, and approved by the Secretariat before you bring them in. A change (amendment) needs one member to propose it and one to second it.",
      "In the House, pass notes (chits) only through the Marshals. Gather support (lobbying) only during breaks or when the House is paused.",
      "Not allowed: copying others' work, fake facts or documents, pre-written bills that were not approved, unofficial groups formed in advance, and pretending to be another delegate.",
      "If the rulebook does not cover something, the Chair decides, following Lok Sabha practice.",
    ],
    rounds: [
      { name: "Order of business", time: "Each sitting", description: "Roll call & quorum check → agenda & General Speakers' List → open debate → calling attention motions & special mentions → bills & resolutions → end of sitting (adjournment)." },
      { name: "How a bill is passed", time: "Bills", description: "First reading (bill is introduced, no debate) → second reading (debate and changes, clause by clause) → third reading (final debate and vote)." },
    ],
    judgingCriteria: [
      { name: "Content & Research", weight: "20" },
      { name: "Speaking & Delivery", weight: "20" },
      { name: "Rules of Procedure", weight: "15" },
      { name: "Diplomacy & Good Conduct", weight: "15" },
      { name: "Debate & questions asked", weight: "15" },
      { name: "Document / Bill contribution", weight: "10" },
      { name: "Consistency & participation", weight: "5" },
    ],
    coordinators: heads("Soummya Jamwal", "Ankush"),
  }),

  // --------------------------------------------------------------------------
  // ESPORTS
  // --------------------------------------------------------------------------
  event({
    id: "esports-cs2",
    entryFeeNum: 199, entryFee: "₹199", prizePool: "1st ₹1,000 · 2nd ₹600 · 3rd ₹400",
    registrationType: "team", minTeam: 5, maxTeam: 6,
    title: "ESPORTS: COUNTER-STRIKE 2",
    tagline: "Team shooter, 5 vs 5, on campus",
    category: "esports",
    overview: "Counter-Strike 2 tournament for teams of 5–6. Format and schedule to be announced.",
    coordinators: heads("Rhythm Rangra"),
  }),
  event({
    id: "esports-bgmi",
    entryFeeNum: 199, entryFee: "₹199", prizePool: "1st ₹3,000 · 2nd ₹2,000 · 3rd ₹1,500",
    registrationType: "team", minTeam: 4, maxTeam: 4, allDay: ["2026-10-30", "2026-10-31"],
    title: "ESPORTS: BGMI",
    tagline: "Four-player squads, two days, twelve matches",
    category: "esports",
    badge: "BATTLE ROYALE",
    date: "DAY 1 – 2",
    time: "30 & 31 Oct, 12:00 PM – 4:00 PM each day",
    overview:
      "A BGMI battle royale tournament for 4-player squads, on the latest game version. Mobile devices only. Squads play six matches a day on Rondo, Erangel and Miramar. Points for your finishing place and your kills add up to the overall ranking.",
    rules: [
      "Each squad has exactly 4 players. Mobile devices only. No emulators or PC versions.",
      "Use your own BGMI account (no guest accounts) and the in-game name you gave when registering. Only registered players can play.",
      "Fully charge your device and check your internet is steady before every match.",
      "Carry your event or university ID in case the organisers ask for it.",
      "Voice chat only with your own registered team. No abuse, threats or toxic behaviour.",
      "Take a screenshot of your result/placement after every match. The captain sends it to the organisers within the given time.",
      "Not allowed: hacks, cheats, mods, scripts, exploits, outside tools that are not approved, sharing accounts, teaming up with other squads, using glitches, and faking screenshots or results. Any of these can get you removed.",
      "If a player disconnects, they count as eliminated, unless the organisers make a technical ruling. Tell the referee about real technical problems right away.",
      "Organisers and referees have the final say on match play, disputes, scoring and discipline.",
    ],
    rounds: [
      { name: "Qualifiers", time: "If more than 16 teams", description: "Teams are split into groups. Teams that qualify move on, based on the announced rules." },
      { name: "Day 1 (30 Oct)", time: "6 matches", description: "Map order: 1 Rondo, 3 Erangel, 2 Miramar." },
      { name: "Day 2 (31 Oct)", time: "6 matches", description: "Same map order, with the Smash Rule used as the organisers announce." },
    ],
    judgingCriteria: [
      { name: "Kill", weight: "1 pt each" },
      { name: "1st place (Chicken Dinner)", weight: "10" },
      { name: "2nd", weight: "6" },
      { name: "3rd", weight: "5" },
      { name: "4th", weight: "4" },
      { name: "5th", weight: "3" },
      { name: "6th", weight: "2" },
      { name: "7th–8th", weight: "1" },
      { name: "Below 8th", weight: "0 (kills still count)" },
    ],
    coordinators: heads("Praveen", "Anurag"),
  }),
  event({
    id: "esports-free-fire",
    entryFeeNum: 299, entryFee: "₹299", prizePool: "1st ₹4,000 · 2nd ₹2,500 · 3rd ₹1,500",
    registrationType: "team", minTeam: 4, maxTeam: 5, startsAt: "2026-11-01T11:00:00+05:30", endsAt: "2026-11-01T15:00:00+05:30",
    title: "ESPORTS: FREE FIRE",
    tagline: "Squad battle royale on Day 3",
    category: "esports",
    date: "DAY 3",
    time: "1 Nov, 11:00 AM – 3:00 PM (4 hrs)",
    overview: "Free Fire tournament for squads of 4–5. Squad format and match schedule to be announced.",
    coordinators: heads("Dhruv Rangra", "Ankush"),
  }),

  // --------------------------------------------------------------------------
  // CULTURAL & FUN
  // --------------------------------------------------------------------------
  event({
    id: "nerd-wars",
    entryFeeNum: 75, entryFee: "₹75", prizePool: "1st ₹1,000 · 2nd ₹750 · 3rd ₹500",
    registrationType: "team", minTeam: 2, maxTeam: 3, startsAt: "2026-10-31T11:00:00+05:30", endsAt: "2026-10-31T13:00:00+05:30",
    title: "NERD WARS",
    tagline: "The fest quiz: general knowledge, puzzles and quick thinking",
    category: "cultural",
    date: "DAY 2",
    time: "31 Oct, 11:00 AM – 1:00 PM (2 hrs)",
    venue: "Open Air Theatre (OAT)",
    overview: "The official Chaitanya 2k26 quiz, for teams of 2–3 who love general knowledge and puzzles. Round details to be announced.",
    coordinators: heads("Shabnam Minhas", "Anshita", "Sourav"),
  }),
  event({
    id: "treasure-hunt",
    entryFeeNum: 199, entryFee: "₹199", prizePool: "1st ₹2,000 · 2nd ₹1,000 · 3rd ₹500",
    registrationType: "team", minTeam: 3, maxTeam: 4, startsAt: "2026-10-30T11:00:00+05:30", endsAt: "2026-10-30T14:00:00+05:30",
    title: "TREASURE HUNT",
    tagline: "Follow the clues across campus",
    category: "cultural",
    date: "DAY 1",
    time: "30 Oct, 11:00 AM – 2:00 PM (3 hrs)",
    overview: "Three hours, one campus, a trail of clues. Solve each clue, race between checkpoints and find the treasure before the other teams.",
    coordinators: heads("Mahek", "Gargi", "Aparna Sharma"),
  }),
  event({
    id: "capture-the-moment",
    entryFeeNum: 20, entryFee: "₹20", prizePool: "Medals for the top 3",
    registrationType: "solo",
    title: "CAPTURE THE MOMENT",
    tagline: "Photography: tell the fest's story in one photo",
    category: "cultural",
    date: "DAY 1 – 3",
    time: "Runs all through the fest · last entries by 4:00 PM",
    venue: "Ground floor",
    overview: "A photo contest that runs all three fest days. Take photos of the best fest moments and send your entries by the 4:00 PM final deadline.",
    coordinators: heads("Dhruv Rangra", "Kartik"),
  }),
  event({
    id: "cultural-walk",
    entryFeeNum: 50, entryFee: "₹50", prizePool: "1st ₹2,000 · 2nd ₹1,500 · 3rd ₹1,000",
    registrationType: "both", maxTeam: 10,
    title: "UNLEASHED",
    tagline: "A walk through the cultures of India",
    category: "cultural",
    overview: "A parade of clothes, traditions and culture from every part of India. Walk solo or in a group of up to 10. Details to be announced.",
    coordinators: heads("Ankita Thakur", "Dhruv", "Gargi"),
  }),
  event({
    id: "dance-competition",
    entryFeeNum: 0, entryFee: "Free", prizePool: "1st Memento · 2nd Memento · 3rd Medal",
    registrationType: "both", maxTeam: 12,
    title: "RHYTHMIC RUMBLE",
    tagline: "Own the stage",
    category: "cultural",
    overview: "Dance solo or with a group of up to 12. Dance categories and rules to be announced.",
    coordinators: heads("Ankita Thakur", "Gargi"),
  }),
];
// Accommodation package, booked through the same cart / checkout / pass flow
// as an event. Deliberately NOT in EVENTS_DATA, so event counts, grids,
// filters and the home rows don't include it; getEventById() still finds it.
export const ACCOMMODATION = event({
  id: "accommodation",
  title: "ACCOMMODATION",
  category: "accommodation",
  categoryName: "ACCOMMODATION",
  badge: "ACCOMMODATION",
  registrationType: "solo",
  entryFeeNum: 999,
  entryFee: "₹999",
  tagline: "Stay on campus for all three fest nights, breakfast and dinner included",
  date: "29 OCT – 1 NOV",
  time: "Check in 29 Oct (evening) · Check out 1 Nov",
  allDay: ["2026-10-29", "2026-11-01"],
  venue: "HPTU Hamirpur campus",
  status: "BOOKING",
  overview:
    "Stay on the HPTU Hamirpur campus for all three fest nights. Check in on the evening of 29 Oct and check out on 1 Nov. Meals: 2 a day, breakfast and dinner, for 3 days (6 meals in all). Dinner is served when you arrive on 29 October.",
  rules: [
    "One booking per person.",
    "Carry your college ID and a government photo ID.",
    "You must register for at least one event. You can add an event and accommodation to the cart together.",
  ],
  coordinators: [],
  isAccommodation: true,
});

export function getEventCatalog() {
  return EVENTS_DATA;
}

export function getEventById(id) {
  if (!id) return null;
  const key = String(id).toLowerCase();
  if (key === ACCOMMODATION.id) return ACCOMMODATION;
  return EVENTS_DATA.find((ev) => ev.id.toLowerCase() === key) || null;
}

export function getCategories() {
  return EVENT_CATEGORIES;
}

// Closed for good: the kill switch is on, the deadline has passed, or the
// event has started (registration shuts automatically at its start time).
export function isPastDeadline(ev, now = Date.now()) {
  if (REGISTRATIONS_CLOSED) return true;
  if (ev?.startsAt && now >= Date.parse(ev.startsAt)) return true;
  return Boolean(ev?.deadline && now > Date.parse(ev.deadline));
}

export function isRegistrationOpen(ev) {
  return Boolean(ev && ev.registrationOpen && !isPastDeadline(ev) && !isRegistrationPaused());
}

export function formatDeadline(ev) {
  if (!ev?.deadline) return "To be notified";
  return new Date(ev.deadline).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

export function feeLabel(ev) {
  if (!ev) return "";
  if (!ev.registrationOpen && !ev.entryFeeNum) return ev.entryFee || "To be notified";
  if (!ev.entryFeeNum) return "Free";
  return `₹${ev.entryFeeNum}${{ team: " per team", both: " per entry (solo or team)" }[ev.registrationType] || ""}`;
}

/**
 * Google Calendar "add event" link, or null when the time isn't known yet.
 */
export function googleCalendarLink(ev) {
  if (!ev) return null;
  const fmt = (iso) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  let dates = null;
  if (ev.startsAt && ev.endsAt) {
    dates = `${fmt(ev.startsAt)}/${fmt(ev.endsAt)}`;
  } else if (Array.isArray(ev.allDay)) {
    const [start, end] = ev.allDay;
    const endDate = new Date(`${end}T00:00:00Z`);
    endDate.setUTCDate(endDate.getUTCDate() + 1); // end date is exclusive
    dates = `${start.replace(/-/g, "")}/${endDate.toISOString().slice(0, 10).replace(/-/g, "")}`;
  }
  if (!dates) return null;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `${ev.title} — Chaitanya 2k26`,
    dates,
    details: `${ev.tagline}\n\n${ev.time}\nhttps://chaitanya2k26.hptu.ac.in/events`,
    location: `${ev.venue !== "To be notified" ? ev.venue + ", " : ""}HPTU Hamirpur, Himachal Pradesh`,
    ctz: "Asia/Kolkata",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function filterEvents(category = "all", searchQuery = "") {
  let list = EVENTS_DATA;

  if (category && category !== "all") {
    list = list.filter((ev) => ev.category === category);
  }

  if (searchQuery && searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim().replace(/\s+/g, " ");
    list = list.filter((ev) =>
      [ev.title, ev.tagline, ev.categoryName, ev.venue, ev.badge, ev.format, ...(ev.coordinators || []).map((c) => c.name)]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q))
    );
  }

  return list;
}
