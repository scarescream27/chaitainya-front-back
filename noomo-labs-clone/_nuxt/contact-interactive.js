/**
 * ============================================================================
 * Chaitanya 2k26 — Contact Form Interactive Animations & Web3Forms Controller
 * ============================================================================
 * Features:
 * 1. Real-time SVG Progress Rim on active bubbles (0% to 100% fill as you type).
 * 2. Concentric Keystroke Liquid Ripple Wave expanding from bubble center.
 * 3. Live Monospace HUD Badge displaying character count & validation state.
 * 4. Dynamic Kinetic Hero Title greeting as user types their name.
 * 5. Web Audio tactile typing acoustics (synchronized with audio toggle).
 * 6. Transmitting radar animation & Web3Forms API submission to chaitainyahptu@gmail.com.
 * 7. Celebratory success card with reset capability.
 */

import { submitToWeb3Forms, isWeb3FormsLive } from "./web3forms-config.js";
import { h as gsap } from "./app-main.js";

// Make globally accessible
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
    
    // Crisp tactile acoustic blip
    osc.type = "sine";
    osc.frequency.setValueAtTime(500 + Math.random() * 220, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.02, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.045);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.05);
  } catch (e) {
    // Audio optional / safe ignore
  }
}

/**
 * Injects radiant SVG progress ring and HUD badge into a bubble wrapper
 */
function enhanceBubble(wrapper, labelText = "FIELD") {
  if (!wrapper || wrapper.querySelector(".bubble-progress-svg")) return;

  // 1. Insert SVG Progress Ring
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "bubble-progress-svg");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.innerHTML = `
    <circle class="bubble-progress-track" cx="50" cy="50" r="45"></circle>
    <circle class="bubble-progress-bar" cx="50" cy="50" r="45"></circle>
  `;
  wrapper.appendChild(svg);

  // 2. Insert HUD Badge
  const hud = document.createElement("div");
  hud.className = "bubble-hud-badge";
  hud.textContent = `[ ${labelText} ]`;
  wrapper.appendChild(hud);

  // 3. Focus and blur class synchronization
  const inputEl = wrapper.querySelector("input, textarea, select");
  if (inputEl) {
    inputEl.addEventListener("focus", () => {
      wrapper.classList.add("is-active");
    });
    inputEl.addEventListener("blur", () => {
      wrapper.classList.remove("is-active");
    });
  }
}

/**
 * Triggers concentric liquid ripple wave inside the bubble
 */
function triggerRipple(wrapper) {
  if (!wrapper) return;
  const ripple = document.createElement("div");
  ripple.className = "keystroke-ripple";
  wrapper.appendChild(ripple);
  setTimeout(() => ripple.remove(), 700);
}

/**
 * Updates progress ring stroke & HUD badge text
 */
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

/**
 * Main initializer for Contact Form animations
 */
export function initContactFormAnimations() {
  if (typeof document === "undefined") return;

  const form = document.querySelector(".contact-form form");
  if (!form || form.dataset.animated === "true") return;
  form.dataset.animated = "true";

  const wrappers = form.querySelectorAll(".input-wrapper");
  if (wrappers.length < 5) return;

  const nameWrap = wrappers[0];
  const emailWrap = wrappers[1];
  const messageWrap = wrappers[2];
  const categoryWrap = wrappers[3];
  const sendWrap = wrappers[4];
  const heartWrap = wrappers[5] || form.querySelector(".heart");

  // Enhance individual bubbles
  enhanceBubble(nameWrap, "ENTER NAME");
  enhanceBubble(emailWrap, "ENTER EMAIL");
  enhanceBubble(messageWrap, "PROJECT / QUERY DETAILS");
  enhanceBubble(categoryWrap, "INQUIRY CATEGORY");

  const nameInput = nameWrap.querySelector("input");
  const emailInput = emailWrap.querySelector("input");
  const messageInput = messageWrap.querySelector("textarea");
  const categorySelect = categoryWrap.querySelector("select");

  const heroH1 = document.querySelector(".contact-hero h1");
  const originalH1 = heroH1 ? heroH1.textContent : "LET'S CREATE SOMETHING AMAZING TOGETHER";

  // 1. Name Input Listener
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

  // 2. Email Input Listener
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

  // 3. Message Textarea Listener
  if (messageInput) {
    messageInput.addEventListener("input", (e) => {
      const val = e.target.value.trim();
      const valid = val.length >= 5;
      const pct = Math.min(1, val.length / 20);
      updateProgress(
        messageWrap,
        pct,
        valid ? `[ ${val.length} CHARS • READY ✓ ]` : `[ ${val.length}/5 CHARS • TYPE MESSAGE ]`,
        valid
      );
      triggerRipple(messageWrap);
      playKeystrokeSound();
    });
  }

  // 4. Category Select Listener
  if (categorySelect) {
    categorySelect.addEventListener("change", (e) => {
      const val = e.target.value;
      const valid = val && val !== "none";
      updateProgress(
        categoryWrap,
        valid ? 1.0 : 0,
        valid ? `[ ${val.toUpperCase()} ✓ ]` : `[ SELECT CATEGORY ]`,
        valid
      );
      triggerRipple(categoryWrap);
      playKeystrokeSound();
    });
  }

  // Helper: Display Transmitting State
  window.__setContactTransmitting = (isTransmitting) => {
    if (!sendWrap) return;
    if (isTransmitting) {
      sendWrap.classList.add("transmitting");
      sendWrap.dataset.origHtml = sendWrap.innerHTML;
      sendWrap.innerHTML = `<p><span class="radar-spinner"></span> TRANSMITTING...</p>`;
    } else {
      sendWrap.classList.remove("transmitting");
      if (sendWrap.dataset.origHtml) {
        sendWrap.innerHTML = sendWrap.dataset.origHtml;
      }
    }
  };

  // Helper: Reveal celebratory dispatched card
  function showSuccessCard(nameVal) {
    if (!heartWrap) return;
    heartWrap.innerHTML = `
      <div class="heart-dispatch-inner" style="text-align:center; padding:16px;">
        <span style="font-size:36px; display:block; margin-bottom:8px; color:#000;">✓</span>
        <h3 class="heart-success-title" style="font-family:DrukMedium,sans-serif; font-size:26px; text-transform:uppercase; margin-bottom:6px; color:#000;">MESSAGE DISPATCHED</h3>
        <p class="heart-success-subtitle" style="font-family:'IBM Plex Mono',monospace; font-size:12px; line-height:1.4; color:#333; margin-bottom:14px;">
          Thank you, <strong>${nameVal || "Friend"}</strong>! Your inquiry has been forwarded directly to <strong>chaitainyahptu@gmail.com</strong>.
        </p>
        <button type="button" class="heart-reset-btn" id="btn-contact-reset" style="background:#000; color:#fff; border:none; padding:8px 16px; border-radius:20px; font-family:'IBM Plex Mono',monospace; font-size:11px; cursor:pointer; text-transform:uppercase;">[ SEND ANOTHER MESSAGE ]</button>
      </div>
    `;

    const activeGsap = window.gsap || gsap;
    if (activeGsap) {
      activeGsap.to(heartWrap, { duration: 0.6, opacity: 1, pointerEvents: "auto", delay: 0.25, ease: "power2.out" });
    } else {
      heartWrap.style.opacity = "1";
      heartWrap.style.pointerEvents = "auto";
    }

    const resetBtn = heartWrap.querySelector("#btn-contact-reset");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        form.reset();
        if (heroH1) heroH1.textContent = originalH1;
        if (activeGsap) {
          activeGsap.to(heartWrap, { duration: 0.3, opacity: 0, pointerEvents: "none" });
          activeGsap.to([nameWrap, emailWrap, messageWrap, categoryWrap, sendWrap], {
            duration: 0.5,
            x: "0%",
            opacity: 1,
            pointerEvents: "auto",
            ease: "power2.out",
          });
        } else {
          heartWrap.style.opacity = "0";
          heartWrap.style.pointerEvents = "none";
          [nameWrap, emailWrap, messageWrap, categoryWrap, sendWrap].forEach(el => {
            el.style.opacity = "1";
            el.style.transform = "none";
            el.style.pointerEvents = "auto";
          });
        }
        sendWrap.classList.remove("transmitting");
        if (sendWrap.dataset.origHtml) sendWrap.innerHTML = sendWrap.dataset.origHtml;
        updateProgress(nameWrap, 0, "[ ENTER NAME ]");
        updateProgress(emailWrap, 0, "[ ENTER EMAIL ]");
        updateProgress(messageWrap, 0, "[ PROJECT / QUERY DETAILS ]");
        updateProgress(categoryWrap, 0, "[ INQUIRY CATEGORY ]");
      });
    }
  }

  // 5. Send Button Interceptor
  if (sendWrap) {
    sendWrap.addEventListener("click", async (e) => {
      const nameVal = nameInput ? nameInput.value.trim() : "";
      const emailVal = emailInput ? emailInput.value.trim() : "";
      const msgVal = messageInput ? messageInput.value.trim() : "";
      const catVal = categorySelect ? categorySelect.value : "General Inquiry";

      // Basic client validation check
      if (!nameVal || nameVal.length < 2) {
        if (nameInput) nameInput.focus();
        updateProgress(nameWrap, 0, "[ ERROR: PLEASE ENTER NAME ]");
        triggerRipple(nameWrap);
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailVal || !emailRegex.test(emailVal)) {
        if (emailInput) emailInput.focus();
        updateProgress(emailWrap, 0, "[ ERROR: VALID EMAIL REQUIRED ]");
        triggerRipple(emailWrap);
        return;
      }

      if (!msgVal || msgVal.length < 2) {
        if (messageInput) messageInput.focus();
        updateProgress(messageWrap, 0, "[ ERROR: PLEASE ENTER MESSAGE ]");
        triggerRipple(messageWrap);
        return;
      }

      // If Vue's form submit will not handle it, handle it directly:
      window.__setContactTransmitting(true);

      try {
        await submitToWeb3Forms({
          name: nameVal,
          email: emailVal,
          category: catVal === "none" ? "General Inquiry" : catVal,
          message: msgVal,
        });

        const activeGsap = window.gsap || gsap;
        if (activeGsap) {
          activeGsap.to(nameWrap, { duration: 0.5, x: "200%", opacity: 0, pointerEvents: "none", ease: "power2.inOut" });
          activeGsap.to(emailWrap, { duration: 0.5, x: "100%", opacity: 0, pointerEvents: "none", ease: "power2.inOut" });
          activeGsap.to(messageWrap, { duration: 0.5, x: "0%", opacity: 0, pointerEvents: "none", ease: "power2.inOut" });
          activeGsap.to(categoryWrap, { duration: 0.5, x: "-100%", opacity: 0, pointerEvents: "none", ease: "power2.inOut" });
          activeGsap.to(sendWrap, { duration: 0.5, x: "-200%", opacity: 0, pointerEvents: "none", ease: "power2.inOut" });
        }
        showSuccessCard(nameVal);
      } catch (err) {
        console.error("Submission failed:", err);
        window.__setContactTransmitting(false);
        alert("Transmission error: " + (err.message || "Please verify your internet connection."));
      }
    }, true);
  }
}

/**
 * Setup observer to automatically enhance contact form whenever it enters the DOM
 */
export function setupContactPageWatcher() {
  if (typeof document === "undefined") return;

  const check = () => {
    if (document.querySelector(".contact-form form")) {
      initContactFormAnimations();
    }
  };

  // Initial check
  check();

  // Watch for dynamic route transitions
  const observer = new MutationObserver(() => {
    check();
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

// Auto-run watcher in browser
if (typeof window !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupContactPageWatcher);
  } else {
    setupContactPageWatcher();
  }
}
