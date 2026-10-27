---
layout: post
lang: de
locale: de_DE
ref: what-99-percent-accuracy-taught-me
date: 2026-10-26
permalink: /de/blog/2026/what-99-percent-accuracy-taught-me/
title: "Was mich 99,65 % Genauigkeit über KI-Sicherheit gelehrt haben"
description: Der Detektor aus meiner Masterarbeit unterschied KI-generierte von menschlichen Texten mit 99,65 % Genauigkeit. Warum diese Zahl der Anfang der Sicherheitsfrage ist und nicht die Antwort.
tags: [KI-Sicherheit, KI-generierte Texte, Erkennung, Adversarial ML]
---

Vor ein paar Jahren habe ich durch einen Online-Betrug Geld verloren. Später hat ein Ransomware-Angriff meine Dateien gesperrt. Keiner der beiden Angriffe war besonders raffiniert, aber beide haben funktioniert, und beide haben mich mit derselben Frage zurückgelassen: Wie stoppt man etwas, das normal aussieht, bis es zu spät ist?

Diese Frage hat mich in meinen Master in Künstlicher Intelligenz begleitet. Heute hat sie eine neue Wendung. Die Nachricht, die einen hereinlegt, muss nicht mehr von einem Menschen geschrieben sein. Ein Sprachmodell schreibt in Sekunden eine überzeugende Bankwarnung, ein gefälschtes Jobangebot oder einen herzzerreißenden Hilferuf, in sauberer Grammatik und ohne die Rechtschreibfehler, auf die wir alle achten sollten.

Für meine Masterarbeit wollte ich deshalb einen Detektor bauen: ein Modell, das einen Text liest und entscheidet, ob ein Mensch oder eine KI ihn geschrieben hat.

## Was ich gebaut habe

Ich habe vier Deep-Learning-Modelle auf einem ausgewogenen Datensatz mit etwa 500.000 Texten trainiert und verglichen, zur Hälfte von Menschen geschrieben, zur Hälfte von KI erzeugt:

- ein **LSTM**, das den Text Wort für Wort liest und sich dabei fortlaufend etwas merkt;
- ein **feinabgestimmtes BERT**, ein Transformer, der jedes Wort im Kontext der ganzen Passage betrachtet;
- **TF-IDF + BERT + LightGBM**, eine Mischung aus klassischer Wortstatistik, BERT-Merkmalen und einem Gradient-Boosting-Klassifikator;
- ein **hybrides BERT + LSTM**, bei dem BERT den Kontext versteht und ein LSTM darüber ihn als Sequenz liest.

Das hybride Modell gewann: **99,65 % Genauigkeit** und ein **F1-Score von 0,995**.

Ich war stolz auf diese Zahl und bin es noch. Aber je mehr ich darüber nachdachte, wo ein solcher Detektor tatsächlich eingesetzt würde, desto klarer wurde mir: Die Zahl ist der Punkt, an dem die Sicherheitsfrage beginnt, nicht der, an dem sie endet.

## Lektion 1: Genauigkeit hängt davon ab, wie die Welt aussieht

Mein Datensatz war ausgewogen: auf jeden KI-Text kam ein menschlicher Text. So trainiert und vergleicht man Modelle richtig. So sieht aber kein Posteingang aus.

Ein einfaches Gedankenexperiment: Stellen Sie sich 10.000 Nachrichten vor, von denen nur 100 KI-generiert sind, und nehmen wir an, der Detektor liegt bei beiden Textarten in 0,35 % der Fälle falsch:

- Er erkennt fast alle der 100 KI-Nachrichten;
- aber er markiert auch etwa 35 der 9.900 menschlichen Nachrichten fälschlich.

Von rund 135 markierten Nachrichten stammt also etwa ein Viertel von echten Menschen, denen vorgeworfen wird, Maschinen zu sein. Das Modell hat sich überhaupt nicht verändert, nur die Welt, in der es arbeitet.

In der Sicherheit nennt man das das **Basisratenproblem**, und es ist der Grund, warum SOC-Analysten in Fehlalarmen untergehen. Ein Detektor ist nur so nützlich wie seine Falsch-Positiv-Rate in dem Maßstab, in dem er läuft.

## Lektion 2: Angreifer lesen dieselben Artikel wie wir

Ein Spamfilter oder Virenscanner hat keinen festen Gegner. Er hat es mit jemandem zu tun, der sich anpasst. Bei der Erkennung von KI-Texten ist das nicht anders. Einen Text umformulieren, menschliches und maschinelles Schreiben mischen oder auf ein neueres Modell wechseln: All das sind Wege, an einem Detektor vorbeizukommen, der mit den Daten von gestern trainiert wurde.

Ein hoher Wert auf einem Testdatensatz zeigt, wie gut ein Modell mit den Angriffen umgeht, die es schon kennt. Über die unbekannten sagt er viel weniger. Das ist das Feld des **Adversarial Machine Learning**, und es ist der Hauptgrund, warum ich als Nächstes in der KI-Sicherheit selbst arbeiten möchte. Einen Detektor zu bauen ist die eine Hälfte der Arbeit. Ihn standhalten zu lassen, wenn jemand aktiv versucht, ihn zu überlisten, ist die andere.

## Lektion 3: Sprache ist eine Sicherheitslücke

Die meisten öffentlichen Datensätze und Erkennungswerkzeuge sind für Englisch gebaut. Die Betrugsnachrichten, die Menschen in Pakistan erhalten, sind oft nicht auf Englisch. Sie kommen auf Urdu oder auf Roman Urdu, also Urdu in lateinischen Buchstaben, mit eigenen Schreibweisen und eigenem Slang.

Ein Detektor, der nie „aap ka account block ho gaya hai“ („Ihr Konto wurde gesperrt“) gesehen hat, schützt die Menschen nicht, die genau diese Nachricht bekommen. Deshalb ist mein aktuelles Projekt ein Betrugs- und Phishing-Detektor für **Englisch, Urdu und Roman Urdu**. Die Angreifer sprechen diese Sprachen bereits, also muss unsere Verteidigung es auch tun.

## Lektion 4: Ein Detektor sollte ein Signal geben, kein Urteil

Fügt man die ersten drei Lektionen zusammen, sticht eine Schlussfolgerung heraus. Ein Modell wie meines sollte nicht der Richter sein. Es sollte ein Signal unter mehreren sein, neben dem Absender der Nachricht, dem Ziel des Links und der Frage, ob die Bitte überhaupt Sinn ergibt. Die endgültige Entscheidung über alles Wichtige sollte bei einem Menschen bleiben.

Das klingt weniger aufregend als „KI-Detektor mit 99,65 % Genauigkeit“, aber so funktioniert gute Sicherheit: in Schichten, nicht mit Wunderwaffen.

## Wie es weitergeht

Meine Masterarbeit hat mich gelehrt, Modelle zu bauen, die Echtes von Gefälschtem trennen. Sie hat mir aber auch gezeigt, wie viel noch offen ist: Detektoren, die mit realen Basisraten zurechtkommen, die anpassungsfähigen Angreifern standhalten und die in den Sprachen funktionieren, die Menschen tatsächlich verwenden.

Das ist die Arbeit, die ich als Nächstes machen möchte, in der Forschung und im Security Operations Center. Wenn Sie an ähnlichen Fragen arbeiten, freue ich mich, von Ihnen zu hören. Sie erreichen mich über das [Kontaktformular](/de/#contact).

*Ein Artikel auf Grundlage meiner Masterarbeit ist in Vorbereitung. Ich teile ihn hier, sobald er erschienen ist.*
