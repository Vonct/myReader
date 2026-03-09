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

这篇文章聚焦一个越来越现实的问题：**当 AI Agent 要接入几十到上千个工具时，传统工具调用范式会同时在“上下文预算、执行效率、调用准确率”三个维度失灵。**  
Anthropic 给出的升级路径不是单点优化，而是三项能力的组合：**Tool Search Tool（按需发现工具）**、**Programmatic Tool Calling（把工具编排下沉到代码执行层）**、**Tool Use Examples（用高质量示例教会模型正确调用）**。  
它们分别解决“工具太多放不下”“中间结果污染上下文”“schema 合法但调用仍然不对”三类瓶颈。

![Illustration for advanced tool use article.](/articles/assets/advanced-tool-use/151600be7f9c23247aad8dcb6aacb2e1ab024f44-1000x1000.svg)

---

### 核心内容（精读）

#### 1) 为什么传统工具调用在规模化后会失效

- 在 MCP 多 server 场景里，**工具定义本身就可能先把上下文吃掉**。文中示例给出：GitHub 35 个工具、Slack 11 个、Sentry 5 个、Grafana 5 个、Splunk 2 个，总计 58 个工具，启动前就要消耗约 **55K tokens**；如果再加上 Jira 之类服务，开销会快速逼近 **100K+**。Anthropic 还提到，他们在内部见过工具定义在优化前直接占掉 **134K tokens**。  
- 问题不只是“贵”，而是会引发**正确性下降**：工具名称越相似、参数越复杂，模型越容易选错工具或传错参数，例如 `notification-send-user` 和 `notification-send-channel`。  
- 传统逐轮自然语言工具调用还会让每一步返回结果都进入上下文，带来明显的 **context pollution（上下文污染）**，并叠加多轮推理往返的时延。

#### 2) Tool Search Tool：只加载当前任务需要的工具

- Tool Search Tool 的核心思想是：**不要预加载所有工具，而是先让模型搜索，再按需展开定义。** 具体做法是把工具标记为 `defer_loading: true`，这样它们一开始不会进入 Claude 的上下文。Claude 先看到的是搜索工具本身，以及少量 `defer_loading: false` 的高频关键工具。  
- 当 Claude 判断当前任务需要某类能力时，它先搜工具，再把返回的候选定义展开到上下文中。这样就从“把整座工具仓库搬进上下文”变成“像检索系统一样按需取用”。  
- 文中给出的对比很关键：传统方式在工作开始前总上下文消耗约 **77K**，改成 Tool Search Tool 之后降到约 **8.7K**；只预先加载搜索工具自身约 **500 tokens**，再按需加载 3-5 个相关工具约 **3K tokens**，相当于保留了 **95% 上下文窗口**。  
- 文章还给出内部结果：在大型 MCP 工具库评测中，Opus 4 从 **49% 提升到 74%**，Opus 4.5 从 **79.5% 提升到 88.1%**。这说明 Tool Search Tool 不只是“省 token”，还改善了在大工具库条件下的调用准确率。  
- 实践上，Anthropic 建议对 MCP server 也可以做“**整库 defer + 高频工具常驻**”的混合配置。

![Tool Search Tool diagram](/articles/assets/advanced-tool-use/advanced-tool-use-src-02_-4782062195150026285.webp)

#### 3) Programmatic Tool Calling：把编排逻辑放到代码里执行

- Programmatic Tool Calling（PTC）解决的是第二类问题：**就算找对了工具，若每次都靠自然语言一轮轮调用，中间结果也会不断挤占上下文，而且每一步都要再做一次模型推理。**  
- Anthropic 的方案是让 Claude 先写一段 Python 编排代码，再在 Code Execution 沙箱里执行。循环、并行、过滤、聚合、容错都在代码中显式完成，只有最终结果进入 Claude 上下文。  
- 文章给出的“Q3 差旅预算超支检查”案例很典型：先取部门成员、并行拉取不同级别预算、再并行拉取每个人的费用项，最后在代码里求和、比较和生成超支名单。这样 **2000+ 条费用明细** 不再进入模型上下文，Claude 最终只需要看到“谁超支了、超了多少”这类结果。  
- 文中的量化收益很直接：复杂研究任务平均 token 使用量从 **43,588 降到 27,297**，约减少 **37%**；同时还减少大量 inference round-trip，延迟下降。准确率方面，内部知识检索从 **25.6% 提升到 28.5%**，GIA benchmark 从 **46.5% 提升到 51.2%**。  
- 更重要的是，它把“靠模型临场读结果再做判断”变成“靠代码显式表达控制流”，这在多步骤工作流里通常更稳。

![Programmatic tool calling flow](/articles/assets/advanced-tool-use/advanced-tool-use-src-03_-4092394291889459726.webp)

#### 4) Tool Use Examples：用示例表达“怎么正确调用”

- 第三类问题是：**JSON Schema 只能告诉模型“什么是合法输入”，却很难告诉它“什么是正确用法”。** 例如日期该写 `YYYY-MM-DD` 还是自然语言？`reporter.id` 是 UUID、纯数字还是 `USR-12345`？高优先级工单是否必须附带升级配置？  
- Tool Use Examples 的做法是在工具定义里加入 `input_examples`，用 1-5 组高质量例子把这些“模式性知识”教给模型。  
- 文章给出的 ticket API 示例很典型：通过三组例子，Claude 不仅学到日期格式、ID 命名规范，还学到“critical bug 需要完整联系信息和 escalation；feature request 可能只需要 reporter；内部任务甚至只要 title”。  
- Anthropic 内部测试显示，在复杂参数处理任务中，加入 Tool Use Examples 后准确率从 **72% 提升到 90%**。这说明 examples 在很多场景下比继续扩 schema 更值。

#### 5) 落地建议：按瓶颈分层启用，而不是一次全开

- Anthropic 的最佳实践不是“把三个能力一口气全开”，而是**从当前最痛的瓶颈入手**：  
	- 如果最大问题是工具定义过大、上下文被挤占：优先上 **Tool Search Tool**；  
	- 如果最大问题是中间结果太多、多步骤流程慢：优先上 **Programmatic Tool Calling**；  
	- 如果最大问题是参数经常填错、调用偏差大：优先补 **Tool Use Examples**。  
- 在此基础上，再逐层叠加其余能力。文章把三者关系概括得很清楚：**Tool Search Tool 负责找到对的工具，PTC 负责高效执行，Tool Use Examples 负责正确调用。**

#### 6) Getting started：这不是概念，而是可直接启用的 beta 功能

- 文章明确说明，这三项能力已在 Claude Developer Platform 以 beta 形式提供。启用方式是在请求里加上 beta header，例如：`advanced-tool-use-2025-11-20`。  
- 在工具列表里同时声明搜索工具、代码执行工具，以及带有 `defer_loading`、`allowed_callers`、`input_examples` 的业务工具，就可以直接开始实验。  
- 这意味着它们不是遥远的研究方向，而是面向开发者的可落地产品能力。

---

### 关键术语

- Tool Search Tool
- Programmatic Tool Calling（PTC）
- Tool Use Examples（input_examples）
- defer_loading
- allowed_callers
- context pollution（上下文污染）
- code_execution
- advanced-tool-use-2025-11-20

---

### 对 myReader 工作流的可执行启发

#### A. 抓取阶段采用“分层策略”

- 优先使用高质量正文抽取能力获取主内容，并在必要时增加关键词聚焦。  
- 当页面结构复杂、正文与导航混杂，或需要多张配图时，再升级到浏览器渲染抓取或站点级结构化抓取。  
- 抓取失败时降级到通用网页抓取，并把“降级抓取”显式写入文末说明，避免来源混淆。

#### B. 编排阶段采用“代码执行优先”

- 对多 URL、分段抓取、图片链接修复、frontmatter 规范化等步骤，优先用脚本并行处理。  
- 仅将最终可读内容（翻译版、精读版、元数据）写入文档，避免把大段原始抓取片段长期留在上下文里。

#### C. 工具调用要附带示例约束

- 对网页阅读 skill 中的关键参数（分类、标签、slug、frontmatter、双版本目录写入）给出正反例，降低归档格式漂移。

#### D. 双版本归档正好契合这篇文章的思路

- **翻译版**相当于把“最终结果”稳定落盘；**精读版**则承接结构化提炼与行动建议。  
- 两个版本分别写入不同目录，本质上就是把“原始抓取内容”和“面向阅读的结果”解耦，减少后续维护成本。

---

### 中文总结（3-5 点）

- Anthropic 把大规模工具调用问题拆成三类：**工具太多、结果太多、参数太模糊**，并分别用 Tool Search Tool、PTC、Tool Use Examples 解决。  
- Tool Search Tool 的关键价值不只是省 token，而是用“按需发现”同时提升大工具库下的调用准确率。  
- Programmatic Tool Calling 的本质是把编排逻辑显式写进代码，从而减少上下文污染、推理往返和人工比对错误。  
- Tool Use Examples 证明了：在复杂业务工具里，示例常常比单纯扩充 schema 更能提升正确率。  
- 对 myReader 来说，这篇文章最实用的启发是：**抓取与归档流程也应该按“发现、执行、约束”分层设计，并尽量把高噪声处理中间态留在脚本层。**

---

### 抓取说明

- 本文已基于原始页面 `https://www.anthropic.com/engineering/advanced-tool-use` 重新抓取并整理。  
- 本次重写补充了原文中的关键量化细节，包括 Tool Search Tool、Programmatic Tool Calling、Tool Use Examples 的具体收益区间与启用方式。  
- 配图继续复用本地已归档资源 3 张（主视觉 + 2 张流程图）。
