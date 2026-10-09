/**
 * ============================================================================
 * Chaitanya 2k26 — Official Event Catalog
 * ============================================================================
 * Source: "Event Student Heads" list from the organising committee.
 * Fest days: Day 1 = 30 Oct, Day 2 = 31 Oct, Day 3 = 1 Nov 2026.
 *
 * Fields the committee has not confirmed yet (venue, date, rules) are
 * marked "To be notified". Entry fees are flat per team / per entry.
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
  "marketmind",
  "model-lok-sabha",
  "esports-bgmi",
  "cadcraft",
  "esports-free-fire",
  "competitive-programming",
]);

// Official rulebook PDFs (rulebooks/<event id>.pdf). Served from jsDelivr,
// pinned to a git tag, so downloads don't use the site's hosting bandwidth.
// After replacing a PDF: commit, push a new tag, and update RULEBOOK_TAG.
const RULEBOOK_TAG = "cdn-v2";
const RULEBOOKS = new Set([
  "codeforge-reforged", "capture-the-flag", "competitive-programming", "error-404",
  "prompt-engineering", "ui-ux-designathon", "cadcraft", "cube-conquest",
  "innovation-fair", "marketmind", "model-lok-sabha", "esports-cs2", "esports-bgmi",
  "esports-free-fire", "nerd-wars", "treasure-hunt", "capture-the-moment",
  "cultural-walk", "dance-competition",
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
    rulebook: RULEBOOKS.has(e.id)
      ? `https://cdn.jsdelivr.net/gh/scarescream27/chaitainya-front-back@${RULEBOOK_TAG}/rulebooks/${e.id}.pdf`
      : null,
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
    registrationType: "team", minTeam: 2, maxTeam: 4, startsAt: "2026-10-30T15:00:00+05:30", endsAt: "2026-10-31T16:00:00+05:30",
    title: "CODEFORGE: REFORGED 2.0",
    tagline: "24-hour open-source hackathon: build something real from scratch",
    category: "tech",
    badge: "FLAGSHIP HACKATHON",
    date: "DAY 1 – 2",
    time: "30 Oct, 4:00 PM – 31 Oct, 4:00 PM (24 hrs) · opening at 3:00 PM",
    venue: "Electrical Labs 307 & 308, 3rd floor",
    overview:
      "The main hackathon of Chaitanya 2k26. Teams get 24 hours to plan, design and build a working open-source project through the night. When time is up, they show it to the judges.",
    rules: [
      "Each team picks one Team Leader, who talks to the organisers for the team.",
      "Use any language, framework, tool or platform. Open-source libraries are allowed; follow their licences and give credit.",
      "AI coding tools are allowed, but your team must understand and be able to explain everything you submit.",
      "Build the project during the hackathon. Projects finished before the event are not accepted.",
      "Mentors give advice and feedback. They do not build your project for you.",
      "Use Git and keep backups. The organisers are not responsible for work lost to device or network problems.",
      "Submit by the code-freeze deadline: team details, problem statement, solution overview, key features, tech stack, Git repository link and a live demo link if you have one. Late entries may lose marks or be rejected.",
      "Final round: a 3–5 minute presentation, a live demo, then questions. Judges may ask about design, scale, security and who built what.",
      "No harassment, plagiarism, cheating or tampering with another team's work.",
      "The organising committee's decisions are final.",
    ],
    rounds: [
      { name: "Opening, briefing & mentor check", time: "30 Oct, 3:00 – 4:00 PM", description: "Opening, rules and problem statements, then a talk with mentors to check your idea." },
      { name: "Progress review 1", time: "30 Oct, 5:30 – 6:30 PM", description: "Show your idea, scope and plan." },
      { name: "Final progress review", time: "31 Oct, 11:00 AM – 12:00 PM", description: "Testing and demo readiness check." },
      { name: "Code freeze, demos & judging", time: "31 Oct, 4:00 PM onwards", description: "Final submission, then presentations, live demos and judging." },
    ],
    judgingCriteria: [
      { name: "Technical implementation", weight: "25%" },
      { name: "Innovation & creativity", weight: "20%" },
      { name: "Working prototype", weight: "20%" },
      { name: "Problem relevance & understanding", weight: "15%" },
      { name: "UI/UX", weight: "10%" },
      { name: "Presentation & demo", weight: "10%" },
    ],
    coordinators: heads("Priyanshu"),
  }),
  event({
    id: "capture-the-flag",
    entryFeeNum: 199, entryFee: "₹199", prizePool: "1st ₹15,000 · 2nd ₹10,000 · 3rd ₹5,000",
    registrationType: "both", maxTeam: 4, startsAt: "2026-11-01T08:00:00+05:30", endsAt: "2026-11-01T16:00:00+05:30",
    title: "CTF: CAPTURE THE FLAG",
    tagline: "Hacking puzzles: find the flags, climb the scoreboard",
    category: "tech",
    date: "DAY 3",
    time: "1 Nov, 8:00 AM – 4:00 PM (8 hrs)",
    venue: "Online (official CTF platform)",
    overview:
      "An online, jeopardy-style Capture The Flag for teams of up to 4 (one captain). 30+ security puzzles in web exploitation, cryptography, binary exploitation, reverse engineering and misc. Solve a puzzle to find its hidden flag, then submit the flag for points on a live scoreboard.",
    rules: [
      "Jeopardy-style CTF with 30+ challenges in Web, Cryptography, Binary Exploitation (Pwn), Reverse Engineering and Misc, from beginner to hard.",
      "Flag format: HPTU{...}, for example HPTU{_some_l33t_string_l1k3_7hi5_}.",
      "Points per challenge drop from 500 to 50 as more teams solve it.",
      "Attack only the official challenges. Any other server or system is off-limits.",
      "Do not share flags, solutions, hints or logins with other teams.",
      "No automatic scanners, flag brute-forcing, or abusing bugs in the contest platform. Report platform bugs to the staff instead.",
      "One team name per team, and each player plays for one team only. No account sharing.",
      "Players under 18 need a parent's or guardian's consent.",
      "Breaking the rules can mean a warning, or removal and a ban. The organisers' decisions are final.",
    ],
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
      "Solve 6 coding problems (1000 points) in 3 hours, in C++, Python or Java. Your code must give the right answer and run fast. Solo entry, in a supervised lab.",
    rules: [
      "Solo contest: one person per computer, 3 hours, 6 problems.",
      "Languages: C++, Python and Java only. Check the language setting before you submit.",
      "Submit on the official contest website. Hidden test cases check your code automatically.",
      "Compilation error, wrong answer, runtime error, time limit or memory limit exceeded all score 0. You may resubmit, within the platform's limits.",
      "Ranking is by total points. Ties go to whoever submitted earlier.",
      "You may bring up to 2 handwritten A4 sheets (both sides) of syntax, STL, algorithms and formulas. No printed notes, books or photocopies.",
      "No Google, AI tools (ChatGPT, Gemini, Copilot etc.), Stack Overflow, online code or outside help.",
      "No phones, smartwatches, tablets or USB drives at your computer. Lab computers are monitored for other apps and tab switching.",
      "Cheating, code sharing, talking to others or tampering means you are removed and your score is cancelled.",
      "Ask questions about a problem through the platform's clarification feature. Report computer or network faults to lab staff at once; extra time is not given automatically.",
    ],
    judgingCriteria: [
      { name: "Problems 1–2 (easy)", weight: "100 pts each" },
      { name: "Problems 3–5 (medium)", weight: "175 pts each" },
      { name: "Problem 6 (hard)", weight: "275 pts" },
    ],
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
    time: "Rounds 1–4: 60 min · final: 30 min (date to be announced)",
    venue: "Labs 1 & 2",
    overview: "Solve four AI challenges in 60 minutes with free AI tools; the top 5 play a 30-minute final. Judges score your prompts, the output and how efficiently you got there.",
    rules: [
      "Solo event, open to registered students with a valid college ID. Report to Labs 1 & 2 30 minutes before the start.",
      "Bring your own laptop. Internet is provided.",
      "Use only free, public AI tools (like the free versions of ChatGPT, Gemini or Claude). No paid or private tools unless everyone gets them.",
      "Each task allows at most 5 prompt attempts.",
      "Do all the work during the event. No pre-made solutions.",
      "After every round, submit your AI Tool Stack (the main tools you used) and your prompt log (screenshots or chat exports).",
      "No phones, no unrelated websites, and no sharing prompts with others.",
      "No copyrighted, offensive or unethical content.",
      "Coordinators may announce a surprise 'Twist card' rule in any round.",
      "Ties are broken by fewer prompt attempts, then less time, then a surprise question. Judges' decisions are final.",
    ],
    rounds: [
      { name: "Rounds 1–4", time: "60 min in all", description: "Data Dash, Prompt Fix, AI Game and AI Image Generation. The top 5 go to the final." },
      { name: "Final: AI Story Teller", time: "30 min", description: "Tell a story with AI-made text, visuals or audio." },
    ],
    judgingCriteria: [
      { name: "Data Dash", weight: "15" },
      { name: "Prompt Fix", weight: "10" },
      { name: "AI Game", weight: "20" },
      { name: "AI Image Generation", weight: "20" },
      { name: "Final: AI Story Teller", weight: "35" },
      { name: "Bonus (creative prompts, fewer tries, speed)", weight: "up to 5" },
    ],
    coordinators: heads("Karan"),
  }),
  event({
    id: "ui-ux-designathon",
    entryFeeNum: 49, entryFee: "₹49", prizePool: "1st Memento · 2nd Memento · 3rd Medal",
    registrationType: "both", maxTeam: 2, startsAt: "2026-11-01T14:00:00+05:30", endsAt: "2026-11-01T16:00:00+05:30",
    title: "UI/UX DESIGNATHON",
    tagline: "Design app screens that solve a given problem",
    category: "tech",
    date: "DAY 3",
    time: "1 Nov, 2:00 PM – 4:00 PM (2 hrs)",
    venue: "Room 108",
    overview: "A 2-hour design contest for one person or a pair. Everyone gets the same two app screens and a surprise theme, then redesigns both screens to fit it. No AI tools.",
    rules: [
      "Everyone gets the same 2-screen base wireframe: a Home / Event Discovery screen and an Event Details screen. A surprise theme is revealed at the start.",
      "Redesign both screens for the theme. Change styles, fonts, colours, images, spacing and layout freely, but each screen's purpose and information must stay clear and usable.",
      "Both screens must look like one product with the same design style.",
      "Tools: Figma (recommended), Adobe XD, Photoshop, Illustrator, GIMP or similar. Install and set them up on your laptop before the event.",
      "No AI tools of any kind (design generators, screen generators, AI images). Using AI means removal at once.",
      "Free fonts and basic icons are fine. Ready-made UI kits, templates or pre-designed screens are not.",
      "Submit exactly ONE PNG or JPG with both screens on the official portal, under your Team ID, before time ends.",
      "No help from other teams or outsiders, and no copying. Designs must be suitable for a campus audience.",
      "Judging is anonymous by Team ID. Ties go to the higher Creativity score, then Theme score, then the judges' decision.",
    ],
    judgingCriteria: [
      { name: "Creativity & originality", weight: "30" },
      { name: "Theme adherence", weight: "25" },
      { name: "Visual design & execution", weight: "25" },
      { name: "UI/UX & usability", weight: "20" },
    ],
  }),

  // --------------------------------------------------------------------------
  // DESIGN & INNOVATION
  // --------------------------------------------------------------------------
  event({
    id: "cadcraft",
    entryFeeNum: 49, entryFee: "₹49", prizePool: "Mementos for the top 3",
    registrationType: "solo", startsAt: "2026-10-30T13:00:00+05:30", endsAt: "2026-10-30T16:00:00+05:30",
    title: "CADCRAFT",
    tagline: "CAD modelling: build it in 3D and get the design right",
    category: "innovation",
    date: "DAY 1",
    time: "30 Oct, 1:00 PM – 4:00 PM (3 hrs, 2 rounds)",
    venue: "2 computer labs (rooms to be announced)",
    overview: "A solo CAD modelling contest in FreeCAD, in two rounds: build an original assembled model for a design challenge, then recreate a 3D-printed part as exactly as you can.",
    rules: [
      "Solo event. All work is done in FreeCAD on the lab computers.",
      "Work on your own. Do not talk to other participants.",
      "No downloaded or ready-made models, online references or outside help. Breaking this means removal.",
      "In Round 1, all parts must be modelled, assembled and properly constrained.",
      "In Round 2, you may handle and measure the 3D-printed model you are given.",
      "Follow the judges' instructions. The judges' decision is final.",
    ],
    rounds: [
      { name: "Round 1: Creative CAD Modelling", time: "1 hr 30 min", description: "Get a design challenge and build an original, assembled CAD model. Marked on creativity (15), modelling quality (15), assembly & constraints (10) and accuracy (10)." },
      { name: "Break", time: "15 min", description: "Short break between rounds." },
      { name: "Round 2: Reverse Engineering", time: "1 hr 15 min", description: "Recreate a 3D-printed model in FreeCAD. Marked on dimensions (25), shape & geometry (10), assembly (10) and constraints & organisation (5)." },
    ],
    judgingCriteria: [
      { name: "Round 1", weight: "50" },
      { name: "Round 2", weight: "50" },
    ],
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
      "Open to students with a valid college ID, including permitted guest colleges. Report at least 30 minutes before your slot.",
      "Each cuber gets 1 try per sub-round.",
      "You get 15 seconds to look at the puzzle (inspection) before every solve. You may hold it and turn it around in your hands, but make no moves.",
      "The organisers mix up (scramble) the puzzles. Everyone in the same group gets the same scramble.",
      "The timer starts when you lift both hands off the cube/timer pad. It stops when you put both hands back.",
      "When the timer stops, the puzzle must be fully solved (or fully in the asked pattern). Any visible mistake is a DNF (did not finish).",
      "In each sub-round, you are ranked by your best single time.",
      "Penalties: inspection over 15 s = +2 s; over 17 s = DNF; making a move during inspection = DNF.",
      "Cheating, using a puzzle that is not allowed, or disturbing others gets you removed.",
      "The organisers give all the puzzles, timers and scramble cards. Bring your own cube only if it passes the judge's check beforehand. Practice puzzles are kept at a set spot before the event.",
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
    rules: [
      "Enter solo or as a team of up to 4.",
      "Your project must be your own original work.",
      "Bring and manage everything you need: materials, equipment, posters and slides (PowerPoint, Canva or any tool you like).",
      "Report on time, and stay at your stand for the whole judging period.",
      "Projects must be completely safe to demonstrate and for visitors to touch.",
      "Keep your area clean and behave professionally.",
      "No copying, no false claims about your results or who did the work, and no touching or interfering with other teams' projects.",
      "Judges may ask you questions about your project.",
      "Breaking the fair-play rules can mean removal. The judges' and organising committee's decisions are final.",
    ],
    judgingCriteria: [
      { name: "Innovation & creativity", weight: "20%" },
      { name: "Scientific concept", weight: "20%" },
      { name: "Relevance & significance", weight: "15%" },
      { name: "Method & technical approach", weight: "15%" },
      { name: "Practical use", weight: "15%" },
      { name: "Presentation & explanation", weight: "10%" },
      { name: "Teamwork", weight: "5%" },
    ],
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
    tagline: "Pitch contest: present your startup idea to the panel",
    category: "business",
    date: "DAY 3",
    time: "1 Nov, 10:00 AM – 12:00 PM (2 hrs)",
    venue: "Conference Hall & labs",
    overview: "Pitch your startup idea to the panel. Answer their questions and win their vote. Enter solo or as a team of up to 4.",
  }),
  event({
    id: "marketmind",
    entryFeeNum: 199, entryFee: "₹199", prizePool: "1st ₹1,000 · 2nd ₹600 · 3rd ₹400",
    registrationType: "team", minTeam: 2, maxTeam: 4,
    title: "MARKETMIND: THE PRODUCT CASE CHALLENGE",
    tagline: "Solve a product problem and present your plan",
    category: "business",
    time: "2 hrs (date to be announced)",
    venue: "Conference Hall",
    overview: "Teams of 2–4 get a real product or business case. Analyse it and hand in a written answer, then present your strategy and defend it to the judges. Both rounds count; nobody is knocked out.",
    rules: [
      "Two rounds and no elimination: every team plays both, and both are marked together at the end.",
      "Report to the venue at least 15 minutes before the start.",
      "No outside help, no working with other teams, and no copying. Any malpractice means removal at once.",
      "Time limits are strict in both rounds.",
      "Ties go to the higher score in Problem Understanding, then Solution, then Q&A, then Presentation. If still tied, the judges set an extra challenge.",
      "The judges' and organising committee's decisions are final.",
    ],
    rounds: [
      { name: "Round I: Case analysis", time: "30–45 min", description: "Get a real product, market or business case. Study it and hand in a written answer with your analysis and plan." },
      { name: "Round II: Presentation & Q&A", time: "5–7 min + 3–5 min Q&A", description: "Present the problem, your strategy, why it works, its risks and impact. Then answer the judges' questions." },
    ],
    judgingCriteria: [
      { name: "Problem understanding & analysis", weight: "30%" },
      { name: "Solution / strategy", weight: "30%" },
      { name: "Presentation & communication", weight: "20%" },
      { name: "Q&A / defence", weight: "20%" },
    ],
  }),
  event({
    id: "model-lok-sabha",
    entryFeeNum: 49, entryFee: "₹49", prizePool: "Best Delegate · High Commendation · Special Mention",
    registrationType: "both", maxTeam: 2, allDay: ["2026-10-30", "2026-10-31"],
    title: "MODEL LOK SABHA",
    tagline: "Mock Indian Parliament: play an MP, debate and make laws",
    category: "business",
    badge: "PARLIAMENTARY MUN",
    date: "DAY 1 – 2",
    time: "30 & 31 Oct (session times to be announced)",
    venue: "Conference Hall",
    overview:
      "A mock Parliament (MUN) that follows the Lok Sabha (House of the People) format. Each delegate plays a current MP and follows Lok Sabha rules. Topic: The Public Examinations (Prevention of Unfair Means) Legislation, and the problem of paper leaks and cheating in national and state exams like NEET, UGC-NET and state PSC exams. Debate in English or Hindi. Register alone or as a pair (double delegation). The secretariat (organisers) decides which MP you play.",
    rules: [
      "Call the Chair \"Hon'ble Speaker\" or \"Mr./Madam Speaker\". Call other members \"Hon'ble Member\" or \"Hon'ble Minister\". Speak only through the Chair.",
      "Stand when you speak. Stay seated while the Chair or another member speaks, unless you are raising a point.",
      "No rude language. That means no personal attacks and no abusive, communal, casteist, sexist or insulting remarks. Do not disrespect any religion, community, region or language.",
      "Dress code: formal Indian or Western clothes (kurta, saree, bandhgala welcome). No party symbols or campaign material.",
      "Answer roll call with \"Present\" or \"Present and Voting\". If you say \"Present and Voting\", you cannot abstain on substantive votes.",
      "Each speech gets 60 seconds. If you go over time again and again, you may get a penalty.",
      "Points of Order, Information, Personal Privilege and Parliamentary Inquiry, and procedural motions, follow the rulebook. A procedural motion passes if more than half vote for it. An Adjournment Motion needs written notice and the support of 10 members.",
      "Bills and resolutions must be typed, your own work, and approved by the Secretariat before you bring them in: at most 1 per delegate (Treasury and Opposition benches table at most 2 each). A change (amendment) must be written, name the clause, and have a proposer and a seconder.",
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
    registrationType: "team", minTeam: 5, maxTeam: 7,
    title: "ESPORTS: COUNTER-STRIKE 2",
    tagline: "Team shooter, 5 vs 5, on campus",
    category: "esports",
    overview: "Counter-Strike 2 tournament, 5 vs 5 standard competitive on Dust and Mirage. Teams of 5 players plus up to 2 substitutes. Bring your own gaming laptop and gear.",
    rules: [
      "5v5 standard competitive. Matches are Best of 1, 3 or 5 (as decided) on Dust and Mirage.",
      "First team to 13 rounds wins the map. A tie goes to overtime.",
      "Open to students with a valid college ID. Report 30 minutes before your slot.",
      "Bring your own gaming laptop, mouse, mousepad and other gear; the organisers do not provide them. Make sure your internet and devices work.",
      "Substitutes may come in only between maps. Only registered players may play.",
      "No cheats, hacks, scripts, third-party tools, or bug and map exploits. Only official game features are allowed.",
      "Voice chat only within your team. No toxic behaviour, spamming or deliberately stalling rounds.",
      "Cheating, unregistered players, smurfing, exploits or disrespect mean removal. Referee, admin and organiser decisions are final.",
    ],
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
    overview: "Free Fire MAX squad tournament on mobile: 4 Battle Royale rounds, then a Champion Rush final to crown the winner.",
    rules: [
      "Free Fire MAX squads: 4 players plus 1 substitute. Mobile devices only; no emulators, PCs, laptops or modded games.",
      "Carry a valid university or college ID. Only registered players can enter the lobby.",
      "Play on your own account with the in-game name and UID you registered. No account sharing, smurfing or playing as someone else.",
      "You are responsible for your battery, game updates, earphones and internet. Device or network problems do not get a match replayed.",
      "Join the custom room 15–30 minutes before your match. Never share the room ID or password.",
      "Maps: Bermuda, Purgatory, Alpine and Kalahari. 4 Battle Royale rounds unless the organisers change it.",
      "Teaming up with other squads, hacks or scripts: removed at once. Bug abuse: lost points, a forfeited match or removal.",
      "Late to the lobby, or toxic behaviour: a warning, lost points, a forfeited match or removal. Referee and committee decisions are final.",
    ],
    rounds: [
      { name: "Battle Royale rounds", time: "4 rounds", description: "Placement points plus 1 point per kill add up across rounds." },
      { name: "Champion Rush (final)", time: "Until there is a winner", description: "Once a squad passes 110 points, it must win (Booyah) the very next match to become champion. If it doesn't, the rush goes on and everyone stays in contention." },
    ],
    judgingCriteria: [
      { name: "Kill", weight: "1 pt each" },
      { name: "1st place (Booyah)", weight: "12" },
      { name: "2nd", weight: "9" },
      { name: "3rd", weight: "8" },
      { name: "4th", weight: "7" },
      { name: "5th", weight: "6" },
      { name: "6th", weight: "5" },
      { name: "7th", weight: "4" },
      { name: "8th", weight: "3" },
      { name: "9th", weight: "2" },
      { name: "10th", weight: "1" },
      { name: "11th–12th", weight: "0" },
    ],
    coordinators: heads("Dhruv Rangra", "Ankush"),
  }),

  // --------------------------------------------------------------------------
  // CULTURAL & FUN
  // --------------------------------------------------------------------------
  event({
    id: "nerd-wars",
    entryFeeNum: 75, entryFee: "₹75", prizePool: "1st ₹1,000 · 2nd ₹750 · 3rd ₹500",
    registrationType: "team", minTeam: 3, maxTeam: 3, startsAt: "2026-10-31T11:00:00+05:30", endsAt: "2026-10-31T13:00:00+05:30",
    title: "NERD WARS",
    tagline: "The fest quiz: general knowledge, puzzles and quick thinking",
    category: "cultural",
    date: "DAY 2",
    time: "31 Oct, 11:00 AM – 1:00 PM (2 hrs)",
    venue: "Open Air Theatre (OAT)",
    overview: "The official Chaitanya 2k26 quiz for teams of exactly 3, in three rounds: science and maths, then computers and tech, then an AI finale.",
    rules: [
      "Open to registered students with a valid college ID. Report to the venue at least 30 minutes early.",
      "Round 1 only picks who moves on; its score does not count after that. Final ranking = Round 2 + Round 3.",
      "Each round's marking is announced before it starts. Some questions may have negative marks.",
      "No phones, smartwatches, laptops or tablets unless you are told you may use them. Being caught with one means removal at once.",
      "No outside help and no talking to the audience. Breaking this means removal.",
      "Ties go to the higher Round 3 score, then Round 2, then less total time, then a sudden-death question.",
      "The quizmaster's and organisers' decisions on questions and scores are final.",
    ],
    rounds: [
      { name: "Round 1: Matter, Motion and Numbers", time: "Qualifier", description: "Class 11 & 12 Physics, Chemistry and Maths. MCQs, short answers, picture questions and rapid fire." },
      { name: "Round 2: The Hardwired Round", time: "Scored", description: "Hardware, software, chips, networking, the Internet, AI and gadgets. MCQs, picture questions, short answers and buzzer questions." },
      { name: "Round 3: The Turing Point (Final)", time: "Scored", description: "AI, machine learning, neural networks, algorithms and the future of computing. Concept, case and data questions, plus buzzer rounds." },
    ],
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
    rules: [
      "Teams of 3 to 4. Report to the venue at the time the organisers give.",
      "Final score = Round I score + Round II score.",
      "Once you hand in your work, you cannot change or add to it.",
      "Do not touch or interfere with another team's tasks, clues or materials.",
      "Do not share answers or clues with other teams, or take help from anyone outside your team. The organisers will say beforehand whether phones, internet or AI are allowed.",
      "Cheating, playing as someone else or changing a submission can mean removal at once.",
      "Ties are decided by total submission time or an extra challenge.",
      "The organisers may change the procedure, timing or scoring if needed. The coordinators' and judges' decisions are final.",
    ],
    rounds: [
      { name: "Round I: Task Challenge", time: "Timed", description: "Finish as many tasks from the list as you can, in any order. Scored on tasks done and how early you hand in; early hand-ins may earn bonus points." },
      { name: "Round II: Riddle Challenge", time: "Timed", description: "Solve as many riddles as you can as a team. Scored on correct answers and how fast you hand in your answer sheet." },
    ],
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
    time: "Rounds 1 & 2: 1 hr each · final photo by 1 Nov, 9:00 AM",
    venue: "Ground floor",
    overview: "A photo contest across the fest: a Colour Hunt and a Theme Challenge (1 hour each), then a final theme photo with the story behind it, due by 1 Nov, 9:00 AM. Bring your own phone or camera.",
    rules: [
      "Bring your own smartphone, DSLR or digital camera.",
      "Take every photo during its round. No downloaded or older photos.",
      "Ask before photographing people, and do not shoot in restricted areas.",
      "Basic edits are fine: crop, exposure, contrast, colour, sharpness and light noise reduction.",
      "Not allowed: AI images, swapped backgrounds, combined photos, adding or removing major objects, or heavy editing.",
      "Keep the original file and its data (metadata); the organisers may ask for it.",
      "Using past, AI-made or someone else's photos, or editing metadata, means removal at once.",
      "You keep the rights to your photos. The organisers may show selected photos for the fest (exhibitions, social media), but will not sell them.",
      "Photos are judged on symmetry and framing, quality and clarity, how well they fit the theme, and the meaning or story they carry.",
      "Ties go to the higher On Theme score, then Meaningful, Quality, then Symmetry. The judges' decisions are final.",
    ],
    rounds: [
      { name: "Round 1: Colour Hunt", time: "1 hr", description: "Find and shoot the given colour." },
      { name: "Round 2: Theme Challenge", time: "1 hr", description: "Shoot a photo for the announced theme." },
      { name: "Round 3: Final Theme Challenge", time: "Till 1 Nov, 9:00 AM", description: "Submit one photo and the story or idea behind it." },
    ],
    coordinators: heads("Dhruv Rangra", "Kartik"),
  }),
  event({
    id: "cultural-walk",
    entryFeeNum: 50, entryFee: "₹50", prizePool: "1st ₹2,000 · 2nd ₹1,500 · 3rd ₹1,000",
    registrationType: "solo",
    title: "UNLEASHED",
    tagline: "A walk through the cultures of India",
    category: "cultural",
    overview: "A solo ramp walk in two categories: Cultural Showcase (traditional dress and heritage) and Cosplay (characters from anime, film, games, books or mythology). Pick one when you register.",
    rules: [
      "Pick one category when you register: Cultural Showcase (traditional dress and heritage of any region, community or era) or Cosplay (a character from anime, film, games, comics, books or mythology). You cannot switch on the day.",
      "Report 30 minutes before the event.",
      "Bring your own background music (BGM), send it in advance, and keep a backup.",
      "Walk only: dancing or talking during the walk loses marks.",
      "You carry, manage and clear your own props.",
      "Prop weapons must be fake, light and safe. No real weapons, fire, sharp objects, liquids, powders or glass.",
      "Outfits, actions and messages must not mock any culture, religion, community or gender. Costumes and lyrics must be decent.",
      "Ties go to the higher Introduction & Message score. The judges' decisions are final.",
      "1st, 2nd and 3rd prizes are given separately for Cultural Showcase and Cosplay.",
    ],
    rounds: [
      { name: "Round 1: Qualifying walk", time: "50 marks", description: "Ramp walk to your BGM, with poses, character actions and approved props. Judges pick the finalists from each category." },
      { name: "Round 2: Final walk & introduction", time: "70 marks", description: "Walk again, then introduce your character or culture, why you chose it and its message, in 2 minutes at most." },
    ],
    judgingCriteria: [
      { name: "Costume / dress", weight: "10" },
      { name: "Makeup & styling", weight: "10" },
      { name: "Effort in presentation", weight: "10" },
      { name: "Confidence & walk", weight: "10" },
      { name: "Actions & props", weight: "10" },
      { name: "Final: introduction & message", weight: "20" },
    ],
    coordinators: heads("Ankita Thakur", "Dhruv", "Gargi"),
  }),
  event({
    id: "dance-competition",
    entryFeeNum: 0, entryFee: "Free", prizePool: "A winner in each category: Solo and Group",
    registrationType: "both", maxTeam: 12,
    title: "RHYTHMIC RUMBLE",
    tagline: "Own the stage",
    category: "cultural",
    overview: "Dance solo or in a group (2 or more), in any style, for 5–8 minutes. Solo and Group are judged separately, with a winner in each.",
    rules: [
      "Two separate categories: Solo (1 dancer) and Group (2 or more). One winner in each.",
      "Any style: classical, folk, hip-hop, contemporary, freestyle, fusion and more.",
      "Perform for 5 to 8 minutes. Timing starts at the first beat or first move. Shorter or longer loses marks.",
      "Report 30 minutes before the event. Send your music (MP3 or link) to the coordinators in advance and keep a backup.",
      "Choreography must be your own. Inspiration is fine; steps copied from reels or YouTube lose marks.",
      "Stunts earn extra points but must be done safely. The organisers are not liable for injuries from unsafe stunts.",
      "No fire, glass, sharp objects, liquids or powders. Clear your props right after you perform.",
      "Songs, costumes and steps must not hurt religious or cultural feelings. No vulgar or offensive gestures.",
      "Ties go to the higher Choreography score. The judges' decision is final; no appeals on the day.",
    ],
    judgingCriteria: [
      { name: "Unique steps / choreography", weight: "15" },
      { name: "Expressions", weight: "10" },
      { name: "Energy", weight: "10" },
      { name: "Pace & rhythm", weight: "10" },
      { name: "Overall impact (solo)", weight: "5" },
      { name: "Coordination & sync (group)", weight: "10" },
      { name: "Formations & transitions (group)", weight: "5" },
    ],
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
    details: `${ev.tagline}\n\n${ev.time}\nhttps://chaitanyahptu.dev/events`,
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
