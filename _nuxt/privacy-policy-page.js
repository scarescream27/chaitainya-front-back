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
              content: "Official Privacy Policy, Data Protection, and Compliance Directive for Chaitanya 2k26.",
            },
          ],
        });

        const policyHtml = `
          <div class="privacy-container">
            <!-- Navigation Actions -->
            <div class="privacy-top-bar">
              <a href="/" class="privacy-back-btn" id="btn-privacy-home">
                <span>←</span> RETURN TO HOME
              </a>
              <div style="display:flex; gap:10px;">
                <a href="/contact" class="privacy-contact-btn" id="btn-privacy-contact">
                  [ CONTACT FEST DESK ]
                </a>
              </div>
            </div>

            <!-- Hero Header -->
            <div class="privacy-hero">
              <span class="privacy-tag-badge">Official Directive & Data Protection</span>
              <h1>Privacy Policy</h1>
              <p class="subtitle">Chaitanya 2k26 — Himachal Pradesh Technical University (HPTU)</p>
              <div class="privacy-meta-row">
                <span>Effective: October 2026</span>
                <span>•</span>
                <span>Revision: 3.0 (Fest Edition)</span>
                <span>•</span>
                <span>Custodian: Organizing Committee & Tech Council</span>
              </div>
            </div>

            <!-- Quick Jump Nav -->
            <nav class="privacy-quick-nav" aria-label="On this page">
              <a href="#sec-overview" class="quick-nav-pill">[ 01. Overview ]</a>
              <a href="#sec-collect" class="quick-nav-pill">[ 02. Data Collected ]</a>
              <a href="#sec-usage" class="quick-nav-pill">[ 03. Usage & Accreditation ]</a>
              <a href="#sec-security" class="quick-nav-pill">[ 04. Security & Firebase ]</a>
              <a href="#sec-thirdparty" class="quick-nav-pill">[ 05. Third Parties ]</a>
              <a href="#sec-intellectual" class="quick-nav-pill">[ 06. Media & Code IP ]</a>
              <a href="#sec-rights" class="quick-nav-pill">[ 07. Your Rights ]</a>
              <a href="#sec-grievance" class="quick-nav-pill">[ 08. Grievance Redressal ]</a>
            </nav>

            <!-- Main Legal Content Sections (div, not <main>: the layout already provides the main landmark) -->
            <div class="privacy-sections">
              <!-- Section 1 -->
              <article class="privacy-card" id="sec-overview">
                <div class="privacy-card-header">
                  <span class="privacy-card-num">01</span>
                  <h2>Introduction & Scope</h2>
                </div>
                <p>
                  This Privacy Policy governs the access and usage of the official digital portal for <strong>Chaitanya 2k26</strong>, 
                  the premier technical and cultural festival hosted by <strong>Himachal Pradesh Technical University (HPTU)</strong>.
                </p>
                <p>
                  By registering for events, participating in hackathons, logging into the participant portal, or submitting inquiries 
                  via our contact interfaces, you acknowledge and agree to the data management practices described in this directive.
                </p>
                <div class="privacy-callout">
                  Core Commitment: We treat all student, participant, and sponsor data with institutional integrity. No personal information is ever sold, leased, or exploited for unauthorized marketing.
                </div>
              </article>

              <!-- Section 2 -->
              <article class="privacy-card" id="sec-collect">
                <div class="privacy-card-header">
                  <span class="privacy-card-num">02</span>
                  <h2>Information We Collect</h2>
                </div>
                <p>To coordinate competitive tracks and security clearance, we collect the following categories of data:</p>
                <ul>
                  <li><strong>Account & Identification:</strong> Your name, email address and profile photo from your Google account, plus the college/institute you enter.</li>
                  <li><strong>Event Registrations & Teams:</strong> The events you register for, your team name, team code and the names of your team members.</li>
                  <li><strong>Contact Details:</strong> The mobile/WhatsApp number you enter, used for schedule updates and coordination.</li>
<li><strong>Payment Details:</strong> For paid events, the amount and the 12-digit UPI transaction reference (UTR) you submit, so the organising committee can match it with the bank statement. We never ask for or store your UPI PIN, bank account or card details.</li>
                  <li><strong>Direct Queries:</strong> Name, Team Name, Email, Contact Number, and specific message text transmitted through our Web3Forms-integrated contact system.</li>
                  <li><strong>Usage Analytics:</strong> Google Analytics for Firebase collects standard usage data (pages viewed, device and browser type, approximate location) to help us improve the site. Your audio on/off preference is stored only in your browser.</li>
                </ul>
              </article>

              <!-- Section 3 -->
              <article class="privacy-card" id="sec-usage">
                <div class="privacy-card-header">
                  <span class="privacy-card-num">03</span>
                  <h2>Purpose & Processing of Data</h2>
                </div>
                <p>Collected information is utilized strictly for festival administration and academic verification:</p>
                <ul>
                  <li><strong>Accreditation & Access:</strong> Validating registered attendees for gate access, workshop entry, and competition eligibility.</li>
                  <li><strong>Hackathon & Competition Logistics:</strong> Organizing project submissions, judging brackets, mentor allocations, and winner leaderboards.</li>
                  <li><strong>Official Communications:</strong> Disseminating critical schedule updates, room allocations, rules briefings, and emergency broadcasts.</li>
                  <li><strong>Certificate & Prize Distribution:</strong> Generating verified Certificates of Participation, Certificates of Merit, and processing prize distribution records.</li>
                </ul>
              </article>

              <!-- Section 4 -->
              <article class="privacy-card" id="sec-security">
                <div class="privacy-card-header">
                  <span class="privacy-card-num">04</span>
                  <h2>Authentication Architecture & Security</h2>
                </div>
                <p>
                  Security is baked into our portal architecture from the ground up:
                </p>
                <ul>
                  <li><strong>Firebase Authentication:</strong> Identity sessions and authentication tokens are safeguarded via Google Firebase Infrastructure adhering to ISO/IEC 27001 and SOC standards.</li>
                  <li><strong>Restricted Admin Access:</strong> Registration and payment records can be viewed only by you and by authorised organising-committee accounts, enforced by Cloud Firestore security rules.</li>
                  <li><strong>HTTPS & Transport Security:</strong> All client-server communications are conducted over end-to-end encrypted TLS/HTTPS channels.</li>
                  <li><strong>No Passwords Stored:</strong> Sign-in uses Google; we never see or store your Google password.</li>
                </ul>
              </article>

              <!-- Section 5 -->
              <article class="privacy-card" id="sec-thirdparty">
                <div class="privacy-card-header">
                  <span class="privacy-card-num">05</span>
                  <h2>Third-Party Services & Integrations</h2>
                </div>
                <p>We utilize carefully audited external services to power portal capabilities:</p>
                <ul>
                  <li><strong>Google Firebase:</strong> Sign-in (Firebase Authentication), storage of registrations and payment submissions (Cloud Firestore), and usage analytics (Google Analytics for Firebase).</li>
                  <li><strong>Web3Forms:</strong> Serverless contact form submission dispatching inquiries directly to <code>chaitanyahptu@gmail.com</code> with SSL encryption.</li>
                  <li><strong>Interactive 3D Engine:</strong> Client-side Three.js and WebGL animations render entirely on your local GPU without exporting biometric or device profiling data.</li>
                </ul>
              </article>

              <!-- Section 6 -->
              <article class="privacy-card" id="sec-intellectual">
                <div class="privacy-card-header">
                  <span class="privacy-card-num">06</span>
                  <h2>Media, Photography & Code Submissions</h2>
                </div>
                <p>
                  <strong>Intellectual Property of Code:</strong> All source code, designs, pitch decks, and prototypes built during Chaitanya 2k26 hackathons remain the 100% exclusive intellectual property of the respective participants and teams.
                </p>
                <p>
                  <strong>Event Photography & Livestreams:</strong> By attending campus events, attendees grant the organizing committee non-exclusive permission to capture event photography, video recordings, and stage performances solely for university archives, aftermovies, and non-commercial publicity.
                </p>
              </article>

              <!-- Section 7 -->
              <article class="privacy-card" id="sec-rights">
                <div class="privacy-card-header">
                  <span class="privacy-card-num">07</span>
                  <h2>Participant Rights & Data Retention</h2>
                </div>
                <p>
                  As an attendee or participant, you possess the right to:
                </p>
                <ul>
                  <li>Request a digital summary of your personal registration details.</li>
                  <li>Update inaccurate contact numbers, team member names, or institutional records.</li>
                  <li>Request account deactivation or removal of non-essential registration records once fest auditing and certificate dispatches are finalized.</li>
                </ul>
              </article>

              <!-- Section 8 -->
              <article class="privacy-card" id="sec-grievance">
                <div class="privacy-card-header">
                  <span class="privacy-card-num">08</span>
                  <h2>Grievance Redressal & Institutional Contact</h2>
                </div>
                <p>
                  For questions regarding data privacy, grievance redressal, or certificate verification, please reach out directly to the festival tech council:
                </p>
                <div class="privacy-callout">
                  <strong>Official Nodal Email:</strong> <a href="mailto:chaitanyahptu@gmail.com" style="color:var(--ink); text-decoration:underline;">chaitanyahptu@gmail.com</a><br/>
                  <strong>Institution:</strong> Himachal Pradesh Technical University (HPTU), Hamirpur, H.P., India<br/>
                  <strong>Festival Secretariat:</strong> Chaitanya 2k26 Organizing Committee
                </div>
              </article>
            </div>

            <!-- Bottom CTA -->
            <section class="privacy-cta-box">
              <h3>HAVE QUESTIONS OR NEED ASSISTANCE?</h3>
              <p>Our festival coordination and technical desk will respond to your questions by email as soon as possible.</p>
              <a href="/contact" class="privacy-cta-btn" id="btn-privacy-cta-contact">[ OPEN CONTACT US DESK ]</a>
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
