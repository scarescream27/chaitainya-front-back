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
import { h as gsap } from "./app-main.js";

if (typeof window !== "undefined") {
  window.gsap = window.gsap || gsap;
  window.__submitToWeb3Forms = submitToWeb3Forms;
}

let audioCtx = null;

function playKeystrokeSound() {
  try {
    const soundStatus = document.querySelector(".social-links-global .volume .status p, .home-preloader .bottom .volume .status p");
    const isSoundOn = !soundStatus || soundStatus.textContent.trim().toLowerCase() === "on";
    if (!isSoundOn) return;

    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(500 + Math.random() * 220, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.02, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.045);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.05);
  } catch (e) {}
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
  hud.textContent = `[ ${labelText} ]`;
  wrapper.appendChild(hud);

  const inputEl = wrapper.querySelector("input, textarea");
  if (inputEl) {
    inputEl.addEventListener("focus", () => {
      wrapper.classList.add("is-active");
    });
    inputEl.addEventListener("blur", () => {
      wrapper.classList.remove("is-active");
    });
  }
}

function triggerRipple(wrapper, isError = false) {
  if (!wrapper) return;
  const ripple = document.createElement("div");
  ripple.className = "keystroke-ripple";
  if (isError) {
    ripple.style.borderColor = "#ff3333";
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
    <form class="contact-chaitanya-form" onsubmit="return false;">
      <div class="input-wrapper" data-field="name">
        <input type="text" name="name" placeholder="[YOUR NAME]" autocomplete="off" spellcheck="false" />
        <div class="outline"></div>
      </div>
      <div class="input-wrapper" data-field="team_name">
        <input type="text" name="team_name" placeholder="[TEAM NAME]" autocomplete="off" spellcheck="false" />
        <div class="outline"></div>
      </div>
      <div class="input-wrapper" data-field="email">
        <input type="email" name="email" placeholder="[YOUR EMAIL]" autocomplete="off" spellcheck="false" />
        <div class="outline"></div>
      </div>
      <div class="input-wrapper" data-field="contact_no">
        <input type="tel" name="contact_no" placeholder="[CONTACT NO]" autocomplete="off" spellcheck="false" />
        <div class="outline"></div>
      </div>
      <div class="input-wrapper input-wrapper-text" data-field="query">
        <textarea name="query" placeholder="[YOUR QUERY]" rows="1" spellcheck="false"></textarea>
        <div class="outline"></div>
      </div>
      <div class="input-wrapper send" data-field="send">
        <p>SEND →</p>
      </div>
      <div class="input-wrapper heart"></div>
    </form>
  `;

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
        valid ? `[ ${val.length} CHARS • NAME VERIFIED ✓ ]` : `[ ${val.length}/2 CHARS • TYPE NAME ]`,
        valid
      );
      triggerRipple(nameWrap);
      playKeystrokeSound();

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
        valid ? `[ ${val.length} CHARS • TEAM READY ✓ ]` : `[ ${val.length}/2 CHARS • TYPE TEAM ]`,
        valid
      );
      triggerRipple(teamWrap);
      playKeystrokeSound();
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
        valid ? `[ EMAIL VERIFIED ✓ ]` : (val.length > 0 ? `[ ${val.length} CHARS • INVALID FORMAT ]` : `[ ENTER EMAIL ]`),
        valid
      );
      triggerRipple(emailWrap);
      playKeystrokeSound();
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
        valid ? `[ ${digits.length} DIGITS • PHONE VERIFIED ✓ ]` : `[ ${digits.length}/10 DIGITS • ENTER PHONE ]`,
        valid
      );
      triggerRipple(contactWrap);
      playKeystrokeSound();
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
        valid ? `[ ${val.length} CHARS • QUERY READY ✓ ]` : `[ ${val.length}/3 CHARS • TYPE QUERY ]`,
        valid
      );
      triggerRipple(queryWrap);
      playKeystrokeSound();
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
          Thank you, <strong>${nameVal || "Friend"}</strong>${teamVal ? " (Team: <strong>" + teamVal + "</strong>)" : ""}! Your query has been forwarded directly to <strong>chaitainyahptu@gmail.com</strong>.
        </p>
        <button type="button" class="heart-reset-btn" id="btn-contact-reset">[ SEND ANOTHER MESSAGE ]</button>
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
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        form.reset();
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
        updateProgress(nameWrap, 0, "[ ENTER NAME ]");
        updateProgress(teamWrap, 0, "[ ENTER TEAM NAME ]");
        updateProgress(emailWrap, 0, "[ ENTER EMAIL ]");
        updateProgress(contactWrap, 0, "[ ENTER CONTACT NO ]");
        updateProgress(queryWrap, 0, "[ ENTER YOUR QUERY ]");
      });
    }
  }

  // 6. Send Button & Submission Handler
  if (sendWrap) {
    sendWrap.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const nameVal = nameInput ? nameInput.value.trim() : "";
      const teamVal = teamInput ? teamInput.value.trim() : "";
      const emailVal = emailInput ? emailInput.value.trim() : "";
      const contactVal = contactInput ? contactInput.value.trim() : "";
      const queryVal = queryInput ? queryInput.value.trim() : "";

      // Validation 1: Name
      if (!nameVal || nameVal.length < 2) {
        if (nameInput) nameInput.focus();
        updateProgress(nameWrap, 0, "[ ERROR: ENTER NAME ]");
        triggerRipple(nameWrap, true);
        return;
      }

      // Validation 2: Team Name
      if (!teamVal || teamVal.length < 2) {
        if (teamInput) teamInput.focus();
        updateProgress(teamWrap, 0, "[ ERROR: ENTER TEAM NAME ]");
        triggerRipple(teamWrap, true);
        return;
      }

      // Validation 3: Email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailVal || !emailRegex.test(emailVal)) {
        if (emailInput) emailInput.focus();
        updateProgress(emailWrap, 0, "[ ERROR: VALID EMAIL REQUIRED ]");
        triggerRipple(emailWrap, true);
        return;
      }

      // Validation 4: Contact No
      const digits = contactVal.replace(/[^0-9]/g, "");
      if (!contactVal || digits.length < 10) {
        if (contactInput) contactInput.focus();
        updateProgress(contactWrap, 0, "[ ERROR: 10-DIGIT PHONE REQUIRED ]");
        triggerRipple(contactWrap, true);
        return;
      }

      // Validation 5: Query
      if (!queryVal || queryVal.length < 3) {
        if (queryInput) queryInput.focus();
        updateProgress(queryWrap, 0, "[ ERROR: ENTER YOUR QUERY ]");
        triggerRipple(queryWrap, true);
        return;
      }

      // Enter Transmitting Radar State
      sendWrap.classList.add("transmitting");
      sendWrap.innerHTML = `<p><span class="radar-spinner"></span> TRANSMITTING...</p>`;

      try {
        await submitToWeb3Forms({
          name: nameVal,
          team_name: teamVal,
          email: emailVal,
          contact_no: contactVal,
          query: queryVal,
        });

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
        showSuccessCard(nameVal, teamVal);
      } catch (err) {
        console.error("Submission error:", err);
        sendWrap.classList.remove("transmitting");
        sendWrap.innerHTML = `<p>RETRY →</p>`;
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
