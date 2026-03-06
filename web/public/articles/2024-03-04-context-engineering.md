---
title: "AI Agent 有效上下文工程：从 Prompt 到 Context 的进化"
date: "2024-03-04"
category: "Engineering"
tags: ["Context Engineering", "Agents", "MCP", "LLM", "Memory"]
summary: "Anthropic 提出“上下文工程”概念：随着 Agent 任务复杂度提升，单纯的 Prompt Engineering 已不足够，必须将 Context 视为有限的稀缺资源，通过 JIT 检索、压缩（Compaction）、结构化笔记和子智能体架构来优化模型表现。"
url: "https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents"
original_title: "Effective context engineering for AI agents"
---

![Context Engineering Hero Image](https://www-cdn.anthropic.com/images/4zrzovbb/website/8e90753880404313886742508823136280424683-2400x1200.png)

### 文章主旨

这篇文章标志着 AI 工程从 **Prompt Engineering（提示词工程）** 向 **Context Engineering（上下文工程）** 的转变。

核心观点是：**上下文（Context）是有限且昂贵的资源**。随着模型上下文窗口变大，"Context Rot"（上下文腐烂）现象依然存在——即干扰增多导致注意力分散。因此，构建高效 Agent 的关键不再仅仅是写好 Prompt，而是**精心策划（Curate）每一轮进入模型上下文的信息**，确保以最小的 Token 消耗提供最高的信号密度。

---

### 核心结论

1.  **Prompt Engineering vs Context Engineering**
    *   **Prompt Engineering** 关注如何编写指令（主要是 System Prompt）。
    *   **Context Engineering** 关注管理整个上下文状态（包括 System Instructions, Tools, MCP, External Data, Message History）。对于多轮对话和长时程任务，后者至关重要。

2.  **Context 是稀缺资源 (Attention Budget)**
    *   Transformer 架构决定了 Token 之间是 $n^2$ 的关注关系。
    *   即便是长窗口模型，填满无关信息也会导致“大海捞针”能力下降。
    *   原则：寻找**最小的高信号 Token 集合**来最大化达成目标的概率。

3.  **动态上下文策略 (Just-in-Time Retrieval)**
    *   **Anti-Pattern**：一次性把所有文件/数据扔进 Context。
    *   **Best Practice**：让 Agent 持有“引用”（文件路径、链接），仅在需要时通过工具（如 `grep`, `read_file`）动态加载数据。
    *   这模拟了人类的工作方式：我们不会背诵整个图书馆，而是通过索引去查找。

4.  **长时程任务的三大支柱**
    *   **压缩 (Compaction)**：当 Context 快满时，让模型总结当前状态，丢弃冗余的工具输出，开启新的 Context 窗口。
    *   **结构化笔记 (Structured Note-taking)**：Agent 将关键信息写入外部文件（如 `NOTES.md`），作为“外部记忆”持久化保存，不受 Context 窗口限制。
    *   **子智能体 (Sub-agents)**：主 Agent 负责规划，将具体任务分发给拥有干净 Context 的子 Agent，子 Agent 执行完仅返回摘要。

5.  **工具设计原则**
    *   工具应具备**Token 效率**（返回结果要精简）。
    *   工具功能不应重叠。**判据**：如果人类工程师无法断定该用哪个工具，Agent 也做不到。

---

### 详细内容译文

#### 1. 为什么需要上下文工程

随着 AI 应用从简单的单次对话转向复杂的 Agent 任务，我们发现 LLM 和人类一样，面对过多信息会“分心”。研究表明，随着 Context 长度增加，模型准确检索信息的能力会下降（Context Rot）。

Context Engineering 的目标是管理这个有限的“注意力预算”。即使模型支持 200k+ Context，盲目填充也会导致性能下降和成本飙升。

#### 2. 有效上下文的解剖

**System Prompts（系统提示词）**：
*   应处于“Goldilocks Zone”（适中区域）：既不要硬编码复杂的 if-else 逻辑（太脆弱），也不要过于笼统（太模糊）。
*   建议使用 XML 标签（如 `<instructions>`, `<tools>`）来结构化 Prompt。

**Tools（工具）**：
*   工具定义了 Agent 的能力边界。
*   最常见的失败模式是**工具集臃肿**。应精简工具数量，确保每个工具用途单一且明确。
*   **Few-shot Examples**：提供一组高质量的、典型的示例，比写一堆复杂的规则更有效。

#### 3. 运行时动态检索 (Runtime Context Retrieval)

传统的 RAG（检索增强生成）通常在推理前检索。而 Agentic 模式下，更推崇 **Just-in-Time (JIT)** 策略。

*   **引用而非全量**：Agent 应该看到文件列表（`ls` 的结果），而不是所有文件的内容。
*   **渐进式披露 (Progressive Disclosure)**：Agent 通过文件名、大小、时间戳判断相关性，然后自主决定读取哪些文件。
*   **Claude Code 案例**：Claude Code 不会把所有代码加载进内存，而是利用 `ls`, `grep` 等工具在文件系统中“游走”，只读取真正需要的代码片段。

#### 4. 长时程任务 (Long-Horizon Tasks)

对于持续数十分钟甚至数小时的任务（如大规模代码重构），单次 Context 窗口肯定不够用。解决方案包括：

*   **Compaction（压缩）**：
    *   保留：架构决策、未解决的 Bug、关键实现细节。
    *   丢弃：冗余的工具输出、过时的尝试。
    *   最简单的压缩：清除历史中的 Tool Results（工具返回的冗长数据），只保留 Agent 的思考和最终结论。

*   **Structured Note-taking（结构化笔记/外部记忆）**：
    *   Agent 像人类一样记笔记。
    *   例如：维护一个 `TODO.md` 或 `MEMORY.json`。
    *   即便 Context 重置，Agent 只要读一下笔记就能“恢复记忆”。
    *   **案例**：Claude 玩 Pokemon 游戏时，会自己记录“我在 1号路练级了 1234 步，皮卡丘升了 8 级”，从而在长达数小时的游戏中保持连贯。

*   **Sub-agent Architectures（子智能体架构）**：
    *   主 Agent 负责 High-level plan。
    *   子 Agent 负责具体执行（比如“搜索相关论文”），子 Agent 可以消耗大量 Token 进行探索，但最后只向主 Agent 汇报 1000 Token 的总结。
    *   这实现了“关注点分离”。

### 总结

Context Engineering 是一种思维方式的转变：从“如何写好一句话”转变为“如何设计一个信息流”。

随着模型变得更聪明（如 Sonnet 4.5），它们需要的微观管理会减少，但**Context 依然是稀缺资源**。无论模型多强，提供**最精简、最高信号**的上下文，永远是提升 Agent 可靠性的最佳手段。
