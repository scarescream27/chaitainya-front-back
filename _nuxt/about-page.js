/**
 * ============================================================================
 * File: about-page.js
 * Purpose: /about — the university, the fest (with its events row), sponsors.
 * Reuses the privacy page's card/hero styles (privacy-policy.css); grids live
 * in about.css.
 * ============================================================================
 */
import { a as t, __tla as o } from "./app-main.js";
import { k as e, H as be, F as xe, M as b } from "./vue-runtime.js";
import { FEST_CONFIG, SPONSORS, getFestDatesLabel, escapeHtml as esc } from "./fest-config.js";
import { EVENT_CATEGORIES, EVENTS_DATA } from "./events-data.js";
import { marqueeHtml, eventCardHtml } from "./m-marquee.js";

function card(num, id, title, body, cls = "") {
  return `
    <article class="privacy-card ${cls}" id="${id}">
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
          <div class="about-m-events">${marqueeHtml(
            EVENTS_DATA.map((ev) => {
              const c = EVENT_CATEGORIES.find((x) => x.id === ev.category);
              return eventCardHtml(ev, c?.accent, c?.shortCode);
            }),
            { label: "Events" }
          )}</div>
          <a href="/events" class="privacy-contact-btn about-inline-cta">BROWSE ALL EVENTS</a>`)}

        ${card("03", "about-sponsors", "Sponsors", `
          ${sponsorsBody}
          <a href="mailto:${mail}?subject=${encodeURIComponent("Sponsorship: Chaitanya 2k26")}" class="privacy-contact-btn about-inline-cta">BECOME A SPONSOR</a>
          <a href="/sponsors" class="privacy-contact-btn about-inline-cta">SEE SPONSORS</a>`)}
      </div>

      <section class="privacy-cta-box">
        <h3>GET IN TOUCH</h3>
        <p>Email <a href="mailto:${mail}" style="color:inherit;text-decoration:underline;">${mail}</a> or send a message through the contact form.</p>
        <a href="/contact-us" class="privacy-cta-btn">CONTACT US</a>
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
