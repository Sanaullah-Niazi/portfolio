---
layout: project
lang: zh
locale: zh_CN
ref: aquapulse
permalink: /zh/projects/aquapulse/
title: "AquaPulse"
summary: "面向多户住宅楼的智能用水管理。从 ESP32 传感器到网页应用和 Android 应用，每户的用水都被计量、公平计费，并时刻监测漏水。"
description: "AquaPulse 是一个开源（MIT）的公寓楼智能用水管理系统：ESP32 固件、基于 TLS 的 MQTT、FastAPI、TimescaleDB、React 网页应用和 Flutter Android 应用，支持 11 种货币的阶梯计费和 AI 漏水检测。"
hero_caption: "用四个场景展示 AquaPulse 的真实功能：水泵自动给屋顶水箱补水，AI 在夜间漏水时关闭阀门，pH 不安全时发出警报，月度账单完成支付。"
wide: true
---
{%- assign img = "/assets/img/projects/aquapulse/" -%}
{%- assign repo = "https://github.com/Sanaullah-Niazi/aquapulse" -%}

<section class="sc-section" aria-labelledby="ap-what">
<h2 id="ap-what">问题，以及 AquaPulse 做什么</h2>
<p class="sc-lede">在许多公寓楼里，用水是共享的，没人真正知道谁用了多少。水箱会溢出或抽干，漏水的管道可能整夜流个不停，水费只能靠估算分摊。AquaPulse 让一栋普通的楼变成智能用水的楼。</p>
<div class="sc-roles">
  <div class="sc-role"><h3>业主</h3><p>查看每户的用水，按真实读数公平计费，远程开关供水，监测水质并接收警报。</p></div>
  <div class="sc-role"><h3>住户</h3><p>查看自己的用水和账单，在线支付，自己开关供水，并确认水是安全的。</p></div>
  <div class="sc-role"><h3>设备</h3><p>每户一个 ESP32 节点，测量流量、pH 和温度，并驱动电动阀门；水箱节点控制水泵。没有硬件时，一个包含 10 户和一个水箱的数字孪生完成同样的工作。</p></div>
</div>
<div class="sc-media sc-pair">{% include shot.html dir=img name="owner-01-overview" alt="业主总览：今天和本月用水、在线水表、未付账单、警报、水箱水位和所有住户" caption="业主的总览。" %}{% include shot.html dir=img name="phone-resident-01-my-home" kind="phone" alt="手机上的“我的家”：今天和本月用水、pH 7.1 安全、温度和本月账单" caption="一户的实时情况。" %}</div>
</section>

<section class="sc-section" aria-labelledby="ap-features">
<h2 id="ap-features">它能做什么</h2>
<ul>
  <li><strong>实时监测：</strong>每户的流量、pH 和温度通过加密的 MQTT 传输，在仪表盘上实时更新。</li>
  <li><strong>远程阀门控制：</strong>只有设备本身确认后，命令才算完成。</li>
  <li><strong>水箱和水泵：</strong>水箱节点在 25% 时自动开泵、95% 时关泵，绝不干转，即使服务器停机也照常工作。</li>
  <li><strong>阶梯计费和支付：</strong>价格由业主设定，支持 11 种货币，生成 PDF 账单。可用现金、银行转账或通过 Stripe 刷卡支付（仅测试模式）。</li>
  <li><strong>AI 漏水检测和预测：</strong>发现缓慢漏水和爆管，可选择自动关阀；提供 7 天用水预测和月底账单估算，并标出异常的日子。在模拟测试数据上，它找出了全部 62 个预设的漏水和爆管，没有误报。</li>
  <li><strong>警报：</strong>九条规则，通过应用和电子邮件发送，并可选 Firebase 推送通知。</li>
</ul>
</section>

<section class="sc-section" aria-labelledby="ap-arch">
<h2 id="ap-arch">整体结构</h2>
<ol class="sc-flow" aria-label="从设备到应用的数据路径">
  <li><strong>ESP32 节点</strong><span>或数字孪生</span></li>
  <li><strong>Mosquitto</strong><span>基于 TLS 的 MQTT，每台设备一个密码</span></li>
  <li><strong>Ingestor</strong><span>检查每条消息</span></li>
  <li><strong>TimescaleDB</strong><span>读数、账单、审计日志</span></li>
  <li><strong>FastAPI</strong><span>API 和实时 WebSocket，位于 Caddy（HTTPS）之后</span></li>
  <li><strong>网页应用和 Android 应用</strong><span>React PWA 和 Flutter</span></li>
</ol>
<p class="sc-note">868 个后端测试，覆盖率 95.4%；双因素登录、防篡改审计日志；每次改动都运行 CodeQL、Trivy、gitleaks、pip-audit、Bandit 和 OWASP ZAP 扫描。</p>
</section>

<section class="sc-section" aria-labelledby="ap-role">
<h2 id="ap-role">我的角色</h2>
<p>我设计并构建了整个系统，从需求规格说明书到硬件、后端、网页应用、Android 应用、AI 和安全。1.0.0 版于 2026 年 10 月 31 日以 MIT 许可证发布。</p>
</section>

<section class="sc-section sc-background" aria-labelledby="ap-bg">
<h2 id="ap-bg">背景：从哪里开始</h2>
<p>AquaPulse 源自我 2023 年在奎达 BUITEMS 的本科毕业设计“Smart Eco Utilization for Smart Edifice”（论文报告题为“IoT based Pure Aqua Utilization in Smart Edifice”）。在 Raja Asif Wagan 博士指导下，三人团队用 Arduino、蓝牙和一个 Android 应用实现了水箱水位测量和水泵自动控制。AquaPulse 保留了这个想法，并为整栋楼重新构建了其余的一切。</p>
</section>

<section class="sc-section" aria-labelledby="ap-links">
<h2 id="ap-links">链接</h2>
<ul class="sc-links">
  <li><a href="{{ repo }}">GitHub 上的代码</a></li>
  <li><a href="{{ repo }}/releases/tag/v1.0.0">1.0.0 版和 Android APK</a></li>
  <li><a href="{{ repo }}/blob/main/docs/SRS.md">需求规格说明书（SRS，英文）</a></li>
  <li><a href="{{ repo }}/blob/main/docs/test-report.md">测试报告（英文）</a></li>
</ul>
</section>
