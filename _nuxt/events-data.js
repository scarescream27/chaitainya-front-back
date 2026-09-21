/**
 * ============================================================================
 * Chaitanya 2k26 — Official Event Catalog & Competition Dataset
 * ============================================================================
 * 12 Curated Flagship Competitions for HPTU Hamirpur's Annual Fest:
 * - Coding & AI (3)
 * - Robotics & IoT (3)
 * - Esports & Gaming (2)
 * - Workshops & Keynotes (2)
 * - Cultural & Arts (2)
 */

export const EVENT_CATEGORIES = [
  { id: "all", name: "ALL ARENAS", shortCode: "ALL", count: 12 },
  { id: "coding", name: "CODING & AI", shortCode: "TECH", count: 3, accent: "#00d2ff" },
  { id: "robotics", name: "ROBOTICS & IOT", shortCode: "ROBO", count: 3, accent: "#ff6b35" },
  { id: "esports", name: "ESPORTS & GAMING", shortCode: "PLAY", count: 2, accent: "#a048fe" },
  { id: "workshops", name: "WORKSHOPS & TALKS", shortCode: "LEARN", count: 2, accent: "#f5a623" },
  { id: "cultural", name: "CULTURAL & ARTS", shortCode: "CULTURE", count: 2, accent: "#e63b7a" },
];

export const EVENTS_DATA = [
  // --------------------------------------------------------------------------
  // 1. CODING & AI
  // --------------------------------------------------------------------------
  {
    id: "ai-hackathon",
    title: "AI INNOVATION HACKATHON",
    tagline: "36-Hour Continuous Sprint Building Autonomous AI & Agentic Systems",
    category: "coding",
    categoryName: "CODING & AI",
    badge: "FLAGSHIP TECH",
    format: "Team (2 - 4 Members)",
    teamSize: "2 - 4 Members",
    minTeam: 2,
    maxTeam: 4,
    entryFee: "₹400 / Team",
    entryFeeNum: 400,
    prizePool: "₹50,000 CASH + CLOUD CREDITS",
    prizeBreakdown: {
      first: "₹25,000 Cash + ₹50,000 Cloud Credits + Trophy",
      second: "₹15,000 Cash + ₹25,000 Cloud Credits",
      third: "₹10,000 Cash + Swag Kit",
    },
    date: "26 - 27 MARCH 2026",
    time: "10:00 AM (36 Hours)",
    venue: "Main CS Innovation Centre & Lab 1",
    status: "REGISTRATION OPEN",
    overview:
      "A 36-hour non-stop hackathon challenging developers to build groundbreaking AI agents, multimodal LLM applications, or autonomous systems solving critical problems in healthcare, education, agriculture, and spatial computing.",
    rules: [
      "Teams must consist of 2 to 4 eligible college/university students with valid college ID cards.",
      "All code, design, and assets must be developed during the 36-hour hackathon period. Open-source libraries and APIs are permitted.",
      "Projects must be hosted on a public GitHub repository with a comprehensive README and working live demo.",
      "Plagiarism, pre-built proprietary codebases, or copyright infringement will result in immediate disqualification.",
      "High-speed university Wi-Fi, power outlets, snacks, beverages, and rest bays will be provided throughout the night.",
    ],
    rounds: [
      {
        name: "Round 1: Problem Pitch & Architecture Check",
        time: "Day 1 // 02:00 PM",
        description: "Submit solution blueprint, tech stack, and workflow architecture to mentor panel.",
      },
      {
        name: "Round 2: Midnight Mentor Checkpoint",
        time: "Day 2 // 01:00 AM",
        description: "Live progress review, code inspection, and API integration mentoring.",
      },
      {
        name: "Round 3: Grand Finale Showcase & Q&A",
        time: "Day 2 // 04:00 PM",
        description: "5-minute live stage demo before industry AI researchers and VC judges.",
      },
    ],
    judgingCriteria: [
      { name: "Innovation & Originality", weight: "30%" },
      { name: "Technical Execution & AI Depth", weight: "30%" },
      { name: "UI/UX & Interactive Design", weight: "20%" },
      { name: "Real-world Practical Utility", weight: "20%" },
    ],
    coordinators: [
      {
        name: "Er. Amit Chandel",
        role: "Faculty Advisor",
        phone: "+91 98160 54321",
        email: "amit.chandel@hptu.ac.in",
        whatsapp: "https://wa.me/919816054321",
      },
      {
        name: "Aditya Sharma",
        role: "Student Lead",
        phone: "+91 98160 11223",
        email: "aditya.sharma@hptu.ac.in",
        whatsapp: "https://wa.me/919816011223",
      },
    ],
  },
  {
    id: "code-golf",
    title: "CODE GOLF: ALGO SPEEDRUN",
    tagline: "Shortest, Most Optimal Byte-Count Algorithmic Showdown Under Pressure",
    category: "coding",
    categoryName: "CODING & AI",
    badge: "SOLO SPEEDRUN",
    format: "Solo (1 Participant)",
    teamSize: "Solo",
    minTeam: 1,
    maxTeam: 1,
    entryFee: "₹100 / Person",
    entryFeeNum: 100,
    prizePool: "₹15,000 CASH",
    prizeBreakdown: {
      first: "₹8,000 Cash + Winner Trophy",
      second: "₹4,500 Cash + Certificate",
      third: "₹2,500 Cash",
    },
    date: "26 MARCH 2026",
    time: "02:30 PM — 05:00 PM",
    venue: "Computer Centre Lab 2",
    status: "REGISTRATION OPEN",
    overview:
      "A fast-paced algorithmic programming contest where standard efficiency is only half the battle. In Code Golf, competitors must solve complex logic puzzles using the minimum possible character and byte count in Python, C++, or JavaScript.",
    rules: [
      "Individual participation only. No internet browsing or external communication allowed during competition.",
      "Permitted languages: Python 3, C++, JavaScript (Node.js), or Rust.",
      "Scoring formula considers both test cases passed (correctness) and source code character/byte count (conciseness).",
      "Standard test harness runs in sandboxed terminal environments with strict CPU time limits (1.0s) and memory caps.",
    ],
    rounds: [
      {
        name: "Round 1: Rapid Algorithmic Qualifier",
        time: "02:30 PM — 03:30 PM",
        description: "5 classic algorithms (dynamic programming, graphs, math logic) under strict time pressure.",
      },
      {
        name: "Round 2: Extreme Code Golf Crucible",
        time: "04:00 PM — 05:00 PM",
        description: "Top 12 finalists compete on obfuscated mini-problems where every byte counts.",
      },
    ],
    judgingCriteria: [
      { name: "Correctness & Hidden Testcases", weight: "50%" },
      { name: "Code Minification & Byte Count", weight: "35%" },
      { name: "Submission Speed Bonus", weight: "15%" },
    ],
    coordinators: [
      {
        name: "Priya Thakur",
        role: "Student Coordinator",
        phone: "+91 94180 55443",
        email: "priya.thakur@hptu.ac.in",
        whatsapp: "https://wa.me/919418055443",
      },
    ],
  },
  {
    id: "ctf-crucible",
    title: "WEB3 & CTF SECURITY CRUCIBLE",
    tagline: "Offensive Security, Binary Exploitation & Smart Contract Auditing",
    category: "coding",
    categoryName: "CODING & AI",
    badge: "CYBERSECURITY",
    format: "Team (1 - 3 Members)",
    teamSize: "1 - 3 Members",
    minTeam: 1,
    maxTeam: 3,
    entryFee: "₹300 / Team",
    entryFeeNum: 300,
    prizePool: "₹25,000 CASH + BADGES",
    prizeBreakdown: {
      first: "₹14,000 Cash + Gold Hacker Badge",
      second: "₹7,500 Cash + Silver Hacker Badge",
      third: "₹3,500 Cash",
    },
    date: "27 MARCH 2026",
    time: "11:00 AM — 04:00 PM",
    venue: "Seminar Hall B & Cybersecurity Lab",
    status: "REGISTRATION OPEN",
    overview:
      "A Jeopardy-style Capture the Flag competition pitting cybersecurity enthusiasts against realistic attack vectors, cryptographic challenges, reverse engineering puzzles, web vulnerabilities, and Solidity smart contract reentrancy hacks.",
    rules: [
      "Teams can comprise 1 to 3 members. Bring your own laptops configured with Kali Linux or preferred pentesting tools.",
      "Attacking the competition scoring server, DoS/DDoS attacks, or sharing flags with rival teams will result in an immediate permanent ban.",
      "All flags follow the standard format: CHAITANYA{flag_string_here}.",
      "Hint penalties apply dynamically depending on challenge tier.",
    ],
    rounds: [
      {
        name: "Jeopardy Phase: 5 Domain Tracks",
        time: "11:00 AM — 03:00 PM",
        description: "Concurrent categories: Web Exploitation, Cryptography, Reverse Engineering, Forensics, and Web3 Smart Contracts.",
      },
      {
        name: "King of the Hill Sprint",
        time: "03:15 PM — 04:00 PM",
        description: "Top 5 teams battle to capture and defend a vulnerable simulated university server box.",
      },
    ],
    judgingCriteria: [
      { name: "Total Flag Points Accumulated", weight: "70%" },
      { name: "Time to First Blood (Bonus)", weight: "20%" },
      { name: "Exploit Methodology Writeup", weight: "10%" },
    ],
    coordinators: [
      {
        name: "Rohan Verma",
        role: "Security Lead",
        phone: "+91 98162 11223",
        email: "rohan.v@hptu.ac.in",
        whatsapp: "https://wa.me/919816211223",
      },
    ],
  },

  // --------------------------------------------------------------------------
  // 2. ROBOTICS & HARDWARE
  // --------------------------------------------------------------------------
  {
    id: "robowars-30kg",
    title: "ROBOWARS: 30KG METAL CLASH",
    tagline: "Heavyweight Battlebots Combat Inside Reinforced Steel Enclosure",
    category: "robotics",
    categoryName: "ROBOTICS & IOT",
    badge: "HEAVY COMBAT",
    format: "Team (2 - 5 Members)",
    teamSize: "2 - 5 Members",
    minTeam: 2,
    maxTeam: 5,
    entryFee: "₹500 / Team",
    entryFeeNum: 500,
    prizePool: "₹45,000 CASH + TROPHY",
    prizeBreakdown: {
      first: "₹25,000 Cash + Grand Champion Trophy",
      second: "₹12,000 Cash + Runner Up Shield",
      third: "₹8,000 Cash",
    },
    date: "26 MARCH 2026",
    time: "03:00 PM — 07:00 PM",
    venue: "Outdoor Central Combat Arena",
    status: "REGISTRATION OPEN",
    overview:
      "The premier mechanical warfare spectacle of Himachal Pradesh! Custom-built remote-controlled combat robots clash inside a poly-carbonate and steel enclosed arena. Weapons allowed: vertical/horizontal spinners, high-pressure flippers, drums, and wedges.",
    rules: [
      "Maximum weight limit: 30.0 kg (5% tolerance allowed). Bots will be weighed and safety-inspected prior to bout.",
      "Power source: DC batteries only (max 36V). Internal combustion engines, liquids, projectiles, and radio jammers strictly forbidden.",
      "Matches last 3 minutes. Elimination by knockout (incapacitation for 10 seconds) or judge scorecards based on Damage, Aggression, and Control.",
      "All bots must feature a fail-safe kill switch accessible from outside the chassis.",
    ],
    rounds: [
      {
        name: "Technical Safety & Weigh-In Scrutiny",
        time: "10:00 AM — 01:00 PM",
        description: "Weapons test, radio failsafe validation, and arena mobility check.",
      },
      {
        name: "Knockout Elimination Brackets",
        time: "03:00 PM — 05:30 PM",
        description: "1-on-1 battle rounds inside the heavy reinforced combat cage.",
      },
      {
        name: "Grand Finale Clash",
        time: "06:00 PM — 07:00 PM",
        description: "Top contenders clash in final sudden-death combat bouts for the trophy.",
      },
    ],
    judgingCriteria: [
      { name: "Structural Damage Inflicted", weight: "40%" },
      { name: "Aggression & Arena Ring Dominance", weight: "35%" },
      { name: "Bot Control & Driver Strategy", weight: "25%" },
    ],
    coordinators: [
      {
        name: "Dr. Rajesh Sharma",
        role: "Faculty Convener",
        phone: "+91 94181 88990",
        email: "rajesh.me@hptu.ac.in",
        whatsapp: "https://wa.me/919418188990",
      },
      {
        name: "Vikas Rana",
        role: "Robotics Club Lead",
        phone: "+91 98050 44556",
        email: "vikas.rana@hptu.ac.in",
        whatsapp: "https://wa.me/919805044556",
      },
    ],
  },
  {
    id: "line-follower",
    title: "AUTONOMOUS LINE FOLLOWER",
    tagline: "PID Microcontroller Micro-Bots Tackling Speed Inversions & Mazes",
    category: "robotics",
    categoryName: "ROBOTICS & IOT",
    badge: "AUTONOMOUS",
    format: "Team (2 - 4 Members)",
    teamSize: "2 - 4 Members",
    minTeam: 2,
    maxTeam: 4,
    entryFee: "₹300 / Team",
    entryFeeNum: 300,
    prizePool: "₹20,000 CASH",
    prizeBreakdown: {
      first: "₹10,000 Cash + Trophy",
      second: "₹6,000 Cash",
      third: "₹4,000 Cash",
    },
    date: "27 MARCH 2026",
    time: "10:30 AM — 01:30 PM",
    venue: "Robotics Workshop Bay (Ground Floor)",
    status: "REGISTRATION OPEN",
    overview:
      "Engineers design and tune high-speed autonomous wheeled robots to navigate a challenging 30-meter track featuring acute 90-degree corners, loop-de-loops, inverted line crossings, and surprise dead-ends in minimal time.",
    rules: [
      "Maximum bot dimensions: 25cm x 25cm x 20cm. No manual intervention once the bot crosses the start threshold.",
      "The track consists of 25mm black line on white surface and white line on black surface.",
      "Microcontroller choice is open (Arduino, STM32, ESP32, Raspberry Pi Pico, Teensy).",
      "Each team gets two official timed runs; the fastest clean run counts towards rankings.",
    ],
    rounds: [
      {
        name: "Track Calibration & Practice Run",
        time: "10:30 AM — 11:30 AM",
        description: "Teams tune IR array sensor thresholds and motor PWM coefficients.",
      },
      {
        name: "Official Grand Prix Timed Runs",
        time: "11:45 AM — 01:30 PM",
        description: "Official laser-timed competition runs with live trackside leaderboards.",
      },
    ],
    judgingCriteria: [
      { name: "Clean Track Completion Time", weight: "70%" },
      { name: "Smoothness & Zero Track Deviations", weight: "20%" },
      { name: "Design Compactness & Elegance", weight: "10%" },
    ],
    coordinators: [
      {
        name: "Neha Sen",
        role: "Student Coordinator",
        phone: "+91 94182 33441",
        email: "neha.sen@hptu.ac.in",
        whatsapp: "https://wa.me/919418233441",
      },
    ],
  },
  {
    id: "drone-gp",
    title: "DRONE GRAND PRIX: FPV SKYRACER",
    tagline: "High-Speed Obstacle Course Drone Racing With FPV Neon Gates",
    category: "robotics",
    categoryName: "ROBOTICS & IOT",
    badge: "AEROMODELING",
    format: "Solo / Duo",
    teamSize: "1 - 2 Members",
    minTeam: 1,
    maxTeam: 2,
    entryFee: "₹250 / Team",
    entryFeeNum: 250,
    prizePool: "₹30,000 CASH",
    prizeBreakdown: {
      first: "₹16,000 Cash + Ace Pilot Trophy",
      second: "₹9,000 Cash",
      third: "₹5,000 Cash",
    },
    date: "27 MARCH 2026",
    time: "03:30 PM — 06:30 PM",
    venue: "University Sports Arena (Illuminated Flight Zone)",
    status: "REGISTRATION OPEN",
    overview:
      "Pilots navigate custom FPV quadcopters through an illuminated obstacle track featuring illuminated air gates, hairpin vertical slalom towers, and speed tunnels inside the University Sports Arena.",
    rules: [
      "Quads must adhere to standard 3-inch or 5-inch prop class. Max battery cell count: 6S LiPo.",
      "Video transmission: 5.8GHz analog or approved digital systems (DJI O3/Walksnail) on assigned race channels.",
      "Pilots must wear FPV goggles and operate from the designated safety pilot box.",
      "Safety nets enclose the entire racing perimeter. Propeller guards strongly recommended.",
    ],
    rounds: [
      {
        name: "Qualifying Time Trials (Hot Lap)",
        time: "03:30 PM — 04:30 PM",
        description: "Individual pilot 3-lap trials to seed the double elimination ladder.",
      },
      {
        name: "4-Drone Heat Elimination Races",
        time: "04:45 PM — 06:30 PM",
        description: "Head-to-head supersonic 4-pack drone heats around the neon track.",
      },
    ],
    judgingCriteria: [
      { name: "Total Heat Race Position", weight: "80%" },
      { name: "Fastest Single Lap Time Record", weight: "20%" },
    ],
    coordinators: [
      {
        name: "Abhishek Dhiman",
        role: "Flight Coordinator",
        phone: "+91 98051 77665",
        email: "abhishek.d@hptu.ac.in",
        whatsapp: "https://wa.me/919805177665",
      },
    ],
  },

  // --------------------------------------------------------------------------
  // 3. ESPORTS & GAMING
  // --------------------------------------------------------------------------
  {
    id: "bgmi-champ",
    title: "BGMI CAMPUS CHAMPIONSHIP",
    tagline: "4-Man Tactical Squad Battle Royale on Erangel & Miramar",
    category: "esports",
    categoryName: "ESPORTS & GAMING",
    badge: "BATTLE ROYALE",
    format: "Squad (4 Players)",
    teamSize: "4 Players",
    minTeam: 4,
    maxTeam: 4,
    entryFee: "₹400 / Squad",
    entryFeeNum: 400,
    prizePool: "₹35,000 CASH",
    prizeBreakdown: {
      first: "₹18,000 Cash + Champion Medals",
      second: "₹10,000 Cash",
      third: "₹5,000 Cash",
      mvp: "₹2,000 Cash + MVP Trophy",
    },
    date: "26 MARCH 2026",
    time: "01:00 PM — 06:00 PM",
    venue: "E-Sports Lounge & Live Broadcast Arena",
    status: "REGISTRATION OPEN",
    overview:
      "The ultimate Battlegrounds Mobile India squad showdown. 24 collegiate squads battle across custom tournament rooms on dedicated high-speed low-ping fibre connections, projected on the main auditorium big screens with live caster commentary.",
    rules: [
      "All squad members must be enrolled college students. Mobile devices only (tablets, iPads, emulators, or triggers strictly banned).",
      "Official BGIS tournament scoring system (10 pts for Chicken Dinner, 1 pt per kill).",
      "Matches played on custom HPTU tournament rooms. Screen recordings must be submitted on dispute.",
      "Third-party crosshair tools, GFX modifiers, or teaming will result in immediate disqualification.",
    ],
    rounds: [
      {
        name: "Group Stage Knockouts (4 Matches)",
        time: "01:00 PM — 03:30 PM",
        description: "24 squads divided into 2 groups (Erangel + Miramar) to determine top 16.",
      },
      {
        name: "Grand Finals: The Last Circle (4 Matches)",
        time: "04:00 PM — 06:00 PM",
        description: "Top 16 squads battle across Erangel, Miramar, and Sanhok for the championship.",
      },
    ],
    judgingCriteria: [
      { name: "Total Placement Points", weight: "50%" },
      { name: "Kill / Elimination Points", weight: "50%" },
    ],
    coordinators: [
      {
        name: "Karan Singh",
        role: "Esports Head",
        phone: "+91 98165 99882",
        email: "karan.esports@hptu.ac.in",
        whatsapp: "https://wa.me/919816599882",
      },
    ],
  },
  {
    id: "valorant-5v5",
    title: "VALORANT 5V5 CAMPUS WARFARE",
    tagline: "Double-Elimination LAN Tournament on 240Hz High-Refresh Rigs",
    category: "esports",
    categoryName: "ESPORTS & GAMING",
    badge: "TACTICAL FPS",
    format: "Team (5 Players + 1 Sub)",
    teamSize: "5 - 6 Players",
    minTeam: 5,
    maxTeam: 6,
    entryFee: "₹500 / Team",
    entryFeeNum: 500,
    prizePool: "₹35,000 CASH",
    prizeBreakdown: {
      first: "₹20,000 Cash + Trophy & Badges",
      second: "₹10,000 Cash",
      third: "₹5,000 Cash",
    },
    date: "27 MARCH 2026",
    time: "01:00 PM — 07:00 PM",
    venue: "Multimedia Hall A (Esports LAN Rig Zone)",
    status: "REGISTRATION OPEN",
    overview:
      "Tactical 5v5 FPS combat on custom Riot tournament server builds. Teams execute site retakes, line up utility flashes, and clutch high-stakes defusal rounds in double-elimination brackets with live casting.",
    rules: [
      "Standard competitive tournament rules. 5 players per team (1 optional substitute).",
      "Map veto system: Ascent, Haven, Bind, Split, Sunset, Lotus, Icebox.",
      "Quarterfinals and Semifinals: Best of 1 (BO1). Grand Finale: Best of 3 (BO3).",
      "Players may bring their own mice, mechanical keyboards, mousepads, and headsets.",
    ],
    rounds: [
      {
        name: "Upper & Lower Bracket Elimination",
        time: "01:00 PM — 04:30 PM",
        description: "Double elimination BO1 matches with map pick and bans.",
      },
      {
        name: "Grand Finale (Best of 3)",
        time: "05:00 PM — 07:00 PM",
        description: "Showcase finals played live before the auditorium audience.",
      },
    ],
    judgingCriteria: [
      { name: "Official Match Scoreboard", weight: "100%" },
    ],
    coordinators: [
      {
        name: "Sahil Jaswal",
        role: "Tournament Director",
        phone: "+91 94183 22110",
        email: "sahil.val@hptu.ac.in",
        whatsapp: "https://wa.me/919418322110",
      },
    ],
  },

  // --------------------------------------------------------------------------
  // 4. WORKSHOPS & TALKS
  // --------------------------------------------------------------------------
  {
    id: "genai-workshop",
    title: "GENAI & AUTONOMOUS AGENTS MASTERCLASS",
    tagline: "Hands-on Workshop: Building Autonomous LLM Agents & Multi-Agent Swarms",
    category: "workshops",
    categoryName: "WORKSHOPS & TALKS",
    badge: "HANDS-ON LAB",
    format: "Individual / Open to All",
    teamSize: "Solo / Open",
    minTeam: 1,
    maxTeam: 1,
    entryFee: "FREE",
    entryFeeNum: 0,
    prizePool: "CERTIFICATES + SWAG KIT",
    prizeBreakdown: {
      first: "Verified Certificate of Completion + HPTU AI Swag Bag + API Credits",
    },
    date: "26 MARCH 2026",
    time: "11:30 AM — 02:00 PM",
    venue: "Auditorium 1 (Main Hall)",
    status: "REGISTRATION OPEN",
    overview:
      "A hands-on intensive masterclass conducted by leading AI researchers and senior engineering leads. Attendees learn the architectural fundamentals of function-calling, autonomous reasoning loops (ReAct), multi-agent swarms, RAG pipelines, and local open-weight model deployment.",
    rules: [
      "Open to all registered attendees of Chaitanya 2k26 with zero entry fee.",
      "Bring your own laptop with Python 3.10+ installed or a modern web browser for cloud notebook access.",
      "Complimentary cloud GPU compute credits provided to all registered participants.",
      "Digital certificates will be issued to all students who complete the hands-on lab exercise.",
    ],
    rounds: [
      {
        name: "Module 1: Agentic Reasoning & Tool Calling",
        time: "11:30 AM — 12:30 PM",
        description: "Understanding autonomous loops, structured outputs, and memory persistence.",
      },
      {
        name: "Module 2: Live Multi-Agent Swarm Coding",
        time: "12:45 PM — 02:00 PM",
        description: "Build an autonomous code-review and debugging multi-agent workflow from scratch.",
      },
    ],
    judgingCriteria: [
      { name: "Workshop Attendance & Lab Exercise Submission", weight: "100%" },
    ],
    coordinators: [
      {
        name: "Dr. Sunita Rana",
        role: "Faculty Incharge",
        phone: "+91 94180 11998",
        email: "sunita.cse@hptu.ac.in",
        whatsapp: "https://wa.me/919418011998",
      },
    ],
  },
  {
    id: "webxr-keynote",
    title: "FUTURE OF SPATIAL COMPUTING & 3D WEB",
    tagline: "Keynote & Interactive Showcase: WebGL, Three.js & Apple Vision Pro",
    category: "workshops",
    categoryName: "WORKSHOPS & TALKS",
    badge: "KEYNOTE & DEMO",
    format: "Individual / Open to All",
    teamSize: "Solo / Open",
    minTeam: 1,
    maxTeam: 1,
    entryFee: "FREE",
    entryFeeNum: 0,
    prizePool: "SWAG + MENTORSHIP",
    prizeBreakdown: {
      first: "Direct 1-on-1 Studio Mentorship Session + XR Developer Swag",
    },
    date: "27 MARCH 2026",
    time: "02:00 PM — 04:00 PM",
    venue: "Auditorium 2 (Media Centre)",
    status: "REGISTRATION OPEN",
    overview:
      "Explore the frontiers of interactive web graphics and spatial computing. Industry creative technologists reveal how to build award-winning 60fps WebGL shaders, real-time physics simulations, and WebXR experiences optimized for spatial headsets.",
    rules: [
      "Open to all attendees. Pre-registration recommended as seats in Auditorium 2 are limited to 250 capacity.",
      "Interactive VR/AR demo booth available in the foyer following the keynote presentation.",
    ],
    rounds: [
      {
        name: "Keynote Presentation & Case Studies",
        time: "02:00 PM — 03:15 PM",
        description: "Demystifying shader math, lighting, Draco compression, and WebXR APIs.",
      },
      {
        name: "Interactive Hardware Demo & Audience Q&A",
        time: "03:15 PM — 04:00 PM",
        description: "Hands-on demo stations with VR/AR headsets and portfolio review.",
      },
    ],
    judgingCriteria: [
      { name: "Active Participation & Q&A Engagement", weight: "100%" },
    ],
    coordinators: [
      {
        name: "Er. Deepak Gautam",
        role: "Tech Talk Coordinator",
        phone: "+91 98166 77889",
        email: "deepak.gautam@hptu.ac.in",
        whatsapp: "https://wa.me/919816677889",
      },
    ],
  },

  // --------------------------------------------------------------------------
  // 5. CULTURAL & ARTS
  // --------------------------------------------------------------------------
  {
    id: "battle-bands",
    title: "BATTLE OF THE BANDS: ROCK & FUSION",
    tagline: "Live Musical Showdown Featuring Rock, Fusion & Indie Bands Under Open Sky",
    category: "cultural",
    categoryName: "CULTURAL & ARTS",
    badge: "LIVE MUSIC",
    format: "Band (3 - 8 Members)",
    teamSize: "3 - 8 Members",
    minTeam: 3,
    maxTeam: 8,
    entryFee: "₹500 / Band",
    entryFeeNum: 500,
    prizePool: "₹40,000 CASH + STUDIO RECORDING",
    prizeBreakdown: {
      first: "₹25,000 Cash + Professional Single Studio Recording Session",
      second: "₹10,000 Cash + Memento",
      third: "₹5,000 Cash",
    },
    date: "26 MARCH 2026",
    time: "06:30 PM — 10:00 PM",
    venue: "Open Air Theatre (OAT - Main Stage)",
    status: "REGISTRATION OPEN",
    overview:
      "Electric guitars, thunderous drums, soul-stirring vocals, and original musical compositions. College bands from across Northern India take the main festival stage to compete for the crown of Battle of the Bands Champion.",
    rules: [
      "Bands can have between 3 to 8 members. Time limit: 15 minutes (including 3 minutes stage setup & sound check).",
      "At least one original composition is strongly encouraged alongside covers.",
      "Standard 5-piece drum kit, bass amplifiers, guitar amplifiers, and monitor wedges provided on stage.",
      "Bands must bring their own guitars, bass, keyboards, effect pedals, and drumsticks.",
    ],
    rounds: [
      {
        name: "Stage Sound Check & Acoustic Balancing",
        time: "04:30 PM — 06:00 PM",
        description: "Official sound engineers dial in audio levels and instrument balancing.",
      },
      {
        name: "Main Stage Competition Performances",
        time: "06:30 PM — 10:00 PM",
        description: "Live open-air high-voltage performances judged by renowned indie artists.",
      },
    ],
    judgingCriteria: [
      { name: "Musicality & Tightness of Composition", weight: "35%" },
      { name: "Vocal Dynamics & Technical Skill", weight: "25%" },
      { name: "Stage Presence & Crowd Energy", weight: "25%" },
      { name: "Originality & Arrangement", weight: "15%" },
    ],
    coordinators: [
      {
        name: "Prof. Arvind Dogra",
        role: "Cultural Secretary",
        phone: "+91 94184 66778",
        email: "arvind.cultural@hptu.ac.in",
        whatsapp: "https://wa.me/919418466778",
      },
      {
        name: "Simran Kapoor",
        role: "Band President",
        phone: "+91 98055 11990",
        email: "simran.music@hptu.ac.in",
        whatsapp: "https://wa.me/919805511990",
      },
    ],
  },
  {
    id: "nukkad-natak",
    title: "NUKKAD NATAK: STREET PLAY SHOWCASE",
    tagline: "Rhythmic Theatrical Performances Sparking Social Awareness & Thought",
    category: "cultural",
    categoryName: "CULTURAL & ARTS",
    badge: "THEATRE",
    format: "Team (8 - 20 Members)",
    teamSize: "8 - 20 Members",
    minTeam: 8,
    maxTeam: 20,
    entryFee: "FREE",
    entryFeeNum: 0,
    prizePool: "₹25,000 CASH",
    prizeBreakdown: {
      first: "₹15,000 Cash + Natak Ratna Trophy",
      second: "₹7,000 Cash",
      third: "₹3,000 Cash",
    },
    date: "27 MARCH 2026",
    time: "05:00 PM — 07:30 PM",
    venue: "Central University Courtyard",
    status: "REGISTRATION OPEN",
    overview:
      "A powerful cultural celebration where theater troupes utilize powerful acoustics, dafli beats, choral chants, and physical theatre in the circular courtyard to deliver hard-hitting messages on social transformation.",
    rules: [
      "Team size: 8 to 20 actors. Time limit: 20 minutes maximum (bell at 18 minutes; negative marking for exceeding time).",
      "Live acoustic instruments allowed: dafli, dholak, harmonium, flute, cymbals. No pre-recorded tracks or electronic amplification.",
      "Plain clothes/kurtas with duppattas/scratches allowed. No elaborate backdrops or heavy stage props.",
      "Vulgarity, direct political campaign slogans, or religious disrespect will result in immediate disqualification.",
    ],
    rounds: [
      {
        name: "Street Play Performances",
        time: "05:00 PM — 07:30 PM",
        description: "Back-to-back troupe showcases in the circular amphitheatre courtyard.",
      },
    ],
    judgingCriteria: [
      { name: "Message Clarity & Social Impact", weight: "35%" },
      { name: "Voice Projection, Chants & Rhythmic Harmony", weight: "30%" },
      { name: "Formation, Movement & Acting Delivery", weight: "25%" },
      { name: "Script Originality & Time Discipline", weight: "10%" },
    ],
    coordinators: [
      {
        name: "Pooja Sharma",
        role: "Theatre Society Lead",
        phone: "+91 94185 88223",
        email: "pooja.dramatics@hptu.ac.in",
        whatsapp: "https://wa.me/919418588223",
      },
    ],
  },
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

export function filterEvents(category = "all", searchQuery = "") {
  let list = EVENTS_DATA;

  if (category && category !== "all") {
    list = list.filter((ev) => ev.category === category);
  }

  if (searchQuery && searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    list = list.filter((ev) => {
      return (
        ev.title.toLowerCase().includes(q) ||
        ev.tagline.toLowerCase().includes(q) ||
        ev.categoryName.toLowerCase().includes(q) ||
        ev.venue.toLowerCase().includes(q) ||
        ev.badge.toLowerCase().includes(q) ||
        ev.format.toLowerCase().includes(q)
      );
    });
  }

  return list;
}
