/**
 * ============================================================================
 * File: m-pages.js
 * Purpose: Pages linked from the phone menu and the phone /organisers page:
 *   /contact-us       Contact (form + email + who runs what)
 *   /sponsors         Sponsors
 *   /organisers/:slug One organiser's details
 * Reuses privacy-policy.css (hero/cards/CTA); extras in m-pages.css.
 * ============================================================================
 */
import { a as setHead, __tla as o } from "./app-main.js";
import { k as defineComponent, H as openBlock, F as createBlock, M as h, E as onMounted } from "./vue-runtime.js";
import { FEST_CONFIG, SPONSORS, getFestDatesLabel, escapeHtml as esc } from "./fest-config.js";
import { EVENTS_DATA, EVENT_CATEGORIES } from "./events-data.js";
import { PHOTOS, PROFILES, initials, allPeople, categoryTeams } from "./teams-data.js";
import { marqueeHtml, eventCardHtml } from "./m-marquee.js";
import { submitToWeb3Forms } from "./web3forms-config.js";
import { submitQueryTicket } from "./auth-service.js";

const SITE = "https://chaitanya2k26.hptu.ac.in";
const mail = () => esc(FEST_CONFIG.contactEmail);

const shell = (badge, title, subtitle, body) => `
  <div class="privacy-container m-page">
    <div class="privacy-hero">
      <span class="privacy-tag-badge">${badge}</span>
      <h1>${title}</h1>
      ${subtitle ? `<p class="subtitle">${subtitle}</p>` : ""}
    </div>
    ${body}
  </div>`;

const section = (title, body, id = "") => `
  <article class="privacy-card m-section"${id ? ` id="${id}"` : ""}>
    <div class="privacy-card-header"><h2>${title}</h2></div>
    ${body}
  </article>`;

// ---- /contact-us -----------------------------------------------------------

function contactHtml() {
  const heads = categoryTeams()
    .filter((tm) => tm.people.length)
    .map(
      (tm) => `
      <li style="--tint: ${tm.accent}">
        <a href="/organisers#${esc(tm.id)}"><strong>${esc(tm.name)}</strong>
        <span>${esc(tm.people.map((p) => p.name).join(", "))}</span></a>
      </li>`
    )
    .join("");
  return shell(
    "Chaitanya 2k26 · HPTU Hamirpur",
    "Contact Us",
    "Questions about events, registration, sponsorship or anything else.",
    `
    <div class="m-quick">
      <a class="m-quick-card" href="mailto:${mail()}"><span>Email</span><strong>${mail()}</strong></a>
      <a class="m-quick-card" href="/events"><span>Events</span><strong>Rules, venues and timings</strong></a>
    </div>
    ${section(
      "Send a message",
      `
      <form class="m-form" novalidate>
        <label>Name<input name="name" autocomplete="name" required minlength="2" /></label>
        <label>Email<input name="email" type="email" autocomplete="email" required /></label>
        <label>Phone <small>(optional)</small><input name="phone" type="tel" autocomplete="tel" inputmode="tel" /></label>
        <label>Message<textarea name="message" rows="4" required></textarea></label>
        <p class="m-form-status" role="status" aria-live="polite"></p>
        <button type="submit" class="privacy-cta-btn">[ SEND MESSAGE ]</button>
      </form>`
    )}
    ${section("Event teams", `<p>Questions about one event? Its team can help.</p><ul class="m-team-list">${heads}</ul>`)}
    ${section(
      "Where",
      `<p>${esc(FEST_CONFIG.university)}. The fest runs ${esc(getFestDatesLabel())}.</p>`
    )}`
  );
}

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

function wireForm(root) {
  const form = root.querySelector(".m-form");
  if (!form) return;
  const status = form.querySelector(".m-form-status");
  const btn = form.querySelector("button");
  const say = (msg, kind = "") => {
    status.textContent = msg;
    status.dataset.kind = kind;
  };
  form.addEventListener("input", (e) => e.target.removeAttribute("aria-invalid"));
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (btn.disabled) return;
    const v = (n) => form.elements[n].value.trim();
    const [name, email, phone, message] = ["name", "email", "phone", "message"].map(v);
    const bad = [
      [name.length < 2, "name", "Enter your name"],
      [!isEmail(email), "email", "Enter an email like name@example.com"],
      [phone && phone.replace(/\D/g, "").length < 10, "phone", "Phone needs 10 digits, or leave it empty"],
      [message.length < 3, "message", "Write a short message"],
    ].filter(([b]) => b);
    if (bad.length) {
      bad.forEach(([, n]) => form.elements[n].setAttribute("aria-invalid", "true"));
      say(bad[0][2], "error");
      form.elements[bad[0][1]].focus();
      return;
    }
    btn.disabled = true;
    say("Sending…");
    try {
      await submitToWeb3Forms({ name, email, contact_no: phone, team_name: "", query: message });
      submitQueryTicket({ name, email, phone, message, subject: "Website contact form" }).catch(() => {});
      form.reset();
      say("Message sent. We'll reply by email.", "ok");
    } catch {
      say(`Couldn't send. Try again or write to ${FEST_CONFIG.contactEmail}`, "error");
    } finally {
      btn.disabled = false;
    }
  });
}

// ---- /sponsors -------------------------------------------------------------

function sponsorsHtml() {
  const subject = encodeURIComponent("Sponsorship: Chaitanya 2k26");
  const cats = EVENT_CATEGORIES.filter((c) => c.id !== "all");
  const list = SPONSORS.length
    ? `<ul class="m-sponsors">${SPONSORS.map(
        (s) => `<li><a href="${esc(s.url || "#")}" target="_blank" rel="noopener">
          ${s.logo ? `<img src="${esc(s.logo)}" alt="${esc(s.name)}" loading="lazy" />` : `<strong>${esc(s.name)}</strong>`}
          ${s.tier ? `<span>${esc(s.tier)}</span>` : ""}</a></li>`
      ).join("")}</ul>`
    : `<p>Our sponsors for 2026 will be announced here. Sponsorship is open now.</p>`;
  return shell(
    `${esc(getFestDatesLabel())} · HPTU Hamirpur`,
    "Sponsors",
    "The partners who make Chaitanya 2k26 happen.",
    `
    ${section("Our sponsors", list)}
    ${section(
      "Why sponsor",
      `
      <ul class="m-stats">
        <li><b>${FEST_CONFIG.festDays}</b><span>Days</span></li>
        <li><b>${EVENTS_DATA.length}</b><span>Events</span></li>
        <li><b>${cats.length}</b><span>Categories</span></li>
      </ul>
      <p>Title, event and stall partnerships put your brand in front of engineering and management students
        from colleges across Himachal Pradesh.</p>
      <ul class="m-chips">${cats.map((c) => `<li style="--tint: ${c.accent}">${esc(c.name)}</li>`).join("")}</ul>`
    )}
    <section class="privacy-cta-box">
      <h3>BECOME A SPONSOR</h3>
      <p>Write to <a href="mailto:${mail()}?subject=${subject}" style="color:inherit;text-decoration:underline;">${mail()}</a> and we'll send the partnership details.</p>
      <a href="mailto:${mail()}?subject=${subject}" class="privacy-cta-btn">[ EMAIL THE TEAM ]</a>
    </section>`
  );
}

// ---- /organisers/:slug -----------------------------------------------------

function organiserHtml(slug) {
  const p = allPeople().find((x) => x.slug === slug);
  if (!p)
    return shell(
      "Organisers",
      "Organiser not found",
      "This link may be out of date.",
      `<a href="/organisers" class="privacy-cta-btn m-back">[ ALL ORGANISERS ]</a>`
    );
  const extra = PROFILES[p.name] || {};
  const photo = PHOTOS[p.name];
  const team = p.teams[0];
  const tint = (categoryTeams().find((t) => t.id === team.id) || {}).accent || "var(--cat-tech)";
  const row = (k, v) => (v ? `<div><dt>${k}</dt><dd>${v}</dd></div>` : "");
  const markOf = (id) => (EVENT_CATEGORIES.find((c) => c.id === id) || {}).shortCode;
  return `
  <div class="privacy-container m-page m-person" style="--tint: ${tint}">
    <a href="/organisers#${esc(team.id)}" class="m-back-link">← ${esc(team.name)}</a>
    <div class="m-person-hero"${photo ? ` style="--bg: url('${esc(photo)}')"` : ""}>
      ${photo ? "" : `<span class="m-card-mark" aria-hidden="true">${esc(initials(p.name))}</span>`}
      <div class="m-person-name">
        <span class="privacy-tag-badge">${esc(p.roles.join(" · "))}</span>
        <h1>${esc(p.name)}</h1>
      </div>
    </div>
    ${section(
      "Details",
      `<dl class="m-dl">
        ${row("Team", esc(p.teams.map((t) => t.name).join(", ")))}
        ${row("Role", esc(p.roles.join(", ")))}
        ${row("Department", esc(extra.department))}
        ${row("From", esc(extra.from))}
        ${row("Email", extra.email ? `<a href="mailto:${esc(extra.email)}">${esc(extra.email)}</a>` : "")}
        ${row("College", esc(extra.college || FEST_CONFIG.university))}
      </dl>
      ${extra.email ? "" : `<p class="m-note">To reach ${esc(p.name.split(" ")[0])}, write to <a href="mailto:${mail()}">${mail()}</a>.</p>`}`
    )}
    ${
      p.events.length
        ? `<h2 class="m-h">Runs ${p.events.length === 1 ? "this event" : `these ${p.events.length} events`}</h2>
           ${marqueeHtml(
             p.events.map((ev) => eventCardHtml(ev, `var(--cat-${ev.category})`, markOf(ev.category))),
             { label: `Events run by ${p.name}`, secsPerCard: 5 }
           )}`
        : ""
    }
  </div>`;
}

// ---- shared page component ---------------------------------------------------

const router = () => document.querySelector("#__nuxt")?.__vue_app__?.config.globalProperties.$router;

// Plain <a href> inside innerHTML: route internal links through Vue Router.
function onClick(ev) {
  if (ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
  const a = ev.target.closest && ev.target.closest("a[href]");
  if (!a || a.target) return;
  const href = a.getAttribute("href");
  if (!href.startsWith("/") || href.startsWith("//") || !router()) return;
  ev.preventDefault();
  router().push(href);
}

function page(name, cls, head, build) {
  return defineComponent({
    __name: name,
    setup() {
      try {
        const trans = document.querySelector(".transition-component");
        if (trans) {
          trans.style.display = "none";
          trans.style.opacity = "0";
        }
      } catch (e) {}
      const route = router()?.currentRoute.value || { params: {}, path: location.pathname };
      const meta = head(route);
      setHead({
        title: `Chaitanya 2k26 | ${meta.title}`,
        meta: [{ name: "description", content: meta.description }],
        link: [{ rel: "canonical", href: SITE + route.path }],
      });
      const html = build(route);
      onMounted(() => {
        window.scrollTo(0, 0);
        const root = document.querySelector("." + cls);
        if (root) wireForm(root);
      });
      return () => (
        openBlock(),
        createBlock("div", { class: `privacy-page-root m-page-root ${cls}`, onClick }, [
          h("div", { class: "privacy-page-wrapper", innerHTML: html }),
        ])
      );
    },
  });
}

let ContactPage, SponsorsPage, OrganiserPage;
const r = Promise.all([
  (() => {
    try {
      return o;
    } catch {}
  })(),
]).then(() => {
  ContactPage = page(
    "contact-us",
    "m-contact-root",
    () => ({ title: "Contact Us", description: "Contact the Chaitanya 2k26 team at HPTU Hamirpur about events, registration or sponsorship." }),
    contactHtml
  );
  SponsorsPage = page(
    "sponsors",
    "m-sponsors-root",
    () => ({ title: "Sponsors", description: "Sponsors and partners of Chaitanya 2k26, the tech and cultural fest of HPTU Hamirpur." }),
    sponsorsHtml
  );
  OrganiserPage = page(
    "organiser",
    "m-organiser-root",
    (route) => {
      const p = allPeople().find((x) => x.slug === route.params.slug);
      return {
        title: p ? p.name : "Organiser",
        description: p ? `${p.name}, ${p.roles.join(", ")} at Chaitanya 2k26, HPTU Hamirpur.` : "Chaitanya 2k26 organisers.",
      };
    },
    (route) => organiserHtml(String(route.params.slug || ""))
  );
});

export { r as __tla, ContactPage, SponsorsPage, OrganiserPage };
