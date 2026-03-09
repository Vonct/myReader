---
title: "从 Codex 看上下文工程 (Context Engineering)"
date: "2024-06-01"
category: "AI Engineering"
tags: ["Context Engineering", "Codex", "Copilot", "LLM", "DevTools"]
summary: "本文深入探讨了 OpenAI Codex（GitHub Copilot 背后的模型）如何处理上下文。面对有限的 Token 窗口，如何从海量代码库中提取最相关的片段？文章介绍了 Jaccard 相似度、FIM（中间填充）训练目标以及基于 IDE 状态（如打开的标签页）的启发式策略。"
url: "https://keli-wen.github.io/One-Poem-Suffices/thinking-in-context/context-engineering-from-codex/"
original_title: "Thinking in Context: Context Engineering from Codex"
---

> **注意**：由于原始链接无法直接访问，本文基于 OpenAI Codex 的技术原理及上下文工程的行业最佳实践整理而成，旨在还原原作者 Keli Wen 可能探讨的核心技术点。

### 1. 引言：代码生成的“大海捞针”

当我们在 IDE 中写代码时，往往认为 AI “读懂”了整个项目。但实际上，底层模型（如 Codex）的上下文窗口（Context Window）是有限的（早期仅 4k-8k tokens）。

**Context Engineering (上下文工程)** 的核心挑战在于：**如何将 GB 级别的代码库压缩进几千个 Token 的窗口中，同时保留解决当前问题所需的最关键信息？**

### 2. Codex 的上下文策略

根据 OpenAI 和 GitHub Copilot 的公开技术细节，有效的上下文构建通常包含以下几个层级：

#### A. 邻近性原则 (Proximity)
*   **光标上下文**：光标前后的代码（Pre-cursor & Post-cursor）是权重最高的。
*   **FIM (Fill-In-The-Middle)**：Codex 不仅仅是“续写”，它经过了 FIM 训练，能够根据“上文”和“下文”来填补中间的空缺。这使得它在插入代码（而不仅仅是追加代码）时表现优异。

#### B. 启发式检索 (Heuristics)
*   **打开的标签页 (Open Tabs)**：开发者通常会打开相关的文件的标签页。Copilot 会优先读取这些文件的内容作为上下文。这是一个简单但极其有效的启发式策略。
*   **最近访问 (Recently Accessed)**：最近编辑过的文件往往与当前任务相关。

#### C. 基于相似度的检索 (Similarity-based Retrieval)
*   **Jaccard 相似度**：计算当前文件与库中其他文件的重叠词汇（标识符、类名）。
*   **Embeddings (向量检索)**：虽然更先进，但在早期的 Copilot 客户端中，为了低延迟，轻量级的 Jaccard 相似度往往比重量级的向量计算更受青睐。

#### D. 依赖图 (Dependency Graph)
*   通过静态分析（Static Analysis）解析 `import` 语句，找到定义的跳转位置（Go-to-definition），将相关接口的定义片段抓取进来。

### 3. 上下文工程的演进

从 Codex 的实践中，我们可以总结出 AI 辅助编程的进化路径：

1.  **Prompt Engineering**: 优化指令（"You are an expert python programmer..."）。
2.  **RAG (Retrieval-Augmented Generation)**: 简单的向量搜索。
3.  **Context Engineering**: 结合领域知识（如编程语言的 AST、IDE 的用户行为数据）来动态、智能地组装上下文。

### 4. 总结

Codex 的成功不仅仅源于模型参数的巨大，更源于精细的上下文工程。它证明了在有限的算力及窗口下，通过理解用户行为（User Behavior）和代码结构（Code Structure），可以极大地提升 AI 的“感知”范围，使其表现得仿佛拥有无限记忆。
