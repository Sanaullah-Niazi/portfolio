---
layout: project
lang: de
locale: de_DE
ref: ai-text-detector
permalink: /de/projects/ai-text-detector/
title: "KI-generierte Texte von menschlichem Schreiben unterscheiden"
summary: Mein Masterarbeitsprojekt. Deep-Learning-Modelle, die KI-generierte von menschlich verfassten Texten unterscheiden, trainiert und verglichen auf einem ausgewogenen Datensatz mit etwa 500.000 Beispielen.
---

## Problem
Große Sprachmodelle schreiben heute Texte, die kaum noch von menschlichem Schreiben zu unterscheiden sind. Das erleichtert Betrug, die Verbreitung von Falschinformationen und Täuschung in der Bildung. Deshalb brauchen wir zuverlässige Wege, solche Texte zu erkennen.

## Vorgehen
Ich habe vier Modelle auf einem ausgewogenen Datensatz mit etwa 500.000 Texten entwickelt und verglichen:

- LSTM
- Feinabgestimmtes BERT
- TF-IDF + BERT + LightGBM
- Hybrides BERT + LSTM

Die Arbeit war meine Masterarbeit an der Islamia University of Bahawalpur, betreut von Prof. Dr. Najia Saher.

## Ergebnisse
Das hybride BERT-+-LSTM-Modell schnitt am besten ab, mit **99,65 % Genauigkeit** und einem **F1-Score von 0,995**. Ein Artikel auf Grundlage der Arbeit ist in Vorbereitung.
