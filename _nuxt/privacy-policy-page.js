/**
 * ============================================================================
 * File: privacy-policy-page.js
 * Purpose: Complete, responsive Chaitanya 2k26 Privacy Policy page component.
 * ============================================================================
 */
import { a as t, __tla as o } from "./app-main.js";
import { k as e, H as be, F as xe, M as b } from "./vue-runtime.js";

let a,
  r = Promise.all([
    (() => {
      try {
        return o;
      } catch {}
    })(),
  ]).then(async () => {
    a = e({
      __name: "privacy-policy",
      setup(l) {
        try {
          document.body.classList.add("has-privacy-policy");
          const trans = document.querySelector(".transition-component");
          if (trans) {
            trans.style.display = "none";
            trans.style.opacity = "0";
            trans.style.clipPath = "circle(0 at 50% 50%)";
            trans.style.webkitClipPath = "circle(0 at 50% 50%)";
          }
        } catch (e) {}

        t({
          title: "Chaitanya 2k26 | Privacy Policy",
          meta: [
            {
              name: "description",
              content: "How Chaitanya 2k26 at HPTU Hamirpur collects, uses and protects participant data for registrations, payments and event entry.",
            },
          ],
          link: [{ rel: "canonical", href: "https://chaitanya2k26.hptu.ac.in/privacy-policy" }],
        });

        const policyHtml = `
          <div class="privacy-container">
            <!-- Navigation Actions -->
            <div class="privacy-top-bar">
              <a href="/" class="privacy-back-btn" id="btn-privacy-home">
                <span>←</span> RETURN TO HOME
              </a>
              <div style="display:flex; gap:12px;">
                <a href="/contact" class="privacy-contact-btn" id="btn-privacy-contact">
                  CONTACT US
                </a>
              </div>
            </div>

            <!-- Hero Header -->
            <div class="privacy-hero">
              <span class="privacy-tag-badge">Official Policy & Data Protection</span>
              <h1>Privacy Policy</h1>
              <p class="subtitle">Chaitanya 2k26 — Himachal Pradesh Technical University (HPTU)</p>
              <div class="privacy-meta-row">
                <span>Effective: October 2026</span>
                <span>•</span>
                <span>Revision: 3.0 (Fest Edition)</span>
                <span>•</span>
                <span>Looked after by: Organising Committee</span>
              </div>
            </div>

            <!-- Quick Jump Nav -->
            <nav class="privacy-quick-nav" aria-label="On this page">
              <a href="#sec-overview" class="quick-nav-pill">01. Introduction</a>
              <a href="#sec-collect" class="quick-nav-pill">02. What We Collect</a>
              <a href="#sec-registration" class="quick-nav-pill">03. Sign-up Data</a>
              <a href="#sec-usage" class="quick-nav-pill">04. How We Use It</a>
              <a href="#sec-cookies" class="quick-nav-pill">05. Cookies & Analytics</a>
              <a href="#sec-thirdparty" class="quick-nav-pill">06. Other Services</a>
              <a href="#sec-security" class="quick-nav-pill">07. Security</a>
              <a href="#sec-intellectual" class="quick-nav-pill">08. Photos & Your Work</a>
              <a href="#sec-retention" class="quick-nav-pill">09. How Long We Keep It</a>
              <a href="#sec-rights" class="quick-nav-pill">10. Your Rights</a>
              <a href="#sec-changes" class="quick-nav-pill">11. Changes</a>
              <a href="#sec-grievance" class="quick-nav-pill">12. Contact</a>
            </nav>

            <!-- Main Legal Content Sections (div, not <main>: the layout already provides the main landmark) -->
            <div class="privacy-sections">
              <!-- Section 1 -->
              <article class="privacy-card" id="sec-overview">
                <div class="privacy-card-header">
                  <span class="privacy-card-num">01</span>
                  <h2>Introduction</h2>
                </div>
                <p>
                  This Privacy Policy covers how you use the official website of <strong>Chaitanya 2k26</strong>.
                  Chaitanya is the yearly tech and cultural fest of <strong>Himachal Pradesh Technical University (HPTU)</strong>.
                </p>
                <p>
                  You may sign up for events, join hackathons, log in to your account or send us a question.
                  When you do, you agree to how we handle data as this policy explains.
                </p>
                <div class="privacy-callout">
                  Our promise: We handle the data of every student, participant and sponsor honestly and with care. We never sell or rent your personal information. We never misuse it for marketing you did not agree to.
                </div>
              </article>

              <!-- Section 2 -->
              <article class="privacy-card" id="sec-collect">
                <div class="privacy-card-header">
                  <span class="privacy-card-num">02</span>
                  <h2>What We Collect</h2>
                </div>
                <p>To run the events and keep the fest safe, we collect these kinds of data:</p>
                <ul>
                  <li><strong>Account and identity:</strong> Your name, email address and profile photo from your Google account. Also the college or institute you type in.</li>
                  <li><strong>Event sign-ups and teams:</strong> The events and accommodation you sign up for, your team name, team code and the names of your team members.</li>
                  <li><strong>Contact details:</strong> The mobile or WhatsApp number you give us. We use it to send schedule updates and to plan with you.</li>
<li><strong>Payment details:</strong> For paid events, the amount and the 12-digit UPI Transaction ID you enter. The organising committee uses it to match your payment with the bank statement. We never ask for or keep your UPI PIN, bank account or card details.</li>
                  <li><strong>Messages to us:</strong> Your name, team name, email, phone number and message, sent through our contact form (run by Web3Forms).</li>
                  <li><strong>How you use the site:</strong> Google Analytics for Firebase collects basic usage data. This includes pages viewed, device and browser type, and rough location. It helps us make the site better. See section 05 to learn how to turn it off.</li>
                </ul>
              </article>

              <!-- Registration -->
              <article class="privacy-card" id="sec-registration">
                <div class="privacy-card-header">
                  <span class="privacy-card-num">03</span>
                  <h2>Sign-up Data</h2>
                </div>
                <p>When you sign in with Google and sign up for an event, we store this in Cloud Firestore:</p>
                <ul>
                  <li><strong>Your profile:</strong> name, email address, profile photo, college, year of study, mobile number, a participant ID made by the site, and the list of events you signed up for.</li>
                  <li><strong>Each sign-up or accommodation booking:</strong> the event, whether you joined alone or as a team, your team name, team code and team members, whether you have paid and how much is due, and the ID of your entry pass (QR code).</li>
                  <li><strong>Payments:</strong> for paid events, the amount and the UPI Transaction ID you enter, and whether the organising committee has checked it.</li>
                </ul>
                <p>Team leaders type in the names of their team members. Please only share details your teammates have agreed to.</p>
              </article>

              <!-- Section 3 -->
              <article class="privacy-card" id="sec-usage">
                <div class="privacy-card-header">
                  <span class="privacy-card-num">04</span>
                  <h2>How We Use It</h2>
                </div>
                <p>We use this data only to run the fest and to check who took part:</p>
                <ul>
                  <li><strong>Entry and access:</strong> Checking who has signed up, so they can enter the campus and their events.</li>
                  <li><strong>Hackathons and competitions:</strong> Handling project entries, judging groups, mentors and winner lists.</li>
                  <li><strong>Official messages:</strong> Sending important schedule updates, room details, rules and emergency alerts.</li>
                  <li><strong>Certificates and prizes:</strong> Making checked certificates of participation and merit, and keeping prize records.</li>
                </ul>
              </article>


              <!-- Cookies & analytics -->
              <article class="privacy-card" id="sec-cookies">
                <div class="privacy-card-header">
                  <span class="privacy-card-num">05</span>
                  <h2>Cookies, Local Storage & Analytics</h2>
                </div>
                <ul>
                  <li><strong>Browser storage:</strong> Your event cart is saved in your browser's local storage. Your event filters and an unfinished checkout are saved in session storage until you close the tab. Firebase Authentication saves your sign-in in your browser, so you stay signed in.</li>
                  <li><strong>Analytics:</strong> Google Analytics for Firebase starts after the page has fully loaded. It may set its own cookies. It does not load at all if your browser sends a Do Not Track or Global Privacy Control signal.</li>
                  <li><strong>No ads:</strong> We do not use advertising or retargeting cookies.</li>
                </ul>
                <p>You can clear this data any time in your browser settings. Doing so signs you out and empties your cart.</p>
              </article>

              <!-- Section 5 -->
              <article class="privacy-card" id="sec-thirdparty">
                <div class="privacy-card-header">
                  <span class="privacy-card-num">06</span>
                  <h2>Other Services We Use</h2>
                </div>
                <p>We use these carefully checked outside services to run the website:</p>
                <ul>
                  <li><strong>Google Firebase:</strong> Sign-in (Firebase Authentication), storing sign-ups and payment details (Cloud Firestore), and usage analytics (Google Analytics for Firebase).</li>
                  <li><strong>Web3Forms:</strong> Sends contact form messages by email to <code>chaitanyahptu@gmail.com</code> over HTTPS. We also save a copy of each message in Cloud Firestore. This lets the organising committee track and answer it.</li>
                  <li><strong>3D animations:</strong> Three.js and WebGL animations run only on your own device's graphics chip. They do not send out any biometric data or data that profiles your device.</li>
                </ul>
              </article>


              <!-- Section 4 -->
              <article class="privacy-card" id="sec-security">
                <div class="privacy-card-header">
                  <span class="privacy-card-num">07</span>
                  <h2>Keeping Data Safe</h2>
                </div>
                <p>
                  We built the website with safety in mind from the start:
                </p>
                <ul>
                  <li><strong>Firebase Authentication:</strong> Your sign-in sessions and login tokens are protected by Google Firebase. Firebase follows the ISO/IEC 27001 and SOC security standards.</li>
                  <li><strong>Limited admin access:</strong> Only you and approved organising-committee accounts can see sign-up and payment records. Cloud Firestore security rules enforce this.</li>
                  <li><strong>HTTPS:</strong> All data between your device and our servers is fully encrypted (TLS/HTTPS).</li>
                  <li><strong>No passwords stored:</strong> You sign in with Google. We never see or keep your Google password.</li>
                </ul>
              </article>
              <!-- Section 6 -->
              <article class="privacy-card" id="sec-intellectual">
                <div class="privacy-card-header">
                  <span class="privacy-card-num">08</span>
                  <h2>Photos, Videos & Your Work</h2>
                </div>
                <p>
                  <strong>Your code belongs to you:</strong> All code, designs, pitch decks and prototypes made during Chaitanya 2k26 hackathons belong 100% to the participants and teams who made them. Only they own them.
                </p>
                <p>
                  <strong>Event photos and videos:</strong> By coming to campus events, you allow the organising committee to take photos and videos of events and stage shows. This permission is non-exclusive. We will use them only for university records, aftermovies and non-commercial promotion.
                </p>
              </article>

              <!-- Retention -->
              <article class="privacy-card" id="sec-retention">
                <div class="privacy-card-header">
                  <span class="privacy-card-num">09</span>
                  <h2>How Long We Keep Data</h2>
                </div>
                <p>
                  We keep sign-up, payment and contact records as long as the organising committee needs them.
                  We need them to run Chaitanya 2k26, check payments and give out certificates. Data saved only in your
                  browser stays there until you clear it. You can ask us to delete your records at any time. Use the contact details below.
                </p>
              </article>

              <!-- Section 7 -->
              <article class="privacy-card" id="sec-rights">
                <div class="privacy-card-header">
                  <span class="privacy-card-num">10</span>
                  <h2>Your Rights</h2>
                </div>
                <p>
                  As a visitor or participant, you have the right to:
                </p>
                <ul>
                  <li>Ask for a digital copy of your personal sign-up details.</li>
                  <li>Fix wrong phone numbers, team member names or college details.</li>
                  <li>Ask us to close your account or remove sign-up records we no longer need. We can do this once the fest's checks are done and certificates are sent.</li>
                </ul>
              </article>

              <!-- Changes -->
              <article class="privacy-card" id="sec-changes">
                <div class="privacy-card-header">
                  <span class="privacy-card-num">11</span>
                  <h2>Changes to This Policy</h2>
                </div>
                <p>
                  We may update this policy when the fest's services change. The latest version is always on this page.
                  The effective date at the top shows when it last changed.
                </p>
              </article>

              <!-- Section 8 -->
              <article class="privacy-card" id="sec-grievance">
                <div class="privacy-card-header">
                  <span class="privacy-card-num">12</span>
                  <h2>Contact</h2>
                </div>
                <p>
                  Have a question about your data, a complaint, or need a certificate checked? Write to the fest team:
                </p>
                <div class="privacy-callout">
                  <strong>Official Email:</strong> <a href="mailto:chaitanyahptu@gmail.com" style="color:var(--ink); text-decoration:underline;">chaitanyahptu@gmail.com</a><br/>
                  <strong>Institution:</strong> Himachal Pradesh Technical University (HPTU), Hamirpur, H.P., India<br/>
                  <strong>Fest Office:</strong> Chaitanya 2k26 Organising Committee
                </div>
              </article>
            </div>

            <!-- Bottom CTA -->
            <section class="privacy-cta-box">
              <h3>HAVE QUESTIONS OR NEED HELP?</h3>
              <p>Our fest team will reply to your questions by email as soon as we can.</p>
              <a href="/contact" class="privacy-cta-btn" id="btn-privacy-cta-contact">CONTACT US</a>
            </section>

            <!-- Footer Credits -->
            <div class="privacy-footer-credits">
              <p>© 2026 Chaitanya 2k26 • Himachal Pradesh Technical University • All rights reserved.</p>
            </div>
          </div>
        `;

        return (i, c) => (
          be(),
          xe("div", { class: "privacy-page-root" }, [
            b("div", {
              class: "privacy-page-wrapper",
              innerHTML: policyHtml,
            }),
          ])
        );
      },
    });
  });

export { r as __tla, a as default };
