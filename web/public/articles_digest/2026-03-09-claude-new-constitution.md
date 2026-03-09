---
title: "Claude 新宪章：Anthropic 如何定义模型价值观与行为边界"
date: "2026-03-09"
category: "AI"
tags: ["Anthropic", "Claude", "Constitutional AI", "Alignment", "Safety"]
summary: "Anthropic 发布新版 Claude 宪章，并将其作为训练核心工件，强调“安全、伦理、合规、有帮助”四层优先级与透明治理。"
url: "https://www.anthropic.com/news/claude-new-constitution"
original_title: "Claude's new constitution"
---

### 文章主旨

![Claude's new constitution](/articles/assets/claude-new-constitution/e69f9d8245799a0c2688d72e997f708475233d6b-1000x1000.svg)


Anthropic 发布了新版 Claude 宪章（constitution），并明确这不是一份“对外营销文案”，而是一份直接用于训练的核心文档。  
它不仅定义 Claude 应该遵循的价值目标，还解释“为什么要这样做”，以提升模型在新场景中的泛化判断能力，而非机械执行规则。

---

### 核心内容（忠实译述）

#### 1) 宪章是训练中的“最高层意图”

- Anthropic 将宪章视为 Claude 行为与价值的最终权威：其他训练或指令应与其“文字和精神”一致。  
- 宪章不仅参与规则约束，还参与合成训练数据生成，包括：相关对话、价值一致响应、候选响应排序等。  
- 该文档以 CC0 公开发布，强调外部可审视性与可复用性。

#### 2) 从“原则清单”转向“可解释意图”

- 旧版更像离散原则列表；新版更强调解释“为何如此”。  
- Anthropic 认为，要让模型在陌生情境中做出好判断，必须理解价值背后的动机，而不仅是记住规则。  
- 仍保留部分高风险“硬约束（hard constraints）”，但不把整份宪章当作僵硬法律条文。

#### 3) 四层目标优先级

文中给出当前主线模型期望的四个目标，并按冲突时的优先顺序排序：

1. **Broadly safe（广义安全）**：不破坏人类对 AI 的监督与纠偏能力；  
2. **Broadly ethical（广义伦理）**：诚实、审慎、避免不当伤害；  
3. **Compliant with guidelines（遵循 Anthropic 指南）**：在具体场景遵循补充规范；  
4. **Genuinely helpful（真实有帮助）**：实质帮助开发者与终端用户。

#### 4) 五个主要章节的治理逻辑

- **Helpfulness**：强调“真正有用”，并讨论在平台方、集成方、终端用户之间如何权衡。  
- **Anthropic’s guidelines**：对医疗、网络安全、越狱、工具使用等领域提供更细规则。  
- **Claude’s ethics**：强调诚实与避免伤害的细致权衡，同时给出不可触碰的硬约束。  
- **Being broadly safe**：在当前阶段把“可监督、可纠偏”放在非常高优先级。  
- **Claude’s nature**：讨论模型身份、潜在道德地位与心理安全等长期议题。

#### 5) 宪章是“活文档”，而不是终稿

- Anthropic 明确承认：训练目标与实际行为之间仍可能有偏差。  
- 未来会继续更新宪章、公开评估材料，并吸收法律、哲学、神学、心理学等跨学科反馈。  
- 随着模型能力上升，类似宪章文档的重要性会持续上升。

---

### 关键术语

- Constitution（宪章）
- Constitutional AI
- hard constraints（硬约束）
- broadly safe / broadly ethical
- transparency（透明性）

---

### 中文总结（3-5 点）

- Anthropic 把“价值观文档”从原则罗列升级为可解释、可训练、可审视的核心治理工件。  
- 新宪章最关键变化是强调“解释原因”，以提升模型跨场景判断能力。  
- 在目标冲突时，优先级是安全 > 伦理 > 合规 > 有帮助。  
- 宪章公开与持续更新，体现了将模型行为治理置于长期、可反馈框架中的思路。  
- 这为“如何把对齐目标转成可执行训练信号”提供了相对完整的工程化范式。

---

### 抓取说明

- 本次已实际使用 Tavily 抓取该 URL，调用方式为 `TavilyClient().extract(..., extract_depth="advanced")`。  
- 抓取成功，返回 1 个结果，正文文本长度约 13,301 字符。  
- 当前归档正文为 Tavily 抓取结果整理版，配图由本地图片脚本补齐。
