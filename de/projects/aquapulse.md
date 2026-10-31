---
layout: project
lang: de
locale: de_DE
ref: aquapulse
permalink: /de/projects/aquapulse/
title: "AquaPulse"
summary: "Intelligentes Wassermanagement für Mehrfamilienhäuser. Der Verbrauch jeder Wohnung wird gemessen, fair abgerechnet und auf Lecks überwacht, von ESP32-Sensoren bis zur Web-App und Android-App."
description: "AquaPulse ist ein Open-Source-System (MIT) für intelligentes Wassermanagement in Mehrfamilienhäusern: ESP32-Firmware, MQTT über TLS, FastAPI, TimescaleDB, eine React-Web-App und eine Flutter-Android-App, mit Staffeltarifen in 11 Währungen und KI-Leckerkennung."
hero_caption: "Eine Illustration echter AquaPulse-Funktionen in vier Szenen: Die Pumpe füllt den Dachtank von selbst, die KI schließt bei einem nächtlichen Leck das Ventil, ein unsicherer pH-Wert löst eine Warnung aus, und eine Monatsrechnung wird bezahlt."
wide: true
---
{%- assign img = "/assets/img/projects/aquapulse/" -%}
{%- assign repo = "https://github.com/Sanaullah-Niazi/aquapulse" -%}

<section class="sc-section" aria-labelledby="ap-what">
<h2 id="ap-what">Das Problem, und was AquaPulse tut</h2>
<p class="sc-lede">In vielen Mehrfamilienhäusern wird Wasser geteilt, und niemand weiß genau, wer wie viel verbraucht hat. Der Tank läuft über oder leer, ein undichtes Rohr kann die ganze Nacht laufen, und die Wasserrechnung wird geschätzt. AquaPulse macht aus einem normalen Gebäude ein Gebäude mit intelligentem Wassermanagement.</p>
<div class="sc-roles">
  <div class="sc-role"><h3>Eigentümer</h3><p>Sehen den Verbrauch jeder Wohnung, rechnen fair nach echten Zählerständen ab, schalten Wasser aus der Ferne ein und aus, überwachen die Wasserqualität und erhalten Warnungen.</p></div>
  <div class="sc-role"><h3>Bewohner</h3><p>Sehen ihren eigenen Verbrauch und ihre Rechnung, bezahlen online, schalten ihr Wasser selbst ein und aus und prüfen, ob ihr Wasser sicher ist.</p></div>
  <div class="sc-role"><h3>Geräte</h3><p>Ein ESP32-Knoten in jeder Wohnung misst Durchfluss, pH-Wert und Temperatur und steuert ein Motorventil. Ein Tankknoten steuert die Pumpe. Ohne Hardware übernimmt ein digitaler Zwilling mit 10 Wohnungen und einem Tank dasselbe.</p></div>
</div>
<div class="sc-media sc-pair">{% include shot.html dir=img name="owner-01-overview" alt="Übersicht für Eigentümer: Verbrauch heute und im Monat, Zähler online, offene Rechnungen, Warnungen, Tankstand und alle Wohnungen" caption="Die Übersicht des Eigentümers." %}{% include shot.html dir=img name="phone-resident-01-my-home" kind="phone" alt="Die Seite „Meine Wohnung“ auf einem Handy: Liter heute und im Monat, pH 7,1 sicher, Temperatur und die bisherige Rechnung" caption="Eine Wohnung, live." %}</div>
</section>

<section class="sc-section" aria-labelledby="ap-features">
<h2 id="ap-features">Was es kann</h2>
<ul>
  <li><strong>Live-Überwachung:</strong> Durchfluss, pH-Wert und Temperatur jeder Wohnung über verschlüsseltes MQTT, live in den Dashboards.</li>
  <li><strong>Ventilsteuerung aus der Ferne:</strong> Ein Befehl gilt erst als erledigt, wenn das Gerät ihn bestätigt.</li>
  <li><strong>Tank und Pumpe:</strong> Der Tankknoten schaltet die Pumpe selbst bei 25 % ein und bei 95 % aus, läuft nie trocken und arbeitet auch, wenn der Server ausfällt.</li>
  <li><strong>Staffeltarife und Zahlungen:</strong> Preise legt der Eigentümer fest, in 11 Währungen, mit PDF-Rechnungen. Bezahlt wird bar, per Überweisung oder per Karte über Stripe (nur Testmodus).</li>
  <li><strong>KI-Leckerkennung und Prognosen:</strong> Lecks und Rohrbrüche, auf Wunsch mit automatischem Schließen des Ventils, eine 7-Tage-Prognose mit Rechnungsschätzung und ungewöhnliche Tage. Auf simulierten Testdaten wurden alle 62 eingebauten Lecks und Rohrbrüche ohne Fehlalarm gefunden.</li>
  <li><strong>Warnungen:</strong> neun Regeln, in den Apps und per E-Mail, mit optionalen Push-Nachrichten über Firebase.</li>
</ul>
</section>

<section class="sc-section" aria-labelledby="ap-arch">
<h2 id="ap-arch">Wie alles zusammenhängt</h2>
<ol class="sc-flow" aria-label="Datenweg von den Geräten zu den Apps">
  <li><strong>ESP32-Knoten</strong><span>oder der digitale Zwilling</span></li>
  <li><strong>Mosquitto</strong><span>MQTT über TLS, ein Passwort je Gerät</span></li>
  <li><strong>Ingestor</strong><span>prüft jede Nachricht</span></li>
  <li><strong>TimescaleDB</strong><span>Messwerte, Rechnungen, Audit-Log</span></li>
  <li><strong>FastAPI</strong><span>API und Live-WebSocket, hinter Caddy (HTTPS)</span></li>
  <li><strong>Web-App und Android-App</strong><span>React-PWA und Flutter</span></li>
</ol>
<p class="sc-note">868 Backend-Tests mit 95,4 % Abdeckung, Zwei-Faktor-Anmeldung, ein manipulationssicheres Audit-Log, und bei jeder Änderung CodeQL, Trivy, gitleaks, pip-audit, Bandit und ein OWASP-ZAP-Scan.</p>
</section>

<section class="sc-section" aria-labelledby="ap-role">
<h2 id="ap-role">Meine Rolle</h2>
<p>Ich habe das gesamte System entworfen und gebaut, von der Anforderungsspezifikation über Hardware, Backend, Web-App und Android-App bis zu KI und Sicherheit. Version 1.0.0 erschien am 31. Oktober 2026 unter der MIT-Lizenz.</p>
</section>

<section class="sc-section sc-background" aria-labelledby="ap-bg">
<h2 id="ap-bg">Hintergrund: wie es anfing</h2>
<p>AquaPulse ist aus meinem Bachelor-Abschlussprojekt von 2023 an der BUITEMS in Quetta entstanden, „Smart Eco Utilization for Smart Edifice“ (der Abschlussbericht heißt „IoT based Pure Aqua Utilization in Smart Edifice“). Ein Team aus drei Personen, betreut von Dr. Raja Asif Wagan, baute mit einem Arduino, Bluetooth und einer Android-App eine Füllstandsmessung mit automatischer Pumpensteuerung. AquaPulse behält diese Idee und baut alles darum herum für ganze Gebäude neu.</p>
</section>

<section class="sc-section" aria-labelledby="ap-links">
<h2 id="ap-links">Links</h2>
<ul class="sc-links">
  <li><a href="{{ repo }}">Code auf GitHub</a></li>
  <li><a href="{{ repo }}/releases/tag/v1.0.0">Version 1.0.0 und die Android-APK</a></li>
  <li><a href="{{ repo }}/blob/main/docs/SRS.md">Anforderungsspezifikation (SRS, Englisch)</a></li>
  <li><a href="{{ repo }}/blob/main/docs/test-report.md">Testbericht (Englisch)</a></li>
</ul>
</section>
