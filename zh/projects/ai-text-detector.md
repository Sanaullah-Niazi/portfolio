---
layout: project
lang: zh
locale: zh_CN
ref: ai-text-detector
permalink: /zh/projects/ai-text-detector/
title: "区分 AI 生成文本与人类写作"
summary: 我的硕士论文项目。用深度学习模型区分 AI 生成的文本和人类写的文本，在一个约含 50 万个样本的平衡数据集上训练和比较。
description: "我的硕士论文项目。用深度学习模型区分 AI 生成的文本和人类写的文本，在一个约含 50 万个样本的平衡数据集上训练和比较。"
---

## 问题
如今的大语言模型写出的文字，已经很难和人类写的区分开。这让诈骗、传播虚假信息和教育作弊变得更容易，所以我们需要可靠的方法来识别这类文本。

## 方法
我在一个约含 50 万条文本的平衡数据集上构建并比较了四种模型：

- LSTM
- 微调后的 BERT
- TF-IDF + BERT + LightGBM
- 混合 BERT + LSTM

这是我在巴哈瓦尔布尔伊斯兰大学完成的硕士论文，导师是 Najia Saher 教授。

## 结果
混合 BERT + LSTM 模型表现最好，**准确率 99.65%**，**F1 分数 0.995**。基于这篇论文的期刊文章正在准备中。
