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
export const REGISTRATION_DEADLINE = "2026-10-29T23:59:00+05:30";

const TBN = "To be notified";

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
    rules: ["Detailed rules and eligibility will be announced soon."],
    rounds: [],
    judgingCriteria: [],
    coordinators: [],
    ...e,
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
    registrationType: "team", minTeam: 2, maxTeam: 4, startsAt: "2026-10-30T18:00:00+05:30", endsAt: "2026-10-31T18:00:00+05:30",
    title: "CODEFORGE: REFORGED 2.0",
    tagline: "24-hour open-source hackathon: build something real from scratch",
    category: "tech",
    badge: "FLAGSHIP HACKATHON",
    date: "DAY 1 – 2",
    time: "30 Oct, 6:00 PM – 31 Oct, 6:00 PM (24 hrs)",
    venue: "Electrical Labs 307 & 308, 3rd floor",
    overview:
      "Chaitanya 2k26's flagship hackathon. Teams get 24 hours to ideate, design and build a working open-source project overnight, then present it to the judges when the sprint ends.",
    coordinators: heads("Priyanshu"),
  }),
  event({
    id: "capture-the-flag",
    registrationType: "both", maxTeam: 3, startsAt: "2026-11-01T08:00:00+05:30", endsAt: "2026-11-01T16:00:00+05:30",
    title: "CTF: CAPTURE THE FLAG",
    tagline: "Cybersecurity challenges: find the flags, climb the scoreboard",
    category: "tech",
    date: "DAY 3",
    time: "1 Nov, 8:00 AM – 4:00 PM (8 hrs)",
    venue: "3 computer labs (rooms to be announced)",
    overview:
      "Eight hours of capture-the-flag across web security, cryptography, forensics and reverse engineering. Crack a challenge to capture its flag, then submit it for points.",
    coordinators: heads("Ritik Chauhan", "Paras Rana"),
  }),
  event({
    id: "competitive-programming",
    registrationType: "solo", startsAt: "2026-10-31T10:00:00+05:30", endsAt: "2026-10-31T13:00:00+05:30",
    title: "COMPETITIVE PROGRAMMING",
    tagline: "Algorithms against the clock",
    category: "tech",
    date: "DAY 2",
    time: "31 Oct, 10:00 AM – 1:00 PM (3 hrs)",
    venue: "2 computer labs (rooms to be announced)",
    overview:
      "Solve as many algorithmic problems as you can in 3 hours, with code that is correct and efficient. Individual entry.",
    coordinators: heads("Manas Kapoor"),
  }),
  event({
    id: "error-404",
    registrationType: "solo", startsAt: "2026-11-01T10:00:00+05:30", endsAt: "2026-11-01T12:00:00+05:30",
    title: "ERROR 404",
    tagline: "Code not found. Find it. Fix it. Finish it.",
    category: "tech",
    badge: "C++ DEBUGGING",
    date: "DAY 3",
    time: "1 Nov, 10:00 AM – 12:00 PM (2 hrs, all rounds)",
    venue: "Rooms 207 & 208 (computer lab)",
    prizePool: "Top 3 win · prizes to be announced",
    overview:
      "A C++ debugging and code-completion contest, also listed as Glitch Code. Each round puts code on a large screen: spot the bug, fix the logic or finish the missing part, faster and more accurately than the rest. Solo entry, C++ only, three rounds that get harder as you go.",
    rules: [
      "Individual event: one participant per entry, no teams.",
      "Only C++ may be used in every round.",
      "Mobile phones are strictly not allowed during the event.",
      "No internet, AI tools or outside help of any kind.",
      "Do not talk to or copy from other participants.",
      "Time limits are strict. Once time is up, no answers are accepted.",
      "Code and questions shown on screen are confidential. Do not note them down or share them.",
      "The decision of the judges and coordinators is final and binding.",
      "Any malpractice leads to immediate disqualification.",
      "Be on time and follow the coordinators' instructions at all times.",
    ],
    rounds: [
      {
        name: "Round 1: Bug Hunt (easy)",
        time: "1 min",
        description:
          "A C++ program with multiple errors is shown on screen. Find as many errors as possible and submit them through the Google Form shared at the venue. Top ~50% advance; ties at the cut-off are broken with a harder 30-second code.",
      },
      {
        name: "Round 2: Fix & Run (medium)",
        time: "2 min",
        description: "Find the error in a new program, correct it and show the correct output. Faster correct answers rank higher. Top ~50% of the remaining advance.",
      },
      {
        name: "Round 3: Complete the Code (hard)",
        time: "3 min",
        description: "Complete an unfinished C++ pattern program (the code itself is the hint) and show the output. The top 3 are declared winners.",
      },
    ],
    coordinators: heads("Rohit", "Gourav", "Sourav"),
  }),
  event({
    id: "prompt-engineering",
    registrationType: "solo",
    title: "PROMPT ENGINEERING",
    tagline: "Write the prompt that gets AI to the right answer",
    category: "tech",
    time: "3 hrs (date to be announced)",
    overview: "You get 3 hours and a set of tasks. Write prompts that get AI tools to solve each one as accurately as possible.",
    coordinators: heads("Karan"),
  }),
  event({
    id: "ui-ux-designathon",
    registrationType: "both", maxTeam: 2, startsAt: "2026-11-01T14:00:00+05:30", endsAt: "2026-11-01T17:00:00+05:30",
    title: "UI/UX DESIGNATHON",
    tagline: "Design the screens that solve the brief",
    category: "tech",
    date: "DAY 3",
    time: "1 Nov, 2:00 PM – 5:00 PM (3 hrs)",
    venue: "Room 108",
    overview: "A 3-hour design sprint for solo designers or pairs. Design the interface and user experience for a given problem statement. Full brief to be announced.",
  }),

  // --------------------------------------------------------------------------
  // DESIGN & INNOVATION
  // --------------------------------------------------------------------------
  event({
    id: "cadcraft",
    registrationType: "solo", startsAt: "2026-10-30T13:00:00+05:30", endsAt: "2026-10-30T17:00:00+05:30",
    title: "CADCRAFT",
    tagline: "CAD modelling: model it, engineer it, nail the design",
    category: "innovation",
    date: "DAY 1",
    time: "30 Oct, 1:00 PM – 5:00 PM (4 hrs)",
    venue: "2 computer labs (rooms to be announced)",
    overview: "A 4-hour solo CAD modelling contest. Read the problem, then turn it into a precise, well-engineered 3D model.",
    coordinators: heads("Mahek", "Gargi"),
  }),
  event({
    id: "cube-conquest",
    registrationType: "solo", startsAt: "2026-10-31T09:00:00+05:30", endsAt: "2026-10-31T10:00:00+05:30",
    title: "CUBE CONQUEST",
    tagline: "Speedcubing: three rounds, one Mirror Cube final",
    category: "innovation",
    badge: "SPEED CUBING",
    date: "DAY 2",
    time: "31 Oct, 9:00 AM – 10:00 AM (1 hr)",
    venue: "Open Air Theatre (OAT)",
    overview:
      "Three rounds of speedcubing, each split into two sub-rounds. Cubers advance round by round until the Mirror Cube final decides the winners. The organisers supply every competition puzzle, timer and scramble card.",
    rules: [
      "Each cuber gets 1 attempt per sub-round.",
      "15 seconds of inspection before every solve: you may hold and turn the puzzle in your hands, but make no moves.",
      "Scrambles are made by the organisers and are identical for all cubers in the same group.",
      "The timer starts when you lift both hands off the cube/timer pad and stops when you place both hands back.",
      "The puzzle must be fully solved (or fully in the required pattern) when the timer stops; any visible error is a DNF.",
      "Ranking in each sub-round is by best single time.",
      "Penalties: inspection over 15 s = +2 s; over 17 s = DNF; turning the cube during inspection = DNF.",
      "Cheating, using an unauthorised puzzle or disrupting others leads to disqualification.",
      "Organisers provide all competition puzzles; bring your own cube only if the judges approve it in advance.",
      "No talking to or coaching a cuber while they are competing. Spectators stay behind the marked line.",
      "The judges' decision is final.",
    ],
    rounds: [
      { name: "Round 1", time: "2x2 cube · Pyramid", description: "Opening round. Cubers who beat the time cutoff move to Round 2." },
      { name: "Round 2", time: "3x3 cube · Pattern on 3x3", description: "Solve the Rubik's Cube, then create the announced pattern (e.g. a checkerboard) from a solved cube. Time cutoff decides who advances." },
      { name: "Round 3 (Final)", time: "Mirror Cube", description: "Solved by shape, not colour. Finalists attempt the same scramble; the fastest valid time wins." },
    ],
    coordinators: heads("Sourav", "Ankita"),
  }),
  event({
    id: "innovation-fair",
    registrationType: "team", minTeam: 1, maxTeam: 4,
    title: "INNOVATION FAIR",
    tagline: "Project exhibition: bring your prototype, explain the build",
    category: "innovation",
    overview: "An exhibition of student projects, prototypes and ideas. Set up your work and present it to visitors and judges, solo or in a team of up to 4.",
    coordinators: heads("Ankush", "Divyanshi"),
  }),

  // --------------------------------------------------------------------------
  // BUSINESS & DEBATE
  // --------------------------------------------------------------------------
  event({
    id: "pitch-sansad",
    registrationType: "team", minTeam: 1, maxTeam: 4, startsAt: "2026-11-01T10:00:00+05:30", endsAt: "2026-11-01T12:00:00+05:30",
    title: "PITCH SANSAD",
    tagline: "Pitch competition: present your startup idea to the house",
    category: "business",
    date: "DAY 3",
    time: "1 Nov, 10:00 AM – 12:00 PM (2 hrs)",
    venue: "Conference Hall & labs",
    overview: "Pitch your startup idea to the panel, defend it under questioning and win their vote. Enter solo or as a team of up to 4.",
  }),
  event({
    id: "marketmind",
    registrationType: "team", minTeam: 1, maxTeam: 3,
    title: "MARKETMIND: THE PRODUCT CASE CHALLENGE",
    tagline: "Product case study: crack it, present the strategy",
    category: "business",
    time: "2 hrs (date to be announced)",
    venue: "Conference Hall",
    overview: "Teams of up to 3 get a product management and business case, and 2 hours to solve it. Analyse the problem, build a strategy and present your solution.",
  }),
  event({
    id: "model-lok-sabha",
    registrationType: "both", maxTeam: 2, startsAt: "2026-10-31T14:00:00+05:30", endsAt: "2026-10-31T17:00:00+05:30",
    title: "MODEL LOK SABHA",
    tagline: "Indian Parliamentary MUN: debate, legislate and represent",
    category: "business",
    badge: "PARLIAMENTARY MUN",
    date: "DAY 2",
    time: "31 Oct, 2:00 PM – 5:00 PM (3 hrs)",
    venue: "Open Air Theatre (OAT)",
    prizePool: "Best Delegate · High Commendation · Special Mention · certificates for all delegates",
    overview:
      "An Indian Parliamentary MUN run on the Lok Sabha (House of the People) format, where delegates represent sitting MPs and follow Lok Sabha procedure. Agenda: The Public Examinations (Prevention of Unfair Means) Legislation, and the crisis of paper leaks and cheating in national and state exams such as NEET, UGC-NET and state PSC exams. Debate in English or Hindi. Register individually or as a double delegation; the secretariat allots MP portfolios.",
    rules: [
      "Address the Chair as \"Hon'ble Speaker\" or \"Mr./Madam Speaker\" and other members as \"Hon'ble Member\" or \"Hon'ble Minister\". All speeches go through the Chair.",
      "Stand while speaking; stay seated while the Chair or another member speaks, unless raising a point.",
      "Unparliamentary language is prohibited: personal attacks, abusive, communal, casteist, sexist or derogatory remarks, or disrespect to any religion, community, region or language.",
      "Dress code: formal Indian or Western attire (Indian formals encouraged). Keep your portfolio placard visible; no party symbols, slogans or campaign material.",
      "Standard speaking time is 60 seconds; repeated overruns may be penalised.",
      "Points of Order, Information, Personal Privilege and Parliamentary Inquiry, and procedural motions, follow the rulebook. Procedural motions pass by simple majority.",
      "Bills and resolutions must be typed, original and approved by the Secretariat before being introduced. Amendments need a proposer and a seconder.",
      "Communication in the House is by chits through the Marshals; lobbying only during breaks or when the House is suspended.",
      "Prohibited: plagiarism, fabricated facts or documents, unapproved pre-written bills, pre-formed unofficial blocs, and impersonating another delegate.",
      "In situations not covered by the rulebook, the Chair's discretion, guided by Lok Sabha practice, prevails.",
    ],
    rounds: [
      { name: "Order of business", time: "Each sitting", description: "Roll call & quorum → agenda & General Speakers' List → open debate → calling attention motions & special mentions → bills & resolutions → adjournment." },
      { name: "Legislative procedure", time: "Bills", description: "First reading (introduction, no debate) → second reading (debate and clause-by-clause amendments) → third reading (final debate and vote)." },
    ],
    judgingCriteria: [
      { name: "Content & Research", weight: "20" },
      { name: "Oratory & Delivery", weight: "20" },
      { name: "Rules of Procedure", weight: "15" },
      { name: "Diplomacy & Decorum", weight: "15" },
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
    registrationType: "team", minTeam: 5, maxTeam: 6,
    title: "ESPORTS: COUNTER-STRIKE 2",
    tagline: "Tactical 5v5 on campus",
    category: "esports",
    overview: "Counter-Strike 2 tournament for teams of 5–6. Format and schedule to be announced.",
    coordinators: heads("Rhythm Rangra"),
  }),
  event({
    id: "esports-bgmi",
    registrationType: "team", minTeam: 4, maxTeam: 4, allDay: ["2026-10-30", "2026-10-31"],
    title: "ESPORTS: BGMI",
    tagline: "Four-player squads, two days, twelve matches",
    category: "esports",
    badge: "BATTLE ROYALE",
    date: "DAY 1 – 2",
    time: "30 & 31 Oct, 12:00 PM – 4:00 PM each day",
    overview:
      "A BGMI battle royale tournament for 4-player squads on the latest game version, mobile devices only. Squads play six matches a day across Rondo, Erangel and Miramar. Placement and kill points add up to the overall standings.",
    rules: [
      "Squads of exactly 4 players. Mobile devices only; emulators and PC clients are not allowed.",
      "Use your own BGMI account (no guest accounts) and the in-game name submitted at registration. Only registered players may play.",
      "Charge your device fully and make sure you have a stable internet connection before every match.",
      "Carry the event or university ID if organisers ask for it.",
      "Voice chat only within your registered team. Abusive, threatening or toxic behaviour is not allowed.",
      "Take a screenshot after every match showing the result/placement; the captain submits it to the organisers within the announced time.",
      "Prohibited: hacks, cheats, mods, scripts, exploits, unauthorised third-party tools, account sharing, teaming with other squads, abusing glitches, and falsifying screenshots or results. Any of these can lead to disqualification.",
      "A player who disconnects is treated as eliminated unless organisers announce a technical ruling. Report genuine technical issues to the referee immediately.",
      "Organisers and referees have final authority on match conduct, disputes, scoring and discipline.",
    ],
    rounds: [
      { name: "Qualifiers", time: "If more than 16 teams", description: "Teams are split into groups; qualifying teams advance on the announced criteria." },
      { name: "Day 1 (30 Oct)", time: "6 matches", description: "Map rotation: 1 Rondo, 3 Erangel, 2 Miramar." },
      { name: "Day 2 (31 Oct)", time: "6 matches", description: "Same map rotation, with the Smash Rule applied as announced by the organisers." },
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
    registrationType: "team", minTeam: 2, maxTeam: 3, startsAt: "2026-10-31T11:00:00+05:30", endsAt: "2026-10-31T13:00:00+05:30",
    title: "NERD WARS",
    tagline: "The fest quiz: trivia, puzzles and fast recall",
    category: "cultural",
    date: "DAY 2",
    time: "31 Oct, 11:00 AM – 1:00 PM (2 hrs)",
    venue: "Open Air Theatre (OAT)",
    overview: "The official Chaitanya 2k26 quiz, for teams of 2–3 who live for trivia and puzzles. Round format to be announced.",
    coordinators: heads("Shabnam Minhas", "Anshita", "Sourav"),
  }),
  event({
    id: "treasure-hunt",
    registrationType: "team", minTeam: 3, maxTeam: 4, startsAt: "2026-10-30T11:00:00+05:30", endsAt: "2026-10-30T14:00:00+05:30",
    title: "TREASURE HUNT",
    tagline: "Follow the clues across campus",
    category: "cultural",
    date: "DAY 1",
    time: "30 Oct, 11:00 AM – 2:00 PM (3 hrs)",
    overview: "Three hours, one campus, a trail of clues. Decode each one, race between checkpoints and reach the treasure before the other teams.",
    coordinators: heads("Mahek", "Gargi", "Aparna Sharma"),
  }),
  event({
    id: "capture-the-moment",
    registrationType: "solo",
    title: "CAPTURE THE MOMENT",
    tagline: "Photography: tell the fest's story in a frame",
    category: "cultural",
    date: "DAY 1 – 3",
    time: "Runs through the fest · final submission 4:00 PM",
    venue: "Ground floor",
    overview: "A photography contest that runs across all three fest days. Shoot the moments that define the fest and submit your entries by the 4:00 PM final deadline.",
    coordinators: heads("Dhruv Rangra", "Kartik"),
  }),
  event({
    id: "cultural-walk",
    registrationType: "both", maxTeam: 10,
    title: "CULTURAL WALK",
    tagline: "A walk through the cultures of India",
    category: "cultural",
    overview: "A parade of regional attire, traditions and heritage from across India. Walk solo or in a group of up to 10; details to be announced.",
    coordinators: heads("Ankita Thakur", "Dhruv", "Gargi"),
  }),
  event({
    id: "dance-competition",
    registrationType: "both", maxTeam: 12,
    title: "DANCE COMPETITION",
    tagline: "Own the stage",
    category: "cultural",
    overview: "Perform solo or with a crew of up to 12. Dance categories and rules to be announced.",
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

export function isPastDeadline(ev, now = Date.now()) {
  return Boolean(ev?.deadline && now > Date.parse(ev.deadline));
}

export function isRegistrationOpen(ev) {
  return Boolean(ev && ev.registrationOpen && !isPastDeadline(ev));
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
  return `₹${ev.entryFeeNum}${ev.registrationType === "solo" ? "" : " per entry"}`;
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
