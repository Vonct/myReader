---
title: "高级工具使用：让 AI Agent 在海量工具中高效协作"
date: "2026-03-08"
category: "Engineering"
tags: ["Anthropic", "Tool Use", "MCP", "Agent", "Engineering"]
summary: "Anthropic 发布三项高级工具能力：Tool Search Tool、Programmatic Tool Calling、Tool Use Examples，用于在大规模工具环境中降低上下文消耗并提升调用质量。"
url: "https://www.anthropic.com/engineering/advanced-tool-use"
original_title: "Introducing advanced tool use on the Claude Developer Platform"
---

### 译者说明

以下内容基于 Anthropic 原文页面重新抓取后整理，为**中文翻译版**。翻译目标是忠实覆盖原文核心有效信息，尽量保留原文结构与术语。

![Illustration for advanced tool use article.](/articles/assets/advanced-tool-use/151600be7f9c23247aad8dcb6aacb2e1ab024f44-1000x1000.svg)

---

### 原文信息

- 标题：Introducing advanced tool use on the Claude Developer Platform  
- 发布时间：Nov 24, 2025

---

### 正文翻译

Anthropic 为 Claude Developer Platform 新增了三项 beta 能力，让 Claude 可以**动态发现工具、从示例中学习工具用法，并在代码执行环境中完成工具调用**。本文解释它们的工作方式。

AI Agent 的未来，应当是模型能够在数百甚至数千个工具之间顺畅协作。比如，一个 IDE 助手可能同时集成 git 操作、文件处理、包管理、测试框架与部署流水线；一个运营协调助手可能需要同时连接 Slack、GitHub、Google Drive、Jira、公司数据库以及大量 MCP Server。

如果想要构建真正有效的 Agent，它们就不能靠“把所有工具定义都预先塞进上下文”来工作。Anthropic 之前关于 MCP 中代码执行的文章已经讨论过：在很多场景里，工具定义和工具结果在 Agent 读到用户请求之前，就可能先消耗掉 50,000+ tokens。理想的 Agent 应该能够按需发现并加载工具，只保留当前任务真正相关的部分。

Agent 还需要具备**从代码里调用工具**的能力。如果用自然语言逐次调用工具，每次调用都需要一次完整推理，中间结果也会不断堆积到上下文里，不管这些信息最终是否真的有用。代码天然适合表达编排逻辑，例如循环、条件判断和数据转换，因此 Agent 需要能够根据任务情况在“代码执行”和“模型推理”之间灵活选择。

此外，Agent 还需要从**示例**中学习如何正确调用工具，而不仅仅依赖 schema。JSON Schema 可以定义结构是否合法，但无法表达使用模式：什么时候该带某个可选字段、哪些字段组合才合理、某个 API 实际期望遵循什么命名和格式约定。

因此，Anthropic 发布了以下三项功能：

- **Tool Search Tool**：让 Claude 通过搜索访问成千上万个工具，而不必提前消耗上下文窗口；
- **Programmatic Tool Calling**：让 Claude 在代码执行环境里调用工具，减少对模型上下文窗口的影响；
- **Tool Use Examples**：提供一种通用标准，演示某个工具应如何被有效调用。

Anthropic 表示，在内部测试里，这些功能让他们构建出了用传统工具调用模式难以实现的东西。比如，Claude for Excel 就使用了 Programmatic Tool Calling，在不压垮模型上下文窗口的前提下读取和修改成千上万行电子表格数据。

---

## Tool Search Tool

### The challenge（挑战）

MCP 工具定义确实能给模型提供必要上下文，但一旦接入的 server 越来越多，这部分 token 开销就会迅速累积。文章举了一个五个 server 的例子：

- GitHub：35 个工具（约 26K tokens）
- Slack：11 个工具（约 21K tokens）
- Sentry：5 个工具（约 3K tokens）
- Grafana：5 个工具（约 3K tokens）
- Splunk：2 个工具（约 2K tokens）

这意味着总计 58 个工具、约 55K tokens，会在对话开始前就被消耗掉。如果再加入 Jira 这类 server（单独就约 17K tokens），很快就会逼近 100K+ 的额外开销。Anthropic 还提到，他们在实际工作中见过工具定义在优化前消耗 134K tokens 的情况。

而这还不只是 token 成本问题。最常见的失败模式其实是：**选错工具**或者**参数传错**，尤其是在工具名字相近的情况下，比如 `notification-send-user` 与 `notification-send-channel`。

### Our solution（方案）

与其一开始就把全部工具定义都加载进上下文，不如让 Tool Search Tool 在需要时再去发现工具。这样 Claude 只会看到当前任务真正需要的工具。

![Tool Search Tool diagram](/articles/assets/advanced-tool-use/advanced-tool-use-src-02_-4782062195150026285.webp)

Tool Search Tool 相比传统方式，可多保留 191,300 tokens 的上下文，而 Claude 的传统方法只能保留 122,800。文章给出的对比是：

**传统方式：**

- 所有工具定义预先加载（50+ MCP 工具约 72K tokens）
- 会话历史与 system prompt 需要和工具定义竞争剩余上下文空间
- 在真正开始工作前，总上下文消耗约 77K

**使用 Tool Search Tool：**

- 一开始只加载 Tool Search Tool 本身（约 500 tokens）
- 需要时再按需发现并加载工具（3-5 个相关工具约 3K tokens）
- 总上下文消耗约 8.7K，保留约 95% 的上下文窗口

这相当于在保留完整工具库访问能力的前提下，将 token 使用量降低约 85%。Anthropic 的内部测试还显示：在大型 MCP 工具库场景中，启用 Tool Search Tool 后，Opus 4 的准确率从 49% 提升到 74%，Opus 4.5 从 79.5% 提升到 88.1%。

### How the Tool Search Tool works（工作方式）

Tool Search Tool 允许 Claude 动态发现工具，而不是一开始就加载全部定义。开发者仍然需要把全部工具定义交给 API，但可以通过 `defer_loading: true` 把某些工具标记为“按需发现”。这些被延迟加载的工具不会在初始上下文中出现。Claude 最初只会看到 Tool Search Tool 本身，以及少量 `defer_loading: false` 的高频关键工具。

当 Claude 需要某类能力时，它会先搜索相关工具。Tool Search Tool 返回匹配工具的引用，这些工具随后才会被展开成完整定义并进入 Claude 的上下文。

例如，如果 Claude 要与 GitHub 交互，它会先搜索“github”，然后只加载 `github.createPullRequest` 和 `github.listIssues` 之类的匹配工具，而不是把 Slack、Jira、Google Drive 的其他 50+ 个工具一起放进上下文。

这使得 Claude 既能访问完整工具库，又只需要为当前任务实际用到的工具支付 token 成本。

文章还特别说明：Tool Search Tool 不会破坏 prompt caching。因为被 defer 的工具根本不会出现在初始 prompt 中，它们只有在 Claude 搜索后才会加入上下文，所以系统提示和核心工具定义仍然可缓存。

实现方式大致如下：

```json
{
  "tools": [
    {"type": "tool_search_tool_regex_20251119", "name": "tool_search_tool_regex"},
    {
      "name": "github.createPullRequest",
      "description": "Create a pull request",
      "input_schema": {"type": "object"},
      "defer_loading": true
    }
  ]
}
```

对于 MCP server，也可以整库延迟加载，只把极少数最常用的工具保留常驻：

```json
{
  "type": "mcp_toolset",
  "mcp_server_name": "google-drive",
  "default_config": {"defer_loading": true},
  "configs": {
    "search_files": {
      "defer_loading": false
    }
  }
}
```

Claude Developer Platform 默认提供了基于 regex 和 BM25 的搜索工具，开发者也可以用 embedding 或其他策略自己实现搜索工具。

### When to use the Tool Search Tool（适用场景）

启用 Tool Search Tool 并不是没有代价，它会在工具调用前多增加一个搜索步骤。因此，只有当上下文节省和准确率提升值得这点额外延迟时，收益才最大。

适合使用的情况：

- 工具定义本身已经消耗超过 10K tokens
- 已经出现工具选择准确率问题
- 正在构建依赖多个 MCP server 的系统
- 可用工具超过 10 个

收益不大的情况：

- 工具库很小（少于 10 个工具）
- 每次会话都要频繁使用所有工具
- 工具定义本身很紧凑

---

## Programmatic Tool Calling

### The challenge（挑战）

随着工作流越来越复杂，传统工具调用会暴露两个根本问题：

- **中间结果污染上下文**：例如 Claude 需要分析一个 10MB 日志文件中的错误模式，整个日志都会进入上下文窗口，尽管 Claude 最终可能只需要错误频率摘要。再比如从多张表拉取客户数据，哪怕很多记录并不相关，也会不断累积到上下文中。  
- **推理开销和人工式综合判断**：每一次工具调用都要经历一次完整模型推理。拿到结果后，Claude 还得“用眼读”数据、提取相关内容、判断各部分如何关联、再决定下一步做什么。一个五步工具工作流就意味着至少五次推理，还不包括模型要解析、比对并综合每一步结果所带来的额外开销。

### Our solution（方案）

Programmatic Tool Calling 的思路是：不要让每一次工具结果都回到 Claude 的上下文里，而是让 Claude 写一段 Python 脚本来编排整个工作流。这段脚本会在 Code Execution 工具（沙箱环境）中运行；只有在脚本真正需要工具结果时，才会暂停并向 API 请求相应工具；返回的数据会被脚本消费，而不是被模型上下文消费。Claude 最终只看到脚本执行后的最终输出。

![Programmatic tool calling flow](/articles/assets/advanced-tool-use/advanced-tool-use-src-03_-4092394291889459726.webp)

文章用一个“预算合规检查”的业务任务举例：“哪些团队成员超出了 Q3 的差旅预算？” 假设有三个工具：

- `get_team_members(department)`：返回某部门成员列表及其 ID、级别
- `get_expenses(user_id, quarter)`：返回某个员工某季度的费用明细
- `get_budget_by_level(level)`：返回某个员工级别对应的预算上限

传统方式需要：先取团队成员、再为每个人拉费用项、再查每个级别预算，最后由 Claude 在自然语言上下文里完成求和、比对和总结。这会把 2000+ 条费用明细（50KB+）都放进上下文。

而用 Programmatic Tool Calling 时，Claude 会先写代码：批量拉团队成员、去重提取级别、并行获取预算、再并行获取所有人的费用清单、最后用代码计算总额并筛选出超支人员。例如：

```python
team = await get_team_members("engineering")

levels = list(set(m["level"] for m in team))
budget_results = await asyncio.gather(*[
    get_budget_by_level(level) for level in levels
])

budgets = {level: budget for level, budget in zip(levels, budget_results)}

expenses = await asyncio.gather(*[
    get_expenses(m["id"], "Q3") for m in team
])

exceeded = []
for member, exp in zip(team, expenses):
    budget = budgets[member["level"]]
    total = sum(e["amount"] for e in exp)
    if total > budget["travel_limit"]:
        exceeded.append({
            "name": member["name"],
            "spent": total,
            "limit": budget["travel_limit"]
        })

print(json.dumps(exceeded))
```

最终进入 Claude 上下文的只会是超支名单，而不是 2000+ 条原始费用项。文章称，这相当于把约 200KB 的原始数据压缩成约 1KB 的最终结果。

量化收益包括：

- 复杂研究任务平均 token 使用从 **43,588** 下降到 **27,297**，约减少 **37%**；
- 多次工具调用不再对应多次模型推理，因此延迟显著下降；
- 通过显式编排逻辑减少错误：内部知识检索指标从 **25.6%** 提升到 **28.5%**，GIA benchmark 从 **46.5%** 提升到 **51.2%**。

Anthropic 的核心观点是：真实生产工作流里充满了脏数据、条件判断和大规模操作。Programmatic Tool Calling 让 Claude 把复杂性放在代码里处理，而不是把注意力浪费在原始数据搬运上。

### How Programmatic Tool Calling works（工作方式）

#### 1. Mark tools as callable from code

开发者需要加入 `code_execution` 工具，并通过 `allowed_callers` 显式允许某些工具可以被代码调用：

```json
{
  "tools": [
    {
      "type": "code_execution_20250825",
      "name": "code_execution"
    },
    {
      "name": "get_team_members",
      "description": "Get all members of a department",
      "input_schema": {"type": "object"},
      "allowed_callers": ["code_execution_20250825"]
    }
  ]
}
```

API 会把这些工具定义转换成 Python 函数，供 Claude 在代码中直接调用。

#### 2. Claude writes orchestration code

Claude 不再一条条请求工具，而是先生成一段 Python 代码，例如：

```json
{
  "type": "server_tool_use",
  "id": "srvtoolu_abc",
  "name": "code_execution",
  "input": {
    "code": "team = get_team_members('engineering')\n..."
  }
}
```

#### 3. Tools execute without hitting Claude’s context

当代码里调用 `get_expenses()` 之类工具时，系统会带着 `caller` 字段发起工具请求，表明本次调用来自 code execution，而不是来自 Claude 的自然语言上下文：

```json
{
  "type": "tool_use",
  "id": "toolu_xyz",
  "name": "get_expenses",
  "input": {"user_id": "emp_123", "quarter": "Q3"},
  "caller": {
    "type": "code_execution_20250825",
    "tool_id": "srvtoolu_abc"
  }
}
```

开发者返回工具结果后，这些结果会先在 Code Execution 环境里继续被脚本处理，而不会直接进入 Claude 的上下文。这个请求-响应循环会为代码中的每次工具调用重复进行。

#### 4. Only final output enters context

当代码执行结束后，只有最终结果会返回给 Claude，例如：

```json
{
  "type": "code_execution_tool_result",
  "tool_use_id": "srvtoolu_abc",
  "content": {
    "stdout": "[{\"name\": \"Alice\", \"spent\": 12500, \"limit\": 10000}]"
  }
}
```

Claude 最终看到的是经过处理后的结论，而不是中间的全部原始数据。

### When to use Programmatic Tool Calling（适用场景）

Programmatic Tool Calling 会给工作流增加一个代码执行步骤，因此只有在 token 节省、延迟改善和准确率提升足够明显时才最划算。

最适合的情况：

- 需要处理大数据集，但最终只关心聚合值或摘要
- 工作流有 3 步或更多彼此依赖的工具调用
- 需要在结果进入 Claude 之前先做过滤、排序或转换
- 不希望中间数据影响 Claude 的最终推理
- 需要并行处理大量相似操作（例如检查 50 个 endpoint）

收益较小的情况：

- 简单的一次性单工具调用
- 任务本身要求 Claude 看到并推理全部中间结果
- 快速查询类、小响应量场景

---

## Tool Use Examples

### The challenge（挑战）

JSON Schema 很擅长定义结构约束：类型、必填字段、可选枚举等；但它无法表达“如何正确使用”这些字段。

文章举了一个支持工单 API 的例子，其中工具 `create_ticket` 允许传入 `title`、`priority`、`labels`、`reporter`、`due_date`、`escalation` 等复杂嵌套参数。Schema 可以告诉 Claude 哪些字段合法，但回答不了这些关键问题：

- `due_date` 应该用 `2024-11-06`、`Nov 6, 2024`，还是 `2024-11-06T00:00:00Z`？
- `reporter.id` 是 UUID、`USR-12345` 这样的业务 ID，还是纯数字？
- 什么时候应该填写 `reporter.contact`？
- `escalation.level` 和 `priority`、`sla_hours` 之间有什么关联？

这些模糊地带会直接导致工具调用格式虽合法、实际却错误或不一致。

### Our solution（方案）

Tool Use Examples 允许开发者直接在工具定义里提供示例调用。这样 Claude 不再只是靠 schema 猜测，而是能从具体例子里学到真实使用模式。

例如：

```json
{
  "name": "create_ticket",
  "input_schema": {"type": "object"},
  "input_examples": [
    {
      "title": "Login page returns 500 error",
      "priority": "critical",
      "labels": ["bug", "authentication", "production"],
      "reporter": {
        "id": "USR-12345",
        "name": "Jane Smith",
        "contact": {
          "email": "jane@acme.com",
          "phone": "+1-555-0123"
        }
      },
      "due_date": "2024-11-06",
      "escalation": {
        "level": 2,
        "notify_manager": true,
        "sla_hours": 4
      }
    },
    {
      "title": "Add dark mode support",
      "labels": ["feature-request", "ui"],
      "reporter": {
        "id": "USR-67890",
        "name": "Alex Chen"
      }
    },
    {
      "title": "Update API documentation"
    }
  ]
}
```

通过这 3 个例子，Claude 可以学到：

- 日期格式应使用 `YYYY-MM-DD`
- 用户 ID 采用 `USR-XXXXX` 风格
- 标签使用 kebab-case
- 严重 bug 需要带联系信息与升级策略
- 功能请求可能只需要 reporter，不需要 escalation
- 内部简单任务甚至只需要 title

Anthropic 内部测试显示，在复杂参数处理场景中，加入 Tool Use Examples 后准确率从 **72% 提升到 90%**。

### When to use Tool Use Examples（适用场景）

Tool Use Examples 会增加工具定义 token，因此只有在准确率提升值得这部分额外成本时才最划算。

最适合的情况：

- 参数结构复杂、嵌套层级深，且“合法 JSON”不等于“正确用法”
- 工具有大量可选参数，而且哪些字段应同时出现很重要
- API 含有领域约定，但这些约定无法被 schema 清楚表达
- 多个工具很相似，需要借示例帮助模型分辨何时该用哪个

收益较小的情况：

- 非常简单、单参数的工具
- URL、邮箱这类模型本来就比较熟悉的标准格式
- 更适合通过 JSON Schema 约束解决的验证问题

---

## Best practices（最佳实践）

### Layer features strategically（按瓶颈分层叠加）

并不是每个 Agent 在每个任务里都需要同时开启这三项功能。更好的策略是先找出当前最大的瓶颈：

- 工具定义导致上下文膨胀 → 先用 Tool Search Tool
- 大量中间结果污染上下文 → 先用 Programmatic Tool Calling
- 参数错误、工具调用格式畸形 → 先用 Tool Use Examples

之后再按需叠加其他功能。它们是互补的：Tool Search Tool 负责找到对的工具，Programmatic Tool Calling 负责高效执行，Tool Use Examples 负责确保调用方式正确。

### Set up Tool Search Tool for better discovery

因为工具搜索会匹配名称和描述，所以清晰、描述性强的工具定义更容易被准确发现。文章给出一个对比例子：

```js
// Good
{
  "name": "search_customer_orders",
  "description": "Search for customer orders by date range, status, or total amount. Returns order details including items, shipping, and payment info."
}

// Bad
{
  "name": "query_db_orders",
  "description": "Execute order query"
}
```

系统提示里也应该明确告诉 Claude 当前有哪些能力，例如：

```text
You have access to tools for Slack messaging, Google Drive file management,
Jira ticket tracking, and GitHub repository operations. Use the tool search
to find specific capabilities.
```

同时，把 3-5 个最高频工具保持常驻，把其余工具 defer，可以在即时可用性与按需发现之间取得平衡。

### Set up Programmatic Tool Calling for correct execution

既然 Claude 要写代码解析工具返回结果，那么开发者就应该把返回格式描述清楚。文章建议在工具描述中明确返回结构，例如：

```text
Returns:
- id (str): Order identifier
- total (float): Order total in USD
- status (str): One of 'pending', 'shipped', 'delivered'
- items (list): Array of {sku, quantity, price}
- created_at (str): ISO 8601 timestamp
```

还应优先让那些**可并行执行**、**重试安全（idempotent）**的工具参与 PTC。

### Set up Tool Use Examples for parameter accuracy

示例的目标是提升行为清晰度。文章建议：

- 使用真实可信的数据，不要写成 `string`、`value` 这种占位内容
- 用尽量少的例子覆盖“最小、部分、完整”三种典型模式
- 保持精炼，通常 1-5 个例子就够
- 重点解决模糊点，只在 schema 本身无法表达正确用法的地方提供 example

---

## Getting started（开始使用）

这三项功能目前都以 beta 形式提供。启用时，需要在请求中加入 beta header，并同时声明所需工具：

```python
client.beta.messages.create(
    betas=["advanced-tool-use-2025-11-20"],
    model="claude-sonnet-4-5-20250929",
    max_tokens=4096,
    tools=[
        {"type": "tool_search_tool_regex_20251119", "name": "tool_search_tool_regex"},
        {"type": "code_execution_20250825", "name": "code_execution"},
        # Your tools with defer_loading, allowed_callers, and input_examples
    ]
)
```

文末还给出了进一步阅读入口，包括：

- Tool Search Tool 的文档与 cookbook
- Programmatic Tool Calling 的文档与 cookbook
- Tool Use Examples 的文档

Anthropic 的结论是：这些能力让工具使用从“简单函数调用”迈向“智能编排”。当 Agent 需要处理跨越大量工具和大规模数据的复杂工作流时，**动态发现、有效执行、正确调用**会成为基础能力。

---

### 抓取说明

- 本文已根据 `https://www.anthropic.com/engineering/advanced-tool-use` 重新抓取整理。  
- 本翻译版以忠实转述原文结构和关键信息为目标，保留了主要术语与示例代码。  
- 配图使用项目中已归档的本地资源 3 张（主视觉 + 2 张流程图）。
