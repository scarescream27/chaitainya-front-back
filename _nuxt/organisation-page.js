/**
 * ============================================================================
 * File: organisation-page.js
 * Purpose: /organisers — the core team plus one team per event category
 * (anchors like #team-tech, linked from each event's "Organised by" block).
 * Reuses privacy-policy.css (hero/CTA); person/event cards and the team grid
 * live in m-pages.css (.m-org).
 * ============================================================================
 */
import { a as t, __tla as o } from "./app-main.js";
import { k as e, H as be, F as xe, M as b, E as rt } from "./vue-runtime.js";
import { FEST_CONFIG, escapeHtml as esc } from "./fest-config.js";
import { TEAMS, categoryTeams } from "./teams-data.js";
import { EVENT_CATEGORIES } from "./events-data.js";
import { marqueeHtml, personCardHtml, eventCardHtml } from "./m-marquee.js";

const TINTS = ["--cat-cultural", "--cat-tech", "--cat-innovation", "--cat-esports", "--cat-business"];

function buildHtml() {
  const mail = esc(FEST_CONFIG.contactEmail);
  const teams = categoryTeams();

  // Per team: two people (tap for their page) with "View more" for the rest,
  // then a row of its events. Section ids are the #team-… anchors.
  const peopleGrid = (cards, label) => `
    <div class="m-people" aria-label="${esc(label)}">
      <ul class="m-people-grid">${cards.map((c, i) => `<li${i > 1 ? ' class="m-people-more"' : ""}>${c}</li>`).join("")}</ul>
      ${cards.length > 2 ? `<button type="button" class="m-people-btn" data-more aria-expanded="false">View more (${cards.length - 2})</button>` : ""}
    </div>`;
  const markOf = (id) => (EVENT_CATEGORIES.find((c) => c.id === id) || {}).shortCode;
  const teamsHtml = `
    <div class="m-org">
      <section class="m-org-team" id="core-team">
        <h2 class="m-h">Core Team</h2>
        ${peopleGrid(
          TEAMS.flatMap((tm) => tm.people).map((m, i) => personCardHtml(m, `var(${TINTS[i % TINTS.length]})`)),
          "Core team"
        )}
      </section>
      ${teams
        .map(
          (tm) => `
      <section class="m-org-team" id="${esc(tm.id)}">
        <h2 class="m-h" style="--tint: ${tm.accent}">${esc(tm.name)}</h2>
        ${tm.people.length ? peopleGrid(tm.people.map((m) => personCardHtml(m, tm.accent)), `${tm.name}: student heads`) : ""}
        <h3 class="m-sub">Events (${tm.events.length})</h3>
        ${marqueeHtml(tm.events.map((ev) => eventCardHtml(ev, tm.accent, markOf(tm.categoryId))), { label: `${tm.name}: events`, secsPerCard: 5, still: true })}
      </section>`
        )
        .join("")}
    </div>`;

  return `
    <div class="privacy-container org-container">
      <div class="privacy-hero">
        <span class="privacy-tag-badge">Chaitanya 2k26 · HPTU Hamirpur</span>
        <h1>The Organisers</h1>
        <p class="subtitle">Chaitanya 2k26 is planned and run by students of HPTU Hamirpur with guidance from faculty coordinators.</p>
      </div>

      ${teamsHtml}

      <section class="privacy-cta-box">
        <h3>GET IN TOUCH</h3>
        <p>Email <a href="mailto:${mail}" style="color:inherit;text-decoration:underline;">${mail}</a> or send a message through the contact form.</p>
        <a href="/contact-us" class="privacy-cta-btn">CONTACT US</a>
      </section>
    </div>`;
}

const reduceMotion = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ScrollSmoother (when active) moves #smooth-content with a transform, so
// scroll through it; otherwise use native scrolling. Header offset ~80px.
function scrollToId(id) {
  const el = id && document.getElementById(id);
  if (!el || !el.closest(".organisation-page-root")) return false;
  const smoother = window.ScrollSmoother && window.ScrollSmoother.get && window.ScrollSmoother.get();
  if (smoother && !smoother.paused()) smoother.scrollTo(el, !reduceMotion(), "top 80px");
  else el.scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block: "start" });
  return true;
}

// No global SPA handler exists for plain <a href>, so route internal links here.
function onClick(ev) {
  if (ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
  const more = ev.target.closest && ev.target.closest("[data-more]");
  if (more) {
    const box = more.closest(".m-people");
    const open = box.classList.toggle("is-open");
    more.setAttribute("aria-expanded", String(open));
    more.textContent = open ? "View less" : `View more (${box.querySelectorAll(".m-people-more").length})`;
    return;
  }
  const a = ev.target.closest && ev.target.closest("a[href]");
  if (!a || a.target) return;
  const href = a.getAttribute("href");
  if (href.startsWith("#")) {
    if (scrollToId(decodeURIComponent(href.slice(1)))) {
      ev.preventDefault();
      history.replaceState(history.state, "", href);
    }
    return;
  }
  if (!href.startsWith("/") || href.startsWith("//")) return;
  // /contact is not a route: it scrolls to the home footer's form.
  if (href === "/contact" && window.__goToContact) {
    ev.preventDefault();
    return window.__goToContact();
  }
  const router = document.querySelector("#__nuxt")?.__vue_app__?.config.globalProperties.$router;
  if (!router) return;
  ev.preventDefault();
  router.push(href);
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
      __name: "organisation",
      setup(l) {
        try {
          const trans = document.querySelector(".transition-component");
          if (trans) {
            trans.style.display = "none";
            trans.style.opacity = "0";
          }
        } catch (e) {}

        t({
          title: "Chaitanya 2k26 | Organisers",
          meta: [
            {
              name: "description",
              content: "The people behind Chaitanya 2k26 at HPTU Hamirpur: the core team and the student heads of every event team.",
            },
          ],
          link: [{ rel: "canonical", href: "https://chaitanya2k26.hptu.ac.in/organisers" }],
        });

        rt(() => {
          // A direct load (/organisers#team-tech) goes through index.html's
          // deep-link routing, which drops the hash: it is stashed there.
          const hash = location.hash || window.__organisersHash || "";
          window.__organisersHash = "";
          if (hash && !location.hash) history.replaceState(history.state, "", location.pathname + hash);
          const id = decodeURIComponent(hash.slice(1));
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              if (id && scrollToId(id)) {
                // Direct load: the home page's layout is still being torn down,
                // so the first jump can overshoot. Settle on the section again.
                setTimeout(() => scrollToId(id), 700);
                return;
              }
              // Arriving from a scrolled page (e.g. the About button): start at the top.
              const smoother = window.ScrollSmoother?.get?.();
              if (smoother && !smoother.paused()) smoother.scrollTo(0, false);
              else window.scrollTo(0, 0);
            })
          );
        });

        const html = buildHtml();
        return (i, c) => (
          be(),
          xe("div", { class: "privacy-page-root organisation-page-root", onClick }, [
            b("div", { class: "privacy-page-wrapper", innerHTML: html }),
          ])
        );
      },
    });
  });

export { r as __tla, a as default };
