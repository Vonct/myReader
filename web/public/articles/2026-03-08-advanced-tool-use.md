---
title: "高级工具使用：让 AI Agent 在海量工具中高效协作"
date: "2026-03-08"
category: "Engineering"
tags: ["Anthropic", "Tool Use", "MCP", "Agent", "Engineering"]
summary: "文章提出 Tool Search Tool、Programmatic Tool Calling、Tool Use Examples 三项能力，用于降低上下文开销并提升工具选择与参数调用准确率。"
url: "https://www.anthropic.com/engineering/advanced-tool-use"
original_title: "Introducing advanced tool use on the Claude Developer Platform"
---

### 文章主旨

这篇文章讨论了一个现实问题：当 Agent 需要连接几十到上千个工具时，传统“把全部工具定义一次性塞进上下文 + 逐次自然语言调用工具”的方式，会快速触发上下文拥塞、调用延迟、选错工具和参数错误。  
Anthropic 给出的方案是三件事协同：**Tool Search Tool（按需发现工具）**、**Programmatic Tool Calling（在代码执行环境里编排调用）**、**Tool Use Examples（用示例补齐 schema 无法表达的用法约定）**。

![Illustration for advanced tool use article.](/articles/assets/advanced-tool-use/151600be7f9c23247aad8dcb6aacb2e1ab024f44-1000x1000.svg)

---

### 核心内容（忠实译述）

#### 1) 为什么传统工具调用在规模化后会失效

- 多 MCP Server 场景下，工具定义本身会先占掉大量 token。文中示例里，GitHub、Slack、Sentry、Grafana、Splunk 共 58 个工具，约消耗 55K tokens；再叠加 Jira 等服务，可能很快到 100K+。  
- 问题不仅是 token 成本：工具越多，越容易“选错工具”或“参数填错”，尤其在名称相近时（如 `notification-send-user` vs `notification-send-channel`）。  
- 逐工具自然语言调用还会让中间结果不断进入上下文，产生“上下文污染”，并造成多轮推理往返。

#### 2) Tool Search Tool：只加载当前任务需要的工具

- 思路是将工具标记为 `defer_loading: true`，默认不放入上下文；模型先通过搜索工具发现需要的候选，再把匹配工具定义按需展开。  
- 文中对比显示：从“预先加载全部工具定义”切换到“按需搜索加载”，可显著降低初始上下文占用（示例中总上下文消耗从约 77K 降至约 8.7K），并减少无关定义噪声。  
- 对于 MCP，可按 server 级别延迟加载，再把少数高频工具保持常驻，形成“高频常驻 + 长尾按需”。

![Tool Search Tool diagram](/articles/assets/advanced-tool-use/advanced-tool-use-src-02_-4782062195150026285.webp)

#### 3) Programmatic Tool Calling：把编排逻辑放到代码里执行

- 传统方式下，每次工具调用都要一次完整推理，并把返回结果送回模型上下文。  
- 新方式下，模型先写一段 Python 编排代码（循环、并行、过滤、聚合、容错），代码在沙箱里调用工具；大部分中间结果留在执行环境，仅把最终摘要结果回传上下文。  
- 文中预算审计案例展示了并行拉取、按级别预算映射、汇总比对等流程，强调这类模式在大数据量和多步骤任务中能同时降低 token 与延迟，并减少人工“眼读结果”导致的错误。

![Programmatic tool calling flow](/articles/assets/advanced-tool-use/advanced-tool-use-src-03_-4092394291889459726.webp)

#### 4) Tool Use Examples：用示例表达“怎么正确调用”

- JSON Schema 只能约束结构合法，无法说明“什么时候该传哪些可选参数”“字段之间如何联动”“业务约定格式是什么”。  
- 通过 `input_examples` 提供 1-5 组高质量样例，可把日期格式、ID 命名规范、嵌套对象填充策略、优先级与升级策略等经验显式教给模型。  
- 文章给出的结论是：复杂参数工具中，示例能显著降低调用偏差。

#### 5) 落地建议：按瓶颈分层启用，而不是一次全开

- 如果首要问题是工具定义太大：先上 Tool Search Tool。  
- 如果首要问题是中间数据太多、多步流程慢：先上 Programmatic Tool Calling。  
- 如果首要问题是参数易错：先补 Tool Use Examples。  
- 三者可逐步叠加：先解决主瓶颈，再在下一层补足准确率或效率短板。

---

### 关键术语

- Tool Search Tool
- Programmatic Tool Calling（PTC）
- Tool Use Examples（input_examples）
- defer_loading
- allowed_callers
- context pollution（上下文污染）

---

### 对 myReader 工作流的可执行启发

#### A. 抓取阶段采用“分层策略”

- 优先使用正文抽取能力获取主内容，并在必要时增加关键词聚焦。  
- 当页面结构复杂或文章很长时，升级到浏览器渲染抓取或站点级结构化抓取。  
- 抓取失败时降级到通用网页抓取，并标注“降级抓取”来源。

#### B. 编排阶段采用“代码执行优先”

- 对多 URL、分段抓取、图片链接清洗等步骤，优先用脚本并行处理。  
- 仅将最终可读内容（中文译文、要点、元数据）写入文档，避免把海量原始片段都塞进上下文。

#### C. 工具调用要附带示例约束

- 对网页阅读 skill 中的关键参数（分类、标签、slug、frontmatter）给出正反例，降低归档格式漂移。

---

### 中文总结（3-5 点）

- 文章核心是把“工具规模化”问题拆成三个层面：发现、执行、调用规范，并分别给出机制化方案。  
- Tool Search Tool 通过按需加载减少定义噪声，能明显释放上下文预算。  
- Programmatic Tool Calling 把多步工具编排前移到代码执行层，减少中间结果污染与多轮推理开销。  
- Tool Use Examples 用真实样例补齐 schema 的语义空白，提升复杂参数调用稳定性。  
- 对 myReader 来说，最直接的升级路径是“主抓取优先 + 失败降级 + 脚本化后处理 + 归档格式示例化”。
