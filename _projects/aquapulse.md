---
title: "AquaPulse"
summary: "Smart water management for multi-home buildings. Every home's water metered, billed fairly and watched for leaks, from ESP32 sensors to a web app and an Android app."
description: "AquaPulse is an open-source (MIT) smart water management system for apartment buildings: ESP32 firmware, MQTT over TLS, FastAPI, TimescaleDB, a React web app and a Flutter Android app, with slab billing in 11 currencies and AI leak detection."
status: Completed       # In progress  or  Completed
order: 0               # lower numbers show first
topics: [AI, Security, Networks]
icon: chip
thumb: /assets/img/projects/aquapulse/aquapulse-card.webp
image:
  path: /assets/img/projects/aquapulse/aquapulse-social.jpg
  width: 1200
  height: 630
  alt: "AquaPulse: the roof tank, homes, owner and resident apps of a smart-water building"
tech: [ESP32, MQTT over TLS, FastAPI, TimescaleDB, React, Flutter, Docker]
links:
  github: "https://github.com/Sanaullah-Niazi/aquapulse"
  apk: "https://github.com/Sanaullah-Niazi/aquapulse/releases/tag/v1.0.0"
  demo: ""
  paper: ""
  video: "/assets/video/aquapulse-system-sound.mp4"
demo_embed: ""
youtube_id: ""
hero_video:
  src: /assets/video/aquapulse-system.mp4
  poster: /assets/img/projects/aquapulse/aquapulse-poster.webp
  width: 1280
  height: 720
  caption: "An illustration of real AquaPulse features, in four scenes: the pump fills the roof tank by itself, the AI closes a valve on a leak at night, an unsafe pH raises an alert, and a monthly bill is paid."
wide: true             # wide page: screenshots, diagrams and a lightbox
---
{%- assign img = "/assets/img/projects/aquapulse/" -%}
{%- assign repo = page.links.github -%}

<section class="sc-section" aria-labelledby="ap-what">
<h2 id="ap-what">The problem, and what AquaPulse does</h2>
<p class="sc-lede">In many apartment buildings, water is shared and nobody really knows who used what. The tank overflows or runs dry, a leaking pipe can run all night, and the water bill is split by guesswork. AquaPulse turns a normal building into a smart-water building.</p>
<div class="sc-roles">
  <div class="sc-role">
    <h3>Owners</h3>
    <p>See every home's water use, bill residents fairly from real readings, turn water on or off remotely, watch water quality and get alerts.</p>
  </div>
  <div class="sc-role">
    <h3>Residents</h3>
    <p>See their own usage and bill, pay online, turn their own water on or off and check that their water is safe.</p>
  </div>
  <div class="sc-role">
    <h3>Devices</h3>
    <p>An ESP32 node in each home measures flow, pH and temperature and drives a motorised valve. A tank node runs the pump. Without hardware, a digital twin of 10 homes and a tank does the same.</p>
  </div>
</div>
</section>

<section class="sc-section" aria-labelledby="ap-features">
<h2 id="ap-features">What it can do</h2>

<div class="sc-feature">
<div class="sc-text">
<h3>Live monitoring</h3>
<p>Every home reports its water flow, pH and temperature over encrypted MQTT, and the dashboards update live over a WebSocket. Litres come from the meter's running total, so a lost message never loses water: with 10% of messages dropped in a test, daily totals stayed within 0.5%.</p>
</div>
<div class="sc-media">{% include shot.html dir=img name="owner-01-overview" alt="Owner overview: litres used today and this month, meters online, unpaid bills, open alerts, tank level and a table of all homes" caption="The owner's overview of the whole building." %}</div>
</div>

<div class="sc-feature">
<div class="sc-text">
<h3>Remote valve control</h3>
<p>Residents can turn their own water off and on, and owners can control and lock any home's valve with a written reason. A command only counts as done when the device itself confirms it.</p>
</div>
<div class="sc-media sc-phones">{% include shot.html dir=img name="phone-resident-01-my-home" kind="phone" alt="Resident's My home screen on a phone: litres today and this month, water running, pH 7.1 safe, temperature and the bill so far" caption="A resident's home, live." %}</div>
</div>

<div class="sc-feature">
<div class="sc-text">
<h3>Tank and pump automation</h3>
<p>The tank node runs the pump by itself: on when the tank falls to 25%, off at 95% (the owner can change both), and always off at 98%. It never runs the pump dry, and it keeps doing this when the server is down.</p>
</div>
<div class="sc-media sc-pair">{% include shot.html dir=img name="owner-04-tank-and-pump" alt="Tank and pump page: water level gauge, pump state, automatic mode and level history" caption="Tank and pump, on the web." %}{% include shot.html dir=img name="phone-owner-04-tank-and-pump" kind="phone" alt="Tank and pump on a phone: water level 30%, pump stopped, automatic mode" caption="And on a phone." %}</div>
</div>

<div class="sc-feature">
<div class="sc-text">
<h3>Water quality</h3>
<p>pH and temperature for every home, with a plain Safe, Check or Unsafe label and live charts. If the water stays outside the safe range for several readings, the resident and the owner get an alert.</p>
</div>
<div class="sc-media sc-phones">{% include shot.html dir=img name="phone-resident-03-water-quality" kind="phone" alt="Water quality screen on a phone: pH 7.1 safe with an explanation and a live pH chart with the safe range" caption="pH, explained in plain words." %}</div>
</div>

<div class="sc-feature">
<div class="sc-text">
<h3>Slab billing and payments</h3>
<p>The owner sets the prices: litre slabs, extra charges and taxes, in 11 currencies. Monthly bills are made from the real meter readings, as PDFs, and stay fair when people move in or out mid-month. Residents pay by cash, bank transfer or card through Stripe (test mode only).</p>
</div>
<div class="sc-media sc-pair">{% include shot.html dir=img name="owner-07-bills" alt="Owner's bills page: one bill per home for September 2026 with totals, amounts still to pay and paid or to-pay status" caption="Bills for the whole building." %}{% include shot.html dir=img name="phone-resident-04-bills" kind="phone" alt="Resident's bills on a phone: September and August 2026 bills, both paid" caption="A resident's bills." %}</div>
</div>

<div class="sc-feature">
<div class="sc-text">
<h3>AI leak detection and forecasts</h3>
<p>Every reading is checked for slow leaks and burst pipes, and the owner can let AquaPulse close the valve on its own. It also gives a 7-day water forecast with a month-end bill estimate, and flags unusual days, each with a reason in plain words. On a labelled test set of simulated data, it found all 62 planted leaks and bursts with no false alarms (<a href="{{ repo }}/blob/main/docs/ai-evaluation.md">evaluation</a>).</p>
</div>
<div class="sc-media sc-pair">{% include shot.html dir=img name="owner-10-ai" alt="AI insights page: building forecast for the next 7 days with its range, month-end estimate and bill estimate" caption="The building's forecast and bill estimate." %}{% include shot.html dir=img name="phone-resident-05-ai-insights" kind="phone" alt="AI insights on a phone: forecast for the next 7 days, this month's litres and bill estimate with a chart" caption="The same for one home." %}</div>
</div>

<div class="sc-feature">
<div class="sc-text">
<h3>Alerts</h3>
<p>Nine rules watch the building: unsafe pH, hot or freezing water, a device offline, the tank low or overflowing, the pump running dry, high daily use, a failed valve command and a stuck sensor. Alerts arrive in the apps and by email, with optional push notifications through Firebase. A System Admin sees the health of every service.</p>
</div>
<div class="sc-media">{% include shot.html dir=img name="admin-02-system-health" alt="System Admin health page: database, MQTT broker, ingestor and worker all up, devices online, readings per minute and the audit log check" caption="The System Admin's health page." %}</div>
</div>

<div class="sc-feature">
<div class="sc-text">
<h3>Light and dark, phone to desktop</h3>
<p>The web app installs on a phone like an app, works from 360 px phones to big screens in light and dark mode, and is checked with an automatic accessibility test on every screen.</p>
</div>
<div class="sc-media">{% include shot.html dir=img name="owner-12-overview-dark" alt="The owner overview in dark mode" caption="Dark mode." %}</div>
</div>
</section>

<section class="sc-section" aria-labelledby="ap-hw">
<h2 id="ap-hw">The hardware</h2>
<p>ESP32 firmware for a home node (flow meter, pH, temperature, motorised valve) and a tank node (level sensor, sump switch, pump relay). Both run in the free Wokwi simulator, and the same contract is followed by the digital twin, so a simulated home can be swapped for a real board.</p>
<div class="sc-grid2">
{% include shot.html dir=img name="hardware-01-home-node" kind="plain" w=800 h=531 alt="Wokwi circuit of the home node: ESP32, flow and pH inputs, DS18B20 temperature sensor and two valve motor outputs" caption="Home node: water flow, pH, temperature and the valve motor." %}
{% include shot.html dir=img name="hardware-02-tank-node" kind="plain" w=800 h=512 alt="Wokwi circuit of the tank node: ESP32, ultrasonic level sensor, sump float switch and pump relay" caption="Tank node: water level, sump switch and pump." %}
</div>
</section>

<section class="sc-section" aria-labelledby="ap-arch">
<h2 id="ap-arch">How it fits together</h2>
<ol class="sc-flow" aria-label="Data path from the devices to the apps">
  <li><strong>ESP32 nodes</strong><span>or the digital twin</span></li>
  <li><strong>Mosquitto</strong><span>MQTT over TLS, a password per device</span></li>
  <li><strong>Ingestor</strong><span>checks every message</span></li>
  <li><strong>TimescaleDB</strong><span>readings, bills, audit log</span></li>
  <li><strong>FastAPI</strong><span>API and live WebSocket, behind Caddy (HTTPS)</span></li>
  <li><strong>Web app and Android app</strong><span>React PWA and Flutter</span></li>
</ol>
<p class="sc-note">Beside them, a worker makes the bills, runs the alert rules and the AI, and sends email and push. Valve and pump commands go back from the API through the broker to the device. Everything starts with one Docker Compose command.</p>
</section>

<section class="sc-section" aria-labelledby="ap-quality">
<h2 id="ap-quality">Security and quality</h2>
<ul class="sc-stats">
  <li><strong>868</strong><span>backend tests, 95.4% line coverage</span></li>
  <li><strong>100%</strong><span>branch coverage of the billing engine</span></li>
  <li><strong>132</strong><span>firmware checks, plus web, app and simulator tests</span></li>
  <li><strong>75 + 30</strong><span>functional and non-functional requirements in an IEEE-style SRS</span></li>
</ul>
<div class="sc-cols">
<div>
<h3>Built in</h3>
<ul>
  <li>Two-factor login, Argon2id passwords and rotating tokens that end the session if one is reused</li>
  <li>A hash-chained, tamper-evident audit log</li>
  <li>MQTT over TLS only, with a password and its own topics for every device</li>
  <li>A STRIDE threat model and an OWASP ASVS checklist</li>
</ul>
</div>
<div>
<h3>Checked on every change</h3>
<ul class="tags sc-scans" aria-label="Security scans in CI">
  <li>CodeQL</li><li>Trivy</li><li>gitleaks</li><li>pip-audit</li><li>pnpm audit</li><li>Bandit</li><li>OWASP ZAP</li><li>testssl.sh</li>
</ul>
<p class="sc-small">CI runs the whole stack, the tests, an accessibility check on every screen and a backup-and-restore check. The <a href="{{ repo }}/blob/main/docs/test-report.md">test report</a> says plainly what is measured and what is not yet.</p>
</div>
</div>
</section>

<section class="sc-section" aria-labelledby="ap-stack">
<h2 id="ap-stack">Tech stack</h2>
<dl class="sc-stack">
  <dt>Hardware</dt><dd><ul class="tags"><li>ESP32</li><li>C++ (PlatformIO)</li><li>Wokwi</li></ul></dd>
  <dt>Backend</dt><dd><ul class="tags"><li>Python</li><li>FastAPI</li><li>TimescaleDB (PostgreSQL)</li><li>Mosquitto MQTT</li><li>Caddy</li><li>Docker Compose</li></ul></dd>
  <dt>Apps</dt><dd><ul class="tags"><li>React</li><li>TypeScript</li><li>PWA</li><li>Flutter</li></ul></dd>
  <dt>AI</dt><dd><ul class="tags"><li>scikit-learn (Isolation Forest)</li><li>statsmodels (Holt-Winters)</li></ul></dd>
  <dt>Payments</dt><dd><ul class="tags"><li>Stripe (test mode)</li><li>WeasyPrint PDFs</li></ul></dd>
  <dt>Testing</dt><dd><ul class="tags"><li>pytest</li><li>Hypothesis</li><li>Playwright</li><li>axe-core</li><li>GitHub Actions</li></ul></dd>
</dl>
</section>

<section class="sc-section" aria-labelledby="ap-role">
<h2 id="ap-role">My role</h2>
<p>I designed and built the whole system, from the software requirements specification to the hardware, backend, web app, Android app, AI and security. Version 1.0.0 was released on 31 October 2026 under the MIT licence.</p>
</section>

<section class="sc-section sc-background" aria-labelledby="ap-bg">
<h2 id="ap-bg">Background: where this started</h2>
<p>AquaPulse grew from my 2023 BS final-year project at BUITEMS, Quetta, "Smart Eco Utilization for Smart Edifice" (the thesis report is titled "IoT based Pure Aqua Utilization in Smart Edifice"). A team of three, supervised by Dr. Raja Asif Wagan, built tank level sensing and automatic pump control with an Arduino, a Bluetooth link and an Android app. AquaPulse keeps the good idea, the self-running tank, and rebuilds everything around it for whole buildings: Wi-Fi and encrypted MQTT instead of Bluetooth, many homes and roles, real billing, security and tests.</p>
</section>

<section class="sc-section" aria-labelledby="ap-links">
<h2 id="ap-links">Links</h2>
<ul class="sc-links">
  <li><a href="{{ repo }}">Code on GitHub</a></li>
  <li><a href="{{ page.links.apk }}">Release v1.0.0 and the Android APK</a></li>
  <li><a href="{{ repo }}/blob/main/docs/SRS.md">Software requirements specification (SRS)</a></li>
  <li><a href="{{ repo }}/blob/main/docs/test-report.md">Test report</a></li>
  <li><a href="{{ repo }}/blob/main/docs/ai-evaluation.md">AI evaluation</a></li>
  <li><a href="{{ repo }}/blob/main/docs/security/threat-model.md">Threat model</a></li>
</ul>
</section>
