/**
 * ============================================================================
 * File: about-page.js
 * Purpose: /about — the university, the fest, the organising team, sponsors.
 * Reuses the privacy page's card/hero styles (privacy-policy.css); grids live
 * in about.css.
 * ============================================================================
 */
import { a as t, __tla as o } from "./app-main.js";
import { k as e, H as be, F as xe, M as b, E as rt } from "./vue-runtime.js";
import { FEST_CONFIG, getFestDatesLabel, escapeHtml as esc } from "./fest-config.js";
import { EVENT_CATEGORIES, EVENTS_DATA } from "./events-data.js";

// Source: "Chaitanya Teams 2026" (organising committee list). Names, roles and
// departments only: the list's phone and roll numbers are never published.

// Fest leadership.
const LEADERSHIP = [
  { name: "Mr. Kushal Sharma", role: "Faculty Coordinator · BHMCT" },
  { name: "Dr. Avni Sharma", role: "Faculty Coordinator · CSE" },
  { name: "Mr. Manish Khanna", role: "Faculty Coordinator · MBA" },
  { name: "Dr. Shivani Rana", role: "Faculty Coordinator · CSE" },
  { name: "Krish Kanha", role: "Student Head Coordinator · CSE" },
  { name: "Aman Singh Ranawat", role: "Student Head Coordinator · CSE" },
];

// Every team: coordinators shown as cards, members as name + year only.
// members: [name, semester]; the year shown is derived from the semester.
const ICONS = {
  code: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>',
  rupee: '<path d="M6 3h12M6 8h12M6 13l8.5 8M6 13h3c6.67 0 6.67-10 0-10"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  pen: '<path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.59 7.59"/><circle cx="11" cy="11" r="2"/>',
  megaphone: '<path d="M3 11v2a1 1 0 0 0 1 1h3l9 5V5L7 10H4a1 1 0 0 0-1 1z"/><path d="M19 9a4 4 0 0 1 0 6"/>',
  wrench: '<path d="M14.7 6.3a4 4 0 0 0 5 5l-9.6 9.6a2.1 2.1 0 0 1-3-3l9.6-9.6a4 4 0 0 0-2-2z"/>',
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  sparkle: '<path d="M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2z"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4M8 22h8"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  stage: '<path d="M12 2v4M4.9 4.9l2.8 2.8M19.1 4.9l-2.8 2.8"/><path d="M6 21l3-11h6l3 11z"/>',
};

const TEAMS = [
  {
    name: "Organising", icon: "users",
    blurb: "The faculty and student heads who lead Chaitanya 2k26.",
    people: LEADERSHIP, faculty: [], students: [], members: [],
  },
  {
    name: "Technical", icon: "code",
    blurb: "The team that built and runs this website, online registration and entry passes.",
    faculty: ["Er. Neha Dhiman"], students: ["Manas Kapoor"],
    members: [["Priyanshu Attri", 7], ["Akash", 7], ["Aditya Verma", 1], ["Gourav", 3]],
  },
  {
    name: "Finance", icon: "rupee",
    faculty: ["Mr. Shubham Sharma"], students: ["Krish Kanha"],
    members: [["Aman Singh Ranawat", 5], ["Ritik", 1]],
  },
  {
    name: "Disciplinary", icon: "shield",
    faculty: ["Mr. Akshay Patial", "Mr. Vijay Nadda", "Mr. Amit Sharma", "Er. Kumari Archana", "Er. Komal"], students: ["Akhil Thakur"],
    members: [
      ["Ankit Thakur", 7], ["Deepanshu Dogra", 7], ["Ayush", 7], ["Nitin", 7], ["Vishav Kaundal", 7], ["Kunal Chauhan", 7],
      ["Akshit Thakur", 7], ["Anshul Kaundal", 7], ["Karnail Singh", 7], ["Anshul Thakur", 5], ["Aditya Thakur", 5],
      ["Aditya Bhardwaj", 5], ["Ishita Parmar", 5], ["Shavi", 5], ["Mahek", 5], ["Muskan Thakur", 5], ["Kavita", 5],
      ["Sumit Kumar", 3], ["Ridima Kapil", 1], ["Sahil Badhan", 1], ["Aseem Choudhary", 1], ["Manasvi Sharma", 3],
      ["Ankush Kumar", 3], ["Shubham Raghuwanshi", 3], ["Shivani", 3], ["Rajat Chauhan", 3], ["Diksha Kumari", 3],
      ["Alisha Thakur", 3], ["Abhishek Thakur", 3], ["Palak Chandel", 3], ["Himanshi", 3], ["Ipsa", 3], ["Vishal", 3],
      ["Alka", 3], ["Payal", 3], ["Pallavi Thakur", 1], ["Abhishek Thakur", 7], ["Sahil Thakur", 7], ["Shubham Thakur", 7],
      ["Sarthak Dhadwal", 7], ["Naveen Rana", 3], ["Jyotiraditya", 5],
    ],
  },
  {
    name: "Design", icon: "pen",
    faculty: ["Dr. Vaishnav Kiran"], students: ["Lavanya Chambial"],
    members: [
      ["Tanishq", 1], ["Navum", 1], ["Kanishk Sapahiya", 1], ["Vaishali", 1], ["Anmol Rana", 1], ["Sanskriti", 1],
      ["Niharika", 1], ["Priyanshi Sharma", 1], ["Sakshi", 1], ["Akshat Rana", 3], ["Asha Thakur", 1],
    ],
  },
  {
    name: "Marketing", icon: "megaphone",
    faculty: ["Mr. Rahul Kaundal", "Mr. Aayush Guleria"], students: ["Kashish Chandel"],
    members: [
      ["Mohit Kashyap", 3], ["Archit Verma", 1], ["Abhinandan Sharma", 3], ["Kashish Kapoor", 3], ["Aditya Thakur", 1],
      ["Parinita", 3], ["Mridula", 3], ["Sahil Verma", 1], ["Ajay Sood", 7],
    ],
  },
  {
    name: "Requirement Gathering & Maintenance", icon: "wrench",
    faculty: ["Mrs. Shagun", "Mr. Rajesh Rakta"], students: ["Shahid Ansari"],
    members: [
      ["Shanvi Kamal", 1], ["Ayush", 7], ["Anshul Chauhan", 1], ["Sushant", 7], ["Sudheer", 1], ["Daksh", 1],
      ["Dushyant", 1], ["Sachin", 1], ["Harshit", 1],
    ],
  },
  {
    name: "Cultural Management", icon: "music",
    faculty: ["Mr. Yashveer Bhardwaj"], students: ["Ankita Thakur"],
    members: [["Divyanshi", 1], ["Priya", 1], ["Simran Thapa", 1]],
  },
  {
    name: "Decor", icon: "sparkle",
    faculty: ["Mr. Ajay Bharti", "Dr. Meena Ranot", "Mrs. Payal Sood"], students: ["Ishita Parmar"],
    members: [
      ["Ekta", 5], ["Khushboo Sharma", 5], ["Loveleen Kaur", 5], ["Aastha Thakur", 5], ["Rhythm Rangra", 3],
      ["Devansh Chaudhary", 3], ["Nishant Sharma", 3], ["Sahil Thakur", 5], ["Nikhil Kumar", 5], ["Sahil Bhatti", 5],
    ],
  },
  {
    name: "Activity Planning", icon: "calendar",
    faculty: ["Er. Banita", "Er. Shikha Dhiman", "Mr. Chander Varun"], students: ["Rohit Kumar"],
    members: [
      ["Sudhanshu Sharma", 7], ["Gargi Choudhary", 5], ["Anshita Sharma", 5], ["Dhruv", 5], ["Shabnam Minhas", 5],
      ["Tarun Suri", 3], ["Ankita Thakur", 3], ["Sourav", 3], ["Soummya", 1], ["Aparna Sharma", 1], ["Priya", 1],
      ["Karan Sharma", 1], ["Ankush", 3], ["Gourav", 3], ["Naman Sharma", 3],
    ],
  },
  {
    name: "PR", icon: "mic",
    faculty: ["Mr. Abhinav Jamwal", "Mr. Shubham Kaushal"], students: ["Shriya Verma"],
    members: [
      ["Ayush Sankhyan", 5], ["Kamakshi", 1], ["Diya", 1], ["Mudit", 1], ["Anway Thakur", 3], ["Mannat", 1],
      ["Aditi", 1], ["Sahil Badhan", 1],
    ],
  },
  {
    name: "Stage Handling", icon: "stage",
    faculty: ["Ms. Meenakshi", "Dr. Pallavi Nagpal"], students: ["Lata"],
    members: [["Vanshika", 1], ["Sunidhi Sharma", 1], ["Nilakashi", 1], ["Shiya Thakur", 1], ["Saksham Thakur", 7]],
  },
];

const YEARS = ["1st", "2nd", "3rd", "4th"];
function yearOf(sem) {
  return `${YEARS[Math.min(Math.ceil(sem / 2), 4) - 1]} Year`;
}

function teamSize(t) {
  return (t.people || []).length + t.faculty.length + t.students.length + t.members.length;
}

function iconSvg(name) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
}

// Sponsors: { name, tier, url, logo }. Empty shows the "sponsor us" card.
const SPONSORS = [];

function initials(name) {
  return name.replace(/^(Mr|Mrs|Ms|Dr|Er)\.\s*/i, "").split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("");
}

// Card tints rotate through the event category colours (the original used
// destructive / muted / warning).
const TINTS = ["--cat-cultural", "--cat-tech", "--cat-innovation", "--cat-esports", "--cat-business"];

// Port of components/ui/team-section.tsx: coordinators as tinted photo cards
// (initials until real photos exist), then members as name + year.
function teamSectionHtml(team) {
  const coords = [
    ...(team.people || []),
    ...team.faculty.map((name) => ({ name, role: "Faculty Coordinator" })),
    ...team.students.map((name) => ({ name, role: "Student Coordinator" })),
  ];
  const cards = coords
    .map(
      (m, i) => `
        <li class="about-team-card" style="--tint: var(${TINTS[i % TINTS.length]}); --i: ${i}">
          <div class="about-team-wave" aria-hidden="true"></div>
          <div class="about-team-photo"><span aria-hidden="true">${esc(initials(m.name))}</span></div>
          <h4>${esc(m.name)}</h4>
          <p>${esc(m.role)}</p>
        </li>`
    )
    .join("");
  const members = team.members
    .map(([name, sem]) => `<li><span>${esc(name)}</span><small>${esc(yearOf(sem))}</small></li>`)
    .join("");
  return `
    <div class="about-team">
      <div class="about-team-head">
        <h3 id="about-team-title"><span>O U R</span>${esc(team.name.toUpperCase())} TEAM</h3>
        ${team.blurb ? `<p>${esc(team.blurb)}</p>` : ""}
      </div>
      <h4 class="about-sub">${team.people ? "Team" : "Coordinators"}</h4>
      <ul class="about-team-grid">${cards}</ul>
      ${members ? `<h4 class="about-sub">Members · ${team.members.length}</h4><ul class="about-members">${members}</ul>` : ""}
    </div>`;
}

function card(num, id, title, body) {
  return `
    <article class="privacy-card" id="${id}">
      <div class="privacy-card-header">
        <span class="privacy-card-num">${num}</span>
        <h2>${title}</h2>
      </div>
      ${body}
    </article>`;
}

function buildHtml() {
  const categories = EVENT_CATEGORIES.filter((c) => c.id !== "all").map((c) => ({
    ...c,
    count: EVENTS_DATA.filter((ev) => ev.category === c.id).length,
  }));
  const mail = esc(FEST_CONFIG.contactEmail);

  const sponsorsBody = SPONSORS.length
    ? `<ul class="about-sponsors">${SPONSORS.map(
        (s) => `<li><a href="${esc(s.url || "#")}" target="_blank" rel="noopener">
          ${s.logo ? `<img src="${esc(s.logo)}" alt="${esc(s.name)}" loading="lazy" />` : `<strong>${esc(s.name)}</strong>`}
          ${s.tier ? `<span>${esc(s.tier)}</span>` : ""}</a></li>`
      ).join("")}</ul>`
    : `<p>Sponsorship for Chaitanya 2k26 is open. Title, event and stall partnerships put your brand in front of
         engineering and management students from colleges across Himachal Pradesh.</p>`;

  return `
    <div class="privacy-container about-container">
      <div class="privacy-top-bar">
        <a href="/" class="privacy-back-btn"><span>←</span> RETURN TO HOME</a>
        <a href="/events" class="privacy-contact-btn">[ EXPLORE EVENTS ]</a>
      </div>

      <div class="privacy-hero">
        <span class="privacy-tag-badge">${esc(getFestDatesLabel())} · HPTU Hamirpur</span>
        <h1>About Chaitanya 2k26</h1>
        <p class="subtitle">The annual technical and cultural fest of ${esc(FEST_CONFIG.university)}.</p>
      </div>

      <div class="privacy-sections">
        ${card("01", "about-university", "The University", `
          <p><strong>Himachal Pradesh Technical University (HPTU)</strong> is the state technical university of
            Himachal Pradesh, set up in 2010 and based in Hamirpur. It brings together engineering, management,
            pharmacy and applied-science programmes, and affiliates technical institutes across the state.</p>
          <p>HPTU's campus in Hamirpur hosts Chaitanya every year, opening its labs, halls and grounds to students
            from colleges across the region.</p>`)}

        ${card("02", "about-fest", "The Fest", `
          <p><strong>Chaitanya</strong> is HPTU's flagship fest: ${FEST_CONFIG.festDays} days of code, design,
            debate, esports and culture. Students plan and run it with guidance from faculty coordinators, and
            participants from every college can register.</p>
          <ul class="about-stats">
            <li><b>${EVENTS_DATA.length}</b><span>Events</span></li>
            ${categories.map((c) => `<li><b>${c.count}</b><span>${esc(c.name)}</span></li>`).join("")}
          </ul>
          <a href="/events" class="privacy-contact-btn about-inline-cta">[ BROWSE ALL EVENTS ]</a>`)}

        ${card("03", "about-team", "Organising Team", `
          <h3 class="about-sub">Teams</h3>
          <ul class="about-tiles">${TEAMS.map(
            (t, i) => `<li><button type="button" class="about-team-open" data-team-open="${i}" aria-haspopup="dialog">
              <span class="about-team-open-icon" aria-hidden="true">${iconSvg(t.icon)}</span>
              <span class="about-team-open-label">${esc(t.name)}<small>${teamSize(t)} people · view team</small></span>
            </button></li>`
          ).join("")}</ul>
          <dialog class="about-team-dialog" aria-labelledby="about-team-title">
            <button type="button" class="about-team-close" data-team-close aria-label="Close team">×</button>
            <div data-team-body></div>
          </dialog>`)}

        ${card("04", "about-sponsors", "Sponsors", `
          ${sponsorsBody}
          <a href="mailto:${mail}?subject=${encodeURIComponent("Sponsorship: Chaitanya 2k26")}" class="privacy-contact-btn about-inline-cta">[ BECOME A SPONSOR ]</a>`)}
      </div>

      <section class="privacy-cta-box">
        <h3>GET IN TOUCH</h3>
        <p>Email <a href="mailto:${mail}" style="color:inherit;text-decoration:underline;">${mail}</a> or send a message through the contact form.</p>
        <a href="/contact" class="privacy-cta-btn">[ CONTACT US ]</a>
      </section>
    </div>`;
}

let a,
  r = Promise.all([
    (() => {
      try {
        return o;
      } catch {}
    })(),
  ]).then(async () => {
    a = e({
      __name: "about",
      setup(l) {
        try {
          const trans = document.querySelector(".transition-component");
          if (trans) {
            trans.style.display = "none";
            trans.style.opacity = "0";
          }
        } catch (e) {}

        t({
          title: "Chaitanya 2k26 | About Us",
          meta: [
            {
              name: "description",
              content: "About Chaitanya 2k26, the annual tech and cultural fest of HPTU Hamirpur: the university, the fest, the organising team and sponsors.",
            },
          ],
          link: [{ rel: "canonical", href: "https://chaitanya2k26.hptu.ac.in/about" }],
        });

        // Team overlay (one shared dialog): native <dialog> handles Esc, focus and the backdrop.
        rt(() => {
          const root = document.querySelector(".about-page-root");
          const dialog = root?.querySelector(".about-team-dialog");
          if (!root || !dialog) return;
          // Scrolling runs through GSAP ScrollSmoother: pause it while open so the
          // page behind can't move (native overflow is locked in about.css).
          const smoother = () => window.ScrollSmoother?.get?.();
          let wasPaused = false;
          root.addEventListener("click", (ev) => {
            const opener = ev.target.closest("[data-team-open]");
            if (opener) {
              const team = TEAMS[Number(opener.dataset.teamOpen)];
              if (!team) return;
              dialog.querySelector("[data-team-body]").innerHTML = teamSectionHtml(team);
              dialog.showModal();
              dialog.scrollTop = 0;
              wasPaused = Boolean(smoother()?.paused());
              smoother()?.paused(true);
            } else if (ev.target.closest("[data-team-close]") || (ev.target === dialog && pressedOutside)) dialog.close();
          });
          // Backdrop close only when the press also started outside the box, so a
          // text-selection drag or a scrollbar click ending on the dialog doesn't close it.
          let pressedOutside = false;
          dialog.addEventListener("pointerdown", (ev) => {
            const r = dialog.getBoundingClientRect();
            pressedOutside = ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom;
          });
          // Fires for Esc too.
          dialog.addEventListener("close", () => {
            if (!wasPaused) smoother()?.paused(false);
          });
        });

        const html = buildHtml();
        return (i, c) => (
          be(),
          xe("div", { class: "privacy-page-root about-page-root" }, [
            b("div", { class: "privacy-page-wrapper", innerHTML: html }),
          ])
        );
      },
    });
  });

export { r as __tla, a as default };
