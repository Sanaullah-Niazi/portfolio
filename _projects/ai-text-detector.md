---
title: "Telling AI-generated text from human writing"
summary: My MS thesis project. Deep learning models that separate AI-generated from human-written text, trained and compared on a balanced dataset of about 500,000 samples.
status: Completed       # In progress  or  Completed
order: 2               # lower numbers show first
topics: [AI, Security] # used by the topic filter: AI, Security, Networks
icon: brain
tech: [Python, PyTorch, Hugging Face Transformers, BERT, LSTM, LightGBM, scikit-learn]
links:
  github: ""
  demo: ""
  paper: ""
  video: ""
demo_embed: ""
youtube_id: ""
---

## Problem
Large language models now write text that is hard to tell apart from human writing. That makes it easier to run scams, spread misinformation and cheat in education, so we need reliable ways to detect it.

## Approach
I built and compared four models on a balanced dataset of about 500,000 texts:

- LSTM
- Fine-tuned BERT
- TF-IDF + BERT + LightGBM
- Hybrid BERT + LSTM

The work was my MS thesis at The Islamia University of Bahawalpur, supervised by Prof. Dr. Najia Saher.

## Results
The hybrid BERT + LSTM model did best, with **99.65% accuracy** and an **F1-score of 0.995**. A paper based on the thesis is in preparation.
