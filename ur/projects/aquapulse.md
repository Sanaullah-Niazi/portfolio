---
layout: project
lang: ur
locale: ur_PK
ref: aquapulse
permalink: /ur/projects/aquapulse/
title: "AquaPulse"
summary: "کئی گھروں والی عمارتوں کے لیے پانی کا اسمارٹ انتظام۔ ہر گھر کا پانی ناپا جاتا ہے، منصفانہ بل بنتا ہے اور لیک پر نظر رکھی جاتی ہے، ESP32 سینسرز سے لے کر ویب ایپ اور Android ایپ تک۔"
description: "AquaPulse اپارٹمنٹ عمارتوں کے لیے پانی کے اسمارٹ انتظام کا ایک اوپن سورس (MIT) نظام ہے: ESP32 فرم ویئر، TLS پر MQTT، FastAPI، TimescaleDB، React ویب ایپ اور Flutter Android ایپ، 11 کرنسیوں میں سلیب بلنگ اور AI سے لیک کی پہچان کے ساتھ۔"
hero_caption: "AquaPulse کی اصل خصوصیات کی چار مناظر میں ایک تصویری جھلک: پمپ خود بخود چھت کی ٹینکی بھرتا ہے، رات کو لیک ہونے پر AI والو بند کر دیتا ہے، غیر محفوظ pH پر الرٹ آتا ہے، اور ماہانہ بل ادا ہوتا ہے۔"
wide: true
---
{%- assign img = "/assets/img/projects/aquapulse/" -%}
{%- assign repo = "https://github.com/Sanaullah-Niazi/aquapulse" -%}

<section class="sc-section" aria-labelledby="ap-what">
<h2 id="ap-what">مسئلہ، اور AquaPulse کیا کرتا ہے</h2>
<p class="sc-lede">بہت سی اپارٹمنٹ عمارتوں میں پانی مشترک ہوتا ہے اور کسی کو ٹھیک سے معلوم نہیں ہوتا کہ کس نے کتنا استعمال کیا۔ ٹینکی بہہ جاتی ہے یا خالی ہو جاتی ہے، لیک ہوتا پائپ ساری رات چلتا رہ سکتا ہے، اور پانی کا بل اندازے سے بانٹا جاتا ہے۔ AquaPulse ایک عام عمارت کو اسمارٹ واٹر عمارت بنا دیتا ہے۔</p>
<div class="sc-roles">
  <div class="sc-role"><h3>مالکان</h3><p>ہر گھر کا استعمال دیکھتے ہیں، اصل ریڈنگ سے منصفانہ بل بناتے ہیں، دور سے پانی کھولتے اور بند کرتے ہیں، پانی کا معیار دیکھتے ہیں اور الرٹ پاتے ہیں۔</p></div>
  <div class="sc-role"><h3>رہائشی</h3><p>اپنا استعمال اور بل دیکھتے ہیں، آن لائن ادائیگی کرتے ہیں، اپنا پانی خود کھولتے اور بند کرتے ہیں اور دیکھتے ہیں کہ پانی محفوظ ہے۔</p></div>
  <div class="sc-role"><h3>آلات</h3><p>ہر گھر میں ایک ESP32 نوڈ پانی کا بہاؤ، pH اور درجۂ حرارت ناپتا ہے اور موٹر والا والو چلاتا ہے۔ ٹینکی کا نوڈ پمپ چلاتا ہے۔ ہارڈ ویئر کے بغیر 10 گھروں اور ایک ٹینکی کا ڈیجیٹل ٹوِن یہی کام کرتا ہے۔</p></div>
</div>
<div class="sc-media sc-pair">{% include shot.html dir=img name="owner-01-overview" alt="مالک کا جائزہ: آج اور اس مہینے کا استعمال، آن لائن میٹر، باقی بل، الرٹ، ٹینکی کی سطح اور تمام گھر" caption="مالک کا جائزہ۔" %}{% include shot.html dir=img name="phone-resident-01-my-home" kind="phone" alt="فون پر میرا گھر: آج اور اس مہینے کے لیٹر، pH 7.1 محفوظ، درجۂ حرارت اور اب تک کا بل" caption="ایک گھر، لائیو۔" %}</div>
</section>

<section class="sc-section" aria-labelledby="ap-features">
<h2 id="ap-features">یہ کیا کر سکتا ہے</h2>
<ul>
  <li><strong>لائیو نگرانی:</strong> ہر گھر کا بہاؤ، pH اور درجۂ حرارت خفیہ (encrypted) MQTT پر، ڈیش بورڈز میں لائیو۔</li>
  <li><strong>دور سے والو کنٹرول:</strong> کوئی حکم تب ہی مکمل مانا جاتا ہے جب آلہ خود اس کی تصدیق کرے۔</li>
  <li><strong>ٹینکی اور پمپ:</strong> ٹینکی کا نوڈ 25٪ پر پمپ خود چلاتا اور 95٪ پر بند کرتا ہے، کبھی خشک نہیں چلاتا، اور سرور بند ہو تب بھی کام کرتا ہے۔</li>
  <li><strong>سلیب بلنگ اور ادائیگی:</strong> قیمتیں مالک طے کرتا ہے، 11 کرنسیوں میں، PDF بلوں کے ساتھ۔ ادائیگی نقد، بینک یا Stripe کارڈ سے (صرف ٹیسٹ موڈ)۔</li>
  <li><strong>AI سے لیک کی پہچان اور پیش گوئی:</strong> لیک اور پائپ پھٹنے کی پہچان، چاہیں تو والو خود بند، 7 دن کی پیش گوئی اور بل کا اندازہ، اور غیر معمولی دن۔ سمیولیٹڈ ٹیسٹ ڈیٹا پر 62 کے 62 لیک اور برسٹ بغیر کسی غلط الرٹ کے پکڑے گئے۔</li>
  <li><strong>الرٹ:</strong> نو اصول، ایپس میں اور ای میل سے، Firebase پش نوٹیفکیشن کے اختیار کے ساتھ۔</li>
</ul>
</section>

<section class="sc-section" aria-labelledby="ap-arch">
<h2 id="ap-arch">سب کچھ کیسے جڑتا ہے</h2>
<ol class="sc-flow" aria-label="آلات سے ایپس تک ڈیٹا کا راستہ">
  <li><strong>ESP32 نوڈز</strong><span>یا ڈیجیٹل ٹوِن</span></li>
  <li><strong>Mosquitto</strong><span>TLS پر MQTT، ہر آلے کا اپنا پاس ورڈ</span></li>
  <li><strong>Ingestor</strong><span>ہر پیغام جانچتا ہے</span></li>
  <li><strong>TimescaleDB</strong><span>ریڈنگز، بل، آڈٹ لاگ</span></li>
  <li><strong>FastAPI</strong><span>API اور لائیو WebSocket، Caddy (HTTPS) کے پیچھے</span></li>
  <li><strong>ویب ایپ اور Android ایپ</strong><span>React PWA اور Flutter</span></li>
</ol>
<p class="sc-note">868 بیک اینڈ ٹیسٹ اور 95.4٪ کوریج، دو مرحلوں والا لاگ اِن، چھیڑ چھاڑ پکڑنے والا آڈٹ لاگ، اور ہر تبدیلی پر CodeQL، Trivy، gitleaks، pip-audit، Bandit اور OWASP ZAP اسکین۔</p>
</section>

<section class="sc-section" aria-labelledby="ap-role">
<h2 id="ap-role">میرا کردار</h2>
<p>میں نے پورا نظام ڈیزائن کیا اور بنایا، ضروریات کی دستاویز (SRS) سے لے کر ہارڈ ویئر، بیک اینڈ، ویب ایپ، Android ایپ، AI اور سیکیورٹی تک۔ ورژن 1.0.0 31 اکتوبر 2026 کو MIT لائسنس کے تحت جاری ہوا۔</p>
</section>

<section class="sc-section sc-background" aria-labelledby="ap-bg">
<h2 id="ap-bg">پس منظر: آغاز کہاں سے ہوا</h2>
<p>AquaPulse میرے 2023 کے بی ایس کے آخری سال کے منصوبے سے نکلا، جو BUITEMS کوئٹہ میں تھا: “Smart Eco Utilization for Smart Edifice” (تھیسس رپورٹ کا عنوان “IoT based Pure Aqua Utilization in Smart Edifice” ہے)۔ ڈاکٹر Raja Asif Wagan کی نگرانی میں تین افراد کی ٹیم نے Arduino، بلوٹوتھ اور ایک Android ایپ سے ٹینکی کی سطح ناپنے اور پمپ کو خودکار چلانے کا نظام بنایا۔ AquaPulse یہی خیال رکھتا ہے اور پوری عمارتوں کے لیے باقی سب کچھ نئے سرے سے بناتا ہے۔</p>
</section>

<section class="sc-section" aria-labelledby="ap-links">
<h2 id="ap-links">لنکس</h2>
<ul class="sc-links">
  <li><a href="{{ repo }}">GitHub پر کوڈ</a></li>
  <li><a href="{{ repo }}/releases/tag/v1.0.0">ورژن 1.0.0 اور Android APK</a></li>
  <li><a href="{{ repo }}/blob/main/docs/SRS.md">ضروریات کی دستاویز (SRS، انگریزی)</a></li>
  <li><a href="{{ repo }}/blob/main/docs/test-report.md">ٹیسٹ رپورٹ (انگریزی)</a></li>
</ul>
</section>
