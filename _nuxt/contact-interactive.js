/**
 * ============================================================================
 * Chaitanya 2k26 — Contact Form Interactive Controller (5 Custom Fields)
 * ============================================================================
 * Fields:
 * 1. Name
 * 2. Team Name
 * 3. Email
 * 4. Contact No
 * 5. Query
 * Action: SEND ->
 */

import { submitToWeb3Forms, isWeb3FormsLive } from "./web3forms-config.js";
import { submitQueryTicket } from "./auth-service.js";
import { h as gsap } from "./app-main.js";

if (typeof window !== "undefined") {
  window.gsap = window.gsap || gsap;
  window.__submitToWeb3Forms = submitToWeb3Forms;
}

function enhanceBubble(wrapper, labelText = "FIELD") {
  if (!wrapper || wrapper.querySelector(".bubble-progress-svg")) return;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "bubble-progress-svg");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.innerHTML = `
    <circle class="bubble-progress-track" cx="50" cy="50" r="45"></circle>
    <circle class="bubble-progress-bar" cx="50" cy="50" r="45"></circle>
  `;
  wrapper.appendChild(svg);

  const hud = document.createElement("div");
  hud.className = "bubble-hud-badge";
  hud.id = `contact-hud-${wrapper.dataset.field || "field"}`;
  hud.textContent = `${labelText}`;
  wrapper.appendChild(hud);

  const inputEl = wrapper.querySelector("input, textarea");
  if (inputEl) {
    // The badge carries live status text, so it describes the field; the
    // stable accessible name comes from the field's own aria-label.
    inputEl.setAttribute("aria-describedby", hud.id);
    inputEl.addEventListener("focus", () => {
      wrapper.classList.add("is-active");
    });
    inputEl.addEventListener("blur", () => {
      wrapper.classList.remove("is-active");
    });
    // Keeps the badge (the visible label) shown once the field has content.
    inputEl.addEventListener("input", () => {
      wrapper.classList.toggle("has-value", inputEl.value.length > 0);
    });
    // Only the text line inside the bubble took taps; let the whole bubble focus it.
    wrapper.addEventListener("click", (e) => {
      if (e.target !== inputEl) inputEl.focus();
    });
  }
}

function triggerRipple(wrapper, isError = false) {
  if (!wrapper) return;
  const ripple = document.createElement("div");
  ripple.className = "keystroke-ripple";
  if (isError) {
    ripple.style.borderColor = "var(--danger)";
  }
  wrapper.appendChild(ripple);
  setTimeout(() => ripple.remove(), 700);
}

function updateProgress(wrapper, percent, hudText, isValid = false) {
  if (!wrapper) return;
  const bar = wrapper.querySelector(".bubble-progress-bar");
  const hud = wrapper.querySelector(".bubble-hud-badge");

  if (bar) {
    const maxDash = 283; // 2 * PI * 45
    const clamped = Math.max(0, Math.min(1, percent));
    bar.style.strokeDashoffset = (maxDash - (maxDash * clamped)).toFixed(1);
    if (isValid) bar.classList.add("valid");
    else bar.classList.remove("valid");
  }

  if (hud && hudText) {
    hud.textContent = hudText;
  }
}

export function initContactForm5Fields() {
  if (typeof document === "undefined") return;

  const wrapper = document.querySelector(".contact-form .wrapper");
  if (!wrapper) return;

  if (wrapper.dataset.fiveFieldsInitialized === "true") return;
  wrapper.dataset.fiveFieldsInitialized = "true";

  // Build the 5 fields + Send + Heart HTML
  wrapper.innerHTML = `
    <form class="contact-chaitanya-form" novalidate>
      <div class="input-wrapper" data-field="name">
        <input type="text" name="name" aria-label="Your name" placeholder="YOUR NAME" autocomplete="name" autocapitalize="words" spellcheck="false" />
        <div class="outline"></div>
      </div>
      <div class="input-wrapper" data-field="team_name">
        <input type="text" name="team_name" aria-label="Team name" placeholder="TEAM NAME (optional)" autocomplete="organization" spellcheck="false" />
        <div class="outline"></div>
      </div>
      <div class="input-wrapper" data-field="email">
        <input type="email" name="email" aria-label="Your email" placeholder="YOUR EMAIL" autocomplete="email" inputmode="email" autocapitalize="off" spellcheck="false" />
        <div class="outline"></div>
      </div>
      <div class="input-wrapper" data-field="contact_no">
        <input type="tel" name="contact_no" aria-label="Contact number" placeholder="CONTACT NO" autocomplete="tel" inputmode="tel" spellcheck="false" />
        <div class="outline"></div>
      </div>
      <div class="input-wrapper input-wrapper-text" data-field="query">
        <textarea name="query" aria-label="Your query" placeholder="YOUR QUERY" rows="1" autocomplete="off" spellcheck="false"></textarea>
        <div class="outline"></div>
      </div>
      <div class="input-wrapper send" data-field="send" role="button" tabindex="0" aria-label="Send message">
        <p>SEND →</p>
      </div>
      <div class="input-wrapper heart"></div>
      <p class="contact-status sr-only" role="status" aria-live="polite" aria-atomic="true"></p>
    </form>
  `;
  // No inline onsubmit (the CSP blocks inline handlers): stop native submits here.
  wrapper.querySelector("form")?.addEventListener("submit", (ev) => ev.preventDefault());

  const form = wrapper.querySelector("form");
  const nameWrap = form.querySelector('[data-field="name"]');
  const teamWrap = form.querySelector('[data-field="team_name"]');
  const emailWrap = form.querySelector('[data-field="email"]');
  const contactWrap = form.querySelector('[data-field="contact_no"]');
  const queryWrap = form.querySelector('[data-field="query"]');
  const sendWrap = form.querySelector('[data-field="send"]');
  const heartWrap = form.querySelector(".heart");

  enhanceBubble(nameWrap, "ENTER NAME");
  enhanceBubble(teamWrap, "ENTER TEAM NAME");
  enhanceBubble(emailWrap, "ENTER EMAIL");
  enhanceBubble(contactWrap, "ENTER CONTACT NO");
  enhanceBubble(queryWrap, "ENTER YOUR QUERY");

  const nameInput = nameWrap.querySelector("input");
  const teamInput = teamWrap.querySelector("input");
  const emailInput = emailWrap.querySelector("input");
  const contactInput = contactWrap.querySelector("input");
  const queryInput = queryWrap.querySelector("textarea");
  const statusEl = form.querySelector(".contact-status");

  // One polite live region for the whole form (WCAG 4.1.3). Clearing first and
  // writing on the next frame makes a repeated message announce again.
  let announceTimer = 0;
  function announce(message) {
    if (!statusEl) return;
    clearTimeout(announceTimer);
    statusEl.textContent = "";
    announceTimer = setTimeout(() => {
      statusEl.textContent = message;
    }, 60);
  }

  // Flags the failing field for assistive tech; cleared as soon as it is edited.
  function markInvalid(inputEl) {
    if (inputEl) inputEl.setAttribute("aria-invalid", "true");
  }
  [nameInput, teamInput, emailInput, contactInput, queryInput].forEach((el) => {
    if (el) el.addEventListener("input", () => el.removeAttribute("aria-invalid"));
  });

  const escapeHtml = (str) =>
    String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  const heroH1 = document.querySelector(".contact-hero h1");
  const originalH1 = heroH1 ? heroH1.textContent : "LET'S CREATE SOMETHING AMAZING TOGETHER";

  // 1. Name Input
  if (nameInput) {
    nameInput.addEventListener("input", (e) => {
      const val = e.target.value.trim();
      const pct = Math.min(1, val.length / 3);
      const valid = val.length >= 2;
      updateProgress(
        nameWrap,
        pct,
        valid ? `${val.length} CHARS • NAME VERIFIED ✓` : `${val.length}/2 CHARS • TYPE NAME`,
        valid
      );
      triggerRipple(nameWrap);

      if (heroH1) {
        if (val.length > 0) {
          heroH1.textContent = `LET'S CREATE SOMETHING AMAZING TOGETHER, ${val.toUpperCase()}`;
        } else {
          heroH1.textContent = originalH1;
        }
      }
    });
  }

  // 2. Team Name Input
  if (teamInput) {
    teamInput.addEventListener("input", (e) => {
      const val = e.target.value.trim();
      const pct = Math.min(1, val.length / 3);
      const valid = val.length >= 2;
      updateProgress(
        teamWrap,
        pct,
        valid ? `${val.length} CHARS • TEAM READY ✓` : `${val.length}/2 CHARS • TYPE TEAM`,
        valid
      );
      triggerRipple(teamWrap);
    });
  }

  // 3. Email Input
  if (emailInput) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    emailInput.addEventListener("input", (e) => {
      const val = e.target.value.trim();
      const valid = emailRegex.test(val);
      const pct = valid ? 1.0 : Math.min(0.8, val.length / 15);
      updateProgress(
        emailWrap,
        pct,
        valid ? `EMAIL VERIFIED ✓` : (val.length > 0 ? `${val.length} CHARS • INVALID EMAIL` : `ENTER EMAIL`),
        valid
      );
      triggerRipple(emailWrap);
    });
  }

  // 4. Contact No Input (phone number)
  if (contactInput) {
    contactInput.addEventListener("input", (e) => {
      const val = e.target.value.trim();
      const digits = val.replace(/[^0-9]/g, "");
      const valid = digits.length >= 10;
      const pct = Math.min(1, digits.length / 10);
      updateProgress(
        contactWrap,
        pct,
        valid ? `${digits.length} DIGITS • PHONE VERIFIED ✓` : `${digits.length}/10 DIGITS • ENTER PHONE`,
        valid
      );
      triggerRipple(contactWrap);
    });
  }

  // 5. Query Textarea
  if (queryInput) {
    queryInput.addEventListener("input", (e) => {
      const val = e.target.value.trim();
      const valid = val.length >= 3;
      const pct = Math.min(1, val.length / 20);
      updateProgress(
        queryWrap,
        pct,
        valid ? `${val.length} CHARS • QUERY READY ✓` : `${val.length}/3 CHARS • TYPE QUERY`,
        valid
      );
      triggerRipple(queryWrap);
    });
  }

  // Helper: show celebratory card
  function showSuccessCard(nameVal, teamVal) {
    if (!heartWrap) return;
    heartWrap.innerHTML = `
      <div class="heart-dispatch-inner">
        <span class="heart-check">✓</span>
        <h3 class="heart-success-title">MESSAGE DISPATCHED</h3>
        <p class="heart-success-subtitle">
          Thank you, <strong>${escapeHtml(nameVal || "Friend")}</strong>${teamVal ? " (Team: <strong>" + escapeHtml(teamVal) + "</strong>)" : ""}! Your query has been forwarded directly to <strong>chaitanyahptu@gmail.com</strong>.
        </p>
        <button type="button" class="heart-reset-btn" id="btn-contact-reset">SEND ANOTHER MESSAGE</button>
      </div>
    `;

    const activeGsap = window.gsap || gsap;
    if (activeGsap) {
      activeGsap.fromTo(
        heartWrap,
        { opacity: 0, scale: 0.94, left: "50%", top: "50%", xPercent: -50, yPercent: -50 },
        { duration: 0.5, opacity: 1, scale: 1, left: "50%", top: "50%", xPercent: -50, yPercent: -50, pointerEvents: "auto", delay: 0.15, ease: "power2.out" }
      );
    } else {
      heartWrap.style.opacity = "1";
      heartWrap.style.pointerEvents = "auto";
      heartWrap.style.left = "50%";
      heartWrap.style.top = "50%";
      heartWrap.style.transform = "translate(-50%, -50%)";
    }

    const resetBtn = heartWrap.querySelector("#btn-contact-reset");

    // The faded-out bubbles stay in the DOM: take them out of the tab order and
    // the accessibility tree, and put focus on the card's only control.
    const hiddenBubbles = [nameWrap, teamWrap, emailWrap, contactWrap, queryWrap, sendWrap];
    hiddenBubbles.forEach((el) => el && el.setAttribute("inert", ""));
    if (resetBtn) {
      setTimeout(() => {
        try { resetBtn.focus({ preventScroll: true }); } catch (_) { resetBtn.focus(); }
      }, 200);
    }

    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        hiddenBubbles.forEach((el) => el && el.removeAttribute("inert"));
        form.reset();
        form.querySelectorAll("[aria-invalid]").forEach((el) => el.removeAttribute("aria-invalid"));
        form.querySelectorAll(".has-value").forEach((el) => el.classList.remove("has-value"));
        if (heroH1) heroH1.textContent = originalH1;
        const bubbles = [nameWrap, teamWrap, emailWrap, contactWrap, queryWrap, sendWrap];
        if (activeGsap) {
          activeGsap.to(heartWrap, {
            duration: 0.25,
            opacity: 0,
            scale: 0.94,
            pointerEvents: "none",
            left: "50%",
            top: "50%",
            xPercent: -50,
            yPercent: -50
          });
          activeGsap.to(bubbles, {
            duration: 0.5,
            x: "0%",
            opacity: 1,
            pointerEvents: "auto",
            ease: "power2.out",
          });
        } else {
          heartWrap.style.opacity = "0";
          heartWrap.style.pointerEvents = "none";
          bubbles.forEach(el => {
            el.style.opacity = "1";
            el.style.transform = "none";
            el.style.pointerEvents = "auto";
          });
        }
        sendWrap.classList.remove("transmitting");
        sendWrap.innerHTML = `<p>SEND →</p>`;
        sendWrap.setAttribute("aria-label", "Send message");
        updateProgress(nameWrap, 0, "ENTER NAME");
        updateProgress(teamWrap, 0, "ENTER TEAM NAME");
        updateProgress(emailWrap, 0, "ENTER EMAIL");
        updateProgress(contactWrap, 0, "ENTER CONTACT NO");
        updateProgress(queryWrap, 0, "ENTER YOUR QUERY");
        announce("Form cleared. You can send another message.");
        if (nameInput) nameInput.focus();
      });
    }
  }

  // 6. Send Button & Submission Handler
  if (sendWrap) {
    // The SEND pill is a div with role="button": make Enter/Space work too.
    sendWrap.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        sendWrap.click();
      }
    });

    sendWrap.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (sendWrap.classList.contains("transmitting")) return;

      const nameVal = nameInput ? nameInput.value.trim() : "";
      const teamVal = teamInput ? teamInput.value.trim() : "";
      const emailVal = emailInput ? emailInput.value.trim() : "";
      const contactVal = contactInput ? contactInput.value.trim() : "";
      const queryVal = queryInput ? queryInput.value.trim() : "";

      // Validation 1: Name
      if (!nameVal || nameVal.length < 2) {
        updateProgress(nameWrap, 0, "ERROR: ENTER NAME");
        markInvalid(nameInput);
        if (nameInput) nameInput.focus();
        triggerRipple(nameWrap, true);
        announce("Please enter your name, at least 2 characters.");
        return;
      }

      // Team Name is optional: general queries (parents, sponsors, solo
      // participants) have no team.

      // Validation 3: Email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailVal || !emailRegex.test(emailVal)) {
        updateProgress(emailWrap, 0, "ERROR: VALID EMAIL REQUIRED");
        markInvalid(emailInput);
        if (emailInput) emailInput.focus();
        triggerRipple(emailWrap, true);
        announce("Please enter a valid email address.");
        return;
      }

      // Validation 4: Contact No
      const digits = contactVal.replace(/[^0-9]/g, "");
      if (!contactVal || digits.length < 10) {
        updateProgress(contactWrap, 0, "ERROR: 10-DIGIT PHONE REQUIRED");
        markInvalid(contactInput);
        if (contactInput) contactInput.focus();
        triggerRipple(contactWrap, true);
        announce("Please enter a contact number with at least 10 digits.");
        return;
      }

      // Validation 5: Query
      if (!queryVal || queryVal.length < 3) {
        updateProgress(queryWrap, 0, "ERROR: ENTER YOUR QUERY");
        markInvalid(queryInput);
        if (queryInput) queryInput.focus();
        triggerRipple(queryWrap, true);
        announce("Please enter your query, at least 3 characters.");
        return;
      }

      // Enter Transmitting Radar State
      sendWrap.classList.add("transmitting");
      sendWrap.innerHTML = `<p><span class="radar-spinner" aria-hidden="true"></span> TRANSMITTING...</p>`;
      sendWrap.setAttribute("aria-disabled", "true");
      announce("Sending your message…");

      try {
        await submitToWeb3Forms({
          name: nameVal,
          team_name: teamVal,
          email: emailVal,
          contact_no: contactVal,
          query: queryVal,
        });

        // Sync query ticket to Firestore 'queries' collection matching chaitanya_schema.sql
        submitQueryTicket({
          name: nameVal,
          team_name: teamVal,
          email: emailVal,
          phone: contactVal,
          message: queryVal,
          subject: `[Support Query] ${teamVal ? teamVal + " • " : ""}${nameVal}`
        }).catch((e) => console.warn("Firestore queries sync note:", e));

        const activeGsap = window.gsap || gsap;
        const bubbles = [nameWrap, teamWrap, emailWrap, contactWrap, queryWrap, sendWrap];
        if (activeGsap) {
          activeGsap.to(bubbles, {
            duration: 0.5,
            x: (i) => (i < 3 ? "150%" : "-150%"),
            opacity: 0,
            pointerEvents: "none",
            stagger: 0.04,
            ease: "power2.inOut",
          });
        }
        sendWrap.removeAttribute("aria-disabled");
        showSuccessCard(nameVal, teamVal);
        announce("Message sent. Thank you, we will get back to you soon.");
      } catch (err) {
        console.error("Submission error:", err);
        sendWrap.classList.remove("transmitting");
        sendWrap.innerHTML = `<p>RETRY →</p>`;
        sendWrap.removeAttribute("aria-disabled");
        sendWrap.setAttribute("aria-label", "Retry sending message");
        announce("Your message could not be sent. Check your connection and press Retry.");
        alert("Transmission error: " + (err.message || "Failed to deliver. Please check connection."));
      }
    });
  }
}

export function setupContactPageWatcher() {
  if (typeof document === "undefined") return;

  const check = () => {
    if (document.querySelector(".contact-form .wrapper")) {
      initContactForm5Fields();
    }
  };

  check();

  const observer = new MutationObserver(() => {
    check();
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

if (typeof window !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupContactPageWatcher);
  } else {
    setupContactPageWatcher();
  }
}
