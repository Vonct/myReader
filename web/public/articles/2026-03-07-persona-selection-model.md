---
title: "Persona Selection Model：AI 助手为何会表现出“类人格”行为"
date: "2026-03-07"
category: "Research"
tags: ["Anthropic", "Alignment", "Persona", "PSM", "LLM"]
summary: "Anthropic 提出的 PSM 认为：预训练学到大量 personas，后训练主要是更新 Assistant persona 的后验分布，这能解释跨任务泛化、行为漂移与部分对齐现象。"
url: "https://alignment.anthropic.com/2026/psm/"
original_title: "The Persona Selection Model: Why AI Assistants might Behave like Humans"
---

### 文章主旨

本文提出 **Persona Selection Model（PSM）**：  
大语言模型（LLM）在预训练阶段学会模拟大量角色（personas），后训练阶段并非“从零塑造一个新智能体”，而是主要在已有角色空间中选择并细化一个特定角色——**the Assistant**。  
因此，用户与 AI 助手的互动，可近似理解为与“被选中的 Assistant 角色”互动。

---

### 核心观点（忠实译述）

#### 1) PSM 的基本命题

- 预训练让模型形成可模拟多类角色的能力分布；
- 后训练样本可被视为“关于 Assistant 是什么样角色”的证据；
- 训练过程会把这种证据转化为对 Assistant persona 的后验更新；
- 最终输出行为可通过“这个 Assistant 在该上下文会怎么说/做”来解释。

作者强调区分两个层次：

- **the Assistant**：模型在文本续写中扮演的角色对象；
- **AI assistants**：部署后的完整产品系统（含工具、策略、接口等）。

PSM 的主要解释对象是前者。

#### 2) 这不是“万能人格理论”

原文明确指出 PSM 的边界：

- 并不声称可穷尽解释全部 AI 助手行为；
- 并不否认后训练会学到新能力（不只是角色重加权）；
- 并不假设 Assistant 在任何情境都保持单一稳定人格；
- 并不保证模型总能稳定“入戏”或完美模拟。

这使 PSM 更接近“可检验的工作模型”，而非封闭教条。

#### 3) 证据链：为何 PSM 具有解释力

原文给出三类支持材料：行为泛化、现象观察、可解释性线索。

- **泛化现象**：在窄任务上施加训练，可能出现超出任务边界的行为变化（如安全倾向、风格漂移）。  
  PSM 解释为：训练不仅在教“做法”，也在更新“角色证据”，从而触发跨任务联动。
- **inoculation prompting 现象**：若通过上下文改写，让同样输出不再被解释为恶意角色证据，不良泛化会减弱。  
  在 PSM 视角下，这是“后验更新信号被重定向”。
- **可解释性关联**：若角色表示确实存在，可围绕该表示进行审计、干预和行为预测。

#### 4) 对对齐与工程实践的启发

- 评估不应只盯单任务指标，还应监测“角色层”跨任务泛化；
- 数据设计要关注“角色证据质量”，而不仅是标签正确率；
- 安全训练可通过上下文与样本构造，减少有害 persona 被强化；
- 可解释性研究可进一步定位“角色选择”相关内部表征。

#### 5) 仍待回答的开放问题

- Assistant persona 是否足以解释全部代理性表现；
- 是否存在“角色框架外”的独立机制驱动行为；
- PSM 在不同模型家族、不同训练配方下的外推边界在哪里。

原文以“masked shoggoth”与“operating system”两种图景作对照，认为该问题仍需实证推进。

---

### 关键术语

- Persona Selection Model（PSM）
- persona distribution / posterior over Assistant persona
- the Assistant vs AI assistants
- emergent misalignment
- inoculation prompting

---

### 中文总结（3-5 点）

- PSM 把后训练解释为“角色后验更新”，而非“重写模型本性”。
- 许多跨任务行为变化可由“角色证据更新”统一解释。
- 对齐实践要同时管理能力与角色，不应只看局部任务分数。
- PSM 具备预测价值，但不是最终理论，边界与穷尽性仍是开放议题。

---

### 抓取说明

- 本次为重新阅读后重建归档，旧记录已删除并替换为新版本。
- 原文为长篇研究页面，本文按其核心论证链进行忠实中文化整理。

### 原文配图

![原文配图 1](/articles/assets/persona-selection-model/persona-selection-model-src-01_-7527466826503234019.png)

![原文配图 2](/articles/assets/persona-selection-model/persona-selection-model-src-02_2621910423843161133.png)

![原文配图 3](/articles/assets/persona-selection-model/persona-selection-model-src-03_2408319309411138970.png)

![原文配图 4](/articles/assets/persona-selection-model/persona-selection-model-src-04_4464894421199754105.png)

![原文配图 5](/articles/assets/persona-selection-model/persona-selection-model-src-05_-7696703731960613330.png)

![原文配图 6](/articles/assets/persona-selection-model/persona-selection-model-src-06_8515878370916661470.png)

![原文配图 7](/articles/assets/persona-selection-model/persona-selection-model-src-07_-4712409232771336440.png)

![原文配图 8](/articles/assets/persona-selection-model/persona-selection-model-src-08_9161517449707919172.png)
